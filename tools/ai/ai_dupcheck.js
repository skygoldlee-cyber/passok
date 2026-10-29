#!/usr/bin/env node
/**
 * ai_dupcheck.js — 초안 ↔ 기존 문항 유사도 상한 검사 (중복 출제 방지)
 * @spec AI-07,AI-13
 *
 * 사용법:
 *   node tools/ai/ai_dupcheck.js                  # tmp/ai_drafts/*.md 초안 전수 검사
 *   node tools/ai/ai_dupcheck.js --all            # 기존 문항끼리 상호 유사도 감사
 *   node tools/ai/ai_dupcheck.js --threshold 0.6  # 임계 조정
 *
 * - 의미 유사도: SEM-05 이웃 인덱스(EMB_NEIGHBORS) — 기존 항목끼리만 커버
 * - 어휘 유사도 폴백: 문자 bigram Jaccard — 초안(미임베딩)에도 적용 가능
 * - 초안 텍스트의 임베딩이 필요하면 ref-pipeline/embeddings로 재계산 후 재실행
 *
 * 유사도 임계 초과 쌍은 [폐기 표시] 대상으로 보고 (설계 §5 dupcheck 게이트화).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, DRAFT_DIR, ROOT, listDraftFiles } = require('./lib/ai_common');
const { parseQuestionBank, questionText } = require('./lib/qbank');
const { listQbanks } = require('./lib/ai_common');
const { loadJsBundle, lexSim } = require('./lib/similarity');

const DEFAULT_THRESHOLD = 0.55; // bigram Jaccard — 어휘 겹침 기준 보수적 상한

/** 초안 md에서 ### Q 블록 텍스트 추출 */
function parseDraftTexts(mdPath) {
    const lines = fs.readFileSync(mdPath, 'utf-8').split(/\r?\n/);
    const out = [];
    let cur = null;
    for (const line of lines) {
        const qm = line.match(/^###\s*Q?(\d+)\.\s*(.*)$/);
        const hm = !qm && line.match(/^###\s*(\S.*)$/); // 번호 없는 ### 헤딩도 문항 경계로 처리
        if (qm || hm) {
            if (cur) out.push(cur);
            cur = qm ? { label: `Q${qm[1]}`, text: qm[2] || '' }
                     : { label: hm[1].slice(0, 30), text: hm[1] };
            continue;
        }
        if (cur && /^[①②③④⑤]/.test(line.trim())) cur.text += ' ' + line.trim().slice(1);
    }
    if (cur) out.push(cur);
    return out.filter(d => (d.text || '').trim().length > 10);
}

function existingItems(targets) {
    const items = []; // {id, text}
    for (const target of targets) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions } = parseQuestionBank(absPath);
            for (const q of questions) items.push({ id: `${exam.key}_q${q.num}`, text: questionText(q) });
        }
    }
    return items;
}

function main() {
    const { flags, opts } = parseArgs();
    const threshold = Number(opts.threshold || DEFAULT_THRESHOLD);
    const targets = getTargets(opts);
    const existing = existingItems(targets);

    // 의미 유사도(기존↔기존): neighbors 인덱스 조회
    const semanticPairs = [];
    for (const target of targets) {
        const nPath = path.join(ROOT, target.dataRoot, 'embeddings', 'neighbors.js');
        if (!fs.existsSync(nPath)) continue;
        const nb = loadJsBundle(nPath);
        for (const [id, adj] of Object.entries(nb.adj || {})) {
            if (!id.startsWith('q:')) continue;
            for (const [nid, score] of adj) {
                if (nid.startsWith('q:') && nid > id && score >= threshold) {
                    semanticPairs.push({ a: id, b: nid, score });
                }
            }
        }
    }

    if (flags.has('all')) {
        console.log(`기존 문항 상호 유사도 (≥${threshold}) — 의미 ${semanticPairs.length}쌍:`);
        for (const p of semanticPairs.slice(0, 50)) console.log(`  ${p.a} ↔ ${p.b}  ${p.score}`);
        return;
    }

    // 초안 ↔ 기존: 어휘 유사도 (임베딩 부재 폴백)
    const drafts = fs.existsSync(DRAFT_DIR)
        ? listDraftFiles().filter(f => !path.basename(f).startsWith('_')) : [];
    if (!drafts.length) { console.log(`초안 없음 — ${path.relative(ROOT, DRAFT_DIR)}/ 에 ai:draft 산출물을 두세요`); return; }

    let flagged = 0;
    for (const file of drafts) {
        const cands = parseDraftTexts(path.join(DRAFT_DIR, file));
        if (!cands.length) continue;
        console.log(`\n${file}: 초안 ${cands.length}건 검사 (기존 ${existing.length}문 대비)`);
        for (const c of cands) {
            const best = existing.map(e => ({ id: e.id, score: lexSim(c.text, e.text) }))
                .sort((a, b) => b.score - a.score)[0];
            if (best && best.score >= threshold) {
                flagged++;
                console.log(`  ⚠️ [폐기 표시] ${c.label} ↔ ${best.id} (어휘 유사도 ${best.score.toFixed(2)})`);
            }
        }
    }
    console.log(`\n임계 초과: ${flagged}건${semanticPairs.length ? ` · (참고) 기존 문항 간 의미 유사 ${semanticPairs.length}쌍` : ''}`);
    if (flags.has('check') && flagged) process.exit(1);
}

if (require.main === module) main();

module.exports = { parseDraftTexts, existingItems };
