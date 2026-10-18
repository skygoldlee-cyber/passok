#!/usr/bin/env node
/**
 * citations.js — 인용(file#LNN) 해석·근거 구절 추출
 * @spec AI-03
 *
 * 생성 초안의 인용을 실제 파일 라인으로 해석하는 공용 유틸.
 * grounded generation 원칙(설계 §4): 컨텍스트는 교재/ref_md 실제 라인만 투입한다.
 */

'use strict';

const fs = require('fs');

const fileCache = new Map();

function readLines(absPath) {
    if (!fileCache.has(absPath)) {
        fileCache.set(absPath, fs.existsSync(absPath)
            ? fs.readFileSync(absPath, 'utf-8').split(/\r?\n/) : null);
    }
    return fileCache.get(absPath);
}

/** 특정 라인 ±context 만큼의 텍스트를 반환. 없으면 null */
function readContext(absPath, lineNo, context = 3) {
    const lines = readLines(absPath);
    if (!lines) return null;
    const from = Math.max(0, lineNo - 1 - context);
    const to = Math.min(lines.length, lineNo + context);
    return {
        line: lines[lineNo - 1] || '',
        text: lines.slice(from, to).join('\n'),
        from: from + 1,
        to,
        total: lines.length,
    };
}

/** 인용 대상 파일이 존재하고 라인이 범위 내인가 (생성기 자기검증용, 설계 §3.1) */
function citationValid(absPath, lineNo) {
    const lines = readLines(absPath);
    return !!lines && lineNo >= 1 && lineNo <= lines.length;
}

/** md 본문에서 인용 링크 전수 추출 — [{label, file, lineNo}] */
function extractLinks(text) {
    const out = [];
    const re = /\[([^\]]*?)\bL(\d+)\]\(<([^>]+\.md)#L(\d+)>\)/g;
    for (const m of text.matchAll(re)) {
        out.push({ label: m[1].trim(), line: Number(m[2]), file: m[3], lineNo: Number(m[4]) });
    }
    return out;
}

module.exports = { readLines, readContext, citationValid, extractLinks };
