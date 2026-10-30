#!/usr/bin/env node
/**
 * ai_statements.js — 복수정답형 진술 설계: 참 진술의 거짓 반전 변형 + 재조합 후보
 * @spec AI-08,AI-02
 *
 * 사용법:
 *   node tools/ai/ai_statements.js [--exam cosmetic] [--limit 20] [--dry-run]
 *
 * - 입력: {dataRoot}/drills/combo_*.js·ox_*.js의 참(truth) 진술
 * - 규칙 변형: 수치 치환 / 주체 교환 / 극성 반전(허용↔금지, 의무→임의, 이상→미만)
 * - LLM 모드: 규칙이 못 잡는 의미적 반전 추가 제안
 * - conceptId별 참 진술 풀에서 재조합 후보(참 2~3 + 변형 거짓)를 함께 제안
 *
 * 산출물: tmp/ai_drafts/statements_<subject>.md — 리뷰 후 문제은행·드릴 소스에 반영.
 *         모순쌍·위치편향은 audit:combo가 그대로 게이트.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, writeDraft, loadEnv, ROOT } = require('./lib/ai_common.js');
const { loadJsBundle } = require('./lib/similarity.js');
const llm = require('./llm_client.js');

const SYSTEM = '당신은 복수정답형(ㄱㄴㄷ 진술 조합) 문항의 진술 설계 보조입니다. 참인 진술을 받아 수험상 혼동을 유도하는 거짓 변형을 제안하라. 단, 실제 법령과 모순되는 참 진술을 만들면 안 된다 — 변형은 반드시 거짓이어야 한다.';

// 주체 교환 사전 — 이 시험에서 혼동이 잦은 행정 주체·절차 쌍
const AGENT_SWAPS = [
    ['식품의약품안전처장', '시·도지사'], ['식품의약품안전처장', '시·군·구청장'],
    ['식품의약품안전처장', '지방식품의약품안전청장'],
    ['화장품제조업자', '화장품책임판매업자'], ['제조업자', '책임판매업자'],
    ['책임판매관리자', '맞춤형화장품조제관리사'],
    ['등록', '신고'], ['허가', '신고'], ['신고', '허가'],
];
// 극성 반전 사전
const POLARITY_SWAPS = [
    ['허용', '금지'], ['가능', '불가'], ['포함', '제외'], ['의무', '임의'],
    ['이상', '미만'], ['이하', '초과'], ['이내', '경과 후'], ['해야 한다', '해서는 안 된다'],
];

/** 참 진술 → 거짓 변형 후보들 (규칙 기반) */
function falseVariants(text) {
    const out = [];
    // 수치 치환 — 발견된 숫자+단위를 흔한 혼동 값으로
    const NUM_CONFUSE = { '3': '1', '5': '3', '7': '14', '15': '30', '30': '15', '90': '30', '1': '3', '2': '5' };
    for (const m of text.matchAll(/(\d+)(일|개월|년|%|ppm|㎍|mg|g|mL)?/g)) {
        const alt = NUM_CONFUSE[m[1]];
        if (alt) out.push({ kind: '수치 치환', text: text.replace(m[0], alt + (m[2] || '')), via: `${m[0]}→${alt}${m[2] || ''}` });
    }
    for (const [a, b] of AGENT_SWAPS) {
        if (text.includes(a)) out.push({ kind: '주체 교환', text: text.replace(a, b), via: `${a}→${b}` });
    }
    for (const [a, b] of POLARITY_SWAPS) {
        if (text.includes(a)) out.push({ kind: '극성 반전', text: text.replace(a, b), via: `${a}→${b}` });
    }
    return out;
}

/** 드릴 번들에서 진술 수집 → [{sid, conceptId, text, truth}] */
function loadStatements(target) {
    const dir = path.join(ROOT, target.dataRoot, 'drills');
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const f of fs.readdirSync(dir)) {
        if (!/^(combo_subject\d+|ox_subject\d+)\.js$/.test(f)) continue;
        for (const item of loadJsBundle(path.join(dir, f))) {
            if (item.statements) out.push(...item.statements.map(s => ({ ...s, src: item.id })));
            else if (item.statement) out.push({ sid: item.sid, conceptId: item.conceptId, text: item.statement, truth: item.truth, src: item.id });
        }
    }
    // sid 중복 제거
    const seen = new Set();
    return out.filter(s => s.text && (seen.has(s.sid) ? false : (seen.add(s.sid), true)));
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = Number(opts.limit || 20);

    for (const target of getTargets(opts)) {
        const stmts = loadStatements(target).filter(s => s.truth === true);
        if (!stmts.length) { console.log(`${target.id}: 진술 번들 없음 (drills 미생성)`); continue; }

        const lines = [`# 진술 반전 변형·재조합 초안 — ${target.id} (참 진술 ${stmts.length}개)`, ''];
        let count = 0;
        for (const s of stmts) {
            if (count >= limit) break;
            const vars = falseVariants(s.text);
            if (!dryRun) {
                const res = await llm.complete(
                    `참 진술: ${s.text}\n\n혼동 유도 거짓 변형을 최대 3개, 한 줄에 하나씩 출력. 규칙 변형과 겹치면 생략.`,
                    { system: SYSTEM, maxTokens: 300 });
                if (!res.dryRun) for (const t of res.text.split('\n').map(x => x.trim()).filter(Boolean)) {
                    vars.push({ kind: 'LLM 제안', text: t.replace(/^[-*]\s*/, ''), via: 'llm' });
                }
            }
            if (!vars.length) continue;
            count++;
            lines.push(`## ${s.sid} · 개념 ${s.conceptId || '(없음)'} (출처 ${s.src})`,
                `- 참 진술: ${s.text}`, '', '| 거짓 변형 후보 | 유형 |', '|---|---|',
                ...vars.slice(0, 5).map(v => `| ${v.text} | ${v.kind}${v.via && v.via !== 'llm' ? ` (${v.via})` : ''} |`), '');
        }

        // 재조합 후보 — conceptId별 참 진술 2개 이상인 그룹
        const byCid = new Map();
        for (const s of stmts) if (s.conceptId) {
            byCid.set(s.conceptId, [...(byCid.get(s.conceptId) || []), s]);
        }
        const groups = [...byCid.entries()].filter(([, g]) => g.length >= 2);
        if (groups.length) {
            lines.push('---', '', '## 재조합 후보 (같은 개념의 참 진술 조합 + 위 변형 거짓)', '');
            for (const [cid, g] of groups.slice(0, 15)) {
                lines.push(`### ${cid} — 참 ${g.length}개`, ...g.slice(0, 5).map(s => `- ${s.text}`), '');
            }
        }

        const out = writeDraft(`${target.id}/statements_${target.id}.md`, lines, { model: llm.modelName() });
        console.log(`${target.id}: 변형 제안 ${count}진술 · 재조합 후보 ${groups.length}개념 → ${out}`);
    }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { falseVariants };
