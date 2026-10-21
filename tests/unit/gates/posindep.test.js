// tests/unit/posindep.test.js — check_position_independence.js 탐지 규칙 검증
// @spec ID-05
// 교재 위치 좌표(라인·인덱스)를 식별자·영속 키로 쓰는 패턴의
// 탐지·오탐 경계 검증 — 콘텐츠 기반 식별자와 표시층 라인 참조는 통과.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { scanLine } = require('../../../tools/check/check_position_independence.js');

const rules = (line) => scanLine(line).map(h => h.rule);

describe('ID-05 R1 — 식별자·키 lvalue 위치 좌표 탐지', () => {

    test('라인 리터럴 식별자 → R1', () => {
        assert.deepEqual(rules(`  const cid = 'L' + lineNo;`), ['R1']);
        // bare 리터럴은 R2, 식별자 대입은 R1 — 동시 부합도 정확
        assert.deepEqual(rules(`  item.conceptId = \`L\${line}\`;`), ['R2', 'R1']);
        assert.deepEqual(rules(`  weak.id = 'L314';`), ['R2', 'R1']);
    });

    test('위치 변수 보간·연결 → R1', () => {
        assert.deepEqual(rules(`  const bookmarkKey = \`\${subjId}_\${chapterIdx}_\${sectionIdx}\`;`), ['R1']);
        assert.deepEqual(rules(`  const key = subjId + ':' + chapterIdx;`), ['R1']);
        assert.deepEqual(rules(`  q.id = \`integrated_q\${index + 1}\`;`), ['R1']);
        assert.deepEqual(rules(`  const itemId = \`pos_\${scrollTop}\`;`), ['R1']);
        // 객체 리터럴 속성도 식별자 대입
        assert.deepEqual(rules(`  save({ key: \`ch\${sectionIdx}\` });`), ['R1']);
    });

    test('콘텐츠 기반 식별자 → 무위반', () => {
        assert.deepEqual(rules(`  const sid = stableId(qid + '|' + stmtText);`), []);
        assert.deepEqual(rules(`  const bookmarkKey = bookmarkKeyOf(subjId, chKey, title);`), []);
        assert.deepEqual(rules(`  const key = \`\${subjId}|\${chapterKey}|\${sectionTitle}\`;`), []);
        // 앵커·qid·날짜·문항 id는 위치 좌표 아님
        assert.deepEqual(rules(`  const cid = '§' + anchor;`), []);
        assert.deepEqual(rules(`  const id = \`q_\${qid}\`;`), []);
    });

    test('마크업 속성 id= → R1 오탐 없음', () => {
        assert.deepEqual(rules(`  html += \`<button id="b" data-args='["\${subjId}", \${chapterIdx}]'>\`;`), []);
        assert.deepEqual(rules(`  const s = \`<span data-md-line="\${lineNo}">x</span>\`;`), []);
    });

    test('cache 계열 lvalue → 세션 캐시 관례로 무위반', () => {
        assert.deepEqual(rules(`  const cacheKey = \`\${subjId}:\${chapterIdx}\`;`), []);
    });
});

describe('ID-05 R2 — bare 라인-id 리터럴', () => {

    test('라인-id 리터럴 → R2', () => {
        assert.deepEqual(rules(`  const tag = 'L0314';`), ['R2']);
        assert.deepEqual(rules(`  const s = \`L\${lineNum}로 이동\`;`), ['R2']);
    });

    test('표시용 접두(#L·괄호·태그) → 무위반', () => {
        assert.deepEqual(rules(`  const href = '#L' + lineNum;`), []);
        assert.deepEqual(rules(`  const t = ' (L' + lineNum + ')';`), []);
        assert.deepEqual(rules(`  const el = \`>L\${lineNo}</sup>\`;`), []);
        // 마이그레이션·파싱 독자의 L\d 정규식은 생성이 아님
        assert.deepEqual(rules(`  const m = s.match(/^L(\\d+)$/);`), []);
    });
});

describe('ID-05 R3 — 영속 저장 키 위치 변수', () => {

    test('저장 호출 키 인자 위치 변수 → R3', () => {
        assert.deepEqual(rules(`  safeSetItem(\`pos_\${subjId}_\${chapterIdx}\`, v);`), ['R3']);
        assert.deepEqual(rules(`  localStorage.setItem(\`scroll_\${scrollTop}\`, '1');`), ['R3']);
        assert.deepEqual(rules(`  setJSON(\`bk_\${sectionIdx}\`, data);`), ['R3']);
    });

    test('콘텐츠 키 저장 → 무위반', () => {
        assert.deepEqual(rules(`  safeSetItem(\`bk_\${subjId}|\${chKey}|\${title}\`, v);`), []);
        assert.deepEqual(rules(`  safeSetJSON('readerBookmarks', bookmarks);`), []);
    });
});
