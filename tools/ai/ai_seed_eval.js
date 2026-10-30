#!/usr/bin/env node
/**
 * ai_seed_eval.js — 콜드스타트 난이도 시딩 오프라인 검증 (AI-32)
 * @spec AI-32
 *
 * 사용법:
 *   node tools/ai/ai_seed_eval.js --exam cosmetic --stats <백업JSON> [--min 30]
 *
 * - 예측: lib/difficulty.estimateDifficulty (ai_tag 정본 휴리스틱, 비LLM)
 * - 실측: 백업 JSON의 quiz_results 첫 정오 — "<subj>_quiz_<num>" 키로 조인
 * - 판정: 예측 버킷별 실측 오답률 단조성 — valid(단조) / borderline(인접 1쌍 위반)
 *   / invalid / insufficient(표본 미달). 유효(valid) 시에만 런타임 시딩 승격
 *   (LEARNING_ALGORITHM_DESIGN §8, AI_COACH §5.2 단계 5).
 */

'use strict';
const fs = require('fs');
const { parseArgs, getTargets, listQbanks } = require('./lib/ai_common.js');
const { parseQuestionBank } = require('./lib/qbank.js');
const { estimateDifficulty, evaluateSeedAccuracy } = require('./lib/difficulty.js');

/** 백업 JSON에서 quiz_results 로드 — ai_stmt_feedback.loadStats와 같은 키 탐색 */
function loadQuizResults(path) {
    const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
    const key = Object.keys(raw).find(k => /(^|:)quiz_results$/.test(k));
    let v = key ? raw[key] : {};
    if (typeof v === 'string') v = JSON.parse(v);
    return v && typeof v === 'object' && v !== null ? v : {};
}

function main() {
    const { opts } = parseArgs();
    if (!opts.stats) {
        console.error('사용법: --stats <백업JSON> [--exam <id>] [--min 30]');
        process.exit(2);
    }
    const results = loadQuizResults(opts.stats);

    // '<subj>_quiz_<num>' → 예측 난이도 색인 (전 시험 문제은행 순회)
    const predById = {};
    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            for (const q of questions) {
                predById[`${exam.key}_quiz_${q.num}`] = estimateDifficulty(q, answers.get(q.num));
            }
        }
    }

    const pairs = [];
    for (const [id, r] of Object.entries(results)) {
        const pred = predById[id];
        if (pred == null || !r || typeof r.correct !== 'boolean') continue;
        pairs.push({ pred, wrong: !r.correct });
    }

    const res = evaluateSeedAccuracy(pairs, Number(opts.min || 30));
    console.log(`표본 ${res.sample}문항 — 예측 D vs 실측 오답률`);
    for (const b of res.buckets) {
        console.log(`  D${b.pred}: n=${b.n} 오답률 ${(b.wrongRate * 100).toFixed(0)}%`);
    }
    console.log(`판정: ${res.verdict}`);
    if (res.verdict === 'valid') console.log('→ 런타임 시딩 승격 허용');
    else console.log(`→ 런타임 시딩 보류 — ${res.verdict === 'insufficient' ? '표본 부족' : '단조성 미충족'}`);
    process.exit(res.verdict === 'invalid' ? 1 : 0);
}

main();
