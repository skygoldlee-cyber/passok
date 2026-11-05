// @spec none — 웹툰 버블 뷰 파서 테스트
// tests/unit/content/care-webtoon.test.js — 웹툰 버블 뷰 파서 단위 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { _parse, _who } from '../../../src/exams/carework/views/care-webtoon.js';

test('_parse: story:start 블록 → 씬 + 대사/지문 분리', () => {
    const md = 'pre\n<!-- story:start -->\n**제목**\n"선임님, 왜요?"\n지문입니다.\n<!-- story:end -->\npost';
    const s = _parse(md);
    assert.equal(s.length, 1);
    assert.deepEqual(s[0].beats.map(b => b.t), ['scene', 'line', 'scene']);
    assert.equal(s[0].beats[1].text, '선임님, 왜요?');
});

test('_who: 화자 추정 — 선임님 호출=미영, 미영 언급=선임, 무표지=교대', () => {
    assert.equal(_who('선임님, 이건 왜요?', null), 'miyoung');
    assert.equal(_who('미영 씨, 그건요', null), 'mentor');
    assert.equal(_who('그래서 그렇게 해요', 'mentor'), 'miyoung');
    assert.equal(_who('그래서 그렇게 해요', 'miyoung'), 'mentor');
});
