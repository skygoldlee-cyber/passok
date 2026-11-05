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

test('parseStorySlots: 챕터 헤딩을 추적해 씬에 소속 챕터 부여', async () => {
    const { parseStorySlots } = await import('../../../src/reader/webtoon-render.js');
    const md = '## 📚 Chapter 10\n<!-- story:start -->\n"씬A"\n<!-- story:end -->\n## 📚 Chapter 12\n<!-- story:start -->\n"씬B"\n<!-- story:end -->';
    const s = parseStorySlots(md);
    assert.deepEqual(s.map(x => x.chapter), [10, 12]);
});

test('parseStorySlots: 장식 마커·화자명 줄 정제', async () => {
    const { parseStorySlots } = await import('../../../src/reader/webtoon-render.js');
    const md = '<!-- story:start -->\n📖 ┈┈┈┈ **이야기** ┈┈┈┈\n\n### 프롤로그\n\n박은정 선임\n"미영 씨, 처음이세요?"\n\n┈┈ **본문** ┈┈ 📘\n<!-- story:end -->';
    const s = parseStorySlots(md);
    assert.equal(s.length, 1);
    assert.deepEqual(s[0].beats.map(b => b.t), ['title', 'speaker', 'line']);
    assert.equal(s[0].beats[1].who, 'mentor');
    assert.equal(s[0].beats[2].text, '미영 씨, 처음이세요?');
    assert.equal(s[0].title, '프롤로그');
});

test('웹툰 과목 선택은 1과목이 먼저다', async () => {
    const { _books } = await import('../../../src/exams/carework/views/care-webtoon.js');
    assert.deepEqual(Object.keys(_books), ['s1', 's2']);
});

test('이야기형 원본 파일은 git 추적 대상이어야 한다', async () => {
    const { execSync } = await import('node:child_process');
    for (const f of ['content/exams/carework/교재/careprac/2과목_요양보호관련_이야기형.md',
        'content/exams/carework/교재/caretheory/1과목_요양보호론_이야기형.md']) {
        const out = execSync(`git ls-files -- "${f}"`).toString().trim();
        assert.ok(out.length > 0, `${f} 미추적 — 프로덕션 404 빈 씬 방지`);
    }
});
