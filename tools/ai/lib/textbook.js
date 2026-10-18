#!/usr/bin/env node
/**
 * textbook.js — 교재 md 로딩·섹션 청크 분할
 * @spec AI-05,AI-11
 *
 * manifest.subjects[].chapters[]의 표준형 교재를 섹션(##/### 헤딩) 단위로
 * 청크 분할해 LLM 컨텍스트·커버리지 분석의 단위로 쓴다.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./ai_common');

/** 시험 대상의 표준형 교재 목록 → [{subjectKey, subjectName, file, absPath}] */
function listTextbooks(target) {
    const out = [];
    for (const s of target.manifest.subjects || []) {
        for (const ch of s.chapters || []) {
            if (!ch.file) continue;
            const absPath = path.join(ROOT, target.contentRoot, s.dir, ch.file);
            if (fs.existsSync(absPath)) {
                out.push({ subjectKey: s.key, subjectName: s.name, order: s.order, file: ch.file, absPath });
            }
        }
    }
    return out;
}

/**
 * 교재 md를 헤딩(##/###) 경계로 청크 분할.
 * @returns {Array<{heading, startLine, endLine, text}>}  (1-based 라인 번호 — LNN 인용과 동일 체계)
 */
function chunkTextbook(absPath) {
    const lines = fs.readFileSync(absPath, 'utf-8').split(/\r?\n/);
    const chunks = [];
    let cur = { heading: '(서두)', startLine: 1, buf: [] };
    for (let i = 0; i < lines.length; i++) {
        const h = lines[i].match(/^(#{2,3})\s+(.+)$/);
        if (h) {
            chunks.push(fin(cur, i));
            cur = { heading: h[2].trim(), startLine: i + 2, buf: [] }; // buf는 헤딩 다음 라인부터 — startLine은 첫 본문 라인
        } else cur.buf.push(lines[i]);
    }
    chunks.push(fin(cur, lines.length));
    return chunks.filter(c => c.text.trim().length > 0);

    function fin(c, endExclusive) {
        return { heading: c.heading, startLine: c.startLine, endLine: endExclusive, text: c.buf.join('\n') };
    }
}

module.exports = { listTextbooks, chunkTextbook };
