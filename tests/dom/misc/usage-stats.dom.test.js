// tests/dom/usage-stats.dom.test.js — 로컬 기능 사용 카운터 (ROAD-L5)
// @spec ROAD-L5,UX-MET-01,UX-MET-02,UX-MET-03,UX-MET-04
// 뷰 전환·기능 액션 카운트가 시험 스코프 localStorage 키에 누적되고,
// 설정의 '내 사용 통계' 모달이 라벨·합계를 렌더링함을 고정한다.
// Phase 2(DOC-DSN-24): 표면 진입 계측 위임 리스너·드릴 진입 함수·통계 복사 경로.

import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../../src/ui-utils.js', async (importOriginal) => ({
    ...(await importOriginal()),
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
    vibrate: vi.fn(),
    trapFocus: vi.fn(() => vi.fn()),
    HAPTIC: { correct: 30, wrong: [40, 30, 40], tap: 10 },
}));
vi.mock('../../../src/views/navigation.js', async (importOriginal) => ({
    ...(await importOriginal()),
    switchView: vi.fn(),
}));

import { loadIndexHtml, el, seedStudyData, resetStudyState, flushAsync } from '../helpers.js';
import {
    trackView, trackAction, getUsageStats, resetUsageStats, showUsageStats,
    isValueThresholdMet, PRO_VALUE_THRESHOLD, initUsageMetrics,
} from '../../../src/usage-stats.js';
import { showToast } from '../../../src/ui-utils.js';
import { gotoOxDrill, startOxDrill } from '../../../src/views/trainer-drills.js';
import { renderDashboard } from '../../../src/views/dashboard.js';
import { DataLoader } from '../../../src/data-loader.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';
import { scopedKey } from '../../../src/exam-context.js';
import { todayKey } from '../../../src/utils.js';

function overlay() { return document.getElementById('usage-stats-overlay'); }

beforeEach(() => {
    localStorage.clear();
    loadIndexHtml();
    overlay()?.remove();
});

describe('사용 카운터 (trackView/trackAction)', () => {
    it('뷰·액션 카운트가 scoped usage_stats 키에 누적된다', () => {
        trackView('quiz-view');
        trackView('quiz-view');
        trackView('flashcard-view');
        trackAction('weak_to_textbook');

        const raw = localStorage.getItem(scopedKey(STORAGE_KEYS.USAGE_STATS));
        expect(raw).toBeTruthy();
        const d = JSON.parse(raw);
        expect(d.views['quiz-view']).toBe(2);
        expect(d.views['flashcard-view']).toBe(1);
        expect(d.actions.weak_to_textbook).toBe(1);
        expect(d.firstUse).toBeTruthy();
        expect(d.owner).toBeTruthy(); // 익명 유저 식별(device_id) — 로그인 없는 기간의 유저 단위
        expect(Object.keys(d.days)).toHaveLength(1);
    });

    it('resetUsageStats가 카운터를 비운다', () => {
        trackView('quiz-view');
        trackAction('diagnostic_quiz');
        resetUsageStats();
        const d = getUsageStats();
        expect(Object.keys(d.views)).toHaveLength(0);
        expect(Object.keys(d.actions)).toHaveLength(0);
        expect(d.firstUse).toBeNull();
    });

    it('손상된 데이터는 초기값으로 복구한다', () => {
        localStorage.setItem(scopedKey(STORAGE_KEYS.USAGE_STATS), '{broken');
        trackView('quiz-view');
        expect(getUsageStats().views['quiz-view']).toBe(1);
    });
});

describe('내 사용 통계 모달 (showUsageStats)', () => {
    it('뷰 라벨과 액션 라벨·합계를 렌더링한다', async () => {
        trackView('quiz-view');
        trackView('quiz-view');
        trackAction('weak_to_textbook');
        trackAction('weak_to_textbook');
        trackAction('diagnostic_quiz');

        await showUsageStats();
        const el = overlay();
        expect(el).not.toBeNull();
        expect(el.textContent).toContain('기출 및 핵심 퀴즈');
        expect(el.textContent).toContain('오답 → 교재 근거 보기');
        expect(el.textContent).toContain('진단 평가');
        expect(el.textContent).toContain('기능 사용 합계');
        // 프라이버시 고지 — 로컬 전용
        expect(el.textContent).toContain('이 기기에만 저장');
    });

    it('유료가치 판정은 Pro 후보 액션만 합산한다 (20회)', async () => {
        // 편의/UI 액션은 판정에서 제외 — plan_compare 20회로는 미충족
        for (let i = 0; i < PRO_VALUE_THRESHOLD; i++) trackAction('plan_compare');
        expect(isValueThresholdMet()).toBe(false);
        await showUsageStats();
        expect(overlay().textContent).toContain(`0/${PRO_VALUE_THRESHOLD}회`);
        expect(overlay().textContent).not.toContain('충족');
        overlay().querySelector('.app-confirm-ok').click();

        // Pro 후보(weak_to_textbook) 20회 → 충족
        for (let i = 0; i < PRO_VALUE_THRESHOLD; i++) trackAction('weak_to_textbook');
        expect(isValueThresholdMet()).toBe(true);
        await showUsageStats();
        expect(overlay().textContent).toContain(`${PRO_VALUE_THRESHOLD}/${PRO_VALUE_THRESHOLD}회`);
        expect(overlay().textContent).toContain('충족');
    });

    it('첫 사용·최근 사용 날짜는 로컬 오늘로 표시한다', async () => {
        // 저장값은 ISO(UTC) 타임스탬프 — UTC 날짜로 자르면 KST 00~09시에
        // 하루 전으로 표시되므로 로컬 날짜(todayKey)와 일치해야 한다
        trackView('quiz-view');
        await showUsageStats();
        expect(overlay().textContent).toContain(`첫 사용: ${todayKey()}`);
        expect(overlay().textContent).toContain(`최근 사용: ${todayKey()}`);
    });

    it('사용 기록이 없으면 빈 상태 문구를 표시한다', async () => {
        await showUsageStats();
        expect(overlay().textContent).toContain('기록된 사용 데이터가 없습니다');
    });

    it('초기화 버튼이 카운터를 비우고 모달을 다시 그린다', async () => {
        trackAction('plan_compare');
        await showUsageStats();
        overlay().querySelector('[data-reset-usage]').click();
        await new Promise(r => setTimeout(r, 0));
        const d = getUsageStats();
        expect(Object.keys(d.actions)).toHaveLength(0);
    });

    it('설정 메뉴에 사용 통계 진입점이 있다', () => {
        const btn = document.querySelector('[data-click="showUsageStats"]');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toContain('내 사용 통계');
    });
});

// ===========================================================================
// Phase 2 표면 진입 계측 (DOC-DSN-24) — 위임 리스너·드릴 진입·회수 경로
// ===========================================================================

const OX_ITEMS = [{ t: 's1', c: true, sid: 'ox_c1_s1', n: 1 }];

function stubDrillData() {
    DataLoader.registry = {
        subjects: [{ order: 1, key: 'subj1', name: '과목1' }],
    };
    DataLoader._loadedDrills = { subject1: OX_ITEMS };
}

function seedOneSubject() {
    seedStudyData('subja', {
        name: '과목1',
        cards: [{ id: 'subja_card_1', term: 't1', definition: 'd' }],
        quizzes: [],
    });
}

describe('표면 진입 계측 — 위임 리스너 (UX-MET-01·02)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        initUsageMetrics();
        vi.clearAllMocks();
    });

    it('오늘 할 일 큐 버튼 클릭 → tq_run:<click> 기록 (UX-MET-01)', () => {
        seedOneSubject();
        renderDashboard();
        const btn = el('weak-subject-recommendation').querySelector('[data-click]');
        expect(btn).not.toBeNull();
        const handler = btn.getAttribute('data-click');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(getUsageStats().actions[`tq_run:${handler}`]).toBe(1);
    });

    it('훈련소 메뉴 카드 클릭 → trainer_menu:<click> 기록 (UX-MET-01)', () => {
        const card = document.querySelector('#trainer-view .trainer-menu-card[data-click="startCalcPractice"]');
        expect(card).not.toBeNull();
        card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(getUsageStats().actions['trainer_menu:startCalcPractice']).toBe(1);
        // 카드 외 클릭은 기록하지 않는다
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(getUsageStats().actions['trainer_menu:startCalcPractice']).toBe(1);
    });

    it('취약 진술 리뷰 패널 — 열림 시에만 review_weak_open 기록 (UX-MET-02)', () => {
        const panel = el('review-weak-panel');
        expect(panel.tagName).toBe('DETAILS');
        panel.open = false;
        panel.dispatchEvent(new Event('toggle')); // 닫힘 → 미기록
        expect(getUsageStats().actions.review_weak_open).toBeUndefined();
        panel.open = true;
        panel.dispatchEvent(new Event('toggle')); // 열림 → 기록
        expect(getUsageStats().actions.review_weak_open).toBe(1);
    });

    it('PRO 배지 클릭 → pro_badge_click 기록, 일반 영역은 미기록 (UX-MET-02)', () => {
        const badge = document.querySelector('[data-pro-feature]');
        expect(badge).not.toBeNull();
        badge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(getUsageStats().actions.pro_badge_click).toBe(1);
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(getUsageStats().actions.pro_badge_click).toBe(1);
    });
});

describe('표면 진입 계측 — 드릴 진입 함수 (UX-MET-01)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        stubDrillData();
        seedOneSubject();
    });

    it('과목 O/X 드릴 시작 → oxdrill_start:<과목번호> 기록', async () => {
        startOxDrill(1); // startDrill은 프로미스를 반환하지 않으므로 플러시로 대기
        await flushAsync(50);
        expect(getUsageStats().actions['oxdrill_start:1']).toBe(1);
    });

    it('출제 문항 0건 → 계측 없이 안내 토스트 (실사용 성립 시점에만 기록)', async () => {
        DataLoader._loadedDrills = { subject1: [] };
        startOxDrill(1);
        await flushAsync(50);
        expect(Object.keys(getUsageStats().actions).filter(k => k.startsWith('oxdrill_start'))).toHaveLength(0);
        expect(showToast).toHaveBeenCalled();
    });

    it('복습 발 드릴 직행 → drill_from_review 기록', async () => {
        gotoOxDrill('weak'); // weak 문항 0건이어도 복습 발 진입 자체가 기록된다
        await flushAsync(50);
        expect(getUsageStats().actions.drill_from_review).toBe(1);
    });
});

describe('사용 통계 회수·판정 격리 (UX-MET-03·04)', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStudyState();
        loadIndexHtml();
        overlay()?.remove();
    });

    it('통계 복사 버튼 → 클립보드에 JSON 내보내기 (UX-MET-03)', async () => {
        trackAction('tq_run:openGoalSettings');
        const writeText = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        await showUsageStats();
        const copyBtn = overlay().querySelector('[data-copy-usage]');
        expect(copyBtn).not.toBeNull();
        copyBtn.click();
        await flushAsync();
        expect(writeText).toHaveBeenCalledTimes(1);
        const exported = JSON.parse(writeText.mock.calls[0][0]);
        expect(exported.actions['tq_run:openGoalSettings']).toBe(1);
        expect(overlay().querySelector('.usage-export-fallback')).toBeNull();
    });

    it('클립보드 차단 → 수동 복사 폴백 textarea 표시 (UX-MET-03)', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
            configurable: true,
        });
        await showUsageStats();
        overlay().querySelector('[data-copy-usage]').click();
        await flushAsync();
        expect(overlay().querySelector('.usage-export-fallback')).not.toBeNull();
    });

    it('표면 진입 계측은 유료가치 임계(20건)에 산입되지 않는다 (UX-MET-04)', () => {
        for (let i = 0; i < PRO_VALUE_THRESHOLD + 5; i++) trackAction('trainer_menu:startLimitsTrainer');
        expect(isValueThresholdMet()).toBe(false);
    });
});

describe('사용 스냅샷 텔레메트리 (UX-MET-05)', () => {
    it('기본 load 경로 — buildUsageExport 스냅샷을 usage_snapshot으로 전송', async () => {
        const { maybeReportUsageSnapshot, _resetUsageTelemetryForTest } = await import('../../../src/usage-telemetry.js');
        _resetUsageTelemetryForTest();
        trackView('dashboard-view'); // 스냅샷 페이로드에 실데이터 확보
        const rows = [];
        const res = await maybeReportUsageSnapshot({
            insert: async (r) => { rows.push(...r); return {}; },
            today: '2026-01-10',
        });
        expect(res).toBe('sent');
        expect(rows[0].event).toBe('usage_snapshot');
        expect(rows[0].meta.views['dashboard-view']).toBeGreaterThan(0);
        // today 주입 시 sent-mark 검사는 건너뜀 — 실제 오늘 날짜로 호출하면 하루 1회 상한이 작동
        const { STORAGE_KEYS } = await import('../../../src/storage-keys.js');
        const { todayKey } = await import('../../../src/utils.js');
        const { safeSetItem } = await import('../../../src/state.js');
        _resetUsageTelemetryForTest();
        safeSetItem(STORAGE_KEYS.USAGE_SNAPSHOT_SENT, todayKey());
        const res2 = await maybeReportUsageSnapshot({ insert: async () => ({}) });
        expect(res2).toBe('skipped');
    });
});
