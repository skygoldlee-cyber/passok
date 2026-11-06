// tests/unit/data-loader.test.js
// @spec DA-03
// DataLoader의 레지스트리 기반 조회 로직 (순수 부분) 검증.
// DOM/스크립트 로딩이 필요한 부분은 제외하고 registry 주입으로 테스트한다.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DataLoader } from '../../../src/content/data-loader.js';

const REGISTRY = {
    subjects: [
        { key: 'law', order: 1, name: '화장품법의 이해', shortName: '화장품법' },
        { key: 'manufacturing', order: 2, name: '화장품 제조 및 품질관리', shortName: '제조·품질' },
        { key: 'understanding', order: 4, name: '맞춤형화장품의 이해', shortName: '맞춤형화장품' },
    ],
    exams: [
        { key: 'subject1', subject: 'law' },
        { key: 'subject2', subject: 'manufacturing' },
        { key: 'subject4', subject: 'understanding' },
    ],
};

let savedRegistry;
let savedManifest;

beforeEach(() => {
    savedRegistry = DataLoader.registry;
    savedManifest = DataLoader.manifest;
    DataLoader.registry = REGISTRY;
    DataLoader.manifest = { subjects: [{ order: 1 }, { order: 2 }, { order: 4 }] };
});

afterEach(() => {
    DataLoader.registry = savedRegistry;
    DataLoader.manifest = savedManifest;
});

// ==================== getSubjectOrders ====================

test('getSubjectOrders: registry.subjects의 order 반환', () => {
    assert.deepEqual(DataLoader.getSubjectOrders(), [1, 2, 4]);
});

test('getSubjectOrders: registry 없으면 빈 배열', () => {
    DataLoader.registry = null;
    assert.deepEqual(DataLoader.getSubjectOrders(), []);
});

test('getSubjectOrders: order 누락/비수치 항목은 필터링', () => {
    DataLoader.registry = { subjects: [{ order: 1 }, { order: undefined }, { order: 'x' }, { order: 3 }] };
    assert.deepEqual(DataLoader.getSubjectOrders(), [1, 3]);
});

// ==================== _examKeyForOrder ====================

test('_examKeyForOrder: order → exams 매핑으로 키 해석', () => {
    assert.equal(DataLoader._examKeyForOrder(1), 'subject1');
    assert.equal(DataLoader._examKeyForOrder('4'), 'subject4');
});

test('_examKeyForOrder: 매핑 없으면 subjectN 폴백', () => {
    assert.equal(DataLoader._examKeyForOrder(3), 'subject3');
    DataLoader.registry = null;
    assert.equal(DataLoader._examKeyForOrder(2), 'subject2');
});

// ==================== getSubjectList / getSubjectMeta ====================

test('getSubjectList: registry.subjects 그대로 반환', () => {
    assert.equal(DataLoader.getSubjectList().length, 3);
    assert.equal(DataLoader.getSubjectList()[0].key, 'law');
});

test('getSubjectList: registry 없으면 빈 배열', () => {
    DataLoader.registry = null;
    assert.deepEqual(DataLoader.getSubjectList(), []);
});

// ==================== mergeUiText / getUiText ====================

import { mergeUiText } from '../../../src/content/data-loader.js';

test('mergeUiText: uiText 미선언 시험도 공통 표준 라벨이 나온다', () => {
    const ui = mergeUiText(undefined);
    assert.equal(ui.flashcard.nav, '카드');
    assert.equal(ui.quiz.nav, '퀴즈');
    assert.equal(ui.review.nav, '복습');
    assert.equal(ui.exam.nav, '모의고사');
    assert.equal(ui.calendar.title, '캘린더');
});

test('mergeUiText: 시험 선언이 공통값을 필드 단위로 덮어쓴다', () => {
    const ui = mergeUiText({ flashcard: { nav: '단어카드' }, dictionary: { title: '성분사전' } });
    assert.equal(ui.flashcard.nav, '단어카드');
    assert.equal(ui.flashcard.title, '플래시카드'); // 미지정 필드는 공통값 유지
    assert.equal(ui.dictionary.title, '성분사전');
});

test('mergeUiText: 공통에 없는 시험 전용 키는 그대로 통과', () => {
    const ui = mergeUiText({ careLog: { title: '요양일지', nav: '요양일지' } });
    assert.equal(ui.careLog.nav, '요양일지');
});
