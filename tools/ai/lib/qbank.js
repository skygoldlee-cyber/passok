#!/usr/bin/env node
/**
 * qbank.js — 문제은행 MD 파서 (AI 제작 도구용)
 * @spec AI-01,AI-03
 *
 * 문제은행 포맷 (CONTENT_WORKFLOW·TEXTBOOK_AUTHORING_GUIDE 규약):
 *   문제 블록: `### Q{n}. 발문` + ①~⑤ 선지 (단답형은 선지 없음)
 *   정답 블록: 파일 말미 `**Q{n}.**` → `> **정답: X** [라벨](<path#Lnnn>)`
 *             + `> **허용 정답:** …` + `> **📖 … 근거 (링크):**` 인용문
 *             + `> **해설**: …` (없으면 ai:explain 대상)
 *
 * AI 생성물도 동일 포맷을 따라야 파서·게이트 변경이 불필요하다 (설계 §4 공통 제약).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// [라벨 ... L####](<path#L####>) — sync_citation_lines.js와 동일 규격
const CITATION_RE = /\[([^\]]*?)\bL(\d+)\]\(<([^>]+\.md)#L(\d+)>\)/g;

const OPTION_RE = /^([①②③④⑤⑥⑦⑧⑨⑩])\s*(.*)$/;
const CIRCLED = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10 };

/**
 * 문제은행 md를 파싱한다.
 * @returns {{questions:Array, answers:Map<number,object>}}
 *   questions[]: {num, stem, options:[{n,text}], type:'choice'|'short', lineNo}
 *   answers: num → {answer, answerNum|null, accepts[], citations:[{label,line,file,lineNo}], explain|null}
 */
function parseQuestionBank(mdPath) {
    const lines = fs.readFileSync(mdPath, 'utf-8').split(/\r?\n/);
    const questions = [];
    const answers = new Map();

    // ── 1) 문제 블록 ──
    let cur = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const qm = line.match(/^###\s*Q(\d+)\.\s*(.*)$/);
        if (qm) {
            if (cur) questions.push(cur);
            cur = { num: Number(qm[1]), stem: qm[2].trim(), options: [], lineNo: i + 1 };
            continue;
        }
        if (!cur) continue;
        if (line.startsWith('**Q')) { questions.push(cur); cur = null; break; } // 정답 섹션 진입
        const om = line.match(OPTION_RE);
        if (om) cur.options.push({ n: CIRCLED[om[1]], text: om[2].trim() });
        else if (line.trim() && !line.startsWith('---') && !line.startsWith('##')) cur.stem += ' ' + line.trim();
    }
    if (cur && !questions.includes(cur)) questions.push(cur);
    for (const q of questions) q.type = q.options.length ? 'choice' : 'short';

    // ── 2) 정답 블록 ──
    let ans = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const am = line.match(/^\*\*Q(\d+)\.\*\*\s*$/);
        if (am) {
            ans = { answer: null, answerNum: null, accepts: [], citations: [], explain: null };
            answers.set(Number(am[1]), ans);
            continue;
        }
        if (!ans) continue;
        // 다음 문항 헤딩·섹션 경계에서 종료하지 않고 끝까지 누적 (블록이 띄어 쓰여도 허용)
        const amAns = line.match(/>\s*\*\*정답:\s*(.+?)\*\*/);
        if (amAns) {
            ans.answer = amAns[1].trim();
            const num = ans.answer.match(/^([①②③④⑤⑥⑦⑧⑨⑩]|\d+)/);
            if (num) ans.answerNum = CIRCLED[num[1]] || Number(num[1]);
        }
        const amAcc = line.match(/>\s*\*\*허용 정답:\*\*\s*(.+)$/);
        if (amAcc) ans.accepts = amAcc[1].split(/[,，]/).map(s => s.trim()).filter(Boolean);
        for (const m of line.matchAll(CITATION_RE)) {
            ans.citations.push({ label: m[1].trim(), line: Number(m[2]), file: m[3], lineNo: Number(m[4]) });
        }
        const amEx = line.match(/\*\*해설\*\*\s*[:：]\s*(.+)$/);
        if (amEx) ans.explain = amEx[1].trim();
    }

    return { questions, answers };
}

/** 문항의 유사도 비교용 텍스트 (발문 + 선지) */
function questionText(q) {
    return [q.stem, ...q.options.map(o => o.text)].join(' ');
}

/** 정답 블록의 첫 인용 (근거 대표) */
function primaryCitation(ans) {
    return ans && ans.citations.length ? ans.citations[0] : null;
}

/** 인용 링크를 문제은행 기준 절대 경로로 해석 */
function resolveCitation(qbankPath, file) {
    return path.resolve(path.dirname(qbankPath), file.replace(/^\.\//, ''));
}

module.exports = { parseQuestionBank, questionText, primaryCitation, resolveCitation, CITATION_RE };
