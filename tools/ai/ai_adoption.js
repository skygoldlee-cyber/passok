#!/usr/bin/env node
/**
 * ai_adoption.js — AI 배치 채택률 리포트
 * @spec AI-23
 *
 * ai_apply --write가 기록하는 tools/ai/adoption_log.jsonl을 집계해
 * 배치별·누적 채택률(편입/생성)과 리뷰 수정률을 출력 — 설계 §3.1의
 * L0→L1 승격 판단 데이터(연속 배치 채택률·수정률 추세).
 *
 * 사용법:
 *   node tools/ai/ai_adoption.js           # 배치별 표 + 합계
 *   node tools/ai/ai_adoption.js --json    # 레코드 + 요약 JSON
 *
 * 주의: 채택률 분모는 "리뷰를 통과해 편입 시도된 엔트리"다 — 리뷰 단계에서
 * 초안 블록을 통째 삭제해 폐기한 분량은 apply가 볼 수 없어 집계되지 않는다.
 * 리뷰 수정(해설 문구 편집)은 초안 본문 해시(sha=) 대조로 감지한다.
 */

'use strict';

const fs = require('fs');
const { ADOPTION_LOG, parseArgs } = require('./lib/ai_common.js');

/** 로그 레코드 → 배치 단위 집계. 같은 초안 파일의 재생성(genDate 상이)은 별개 배치. */
function summarize(records) {
    const batches = new Map(); // key: draft|genDate → 레코드(applied 최대)
    for (const r of records) {
        const key = `${r.draft}|${r.genDate || ''}`;
        const prev = batches.get(key);
        if (!prev || (r.applied || 0) > (prev.applied || 0)) batches.set(key, r);
    }
    const list = [...batches.values()]
        .sort((a, b) => String(a.genDate || a.ts).localeCompare(String(b.genDate || b.ts)));
    const total = { generated: 0, applied: 0, skipped: 0, batches: list.length, edited: 0 };
    for (const b of list) {
        total.generated += b.generated || 0;
        total.applied += b.applied || 0;
        total.skipped += b.skipped || 0;
        if (b.edited) total.edited++;
    }
    total.adoptionRate = total.generated ? total.applied / total.generated : 0;
    return { batches: list, total };
}

function main() {
    const { flags } = parseArgs();
    if (!fs.existsSync(ADOPTION_LOG)) {
        console.log('adoption_log.jsonl 없음 — ai_apply --write 편입 후 생성됩니다');
        return;
    }
    const records = fs.readFileSync(ADOPTION_LOG, 'utf-8').split(/\r?\n/)
        .filter(Boolean).map(l => JSON.parse(l));
    const { batches, total } = summarize(records);
    if (flags.has('json')) { console.log(JSON.stringify({ records, total }, null, 2)); return; }

    console.log('AI 배치 채택 리포트 (tools/ai/adoption_log.jsonl)\n');
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`${pad('배치(초안)', 34)} 생성  편입  스킵  채택률  수정  모델`);
    for (const b of batches) {
        const rate = b.generated ? `${Math.round(100 * b.applied / b.generated)}%` : '-';
        console.log(`${pad(b.draft, 34)} ${pad(b.generated, 4)}  ${pad(b.applied, 4)}  ${pad(b.skipped, 4)}  ${pad(rate, 5)}  ${b.edited === undefined ? '-' : (b.edited ? 'yes' : 'no')}   ${b.model || '-'}`);
    }
    console.log(`\n합계: 배치 ${total.batches}건 · 생성 ${total.generated} · 편입 ${total.applied}`
        + ` · 스킵 ${total.skipped} · 채택률 ${Math.round(100 * total.adoptionRate)}%`
        + ` · 리뷰수정 배치 ${total.edited}/${total.batches}`);
    console.log('※ 분모는 리뷰 통과 엔트리 — 리뷰 단계 폐기분(블록 삭제)은 미집계.'
        + ' 승격 판단은 설계 §3.1에 따라 연속 배치 추세로 결정');
}

if (require.main === module) main();

module.exports = { summarize };
