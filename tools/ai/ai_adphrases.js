#!/usr/bin/env node
/**
 * ai_adphrases.js — 광고문구 사전 확장 후보 초안 생성 (cosmetic 전용 — ad-lint.js 사전)
 * @spec AI-21
 *
 * 사용법:
 *   node tools/ai/ai_adphrases.js [--exam cosmetic] [--clause 라,마] [--dry-run]
 *
 * 별표5 '표시·광고의 범위 및 준수사항' 2항 각 호의 법문과 기존 사전 항목을 근거로
 * 누락된 금지 표현 후보를 제안한다. check:adlint가 'expected: []'로 보고하는
 * 미커버 호(라·마·자·차·카)가 주요 대상.
 *
 * 산출물: tmp/ai_drafts/adphrases_<examId>.md — JS 배열 항목 형태.
 * apply 없음 — 사람이 리뷰 후 src/exams/<id>/ad-lint.js에 직접 편입하고
 * `npm run check:adlint`로 자기 검출 회귀를 확인한다 (사전은 코드 파일이므로
 * 기계적 병합 대신 수동 편입을 원칙으로 한다).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { parseArgs, getTargets, writeDraft, loadEnv, ROOT } = require('./lib/ai_common');
const llm = require('./llm_client');

const SYSTEM = '당신은 화장품 광고 규정 준수 점검 사전의 항목 작성 보조입니다. 제공된 법문과 기존 사전 항목을 근거로, 해당 조항이 금지하는 표현의 구체적 예시를 제안하라. 법문의 취지를 벗어나는 표현은 제안하지 말 것.';

// 별표5 2항 각 호 — check_adlint_coverage.js LEGAL_CLAUSES와 동일 목록 유지
const CLAUSES = [
    { clause: '가', name: '의약품 오인 금지', category: 'medicine' },
    { clause: '나', name: '기능성화장품 오인 금지', category: 'functional' },
    { clause: '다', name: '의료 전문가 추천·공인 표현 금지', category: 'endorsement' },
    { clause: '라', name: '국내외 제품 오인 금지', category: null },
    { clause: '마', name: '외국 기술제휴 허위 표현 금지', category: null },
    { clause: '바', name: '비교·절대적 표현 금지', category: 'overclaim' },
    { clause: '사', name: '소비자 오인·기만 표현 금지', category: 'overclaim' },
    { clause: '아', name: '객관 확인 불가 효능 표현 금지', category: 'overclaim' },
    { clause: '자', name: '저속·혐오 표현 금지', category: null },
    { clause: '차', name: '멸종위기종 함유 표현 금지', category: null },
    { clause: '카', name: '타 제품 비방 금지', category: null },
];

/** ref_md에서 별표5 표시·광고 준수사항 문서 탐색 */
function findAdLawDoc(target) {
    const root = path.join(ROOT, target.contentRoot, '참조자료', 'ref_md');
    if (!fs.existsSync(root)) return null;
    const stack = [root];
    while (stack.length) {
        const d = stack.pop();
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) { stack.push(p); continue; }
            if (e.name.endsWith('.md') && /별표5.*표시|표시광고범위/.test(e.name + d)) {
                const text = fs.readFileSync(p, 'utf-8');
                if (/준수사항|2항|호[).]/.test(text)) return { file: p, text };
            }
        }
    }
    return null;
}

/** 별표5 문서에서 특정 호(가/나/…)의 법문 추출 */
function clauseText(docText, clause) {
    const re = new RegExp(`(?:^|\\n)\\s*\\d*\\s*[.)]?\\s*${clause}\\s*[.)]\\s*([^\\n]{0,400})`);
    const m = docText.match(re);
    if (m) return m[1].trim();
    const idx = docText.indexOf(`${clause}. `);
    return idx >= 0 ? docText.slice(idx, idx + 400).split('\n')[0] : null;
}

function buildPrompt(clause, lawText, existing) {
    return [
        `별표5 2항 ${clause.clause}호(${clause.name})가 금지하는 광고 표현 후보를 제안하라.`,
        '',
        lawText ? `[법문]\n${lawText}` : '[법문 추출 실패 — 조항명 기준으로 보수적 제안]',
        '',
        existing.length
            ? `[기존 사전 항목 — 중복 제안 금지]\n${existing.join('\n')}`
            : '[기존 사전 항목 없음 — 이 조항은 사전 미커버]',
        '',
        '출력 형식 (한 줄에 하나, 최대 10개):',
        "{ term: '금지표현', category: '카테고리키', suggestion: '대체 표현' },",
        'category는 기존 키(medicine/functional/endorsement/overclaim) 또는 조항에 맞는 새 키 제안.',
    ].join('\n');
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const only = opts.clause ? new Set(opts.clause.split(',')) : null;

    for (const target of getTargets(opts)) {
        const lintPath = path.join(ROOT, 'src', 'exams', target.id, 'ad-lint.js');
        if (!fs.existsSync(lintPath)) { console.log(`${target.id}: ad-lint 사전 없음 — 건너뜀`); continue; }
        const { AD_BANNED_TERMS } = createRequire(lintPath)(lintPath);
        const doc = findAdLawDoc(target);
        if (!doc) console.log(`${target.id}: 별표5 문서 미발견 — 법문 없이 진행`);

        const lines = [`# 광고문구 사전 확장 후보 — ${target.id}`, '',
            `> 사전: src/exams/${target.id}/ad-lint.js · 근거: ${doc ? path.basename(doc.file) : '미발견'}`, ''];
        for (const clause of CLAUSES) {
            if (only && !only.has(clause.clause)) continue;
            const existing = AD_BANNED_TERMS.filter(t => !clause.category || t.category === clause.category)
                .map(t => `- ${t.term} (${t.category})`);
            const lawText = doc ? clauseText(doc.text, clause.clause) : null;
            const prompt = buildPrompt(clause, lawText, existing);
            lines.push(`## ${clause.clause}호 — ${clause.name}`, '',
                lawText ? `> 법문: ${lawText.slice(0, 200)}` : '> 법문 미추출', '');
            if (dryRun) {
                lines.push('(미생성 — DRY RUN 또는 API 키 없음)', '',
                    '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
            } else {
                const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 600 });
                lines.push('```js', res.dryRun ? '// (미생성 — DRY RUN)' : res.text.trim(), '```', '');
            }
        }
        const out = writeDraft(`${target.id}/adphrases_${target.id}.md`, lines, { model: llm.modelName() });
        console.log(`${target.id}: → ${out} (리뷰 후 ad-lint.js 수동 편입, check:adlint 회귀 확인)`);
    }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { buildPrompt, clauseText, CLAUSES };
