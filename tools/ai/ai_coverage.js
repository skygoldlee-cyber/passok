#!/usr/bin/env node
/**
 * ai_coverage.js — 출제 커버리지 갭 분석
 * @spec AI-11,AI-13
 *
 * 사용법:
 *   node tools/ai/ai_coverage.js [--exam cosmetic] [--min-gap 40]
 *
 * - 문제은행 인용(file#LNN)을 교재 라인에 매핑해 과목별 인용 커버율 산출
 * - 인용이 없는 교재 섹션(##/### 헤딩 청크)을 "미출제 구간"으로 리포트
 *   → ai:draft의 투입 범위(--lines) 결정 근거
 *
 * 산출물: tmp/ai_drafts/coverage_<id>.md
 */

'use strict';

const path = require('path');
const { parseArgs, getTargets, listQbanks, writeDraft } = require('./lib/ai_common.js');
const { parseQuestionBank } = require('./lib/qbank.js');
const { listTextbooks, chunkTextbook } = require('./lib/textbook.js');
const { readLines } = require('./lib/citations.js');

function main() {
    const { opts } = parseArgs();

    for (const target of getTargets(opts)) {
        // 1) 문제은행 인용을 대상 파일별 라인 집합으로 수집
        const citedByFile = new Map(); // absPath → Set<lineNo>
        for (const { absPath } of listQbanks(target)) {
            const { answers } = parseQuestionBank(absPath);
            for (const ans of answers.values()) {
                for (const cit of ans.citations) {
                    const abs = path.resolve(path.dirname(absPath), cit.file);
                    if (!citedByFile.has(abs)) citedByFile.set(abs, new Set());
                    // 인용 라인 ±5를 커버로 간주 (표·단락 단위 출제 특성)
                    for (let d = -5; d <= 5; d++) citedByFile.get(abs).add(cit.lineNo + d);
                }
            }
        }

        // 2) 교재별 커버율 + 미출제 섹션
        const lines = [`# 출제 커버리지 갭 — ${target.id}`, ''];
        for (const book of listTextbooks(target)) {
            const cited = citedByFile.get(book.absPath) || new Set();
            const total = (readLines(book.absPath) || []).length;
            let covered = 0;
            for (const l of cited) if (l >= 1 && l <= total) covered++;
            const chunks = chunkTextbook(book.absPath);
            // 메타 섹션(목차·마인드맵·요약·확인문제 등 학습 보조)은 출제 갭이 아니므로 제외
            const META_RE = /목차|마인드맵|학습 (아이콘|목표|흐름|지도)|요약|확인문제|지도|암기 축|핵심|가이드|아이콘|전체 지도|🧭|🚀|📋|🗺️|📌|✅/;
            const gaps = chunks.filter(c => {
                if (META_RE.test(c.heading)) return false;
                for (let l = c.startLine; l <= c.endLine; l++) if (cited.has(l)) return false;
                return true; // 인용이 한 줄도 없는 섹션
            });
            lines.push(`## ${book.subjectName} — ${book.file}`,
                `- 전체 ${total}라인 · 인용 커버 ${covered}라인 (${total ? (covered / total * 100).toFixed(1) : 0}%)`,
                `- 미출제 섹션 ${gaps.length}개 / 전체 ${chunks.length}개`, '');
            for (const g of gaps.slice(0, 30)) {
                lines.push(`  - L${g.startLine}~L${g.endLine} · ${g.heading}`);
            }
            lines.push('');
        }
        const out = writeDraft(`${target.id}/coverage_${target.id}.md`, lines, { model: 'analysis' });
        console.log(`${target.id}: 커버리지 리포트 → ${out}`);
    }
}

if (require.main === module) main();

module.exports = {};
