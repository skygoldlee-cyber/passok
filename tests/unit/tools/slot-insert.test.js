// tests/unit/tools/slot-insert.test.js — 교재 슬롯 삽입 $-패턴 회귀
// @spec none — 2026-11 fireelec 과목2 수식 훼손 사고 재발 방지
// 배경: merge_draft.js가 replace(re, "$1" + insert)로 치환 문자열을 써
//       본문의 LaTeX `$1`, `$15`, `$&`가 캡처 그룹으로 해석되어
//       절 제목이 수식 안에 끼어들고 숫자가 소실됐다.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { insertBodyIntoSlot } = require('../../../tools/ai/lib/slot_insert.js');

const DOC = [
    '## 📚 Chapter 01. 전기회로',
    '',
    '### 1. 직류회로',
    '',
    '<!-- 작성: 본문 -->',
    '',
    '### 2. 교류회로',
    '',
    '<!-- 작성: 본문 -->',
].join('\n');

describe('insertBodyIntoSlot — 치환 문자열 함정', () => {
    test('$1·$15·$&·$\' 포함 본문이 리터럴로 삽입된다', () => {
        const insert = [
            '* 줄의 법칙: 열량은 시간에 비례한다.',
            '* 휘트스톤 브리지 평형 시 $15 V$ 전원에 전류 $100\\text{mA}(0.1\\text{A})$.',
            '* 계기 오차 $1\\Omega$ 보정, 치환 패턴 $&$와 $\'`$~도 그대로.',
        ].join('\n');
        const out = insertBodyIntoSlot(DOC, '1. 직류회로', insert);
        assert.ok(out.includes('$15 V$'), '$15가 그대로여야 함');
        assert.ok(out.includes('$100\\text{mA}(0.1\\text{A})$'), '$1계 수식이 보존되어야 함');
        assert.ok(out.includes('$&$'), '$&가 리터럴이어야 함');
        // 치환 문자열 해석이 일어났다면 캡처값(슬롯 헤딩)이 본문 안에 끼어든다
        const bodyStart = out.indexOf('* 줄의 법칙');
        const bodyEnd = out.indexOf('### 2. 교류회로');
        assert.ok(!out.slice(bodyStart, bodyEnd).includes('### 1. 직류회로'),
            '본문 안에 슬롯 헤딩이 재삽입되면 안 됨');
    });

    test('슬롯 플레이스홀더는 본문으로 대체된다', () => {
        const out = insertBodyIntoSlot(DOC, '2. 교류회로', '* 3상 교류 내용');
        assert.equal(out.split('<!-- 작성: 본문 -->').length - 1, 1,
            '대상 슬롯 플레이스홀더만 소거(1개 잔존)');
        assert.ok(out.includes('### 2. 교류회로\n\n* 3상 교류 내용'), '슬롯 헤딩 직후에 본문');
        assert.ok(out.includes('### 1. 직류회로\n\n<!-- 작성: 본문 -->'), '다른 슬롯은 유지');
    });

    test('채워진 슬롯은 챕터 말미에 추가한다', () => {
        const filled = DOC.replace('<!-- 작성: 본문 -->', '* 기존 본문');
        const out = insertBodyIntoSlot(filled, '1. 직류회로', '* 신규 내용');
        assert.ok(out.includes('* 기존 본문'), '기존 본문 보존');
        const idxNew = out.indexOf('* 신규 내용');
        const idxNext = out.indexOf('### 2. 교류회로');
        assert.ok(idxNew > out.indexOf('* 기존 본문') && idxNew < idxNext,
            '신규 본문은 기존 본문 뒤·다음 슬롯 앞에 위치');
    });

    test('슬롯 헤딩이 없으면 예외', () => {
        assert.throws(() => insertBodyIntoSlot(DOC, '9. 없는슬롯', 'x'), /슬롯 헤딩 없음/);
    });
});
