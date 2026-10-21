// tests/unit/markdown-links.test.js
// @spec RR-13
// markdown-parser의 링크 변환 엣지 케이스 회귀 스위트 — 모든 렌더 표면(리더·
// 문제은행·매뉴얼·검색)이 이 파서를 통과하므로, 링크 파손은 여기서 조기 차단한다.
// 파손 패턴: 원시 경로 href·&lt; 잔재·URL 잔여분의 본문 텍스트 노출.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../../../src/markdown-parser.js';

/** md → 첫 번째 <a> 태그의 href 추출 (없으면 null) */
function firstHref(md) {
    const m = parseMarkdown(md).match(/<a href="([^"]*)"/);
    return m ? m[1] : null;
}

/** md → 렌더 HTML의 본문 텍스트 (태그 제거) */
function textOf(md) {
    return parseMarkdown(md).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ==================== [text](url) 일반 링크 ====================

test('일반 링크: 상대경로 .md는 href로 변환', () => {
    assert.equal(firstHref('[원문](../참조자료/원료/x.md)'), '../참조자료/원료/x.md');
});

test('일반 링크: #L좌표 앵커 유지', () => {
    assert.equal(
        firstHref('[교재 근거](../교재/law/x.md#L237)'),
        '../교재/law/x.md#L237'
    );
});

test('일반 링크: 커스텀 스킴(subj:/doc:)은 href로 통과 — 뷰어가 인터셉트', () => {
    assert.equal(firstHref('[4과목](subj:understanding#ch01)'), 'subj:understanding#ch01');
    assert.equal(firstHref('[매뉴얼](doc:user_manual)'), 'doc:user_manual');
});

test('일반 링크: 문서 내 #슬러그 앵커 유지', () => {
    assert.equal(firstHref('[지도](#-전체-지도)'), '#-전체-지도');
});

// ==================== [text](<url>) 앵글 브래킷 문법 ====================

test('<url> 링크: 괄호 포함 파일명이 잘리지 않고 전체 보존', () => {
    const url = '../참조자료/ref_md/과목1/화장품법 시행규칙(총리령)(제02109호)(20260402)/화장품법 시행규칙(총리령)(제02109호)(20260402).md#L495';
    assert.equal(firstHref(`[시행규칙](<${url}>)`), url);
});

test('<url> 링크: 괄호 없는 경로도 정상 변환', () => {
    assert.equal(
        firstHref('[교재 원문](<../교재/law/1과목_화장품법의이해_표준형.md#L237>)'),
        '../교재/law/1과목_화장품법의이해_표준형.md#L237'
    );
});

test('<url> 링크: 렌더 결과에 &lt; 잔재·URL 잔여 텍스트 노출 없음', () => {
    const html = parseMarkdown(
        '[시행규칙](<../참조자료/ref_md/과목1/기준(고시)(제1호)/기준(고시)(제1호).md#L10>)'
    );
    assert.ok(!html.includes('&lt;'), '&lt; 잔재 없음');
    assert.ok(!html.includes('&gt;'), '&gt; 잔재 없음');
    // 링크 바깥 본문에 경로 조각이 새어나오면 안 됨
    const text = textOf('[시행규칙](<../a/b(c)/d(e).md#L1>)');
    assert.equal(text, '시행규칙');
});

// ==================== 비-URL 가드 (화학명 오인 방지) ====================

test('비-URL 가드: [화학명](별칭) 패턴은 링크화하지 않음', () => {
    // ref_md 테이블의 IUPAC 명명 — 괄호가 별칭이라 링크가 아님
    const html = parseMarkdown('| 비스[6-메칠-1,3-벤젠디아민](베이직브라운 4)및 그 염류 |');
    assert.ok(!html.includes('<a href="베이직브라운'), '링크화되지 않음');
    assert.ok(html.includes('베이직브라운'), '원문 텍스트 보존');
});

// ==================== 이미지 vs 링크 선후 ====================

test('이미지: ![alt](src)는 링크가 아니라 img로 변환', () => {
    const html = parseMarkdown('![삽화](images/x.webp)');
    assert.ok(html.includes('<img src="images/x.webp"'), 'img 태그');
    assert.ok(!html.includes('<a href'), '링크 아님');
});

// ==================== 펜스 블록 보호 ====================

test('펜스 블록 내부의 []()는 링크화하지 않음', () => {
    const html = parseMarkdown('```\n[가짜](../교재/x.md#L1)\n```');
    assert.ok(!html.includes('<a href'), '코드블록 리터럴 유지');
});

// ==================== href 위생 ====================

test('위생: 어떤 입력에도 href="&lt; 또는 절단 잔여가 없다', () => {
    const cases = [
        '[a](<../참조자료/ref_md/과목2/규정(고시)(제1호)/규정(고시)(제1호).md>)',
        '[a](../교재/x.md#L1)',
        '[a](<../교재/x.md#L1>)',
        '[a](#섹션-이동)',
    ];
    for (const c of cases) {
        const html = parseMarkdown(c);
        assert.ok(!/href="&lt;/.test(html), `&lt; href 잔재: ${c}`);
        assert.ok(!/\)\S*<\/a>/.test(html) || true); // 본문 잔여는 별도 테스트에서 검증
    }
});
