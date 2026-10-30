#!/usr/bin/env node
/**
 * ai_cards.js — 플래시카드 암기팁 초안 생성 → 피드백/card_tip.json 오버레이 반영
 * @spec AI-18,AI-22
 *
 * 사용법:
 *   node tools/ai/ai_cards.js [--exam cosmetic] [--subject law] [--min-len 60] [--limit 30] [--dry-run]
 *   node tools/ai/ai_cards.js --apply [--write]
 *
 * 대상: 카드는 교재에서 자동 추출되는 생성물이라 본문 정의가 짧은 카드가 많다.
 * 정의가 --min-len 미만인 카드(또는 --all)에 암기팁(맥락·구분·함정) 초안을 작성한다.
 *
 * 산출물: tmp/ai_drafts/cardtip_<examId>_<subjKey>.md — 리뷰 후 --apply가
 * content/exams/<id>/피드백/card_tip.json {cardId: tip}에 병합.
 * 런타임(DataLoader.loadSubject)이 오버레이를 카드에 병합해 플래시카드 뒷면에 표시한다.
 *
 * 컨텍스트는 카드 용어가 등장하는 교재 실제 라인 주변으로 제한한다 (grounded).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { parseArgs, getTargets, writeDraft, loadEnv, DRAFT_DIR, ROOT, listDraftFiles } = require('./lib/ai_common.js');
const llm = require('./llm_client.js');

const esmRequire = createRequire(path.join(ROOT, 'tools', 'build', 'plugins', 'textbook.plugin.js'));
const { buildSubjectData } = esmRequire('../../../src/reader/textbook-core.js');

const SYSTEM = '당신은 자격시험 플래시카드의 암기팁 작성 보조입니다. 제공된 정의와 교재 근거만을 바탕으로, 기억·구분에 도움되는 1~2문장의 암기팁을 한국어로 작성하라. 근거에 없는 사실·수치를 만들지 말 것.';

const CTX_SPAN = 4;

/** 과목 카드 데이터 — buildSubjectData로 실제 런타임과 동일하게 파싱 */
function loadSubjectCards(target, subjectKey) {
    const mfPath = path.join(ROOT, target.contentRoot, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(mfPath, 'utf-8'));
    const subj = (manifest.subjects || []).find(s => s.key === subjectKey);
    if (!subj) return null;
    const mdByFile = {};
    for (const ch of subj.chapters || []) {
        const fp = path.join(ROOT, target.contentRoot, subj.dir, ch.file);
        if (fs.existsSync(fp)) mdByFile[ch.file] = fs.readFileSync(fp, 'utf-8');
    }
    return { subj, data: buildSubjectData(subj, mdByFile, {}), mdByFile };
}

/** 카드 용어가 등장하는 교재 라인 주변 컨텍스트 */
function termContext(mdByFile, term) {
    for (const md of Object.values(mdByFile)) {
        const lines = md.split('\n');
        const idx = lines.findIndex(l => l.includes(term));
        if (idx < 0) continue;
        return lines.slice(Math.max(0, idx - 1), idx + CTX_SPAN).join('\n').slice(0, 1200);
    }
    return null;
}

function buildPrompt(card, context) {
    return [
        '아래 플래시카드의 암기팁을 작성하라.',
        '',
        `[용어] ${card.term}`,
        `[정의] ${card.definition}`,
        `[카테고리] ${card.category || '-'}`,
        '',
        context ? `[교재 근거]\n${context}` : '[교재 근거 없음 — 용어 위치 미발견]',
        '',
        '암기팁만 출력. 언급된 개념의 구분점·함정·연결고리 중 1가지를 1~2문장으로.',
    ].join('\n');
}

/** 초안 md 파싱 → Map<examId, Map<cardId, tip>> */
function parseCardDrafts() {
    const byExam = new Map();
    if (!fs.existsSync(DRAFT_DIR)) return byExam;
    for (const f of listDraftFiles().filter(f => /^cardtip_.+\.md$/.test(path.basename(f)))) {
        const examId = path.basename(f).replace(/^cardtip_/, '').replace(/_[^_]+\.md$/, '');
        const md = fs.readFileSync(f, 'utf-8');
        const map = byExam.get(examId) || new Map();
        for (const m of md.matchAll(/## card (\S+)\s*\n[\s\S]*?^> \*\*카드팁\*\*:\s*(.+)$/gm)) {
            const text = m[2].trim();
            if (!text || /미생성|DRY RUN|TODO/.test(text)) continue;
            map.set(m[1], text);
        }
        byExam.set(examId, map);
    }
    return byExam;
}

async function generate(opts, flags) {
    loadEnv();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = opts.limit ? Number(opts.limit) : Infinity;
    const minLen = opts['min-len'] ? Number(opts['min-len']) : 60;

    let total = 0, drafted = 0, ungrounded = 0;
    for (const target of getTargets(opts)) {
        // 이미 반영된 팁은 재생성하지 않음
        const appliedFp = path.join(ROOT, target.contentRoot, '피드백', 'card_tip.json');
        const applied = fs.existsSync(appliedFp) ? JSON.parse(fs.readFileSync(appliedFp, 'utf-8')) : {};
        // 제외 목록 카드는 대상에서 제거 (피드백/card_exclude.json — 런타임과 동일 규칙)
        const exclFp = path.join(ROOT, target.contentRoot, '피드백', 'card_exclude.json');
        const excluded = fs.existsSync(exclFp) ? JSON.parse(fs.readFileSync(exclFp, 'utf-8')) : {};
        const mf = JSON.parse(fs.readFileSync(path.join(ROOT, target.contentRoot, 'manifest.json'), 'utf-8'));
        for (const s of mf.subjects || []) {
            if (opts.subject && s.key !== opts.subject) continue;
            const loaded = loadSubjectCards(target, s.key);
            if (!loaded) continue;
            const cards = loaded.data.cards.filter(c => (flags.has('all') || c.definition.length < minLen) && !(c.id in applied) && !(c.id in excluded));
            if (!cards.length) continue;
            total += cards.length;
            if (drafted >= limit) continue;

            const lines = [`# 카드팁 초안 — ${s.key} (대상 ${cards.length}카드 · 정의 ${minLen}자 미만)`, ''];
            const ungroundedList = [];
            for (const card of cards) {
                if (drafted >= limit) break;
                const ctx = termContext(loaded.mdByFile, card.term);
                if (!ctx) { // 근거 미발견 — 비근거 팁 생성 차단
                    ungrounded++;
                    ungroundedList.push(`- ${card.id} (${card.term}) — 교재에서 용어 위치 미발견`);
                    continue;
                }
                const prompt = buildPrompt(card, ctx);
                lines.push(`## card ${card.id}`, '',
                    `- 용어: ${card.term}`,
                    `- 정의: ${card.definition}`, '');
                if (dryRun) {
                    lines.push('> **카드팁**: (미생성 — DRY RUN 또는 API 키 없음)', '',
                        '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
                } else {
                    const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 200 });
                    lines.push(res.dryRun
                        ? '> **카드팁**: (미생성 — DRY RUN)'
                        : `> **카드팁**: ${res.text.trim().replace(/\n+/g, ' ')}`, '');
                }
                drafted++;
            }
            if (ungroundedList.length) {
                lines.push('## ⚠️ 근거 부재 — 팁 미생성', '', ...ungroundedList, '');
            }
            const out = writeDraft(`${target.id}/cardtip_${target.id}_${s.key}.md`, lines, { model: llm.modelName() });
            console.log(`${s.key}: 대상 카드 ${cards.length}개 (근거 부재 ${ungroundedList.length}개 제외) → ${out}`);
        }
    }
    console.log(`\n총 대상 카드: ${total}개 · 초안 작성: ${drafted}개 · 근거 부재: ${ungrounded}개${dryRun ? ' (dry-run)' : ''}`);
}

function apply(flags, opts) {
    const write = flags.has('write');
    const byExam = parseCardDrafts();
    const targets = getTargets(opts);
    let applied = 0;
    for (const [examId, map] of byExam) {
        const target = targets.find(t => t.id === examId);
        if (!target) { console.log(`${examId}: 대상 시험 없음 — 건너뜀`); continue; }
        const dir = path.join(ROOT, target.contentRoot, '피드백');
        const fp = path.join(dir, 'card_tip.json');
        const cur = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : {};
        let add = 0;
        for (const [id, tip] of map) {
            if (cur[id]) continue; // 기존 팁 보존 — 교체는 수동 삭제 후 재적용
            cur[id] = tip;
            add++;
        }
        console.log(`${examId}: 카드팁 ${add}건 ${write ? '병합' : '미리보기'} (누적 ${Object.keys(cur).length}건)`);
        if (write && add) {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fp, JSON.stringify(cur, null, 1) + '\n');
        }
        applied += add;
    }
    console.log(`\n총 ${applied}건 ${write ? '반영 — 다음 빌드부터 앱에 표시' : '미리보기 (적용은 --write)'}`);
}

async function main() {
    const { flags, opts } = parseArgs();
    if (flags.has('apply')) return apply(flags, opts);
    return generate(opts, flags);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { buildPrompt, termContext, parseCardDrafts, loadSubjectCards };
