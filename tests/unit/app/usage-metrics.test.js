// tests/unit/usage-metrics.test.js — Phase 2 표면 진입 계측 (src/usage-stats.js)
// @spec UX-MET-01,UX-MET-04
// 검증: 신규 계측 키가 actions에 기록되되 유료가치 판정(VALUE_ACTIONS)과
//       스토리지 스키마를 오염하지 않음 — 데이터 없는 구조 결정 차단의 계측 기반.
//
// 실행: npm test (node:test) — DOM 테스트는 test:dom (vitest)

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function createMockStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
        get length() { return store.size; },
        key: (i) => [...store.keys()][i],
    };
}

let trackAction, isValueThresholdMet, actionLabel, buildUsageExport, getUsageStats;

beforeEach(async () => {
    global.localStorage = createMockStorage();
    global.window = {};
    const m = await import('../../../src/usage-stats.js');
    ({ trackAction, isValueThresholdMet, actionLabel, buildUsageExport, getUsageStats } = m);
});

test('UX-MET-01 — 표면 진입 계측 키가 actions에 버킷 접미와 함께 기록된다', () => {
    trackAction('tq_run:openGoalSettings');
    trackAction('oxdrill_start:1');
    trackAction('combo_start:weak');
    trackAction('drill_from_review');
    trackAction('review_weak_open');
    trackAction('trainer_menu:startCalcPractice');
    trackAction('pro_badge_click');

    const { actions } = getUsageStats();
    assert.equal(actions['tq_run:openGoalSettings'], 1);
    assert.equal(actions['oxdrill_start:1'], 1);
    assert.equal(actions['combo_start:weak'], 1);
    assert.equal(actions['drill_from_review'], 1);
    assert.equal(actions['review_weak_open'], 1);
    assert.equal(actions['trainer_menu:startCalcPractice'], 1);
    assert.equal(actions['pro_badge_click'], 1);
});

test('UX-MET-04 — 표면 진입 계측은 유료가치 판정(VALUE_ACTIONS) 집계에서 제외된다', () => {
    // PRO_VALUE_THRESHOLD(20)를 넘는 표면 진입 계측을 넣어도 임계 미달이어야 한다
    for (let i = 0; i < 25; i++) {
        trackAction('tq_run:startDueReview');
        trackAction('trainer_menu:openOxDrillSetup');
    }
    assert.equal(isValueThresholdMet(), false);

    // 실제 유료가치 액션으로 20건 누적 시 임계 도달 — 판정 로직이 죽지 않음
    for (let i = 0; i < 20; i++) trackAction('weak_to_card');
    assert.equal(isValueThresholdMet(), true);
});

test('UX-MET-04 — actionLabel은 `:` 접미 키를 버킷 라벨로 해석한다', () => {
    assert.equal(actionLabel('tq_run:startSubjectStudy'), '오늘 할 일 큐 실행');
    assert.equal(actionLabel('trainer_menu:startLimitsTrainer'), '훈련소 메뉴 진입');
    assert.equal(actionLabel('weak_to_card'), '오답 → 복습 노트'); // 기존 정확 키 우선
    assert.equal(actionLabel('untracked:xyz'), 'untracked:xyz'); // 미등록 → 키 원형
});

test('UX-MET-03 — 내보내기는 카운터·기간만 담고 학습 내용 필드를 포함하지 않는다', () => {
    trackAction('tq_run:x');
    const d = JSON.parse(buildUsageExport());
    assert.equal(d.v, 1);
    assert.ok(d.owner);
    assert.equal(d.actions['tq_run:x'], 1);
    assert.ok(typeof d.views === 'object' && typeof d.days === 'object');
    for (const k of Object.keys(d)) {
        assert.ok(['v', 'owner', 'firstUse', 'lastUse', 'days', 'views', 'actions'].includes(k),
            `내보내기에 예상 밖 필드: ${k}`);
    }
});
