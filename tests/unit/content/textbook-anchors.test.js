// tests/unit/textbook-anchors.test.js — 교재 라인 → §앵커 해석 헬퍼
// @spec AN-10
// conceptId의 라인 좌표(L####) 의존 제거 — 구조 앵커(N.M)로의 해석 정확성 검증

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { anchorBoundariesOf, anchorAt, parseCitationTarget } =
    require('../../../tools/build/textbook_anchors.js');

const SAMPLE = [
    '# 과목 교재',                          // L1
    '본문 서두',                            // L2
    '## 📚 Chapter 01. 화장품법의 이해',     // L3
    '챕터 도입 문단',                        // L4
    '## 1. 화장품법의 목적',                 // L5
    '본문',                                // L6
    '### 1.1 세부',                        // L7 — ####/##### 하위 헤딩은 앵커 무시
    '## 2. 화장품의 정의',                  // L8
    '본문',                                // L9
    '## 📚 Chapter 02. 개인정보 보호법',     // L10
    '## 1. 고객관리 프로그램',               // L11 — 절 번호 리셋
    '본문',                                // L12
].join('\n');

function fixture() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-'));
    const file = path.join(dir, '교재.md');
    fs.writeFileSync(file, SAMPLE, 'utf8');
    return file;
}

test('anchorBoundariesOf: 챕터·절 헤딩이 경계, 번호는 챕터별 리셋', () => {
    const b = anchorBoundariesOf(fixture());
    assert.deepEqual(b, [[3, '1.0'], [5, '1.1'], [8, '1.2'], [10, '2.0'], [11, '2.1']]);
});

test('anchorAt: 라인 → 소속 앵커 (경계 이전·사이·끝)', () => {
    const b = anchorBoundariesOf(fixture());
    assert.equal(anchorAt(b, 1), null);    // 첫 헤딩 이전
    assert.equal(anchorAt(b, 4), '1.0');   // 챕터 도입부
    assert.equal(anchorAt(b, 6), '1.1');   // ## 1. 구간
    assert.equal(anchorAt(b, 7), '1.1');   // ### 하위 헤딩은 상위 절 유지
    assert.equal(anchorAt(b, 9), '1.2');
    assert.equal(anchorAt(b, 12), '2.1');  // 챕터2 절1 — "2.1"이지 "1.1" 아님
});

test('anchorAt: 라인 시프트에 무관 — 구조만 같으면 같은 앵커', () => {
    // L6 위치의 본문이 라인이 밀려도(L106) 같은 절이면 앵커 동일 — 핵심 요구사항
    const b = anchorBoundariesOf(fixture());
    assert.equal(anchorAt(b, 6), anchorAt(b, 7)); // ### 삽입으로 밀린 라인도 동일 앵커
});

test('anchorBoundariesOf: 파일 없음 → 빈 경계', () => {
    assert.deepEqual(anchorBoundariesOf('/nonexistent/path.md'), []);
});

test('parseCitationTarget: 교재 링크만 해석 — 참조자료 제외', () => {
    assert.deepEqual(parseCitationTarget('../교재/law/과목1.md#L314'), { file: '../교재/law/과목1.md', line: 314 });
    assert.equal(parseCitationTarget('../참조자료/ref_md/법령.md#L10'), null);
    assert.equal(parseCitationTarget('../교재/law/과목1.md'), null); // 라인 없음
    assert.equal(parseCitationTarget(''), null);
});
