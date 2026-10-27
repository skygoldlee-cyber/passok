// tests/unit/scaffold-chapter.test.js
// @spec BP-15,CS-11
// 참조자료→교재 챕터 스캐폴더 — CS-11 도출 계약 형식(출처·원문 보기·백매터 링크)의
// 결정론적 생성물과 시험별 contentRoot 해석을 검증.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChapterSkeleton, encodeRefUrl, parseArgs } from '../../../tools/build/scaffold_chapter.js';

const REFS = [
    { docName: '보험업법(법률)(제20436호)(20250131)', dirRel: '참조자료/ref_md/과목1/보험업법(법률)(제20436호)(20250131)', mdRel: '참조자료/ref_md/과목1/보험업법(법률)(제20436호)(20250131)/보험업법(법률)(제20436호)(20250131).md' },
    { docName: '보험업법 시행령(대통령령)(제36728호)(20261002)', dirRel: '참조자료/ref_md/과목1/보험업법 시행령(대통령령)(제36728호)(20261002)', mdRel: '참조자료/ref_md/과목1/보험업법 시행령(대통령령)(제36728호)(20261002)/보험업법 시행령(대통령령)(제36728호)(20261002).md' },
];

const base = { title: '1과목 보험업법', subjectNum: '1', refs: REFS, contentRoot: 'content/exams/insadj' };

test('buildChapterSkeleton: H1·챕터 수·작성 슬롯', () => {
    const md = buildChapterSkeleton(base);
    assert.ok(md.startsWith('# 📕 1과목 보험업법'));
    assert.equal((md.match(/## 📚 Chapter \d{2}\./g) || []).length, 2);
    assert.ok(md.includes('<!-- 작성: 본문 -->'), '본문 슬롯 존재');
});

test('buildChapterSkeleton: 각 챕터에 출처·원문 보기 블록 (CS-11 추적성)', () => {
    const md = buildChapterSkeleton(base);
    const srcBlocks = md.match(/> 📌 \*\*출처\*\*:/g) || [];
    const viewBlocks = md.match(/> \*\*원문 보기\*\*:/g) || [];
    assert.equal(srcBlocks.length, 2);
    assert.equal(viewBlocks.length, 2);
});

test('buildChapterSkeleton: 링크는 인코딩된 ref_md 경로 규약', () => {
    const md = buildChapterSkeleton(base);
    assert.ok(md.includes('../참조자료/ref_md/과목1/보험업법%28법률%29%28제20436호%29%2820250131%29/'), '괄호 %28/%29 인코딩');
    assert.ok(md.includes('보험업법%20시행령'), '공백 %20 인코딩');
    // 원문 괄호 미인코딩 잔재 없음 (링크 URL 내부) — insadj 규약: 꺽쇠 없는 (../참조자료/…) 형식
    const linkUrls = [...md.matchAll(/\]\((\.\.\/참조자료[^)]+)\)/g)].map(m => m[1]);
    assert.ok(linkUrls.length >= 6, '출처·원문·백매터 링크 전부 ../참조자료 형식');
    assert.ok(!md.includes('(<../참조자료'), '꺽쇠 래핑 없음');
    linkUrls.forEach(u => assert.ok(!u.includes('('), `URL 내 생괄호 없음: ${u}`));
});

test('buildChapterSkeleton: 백매터 링크 목록이 선택 ref 전량 포함', () => {
    const md = buildChapterSkeleton(base);
    const backmatter = md.split('## 📚 참조 자료 (법령 원문)')[1];
    assert.ok(backmatter, '백매터 섹션 존재');
    REFS.forEach(r => assert.ok(backmatter.includes(`${r.docName}.md`), r.docName));
    assert.ok(backmatter.includes('학습 보조용입니다'), '안내 문구 포함');
});

test('buildChapterSkeleton: 시험별 contentRoot 독립 — 동일 출력 구조', () => {
    const insadj = buildChapterSkeleton(base);
    const cosmetic = buildChapterSkeleton({ ...base, contentRoot: 'content/exams/cosmetic' });
    // 링크는 상대 경로라 contentRoot와 무관 — 출력이 동일 구조임을 확인
    assert.equal(insadj.replace(/과목1/g, 'S'), cosmetic.replace(/과목1/g, 'S'));
});

test('encodeRefUrl: 공백·괄호만 선택 인코딩', () => {
    assert.equal(encodeRefUrl('a b(c)d'), 'a%20b%28c%29d');
    assert.equal(encodeRefUrl('한글/경로.md'), '한글/경로.md');
});

test('parseArgs: 값 옵션과 플래그 구분', () => {
    const a = parseArgs(['--exam', 'insadj', '--subject', '1', '--refs', 'all', '--out', 'x.md', '--dry-run', '--force']);
    assert.equal(a.exam, 'insadj');
    assert.equal(a.subject, '1');
    assert.equal(a.refs, 'all');
    assert.equal(a.out, 'x.md');
    assert.equal(a['dry-run'], true);
    assert.equal(a.force, true);
});
