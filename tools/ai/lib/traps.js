#!/usr/bin/env node
/**
 * traps.js — 문항 함정 유형(trap) 규칙 추론 (AI-39, DOC-DSN-52 Phase 3)
 * @spec AI-39
 *
 * 어휘 정본은 src/content/questions.js의 TRAP_TAGS — 이 모듈은 후보만 제안하고
 * 최종 태깅은 사람 리뷰(tmp/ai_drafts 초안 → --write 편입)로 확정한다.
 *
 * 규칙 커버: 수치바꿔치기·절대표현·예외조항·유사용어혼동(선지 유사도).
 * 주어치환은 발문-선지 의미 대조가 필요해 규칙 비검출 — LLM 초안 영역.
 */

'use strict';

const { TRAP_TAGS } = require('../../../src/content/questions.js');
const { lexSim } = require('./similarity.js');

const ABSOLUTE_RE = /항상|모든|모두|반드시|절대|무조건|전부|어떤 경우|누구나|유일/;
const EXCEPT_RE = /예외|제외|다만|~에 한하|에 한해/;
const SIM_THRESHOLD = 0.45; // 선지 쌍 bigram Jaccard — 유사용어 혼동 후보 기준

/** 숫자 토큰 마스킹 — 숫자만 다른 선지 감지용 (소수점·천단위 콤마 포함) */
function numMask(s) {
    return String(s).replace(/\d[\d,.]*/g, '#');
}

/**
 * 문항의 함정 유형 후보 추론 (규칙 — 결정론).
 * @param {{stem:string, options:{n:number,text:string}[], type:string}} q
 * @param {number|null} answerNum 정답 선지 번호 (①=1, ②=2 …)
 * @returns {{tag:string, basis:string}[]} 후보 목록 (중복 없음)
 */
function inferTrapCandidates(q, answerNum) {
    const out = [];
    const push = (tag, basis) => { if (!out.some(r => r.tag === tag)) out.push({ tag, basis }); };
    if (!q || q.type !== 'choice' || !(q.options || []).length) return out;

    const opts = q.options;
    const answer = opts.find(o => o.n === answerNum) || null;
    const wrongs = opts.filter(o => o !== answer);

    // 수치바꿔치기 — 오지가 정답 선지와 숫자만 다름 (마스크 동일 + 정답에 숫자 존재)
    if (answer && /\d/.test(answer.text)
        && wrongs.some(w => w.text !== answer.text && numMask(w.text) === numMask(answer.text))) {
        push('수치바꿔치기', '정답 선지와 숫자만 다른 오지');
    }

    // 절대표현 — 정답 선지엔 없고 오지에만 절대 화행이 있는 구조가 함정 전형
    if (wrongs.some(w => ABSOLUTE_RE.test(w.text)) && !(answer && ABSOLUTE_RE.test(answer.text))) {
        push('절대표현', '오지에만 절대 화행(항상·모두·반드시 등)');
    }

    // 예외조항 — 발문·오지의 예외·단서 표현
    if (EXCEPT_RE.test(q.stem) || wrongs.some(w => EXCEPT_RE.test(w.text))) {
        push('예외조항', '예외·단서 표현 포함');
    }

    // 유사용어혼동 — 선지 쌍의 어휘 유사도가 임계 이상 (핵심 용어만 다른 유사 선지)
    let simPair = null;
    for (let i = 0; i < opts.length && !simPair; i++) {
        for (let j = i + 1; j < opts.length; j++) {
            const a = opts[i].text, b = opts[j].text;
            if (!a || !b || a === b) continue;
            const sim = lexSim(a, b);
            if (sim >= SIM_THRESHOLD) { simPair = { a: opts[i].n, b: opts[j].n, sim }; break; }
        }
    }
    if (simPair) {
        push('유사용어혼동', `선지 ${simPair.a}·${simPair.b} 유사도 ${(simPair.sim * 100).toFixed(0)}%`);
    }

    return out.filter(r => TRAP_TAGS.includes(r.tag));
}

module.exports = { inferTrapCandidates, numMask, ABSOLUTE_RE, EXCEPT_RE, SIM_THRESHOLD };
