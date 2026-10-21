// tests/unit/check-meta-sections.test.js — 메타 섹션 규약 체커 검증
// @spec TS-17
// findMetaSuspects: 교재 ## 헤딩 중 메타 의심 키워드를 담았지만 reader-toc.js의
// isStoryMetaSection 패턴에 매칭되지 않는 헤딩을 수집 — 교재 교체 시 신규 메타
// 표기가 "렌더되는데 메타 의도"인 회귀로 검출되는지 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findMetaSuspects, diffBaselineTitles } from '../../../tools/check/check_meta_sections.js';

function fixture(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metasec-'));
    for (const [rel, text] of Object.entries(files)) {
        const p = path.join(dir, rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, text, 'utf-8');
    }
    return dir;
}

const targets = (root) => [{ id: 't1', contentRoot: path.relative(root, path.join(root, 'pack')) }];

test('TS-17 — 메타 의심 헤딩 수집: 키워드 포함 + 패턴 미매칭만 후보', () => {
    const root = fixture({
        'pack/교재/a/a_표준형.md': [
            '# 문서', '',
            '## 📚 Chapter 01. 본론', '본문', '',
            '## 📊 OOO 비교표', '표', '',        // 패턴 매칭 → 메타, 비의심
            '## ⚡ 시험 직전 체크리스트', 'x', '', // 키워드+미매칭 → 의심
            '## 1. 본문 섹션', '비교표 언급 본문', '', // 본문에 키워드 없는 제목 → 비의심
            '## 📌 용어 정리 노트', 'x', '',     // 용어 정리 키워드 → 의심
        ].join('\n'),
    });
    const sus = findMetaSuspects(targets(root), root);
    assert.deepEqual(sus.map(s => s.title), ['⚡ 시험 직전 체크리스트', '📌 용어 정리 노트']);
    assert.ok(sus.every(s => s.file.endsWith('a_표준형.md') && s.line > 0 && s.exam === 't1'));
});

test('TS-17 — Chapter 헤딩·코드펜스 내부 헤딩은 제외', () => {
    const root = fixture({
        'pack/교재/b/b_이야기형.md': [
            '## 📚 Chapter 02. 비교표의 세계', '', // Chapter 규약은 본문 챕터 — 제외
            '```', '## ✅ 확인문제 가짜', '```', '', // 펜스 내부 — 제외
            '## ✅ 확인문제', '',                 // 패턴 매칭 메타 — 제외
        ].join('\n'),
    });
    assert.deepEqual(findMetaSuspects(targets(root), root), []);
});

test('TS-17 — 기준선 diff는 신규 제목만 1회 보고', () => {
    const suspects = [
        { title: '신규A', file: 'f1', line: 1, exam: 't' },
        { title: '신규A', file: 'f1', line: 9, exam: 't' },   // 같은 제목 재등장 — 1회만
        { title: '신규B', file: 'f2', line: 3, exam: 't' },
        { title: '기존의심', file: 'f3', line: 5, exam: 't' },
    ];
    const fresh = diffBaselineTitles(suspects, ['기존의심']);
    assert.deepEqual(fresh.map(s => s.title), ['신규A', '신규B']);
});
