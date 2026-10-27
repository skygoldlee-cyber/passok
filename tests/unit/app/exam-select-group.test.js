// 시험 선택 뷰 그룹핑 — groupExamsForSelect 순수 함수 테스트
// @spec ES-01
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupExamsForSelect } from '../../../src/views/exam-select.js';

const e = (id, group) => ({ id, name: id, ...(group ? { group } : {}) });

test('group이 없는 목록은 null (평면 그리드 유지)', () => {
    assert.equal(groupExamsForSelect([e('a'), e('b')]), null);
});

test('group 지정 시험은 섹션으로 묶이고 미지정은 기타 맨 뒤', () => {
    const exams = [e('a'), e('b', 'IT'), e('c', 'IT'), e('d', '안전'), e('f')];
    const g = groupExamsForSelect(exams);
    assert.deepEqual(g.map(([name]) => name), ['IT', '안전', '기타']);
    assert.deepEqual(g[0][1].map(x => x.id), ['b', 'c']);
    assert.deepEqual(g[2][1].map(x => x.id), ['a', 'f']);
});

test('그룹 간 순서는 선언 순서 유지', () => {
    const exams = [e('x', '전기'), e('y', 'IT'), e('z', '전기')];
    const g = groupExamsForSelect(exams);
    assert.deepEqual(g.map(([name]) => name), ['전기', 'IT']);
});
