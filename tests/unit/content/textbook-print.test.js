// tests/unit/content/textbook-print.test.js — 교재 인쇄 QR 칩 주입
// @spec DR-09
// 표준형 교재 절 말미 개념 문항 QR 주입 — 0문 절 생략·문항 수 표기·절 경계 배치 검증

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const _tmpDirs = [];
after(() => { for (const d of _tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
function tmpDir(prefix) { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); _tmpDirs.push(d); return d; }

const require = createRequire(import.meta.url);
const { injectQrChips, qrChipHtml, countQuestionsByAnchor } =
    require('../../../tools/build/build_textbook_print.js');
const { anchorBoundariesOf, anchorAt } = require('../../../tools/build/textbook_anchors.js');

const TEXTBOOK = [
    '# 1과목 표준형',
    '',
    '## 목차',
    '- Chap1',
    '',
    '## 📚 Chapter 01. 개론',
    '도입 문단',
    '## 1. 첫째 절',
    '본문 A',
    '## 2. 둘째 절',
    '본문 B',
    '## 📚 Chapter 02. 심화',
    '## 1. 심화 절',
    '본문 C',
    '',
    ':::page',
].join('\n');

const fakeQr = url => `QR<${url}>`;

test('injectQrChips: 절 말미에 QR 칩, 문항 수·딥링크 포함', () => {
    const { md, chips } = injectQrChips(TEXTBOOK, {
        countFor: () => 3,
        qrPngB64: fakeQr,
    });
    assert.equal(chips.length, 3);
    assert.deepEqual(chips.map(c => c.cid), ['1.1', '1.2', '2.1']);
    assert.ok(md.includes('이 절 문항 3개 풀기'));
    assert.ok(md.includes('QR<https://passok.vercel.app/#/trainer/concept/1.1>'));
    // 칩이 다음 ## 헤딩 직전(절 말미)에 배치된다
    const i1 = md.indexOf('concept/1.1'), i2 = md.indexOf('## 2. 둘째 절');
    assert.ok(i1 < i2);
});

test('injectQrChips: 0문 절은 칩 생략', () => {
    const { md, chips, skipped } = injectQrChips(TEXTBOOK, {
        countFor: cid => (cid === '1.2' ? 5 : 0),
        qrPngB64: fakeQr,
    });
    assert.deepEqual(chips.map(c => c.cid), ['1.2']);
    assert.deepEqual(skipped.map(c => c.cid), ['1.1', '2.1']);
    assert.ok(!md.includes('concept/1.1'));
    assert.ok(md.includes('concept/1.2'));
});

test('injectQrChips: 비번호 ## 헤딩은 장 컨텍스트 해제 — 표지·목차에 칩 없음', () => {
    const md = ['## 제목', '## 1. 번호절(장 없음)', '본문', '## 📚 Chapter 03. 장', '## 1. 절', '본문'].join('\n');
    const { chips } = injectQrChips(md, { countFor: () => 1, qrPngB64: fakeQr });
    assert.deepEqual(chips.map(c => c.cid), ['3.1']); // 장 없는 "## 1."은 무시
});

test('injectQrChips: :::page 펜스는 절 경계 판정에서 칩 뒤로 — 칩이 펜스 앞에 온다', () => {
    const { md } = injectQrChips(TEXTBOOK, { countFor: () => 1, qrPngB64: fakeQr });
    const qr = md.indexOf('concept/2.1'), page = md.indexOf(':::page');
    assert.ok(qr > -1 && page > -1 && qr < page, '칩이 :::page보다 앞(절 본문 말미)');
});

test('qrChipHtml: 문항 수·cid·앵커·분할 방지 속성', () => {
    const html = qrChipHtml('2.3', '3. 노인학대', 7, 'BASE64');
    assert.ok(html.includes('이 절 문항 7개'));
    assert.ok(html.includes('§2.3'));
    assert.ok(html.includes('data-cid="2.3"'));
    assert.ok(html.includes('page-break-inside:avoid'));
    assert.ok(html.includes('BASE64'));
});

test('countQuestionsByAnchor: Q블록 첫 교재 인용 → 파일·앵커별 집계, 참조자료·중복 인용 제외', () => {
    const dir = tmpDir('qr-bank-');
    const book = path.join(dir, '교재.md');
    fs.writeFileSync(book, TEXTBOOK, 'utf8');
    const bounds = anchorBoundariesOf(book);
    const resolve = (abs, line) => (abs === book ? anchorAt(bounds, line) : null);
    const bank = [
        '**Q1.** 문제1',
        '[교재](<./교재.md#L9>)',         // → 1.1 (## 1. 첫째 절 구간)
        '**Q2.** 문제2',
        '[교재](<./교재.md#L9>)',         // → 1.1 (중복 문항은 별도 집계)
        '[교재](<./교재.md#L11>)',        // → 1.2 — 같은 문항의 두 절 인용은 둘 다 집계
        '**Q3.** 문제3',
        '[참조](<./참조자료/ref.md#L5>)',  // 교재 아님 — 제외
        '**Q4.** 문제4',
        '[교재](<./교재.md#L11>)',
        '[교재](<./교재.md#L11>)',        // 같은 절 중복 인용 — 1회
    ].join('\n');
    const counts = countQuestionsByAnchor(bank, dir, resolve);
    const m = counts.get(book);
    assert.equal(m.get('1.1').size, 2);   // Q1, Q2
    assert.equal(m.get('1.2').size, 2);   // Q2(두 번째 인용), Q4 — Q4의 중복 인용은 1회
    assert.equal(m.get('2.1'), undefined); // Q3은 교재 인용 없음
});
