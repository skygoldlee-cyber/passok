// tests/dom/exams/carework/care-views.test.js — carework 실무 뷰 커버리지
// @spec none — 시험 전용 실무 뷰 DOM 계약 (DA-13)
// 목적: carework 5개 실무 뷰의 핵심 핸들러를 jsdom에서 실행해 DOM 반영과
//       커버리지 임계(함수·라인)를 고정한다 — 실마크업 파셜을 주입해 사용한다.
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.mock('../../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
}));
vi.mock('../../../../src/auth-sync/supabase-client.js', () => ({
    getAuthSession: vi.fn(() => Promise.resolve({ session: null })),
    getSupabase: vi.fn(() => Promise.resolve({})),
    onAuthChange: vi.fn(),
}));
vi.mock('../../../../src/pro/pro-upgrade.js', () => ({
    proFeatureNotice: vi.fn(() => false),
    hasProEntitlement: vi.fn(() => false),
    refreshProBadges: vi.fn(),
}));
vi.mock('../../../../src/exams/carework/facility.js', async (importOriginal) => ({
    ...await importOriginal(),
    myMembership: vi.fn(() => Promise.resolve(null)),
    listHandovers: vi.fn(() => Promise.resolve([])),
    submitHandover: vi.fn(() => Promise.resolve({})),
    ackHandover: vi.fn(() => Promise.resolve({})),
}));

import { careCalcRun, careCalcReset, initCareCalcView } from '../../../../src/exams/carework/views/care-calc.js';
import { careCardOpen, careCardClose, initCareCardView } from '../../../../src/exams/carework/views/care-card.js';
import { careLogGenerate, careLogCopy, initCareLogView } from '../../../../src/exams/carework/views/care-log.js';
import { careFacilityHandoverSubmit, careHandoverAck } from '../../../../src/exams/carework/views/care-handover.js';
import { careAuditReset, careAuditCopy, careAuditPrint, initCareAuditView } from '../../../../src/exams/carework/views/care-audit.js';
import { careHandoverGenerate, careHandoverSave, careHandoverCopy, careHandoverShare, initCareHandoverView } from '../../../../src/exams/carework/views/care-handover.js';
import { initFacilityJoinView } from '../../../../src/exams/carework/views/facility-join.js';
import { syncFacilityNav, myMembership, listHandovers } from '../../../../src/exams/carework/facility.js';
import { ManualViewer } from '../../../../src/reader/manual-viewer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const loadPartial = (rel) => {
    document.body.innerHTML = readFileSync(join(ROOT, 'html', 'exams', 'carework', rel), 'utf-8');
};

describe('carework 실무 뷰 — 마크업↔핸들러 계약', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('careCalc — 계산 후 결과 카드 렌더', () => {
        loadPartial('care-calc.html');
        document.getElementById('care-grade').value = '1';
        document.getElementById('care-type').value = 'home';
        document.getElementById('care-use').value = '20';
        careCalcRun();
        expect(document.querySelector('#care-result')?.textContent).toMatch(/원/);
        careCalcReset();
    });

    it('careCalc — 비급여 항목별 합산 + 상급침실료 시설 전용 토글', () => {
        loadPartial('care-calc.html');
        initCareCalcView();
        // 당해연도 한도표 렌더 — 등급 6행 + 연도 헤더
        const lt = document.getElementById('care-limit-table');
        expect(lt?.querySelectorAll('tbody tr').length).toBe(6);
        expect(lt?.querySelector('thead')?.textContent).toContain('2026');
        // 시설 수가표 — 요양시설 5등급 행 + 20% 본인부담 병기
        const rt = document.getElementById('care-fac-rate-table');
        expect(rt?.querySelectorAll('tbody tr').length).toBe(5);
        expect(rt?.textContent).toContain('93,070원');
        const type = /** @type {HTMLSelectElement} */ (document.getElementById('care-type'));
        const roomWrap = /** @type {HTMLElement} */ (document.getElementById('care-nc-room-wrap'));
        // 재가 선택 시 상급침실료 비노출
        type.value = 'home';
        type.dispatchEvent(new Event('change'));
        expect(roomWrap.hidden).toBe(true);
        // 시설 전환 시 노출 + 항목별 합산이 납부액에 반영
        type.value = 'facility';
        type.dispatchEvent(new Event('change'));
        expect(roomWrap.hidden).toBe(false);
        // 시설 전환 시 수동 이용액 랩 비노출 + 수가×일수 자동 산정
        expect(/** @type {HTMLElement} */ (document.getElementById('care-use-wrap')).hidden).toBe(true);
        expect(/** @type {HTMLElement} */ (document.getElementById('care-fac-wrap')).hidden).toBe(false);
        const facSel = /** @type {HTMLSelectElement} */ (document.getElementById('care-fac-type'));
        facSel.value = 'nursing';
        document.getElementById('care-grade').value = 'g1';
        document.getElementById('care-fac-days').value = '30';
        document.getElementById('care-use').value = '2000000'; // 자동 산정으로 덮임 (93,070×30=2,792,100)
        document.getElementById('care-nc-meal').value = '450000';
        document.getElementById('care-nc-room').value = '100000';
        document.getElementById('care-nc-groom').value = '10000';
        careCalcRun();
        const txt = document.querySelector('#care-result')?.textContent || '';
        expect(txt).toContain('비급여 자부담');
        expect(txt).toContain('558,420원'); // 급여 본인부담금 — 비급여 미포함
        expect(txt).toContain('1,118,420원'); // 실납부 = 급여부담 558,420 + 비급여 560,000
        expect(txt).toContain('93,070원/일');
        // 입력 조건 병기 — 인쇄 결과물이 조건 없이 결과만 나오던 결함 회귀 방지
        expect(txt).toContain('입력 조건');
        expect(txt).toContain('시설급여');
        expect(txt).toContain('30일');
        expect(txt).toContain('비급여·식재료비');
        expect(txt).toContain('450,000원');
        // 문서형 구조 — 헤더 + 입력 조건/계산 결과 2개 표 (가독성 출력 회귀 방지)
        expect(document.querySelectorAll('#care-result table.care-doc').length).toBe(2);
        expect(document.querySelector('#care-result .care-doc-head')?.textContent).toContain('장기요양 비용 계산 결과');
        expect(document.querySelector('#care-result table.care-doc caption')?.textContent).toBe('입력 조건');
        // 강조는 '실제 월 납부액' 행 — 위치 선택자 회귀 방지
        const totalRow = document.querySelector('#care-result .care-calc-total');
        expect(totalRow?.textContent).toContain('실제 월 납부액');
        careCalcReset();
    });

    it('careCard — 목록→상세→복귀', async () => {
        loadPartial('care-card.html');
        await initCareCardView();
        const btn = document.querySelector('.care-card-item');
        if (btn) careCardOpen(btn.getAttribute('data-arg'));
        careCardClose();
        expect(document.getElementById('care-card-list')).toBeTruthy();
    });

    it('careLog — 초기화 후 생성·복사', () => {
        loadPartial('care-log.html');
        initCareLogView();
        document.getElementById('log-date').value = '2026-11-01';
        document.getElementById('log-client').value = '김○○';
        document.getElementById('log-service').value = 'visit-care';
        careLogGenerate();
        expect(document.querySelector('#log-preview pre')?.textContent).toMatch(/김○○/);
        careLogCopy();
    });

    it('careAudit — 로드 후 점검 초기화', async () => {
        loadPartial('care-audit.html');
        await initCareAuditView();
        careAuditReset();
        expect(document.getElementById('audit-list')).toBeTruthy();
    });

    it('careAudit — 점검표 복사·인쇄 핸들러 실행', async () => {
        loadPartial('care-audit.html');
        await initCareAuditView();
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
        window.print = () => {};
        careAuditCopy();
        careAuditPrint();
        expect(document.getElementById('audit-list')).toBeTruthy();
    });

    it('careHandover — 기관 인계·인수 확인 핸들러 노출 (DSN-43 6b)', () => {
        expect(typeof careFacilityHandoverSubmit).toBe('function');
        expect(typeof careHandoverAck).toBe('function');
    });

    it('careHandover — 기관 인계 목록 렌더: 서버 필드 esc 처리·인수 수 표시 (DSN-43 6b)', async () => {
        vi.mocked(myMembership).mockResolvedValueOnce({ facilities: { id: 'f1', name: '<b>시설</b>' } });
        vi.mocked(listHandovers).mockResolvedValueOnce([
            { id: 'h1', shift_date: '2026-11-02', client: '<img src=x>', memo: 'm', handover_acks: [{}, {}] },
        ]);
        loadPartial('care-handover.html');
        initCareHandoverView();
        await new Promise(r => setTimeout(r, 0));
        const host = document.getElementById('ho-facility');
        expect(host.innerHTML).toContain('&lt;img');
        expect(host.innerHTML).not.toContain('<img src=x>');
        expect(host.textContent).toContain('2명 인수');
    });

    it('careHandover — 생성·복사·공유 핸들러', () => {
        loadPartial('care-handover.html');
        initCareHandoverView();
        document.getElementById('ho-date').value = '2026-11-01';
        document.getElementById('ho-from').value = '김○○';
        document.getElementById('ho-to').value = '박○○';
        careHandoverGenerate();
        expect(document.querySelector('#ho-preview pre')?.textContent).toMatch(/인수인계서/);
        careHandoverShare(); // 미저장 상태 — 차단 토스트 (기록 우선 규칙)
        careHandoverSave();
        expect(document.getElementById('ho-saved')?.textContent).toMatch(/김○○/);
        careHandoverCopy();
        careHandoverShare(); // 저장 후 — 공유 진행
    });

    // @spec DA-18 — 권한 뷰 분리: facility-join은 클라이언트 뷰로 비로그인/비권한 시 안내만 표시
    it('careFacility — 미로그인 시 로그인 안내 렌더', async () => {
        loadPartial('facility-join.html');
        initFacilityJoinView();
        await new Promise(r => setTimeout(r, 0));
        expect(document.getElementById('facility-join-body')?.textContent).toMatch(/로그인/);
    });

    it('실무매뉴얼 — ManualViewer.openPracticeManual 뷰어 연결', () => {
        expect(typeof ManualViewer.openPracticeManual).toBe('function');
    });

    it('syncFacilityNav — manager만 기관관리 메뉴 표시 (DA-18 보안 기본값)', () => {
        document.body.innerHTML = '<button data-target="facility-admin-view" class="is-hidden"></button>';
        syncFacilityNav({ role: 'manager' });
        expect(document.querySelector('button').classList.contains('is-hidden')).toBe(false);
        syncFacilityNav({ role: 'worker' });
        expect(document.querySelector('button').classList.contains('is-hidden')).toBe(true);
        syncFacilityNav(null);
        expect(document.querySelector('button').classList.contains('is-hidden')).toBe(true);
    });

    // @spec DA-21 — select option 테마 강제: carework 폼의 option에도 다크 토큰 규칙 존재
    it('select option 다크 규칙 — .care-calc-form select option 테마 토큰 적용 (DA-21)', async () => {
        const { readFileSync } = await import('node:fs');
        const css = readFileSync('css/exams/carework/care-tools.css', 'utf-8');
        expect(css).toContain('.care-calc-form select option');
        expect(css).toContain('--bg-sidebar');
        expect(css).toContain('--color-text-main');
    });

    // @spec none — 인쇄 허용 목록 회귀: 출력·인쇄 대상인 각 도구의 결과 요소가
    // @media print의 body.ui-mode-practice *{hidden} 예외에 모두 포함돼야 하고,
    // print.css는 활성 뷰를 표시해야 한다 (둘 중 하나라도 깨지면 백지 출력)
    it('@media print — 결과물 요소 허용 목록 + 활성 뷰 표시 규칙 (백지 출력 회귀)', async () => {
        const { readFileSync } = await import('node:fs');
        const css = readFileSync('css/exams/carework/care-tools.css', 'utf-8');
        const printBlock = css.slice(css.indexOf('@media print'));
        expect(printBlock).toContain('body.ui-mode-practice *');
        for (const id of ['#log-preview', '#care-result', '#ho-preview', '#audit-list', '#audit-progress', '#care-card-detail']) {
            expect(printBlock).toContain(`${id}, ${id} *`);
        }
        // print.css — 활성 뷰만 표시. 특정 뷰 id 하드코딩 시 다른 뷰 인쇄가 깨짐
        const printCss = readFileSync('css/print.css', 'utf-8');
        expect(printCss).toContain('.view-section.active');
        expect(printCss).not.toMatch(/#review-view\.view-section\s*\{/);
    });

});
