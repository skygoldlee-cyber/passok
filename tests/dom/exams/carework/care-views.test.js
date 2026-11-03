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
    submitVisit: vi.fn(() => Promise.resolve({})),
    listVisits: vi.fn(() => Promise.resolve([])),
    updateVisitResult: vi.fn(() => Promise.resolve({})),
    submitIncident: vi.fn(() => Promise.resolve({})),
    listIncidents: vi.fn(() => Promise.resolve([])),
}));

import { careCalcRun, careCalcReset, initCareCalcView } from '../../../../src/exams/carework/views/care-calc.js';
import { careCardOpen, careCardClose, initCareCardView } from '../../../../src/exams/carework/views/care-card.js';
import { careLogGenerate, careLogCopy, initCareLogView } from '../../../../src/exams/carework/views/care-log.js';
import { careFacilityHandoverSubmit, careHandoverAck } from '../../../../src/exams/carework/views/care-handover.js';
import { careAuditReset, careAuditCopy, careAuditPrint, initCareAuditView } from '../../../../src/exams/carework/views/care-audit.js';
import { careHandoverGenerate, careHandoverSave, careHandoverCopy, careHandoverShare, initCareHandoverView } from '../../../../src/exams/carework/views/care-handover.js';
import { initFacilityJoinView } from '../../../../src/exams/carework/views/facility-join.js';
import { careVisitAdd, careVisitResultOpen, careVisitResultSave, careVisitDelete, careVisitExport, initCareVisitView } from '../../../../src/exams/carework/views/care-visit.js';
import { careClientSave, careClientLoad, careClientDelete, initCareClientView } from '../../../../src/exams/carework/views/care-client.js';
import { careIncidentGenerate, careIncidentSave, careIncidentDelete, initCareIncidentView } from '../../../../src/exams/carework/views/care-incident.js';
import { careRosterAdd, careRosterDelete, initCareRosterView } from '../../../../src/exams/carework/views/care-roster.js';
import { syncFacilityNav, myMembership, listHandovers, listVisits as listFacilityVisits } from '../../../../src/exams/carework/facility.js';
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

    it('careCalc — 적용 기준 연도 표기 + 데이터 연도 구버전 시 경고 (고시 연차 갱신)', () => {
        loadPartial('care-calc.html');
        initCareCalcView();
        // 현행 — 적용 연도가 항상 표시되고 경고 없음
        expect(document.getElementById('care-year-label')?.textContent).toBe('2026');
        const note = document.getElementById('care-year-note');
        expect(note?.textContent).toBe('적용 기준: 2026년 고시');
        expect(note?.classList.contains('care-calc-err')).toBe(false);
        // 구버전 시뮬레이션 — 데이터 연도 < 현재 연도면 경고 문구·스타일
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2027-06-01'));
        initCareCalcView();
        expect(note?.textContent).toContain('2027년 고시가 아직 반영되지 않았습니다');
        expect(note?.classList.contains('care-calc-err')).toBe(true);
        careCalcRun();
        const txt = document.querySelector('#care-result')?.textContent || '';
        expect(txt).toContain('적용 기준');
        expect(txt).toContain('2026년 고시 기준 — 현재 연도 고시가 아직 반영되지 않았으므로');
        vi.useRealTimers();
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
        // 문서형 구조 — 헤더 + 입력 조건/공단 책정 기준/계산 결과 3개 표 (가독성 출력 회귀 방지)
        expect(document.querySelectorAll('#care-result table.care-doc').length).toBe(3);
        // 공단 책정 기준표 — 시설 선택 시 등급별 1일 수가, 선택 등급 행 강조
        expect(txt).toContain('공단 책정 기준');
        expect(txt).toContain('1일 수가');
        expect(document.querySelector('#care-result .care-doc-sel')?.textContent).toContain('1등급');
        expect(document.querySelector('#care-result .care-doc-head')?.textContent).toContain('장기요양 비용 계산 결과');
        expect(document.querySelector('#care-result .care-doc-sec')?.textContent).toBe('입력 조건');
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
        // 문서형 헤더 — 모든 결과물이 제목+출력일 템플릿 공유 (가독성 출력 회귀 방지)
        expect(document.querySelector('#log-preview .care-doc-head strong')?.textContent).toBe('요양보호 서비스 기록');
        expect(document.querySelector('#log-preview .care-doc-head span')?.textContent).toContain('출력');
        // esc() 래핑된 출력일이 이스케이프 없이 정상 렌더 (싱크 규약 적용 후에도 값 표시)
        expect(document.querySelector('#log-preview .care-doc-head span')?.textContent).toMatch(/\d{4}-\d{2}-\d{2}/);
        // 문서형 서명란 — cosmetic fp-sign-row 대응 (작성자·확인자)
        expect(document.querySelector('#log-preview .care-doc-sign')?.textContent).toContain('작성자(요양보호사)');
        careLogCopy();
    });

    it('careAudit — 로드 후 점검 초기화 + 문서 헤더', async () => {
        loadPartial('care-audit.html');
        await initCareAuditView();
        careAuditReset();
        expect(document.getElementById('audit-list')).toBeTruthy();
        expect(document.querySelector('#audit-list .care-doc-head strong')?.textContent).toBe('기관 평가 체크리스트');
        expect(document.querySelector('#audit-list .care-doc-sign')?.textContent).toContain('점검자');
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

    it('careVisit — 예약 등록 → 결과 기록 → 완료 목록 상태 전이 (DSN-43 6c)', async () => {
        loadPartial('care-visit.html');
        initCareVisitView();
        document.getElementById('vis-date').value = '2026-11-05';
        document.getElementById('vis-time').value = '14:00';
        document.getElementById('vis-client').value = '김○○';
        document.getElementById('vis-visitor').value = '홍○○';
        document.getElementById('vis-phone').value = '010-1234-5678';
        careVisitAdd();
        const sched = document.getElementById('vis-scheduled');
        expect(sched.textContent).toContain('김○○');
        expect(sched.textContent).toContain('홍○○');
        expect(sched.textContent).toContain('010-1234-5678');
        // 결과 기록 패널 — loc: 접두 data-arg로 대상 지정 후 저장
        const arg = sched.querySelector('[data-arg^="loc:"]')?.dataset.arg;
        careVisitResultOpen(arg);
        expect(document.getElementById('vis-result-panel').classList.contains('is-hidden')).toBe(false);
        document.getElementById('vis-result-date').value = '2026-11-05';
        document.getElementById('vis-result-summary').value = '면회 <b>30분</b> — 상태 양호';
        await careVisitResultSave();
        expect(document.getElementById('vis-done').textContent).toContain('면회 <b>30분</b>');
        // 결과 요약 이스케이프 — 서버·사용자 입력이 마크업으로 주입되지 않음 (ROAD-Q5)
        expect(document.getElementById('vis-done').innerHTML).toContain('&lt;b&gt;30분&lt;/b&gt;');
        // 출력물 기관명 — 로컬 설정이 문서 헤더에 병기 (DSN-43 6e)
        const { setLocalOrgName } = await import('../../../../src/exams/carework/facility.js');
        setLocalOrgName('행복요양원');
        careVisitExport();
        expect(document.getElementById('vis-preview').textContent).toContain('행복요양원');
        setLocalOrgName('');
        expect(document.getElementById('vis-scheduled').textContent).toContain('등록된 방문예약이 없습니다');
        careVisitDelete(document.querySelector('#vis-done [data-arg]')?.dataset.arg);
    });

    it('careVisit — 기관 면회 대장 렌더: 예정 항목만 결과 기록 버튼 노출 (DSN-43 6c)', async () => {
        vi.mocked(myMembership).mockResolvedValueOnce({ facilities: { id: 'f1', name: '행복요양원' } });
        vi.mocked(listFacilityVisits).mockResolvedValueOnce([
            { id: 'v1', visit_date: '2026-11-05', visit_time: '14:00', client: '김○○', visitor_name: '홍○○', visitor_phone: '010-1111-2222', status: 'scheduled' },
            { id: 'v2', visit_date: '2026-11-03', client: '이○○', visitor_name: '박○○', status: 'done', result: { summary: '면회 완료' } },
        ]);
        loadPartial('care-visit.html');
        initCareVisitView();
        await new Promise(r => setTimeout(r, 0));
        const host = document.getElementById('vis-facility');
        expect(host.textContent).toContain('행복요양원');
        expect(host.textContent).toContain('홍○○');
        expect(host.textContent).toContain('010-1111-2222');
        expect(host.innerHTML).toContain('fac:v1');
        expect(host.innerHTML).not.toContain('fac:v2'); // 완료 건은 결과 기록 버튼 없음
    });

    it('careClients — 대상자 등록 → 수정 불러오기 → 삭제', () => {
        loadPartial('care-client.html');
        initCareClientView();
        document.getElementById('cli-name').value = '김○○';
        document.getElementById('cli-caution').value = '낙상 위험';
        careClientSave();
        const list = document.getElementById('cli-list');
        expect(list.textContent).toContain('김○○');
        expect(list.textContent).toContain('낙상 위험');
        const id = list.querySelector('[data-arg]')?.dataset.arg;
        careClientLoad(id);
        expect(document.getElementById('cli-name').value).toBe('김○○');
        careClientDelete(id);
        expect(list.textContent).toContain('등록된 대상자가 없습니다');
    });

    it('careIncident — 보고서 생성 → 저장 목록', () => {
        loadPartial('care-incident.html');
        initCareIncidentView();
        document.getElementById('inc-date').value = '2026-11-03';
        document.getElementById('inc-client').value = '김○○';
        document.getElementById('inc-type').value = 'fall';
        document.getElementById('inc-desc').value = '화장실 앞 미끄러짐';
        careIncidentGenerate();
        expect(document.querySelector('#inc-preview pre')?.textContent).toContain('낙상');
        careIncidentSave();
        expect(document.getElementById('inc-saved').textContent).toContain('김○○');
        careIncidentDelete(document.querySelector('#inc-saved [data-arg]')?.dataset.arg);
    });

    it('careRoster — 근무 배정 등록 → 목록 정렬 표시', () => {
        loadPartial('care-roster.html');
        initCareRosterView();
        document.getElementById('ros-date').value = '2026-11-05';
        document.getElementById('ros-shift').value = 'night';
        document.getElementById('ros-worker').value = '김○○';
        careRosterAdd();
        const list = document.getElementById('ros-list');
        expect(list.textContent).toContain('김○○');
        expect(list.textContent).toContain('야간');
        careRosterDelete(list.querySelector('[data-arg]')?.dataset.arg);
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
        for (const id of ['#log-preview', '#care-result', '#ho-preview', '#audit-list', '#audit-progress', '#care-card-detail', '#vis-preview', '#inc-preview', '#ros-preview', '#cli-preview']) {
            expect(printBlock).toContain(`${id}, ${id} *`);
        }
        // print.css — 활성 뷰만 표시. 특정 뷰 id 하드코딩 시 다른 뷰 인쇄가 깨짐
        const printCss = readFileSync('css/print.css', 'utf-8');
        expect(printCss).toContain('.view-section.active');
        expect(printCss).not.toMatch(/#review-view\.view-section\s*\{/);
        // 윤곽 테이블 — 격자 테두리(외곽선+셀)가 화면·인쇄 모두 적용
        expect(css).toMatch(/\.care-doc \{[^}]*border: 1px solid/);
        expect(css).toMatch(/\.care-doc td \{[^}]*border: 1px solid/);
        expect(printBlock).toContain('--print-border-strong');
        // 인쇄 여백·페이지 분할 — 절대 위치는 본문 잘림·겹침 유발 (일반 흐름 + 뷰 패딩이 여백)
        expect(printBlock).not.toContain('position: absolute');
        // 빈 페이지 방지 — 숨은 폼 레이아웃이 뒷장으로 밀리지 않도록 출력물 외 형제 display:none
        expect(printBlock).toMatch(/\.view-section\.active > :not[\s\S]*?display: none !important/);
    });

});
