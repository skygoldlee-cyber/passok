// tests/unit/glossary-extract.test.js — 용어 후보 추출 리포트 검증
// @spec BP-14
// extract_glossary_candidates.js가 ref_md 코퍼스에서 정의 조항·약칭·영문 병기를
// 추출하고, GLOSSARY_INDEX 기존 항목과 대조해 신규/기존으로 분류하는지 확인한다.
// 리포트는 검토용 — 어떤 항목도 glossary JSON·synonyms에 자동 병합하지 않는다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { applyGlossaryCandidates, applySynonymCandidates } from '../../../tools/build/extract_glossary_candidates.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TOOL = join(ROOT, 'tools', 'build', 'extract_glossary_candidates.js');

// 도구 전체 실행 — 출력 리포트를 회귀 검증 대상으로 사용
const report = execFileSync(process.execPath, [TOOL], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024,
});

test('BP-14 — 리포트 헤더: 시험·파일 수·신규/기존 건수 요약', () => {
    assert.match(report, /# 용어 후보 추출 — cosmetic/);
    assert.match(report, /ref_md \d+개 \+ 교재 표준형 \d+개 파일/);
    assert.match(report, /후보 \d+건 — 신규 \d+ · 기존 용어집 \d+/);
});

test('BP-14 — 정의 조항 추출: 법령 "X"란 패턴이 용어 후보가 된다', () => {
    // 화장품법 제2조 정의 목록 — "화장품"이란 ... 형태
    assert.match(report, /\[(신규|기존)\/정의\] 화장품 /);
    // 항목 기호 정의 — "맞춤형화장품"이란 (용어집 기존 항목 → EXISTS 분류)
    assert.match(report, /\[기존\/정의\] 맞춤형화장품 /);
});

test('BP-14 — 약칭 추출: 이하 "X"라 한다 패턴', () => {
    // 화장품법 시행규칙의 약칭 정의
    assert.match(report, /\[(신규|기존)\/약칭\] 안전확보 조치 /);
});

test('BP-14 — 영문 병기 추출 + 화학식 노이즈 필터', () => {
    // 자외선차단지수(SPF) 같은 용어-약어 쌍
    assert.match(report, /\[(신규|기존)\/영문\] 자외선차단지수 = SPF/);
    // 화학식(C H O, La(NO3) 등)은 후보에서 제외 — '= C' 형태 미등장
    assert.doesNotMatch(report, /\/영문\] \S+ = [A-Z](?:\s+[A-Z][a-z]?)+\s/);
});

test('BP-14 — 후보는 출처(문서·라인)를 동반한다', () => {
    // 과목N · 문서경로:L라인 형식 — 수동 병합 검토 시 원문 대조 가능
    assert.match(report, /\(과목\d · [^)]+\.md:L\d+/);
});

test('BP-14 — 약칭 후보는 원명(fullForm)을 동반한다', () => {
    // '(이하 "화장비누"라 한다)'의 원명 '세안용 비누'를 ← 표기로 함께 출력
    assert.match(report, /\/약칭\] \S+ ← \S/);
});

test('BP-14 — 교재 표준형 스캔: ref_md 정의 희박 과목의 커버리지 보완', () => {
    // 헤더에 교재 파일 수 표기 + 교재 출처 후보 태그 존재
    assert.match(report, /ref_md \d+개 \+ 교재 표준형 \d+개 파일/);
    assert.match(report, / · 교재\)/);
});

// ==================== applySynonymCandidates (--apply-synonyms) ====================

test('BP-14 — apply-synonyms: 영문·실질 약칭을 manifest.synonyms에 병합', () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'syn-'));
    const mf = join(dir, 'manifest.json');
    fs.writeFileSync(mf, JSON.stringify({ synonyms: { '유화': ['에멀전'] } }, null, 2), 'utf-8');
    const res = applySynonymCandidates([
        { term: '자외선차단지수', pattern: '영문', status: 'NEW', english: 'SPF' },
        { term: '유화', pattern: '영문', status: 'NEW', english: '에멀전' },      // 기존 alt 중복
        { term: '징크설페이트', pattern: '영문', status: 'NEW', english: 'anhydrous' }, // 파편 제외
        { term: '화장비누', pattern: '약칭', status: 'NEW', fullForm: '세안용 비누', sameTerm: false },
        { term: '책임판매관리자', pattern: '약칭', status: 'NEW', fullForm: '책임판매관리자', sameTerm: true },
        { term: '기존용어', pattern: '영문', status: 'EXISTS', english: 'Old' }, // 기존 항목 제외
    ], mf);
    const syn = JSON.parse(fs.readFileSync(mf, 'utf-8')).synonyms;
    assert.equal(res.added, 2);
    assert.deepEqual(syn['자외선차단지수'], ['SPF']);
    assert.deepEqual(syn['세안용 비누'], ['화장비누']);
    assert.equal(syn['징크설페이트'], undefined);
    assert.equal(syn['책임판매관리자'], undefined);
    assert.deepEqual(syn['유화'], ['에멀전']); // 중복 추가 없음
});

// ==================== applyGlossaryCandidates (--apply) ====================

function tmpGlossaryDir(seed = {}) {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'gloss-'));
    for (const [f, items] of Object.entries(seed)) {
        fs.writeFileSync(join(dir, f), JSON.stringify(items, null, 2), 'utf-8');
    }
    return dir;
}

test('BP-14 — apply: 신규 정의를 subjectN.json에 병합 + autoExtracted 표식', () => {
    const dir = tmpGlossaryDir({ 'subject1.json': [{ keyword: '시행령', definition: '기존' }] });
    const res = applyGlossaryCandidates([
        { term: '화장품', pattern: '정의', status: 'NEW', definition: '피부 등에 바르는 물품을 말한다.', subjectDir: '과목1' },
        { term: '로션제', pattern: '정의', status: 'NEW', definition: '유화제 등을 넣어 만든 것.', subjectDir: '과목2' }, // 신규 파일 생성
    ], dir);
    assert.equal(res.added, 2);
    const s1 = JSON.parse(fs.readFileSync(join(dir, 'subject1.json'), 'utf-8'));
    assert.equal(s1.length, 2);
    assert.equal(s1[1].keyword, '화장품');
    assert.equal(s1[1].autoExtracted, true);
    const s2 = JSON.parse(fs.readFileSync(join(dir, 'subject2.json'), 'utf-8'));
    assert.equal(s2[0].keyword, '로션제');
});

test('BP-14 — apply: 기존 키워드·비대상 패턴·기존 항목은 건너뜀', () => {
    const dir = tmpGlossaryDir({ 'subject1.json': [{ keyword: '시행령', definition: '기존' }] });
    const res = applyGlossaryCandidates([
        { term: '시행령', pattern: '정의', status: 'NEW', definition: '중복', subjectDir: '과목1' },
        { term: 'SPF', pattern: '영문', status: 'NEW', definition: '자외선차단지수(SPF)', subjectDir: '과목1' },
        { term: '맞춤형화장품', pattern: '정의', status: 'EXISTS', definition: '기존 항목', subjectDir: '과목1' },
        { term: '무과목', pattern: '정의', status: 'NEW', definition: '과목 디렉터리 없음', subjectDir: '' },
        { term: '정의없음', pattern: '정의', status: 'NEW', definition: '', subjectDir: '과목1' },
    ], dir);
    assert.equal(res.added, 0);
    assert.equal(res.skipped, 5);
    const s1 = JSON.parse(fs.readFileSync(join(dir, 'subject1.json'), 'utf-8'));
    assert.equal(s1.length, 1); // 기존 항목만 — 변경 없음
});

test('BP-14 — apply: --patterns로 약칭까지 확장 가능', () => {
    const dir = tmpGlossaryDir();
    const res = applyGlossaryCandidates([
        { term: '안전확보 조치', pattern: '약칭', status: 'NEW', definition: '이하 "안전확보 조치"라 한다', subjectDir: '과목1' },
    ], dir, { patterns: ['정의', '약칭'] });
    assert.equal(res.added, 1);
});
