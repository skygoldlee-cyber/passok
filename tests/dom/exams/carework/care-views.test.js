// tests/dom/exams/carework/care-views.test.js — carework 실무 뷰 커버리지
// @spec none — 시험 전용 실무 뷰 DOM 계약 (DA-13)
// @spec UX-NAV-17 — 문서 헤더·시드 제목 기대값이 uiText.title과 동일 명칭 (표시명 단일성)
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
import { careLogGenerate, careLogRecordCopy, initCareLogView } from '../../../../src/exams/carework/views/care-log.js';
import { careFacilityHandoverSubmit, careHandoverAck } from '../../../../src/exams/carework/views/care-handover.js';
import { careAuditReset, careAuditPrint, initCareAuditView } from '../../../../src/exams/carework/views/care-audit.js';
import { careHandoverGenerate, careHandoverSave, careHandoverExport, initCareHandoverView } from '../../../../src/exams/carework/views/care-handover.js';
import { initFacilityJoinView } from '../../../../src/exams/carework/views/facility-join.js';
import { initCareHomeView, careDocSignSave, careSignImagePick } from '../../../../src/exams/carework/views/care-home.js';
import { setDocSign } from '../../../../src/exams/carework/facility.js';
import { careVisitAdd, careVisitResultOpen, careVisitResultSave, careVisitDelete, careVisitPreview, initCareVisitView } from '../../../../src/exams/carework/views/care-visit.js';
import { careClientSave, careClientLoad, careClientDelete, initCareClientView } from '../../../../src/exams/carework/views/care-client.js';
import { listClients } from '../../../../src/exams/carework/care-client-store.js';
import { careLogCsvExport } from '../../../../src/exams/carework/views/care-log.js';
import { addCareLog, removeCareLog } from '../../../../src/exams/carework/care-log-store.js';
import { careVisitCsvExport } from '../../../../src/exams/carework/views/care-visit.js';
import { addVisit, removeVisit } from '../../../../src/exams/carework/care-visit-store.js';
import { careIncidentCsvExport } from '../../../../src/exams/carework/views/care-incident.js';
import { addIncident, removeIncident } from '../../../../src/exams/carework/incident-store.js';
import { careRosterCsvExport, careRosterCsvImport } from '../../../../src/exams/carework/views/care-roster.js';
import { addRoster, listRoster } from '../../../../src/exams/carework/roster-store.js';
import { selectFile, waitFor, spyAnchorDownload, lastToast } from '../../helpers.js';
import { careIncidentGenerate, careIncidentSave, careIncidentDelete, initCareIncidentView } from '../../../../src/exams/carework/views/care-incident.js';
import { careRosterAdd, careRosterDelete, initCareRosterView } from '../../../../src/exams/carework/views/care-roster.js';
import { careFinderUseOrg } from '../../../../src/exams/carework/views/care-finder.js';
import { getOrgName } from '../../../../src/exams/carework/facility.js';
import { syncFacilityNav, myMembership, listHandovers, listVisits as listFacilityVisits } from '../../../../src/exams/carework/facility.js';
import { ManualViewer } from '../../../../src/reader/manual-viewer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const loadPartial = (rel) => {
    document.body.innerHTML = readFileSync(join(ROOT, 'html', 'exams', 'carework', rel), 'utf-8');
};

describe('carework 실무 뷰 — 마크업↔핸들러 계약', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        // SheetJS 스텁 — vendor 로드 없이 downloadSheet 경로만 통과
        window.XLSX = { read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }), write: () => new Uint8Array([1]),
            utils: { sheet_to_csv: () => '', aoa_to_sheet: () => ({}), book_new: () => ({}), book_append_sheet() {} } };
    });

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
        expect(document.querySelector('#log-preview .care-doc-head strong')?.textContent).toBe('요양일지');
        expect(document.querySelector('#log-preview .care-doc-head span')?.textContent).toContain('출력');
        // esc() 래핑된 출력일이 이스케이프 없이 정상 렌더 (싱크 규약 적용 후에도 값 표시)
        expect(document.querySelector('#log-preview .care-doc-head span')?.textContent).toMatch(/\d{4}-\d{2}-\d{2}/);
        // 문서형 서명란 — cosmetic fp-sign-row 대응 (작성자·확인자)
        expect(document.querySelector('#log-preview .care-doc-sign')?.textContent).toContain('작성자(요양보호사)');
        careLogRecordCopy(); // 제공기록지 양식 복사 — 메뉴와 별개 문서라 별도 버튼 유지
    });

    it('careAudit — 로드 후 점검 초기화 + 문서 헤더', async () => {
        loadPartial('care-audit.html');
        await initCareAuditView();
        careAuditReset();
        expect(document.getElementById('audit-list')).toBeTruthy();
        expect(document.querySelector('#audit-list .care-doc-head strong')?.textContent).toBe('평가 체크리스트');
        expect(document.querySelector('#audit-list .care-doc-sign')?.textContent).toContain('점검자');
    });

    it('careHome — 서명 저장이 모든 문서 서명란에 기입 (빈키 슬롯은 공란 유지)', () => {
        setDocSign('', '', ''); // 이전 테스트 잔류 방지
        loadPartial('care-home.html');
        initCareHomeView();
        const aEl = /** @type {HTMLInputElement} */ (document.getElementById('home-sign-author'));
        const cEl = /** @type {HTMLInputElement} */ (document.getElementById('home-sign-confirmer'));
        const rEl = /** @type {HTMLInputElement} */ (document.getElementById('home-sign-receiver'));
        expect(aEl).toBeTruthy(); // 홈 서명 입력 폼 존재
        aEl.value = '김요양'; cEl.value = '박시설'; rEl.value = '이인수';
        careDocSignSave();
        // 홈 재진입 시 저장값이 폼에 채워짐
        initCareHomeView();
        expect(/** @type {HTMLInputElement} */ (document.getElementById('home-sign-author')).value).toBe('김요양');
        expect(/** @type {HTMLInputElement} */ (document.getElementById('home-sign-receiver')).value).toBe('이인수');
        // 일지 — 작성자·확인자 모두 기입
        loadPartial('care-log.html');
        initCareLogView();
        document.getElementById('log-date').value = '2026-11-01';
        document.getElementById('log-client').value = '김○○';
        careLogGenerate();
        const sign = document.querySelector('#log-preview .care-doc-sign')?.textContent || '';
        expect(sign).toContain('작성자(요양보호사): 김요양');
        expect(sign).toContain('확인자: 박시설');
        // 인수인계 — 인계자·인수자 기입, 확인일은 수기 공란 유지
        loadPartial('care-handover.html');
        /** @type {HTMLInputElement} */ (document.getElementById('ho-date')).value = '2026-11-05';
        /** @type {HTMLInputElement} */ (document.getElementById('ho-from')).value = '김인계';
        /** @type {HTMLInputElement} */ (document.getElementById('ho-to')).value = '박인수';
        careHandoverGenerate();
        const hoSign = document.querySelector('#ho-preview .care-doc-sign')?.textContent || '';
        expect(hoSign).toContain('인계자(서명): 김요양');
        expect(hoSign).toContain('인수자(서명): 이인수');
        expect(hoSign).toContain('확인일: ______________');
        setDocSign('', '', ''); // 정리 — 다른 테스트의 빈 서명란 검증에 영향 없도록
    });

    it('docMdSign — 홈 설정 서명이 문서 초안에 자동 기입된다', async () => {
        const { setDocSign } = await import('../../../../src/exams/carework/facility.js');
        const { docMdSign } = await import('../../../../src/exams/carework/doc-md.js');
        setDocSign('김보호', '박기관');
        const md = docMdSign([['점검자', 'author'], ['기관장(확인)', 'confirmer'], ['점검일', '']]);
        expect(md).toContain('점검자: 김보호'); // 서명란이 MD 초안에 포함 — 미리보기·docx·복사 공통
        expect(md).toContain('기관장(확인): 박기관');
        expect(md).toMatch(/점검일: ＿+/); // 미설정 슬롯은 수기 서명용 공란
    });

    it('docSignHtml — 서명 이미지 등록 시 작성자 슬롯에 이미지 기입', async () => {
        const { setDocSignImage, docSignHtml } = await import('../../../../src/exams/carework/facility.js');
        setDocSignImage('data:image/svg+xml;base64,AAA');
        const html = docSignHtml([['작성자', 'author'], ['확인자', 'confirmer']]);
        expect(html).toContain('care-doc-signimg'); // author 슬롯이 이미지로 기입
        expect(html).toContain('data:image/svg+xml;base64,AAA');
        setDocSignImage(''); // 정리 — 이후 테스트에 영향 방지
    });

    it('signFileToDataUri — 디코딩 불가 환경은 원본 data URI 폴백으로 등록 유지', async () => {
        const { signFileToDataUri } = await import('../../../../src/exams/carework/facility.js');
        // jsdom은 Image 로드 이벤트를 발생시키지 않아 디코딩이 무한 대기 — 디코딩 실패 강제로 폴백 계약 고정
        const origUrl = URL.createObjectURL;
        URL.createObjectURL = () => { throw new Error('decode-unavailable'); };
        try {
            const uri = await signFileToDataUri(new File([new Uint8Array([1, 2, 3])], 's.png', { type: 'image/png' }));
            expect(uri).toMatch(/^data:image\/png;base64,/);
        } finally { URL.createObjectURL = origUrl; }
    });

    it('careHome — 서명 이미지 업로드가 정규화 경유로 저장·미리보기 갱신', async () => {
        const { getDocSign, setDocSignImage } = await import('../../../../src/exams/carework/facility.js');
        setDocSignImage(''); // 이전 테스트 잔류 방지
        const origUrl = URL.createObjectURL;
        URL.createObjectURL = () => { throw new Error('decode-unavailable'); };
        try {
            loadPartial('care-home.html');
            initCareHomeView();
            selectFile('home-sign-image', new File([new Uint8Array([4, 5, 6])], 's.png', { type: 'image/png' }));
            await waitFor(() => getDocSign().signImage.startsWith('data:'));
            expect(getDocSign().signImage).toMatch(/^data:/); // jsdom 디코딩 불가 → 원본 폴백 data URI
            expect(document.getElementById('home-sign-image-preview')?.innerHTML).toContain('care-sign-preview');
        } finally { URL.createObjectURL = origUrl; setDocSignImage(''); }
    });

    it('careAudit — 점검표 인쇄 핸들러 실행', async () => {
        loadPartial('care-audit.html');
        await initCareAuditView();
        window.print = () => {};
        careAuditPrint();
        expect(document.getElementById('audit-list')).toBeTruthy();
    });

    // @spec CO-19 — 기관 점검표 파일 업로드 (콘텐츠 오버라이드)
    it('careAudit — 기관 점검표 파일(.csv) 업로드 → 커스텀 점검표 적용·기본 복원', async () => {
        const { initCareAuditView: initAudit, careAuditFileReset } = await import('../../../../src/exams/carework/views/care-audit.js');
        const { loadCustomSections, clearCustomSections, clearChecks } = await import('../../../../src/exams/carework/care-audit.js');
        clearCustomSections(); clearChecks();
        // jsdom은 상대 경로 fetch 불가 — 기본 점검표 JSON을 stub으로 제공
        const checklist = JSON.parse(readFileSync(join(ROOT, 'content/exams/carework/실무/audit_checklist.json'), 'utf-8'));
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(checklist) })));
        loadPartial('care-audit.html');
        await initAudit();
        expect(document.querySelectorAll('#audit-list [data-audit]').length).toBe(20); // 기본 고시 20항목
        // .csv 업로드 — 헤더 매핑(구분·점검항목·근거) → 2영역 2항목
        const csv = '구분,점검항목,근거\n인권,기관 인권교육 실시,기관 지침\n안전,기관 낙상 점검,기관 매뉴얼';
        selectFile('audit-file', new File([csv], '기관점검표.csv', { type: 'text/csv' }));
        await waitFor(() => document.getElementById('audit-import-preview')); // 파싱 검토 단계
        const pv = document.getElementById('audit-import-preview');
        expect(pv.textContent).toContain('기관 인권교육 실시'); // 적용 전 분할 확인
        expect(loadCustomSections()).toBeNull(); // 확정 전에는 미적용
        document.getElementById('audit-import-apply').click(); // 적용 확정
        await waitFor(() => !!loadCustomSections());
        expect(loadCustomSections()?.length).toBe(2);
        expect(document.querySelectorAll('#audit-list [data-audit]').length).toBe(2); // 업로드 2항목으로 교체
        expect(document.getElementById('audit-list').textContent).toContain('기관 인권교육 실시');
        expect(document.getElementById('audit-custom-note').classList.contains('is-hidden')).toBe(false);
        await careAuditFileReset(); // 기본 점검표 복원
        expect(loadCustomSections()).toBeNull();
        expect(document.querySelectorAll('#audit-list [data-audit]').length).toBe(20);
        expect(document.getElementById('audit-custom-note').classList.contains('is-hidden')).toBe(true);
        vi.unstubAllGlobals();
    });

    it('careCard — 카드 이벤트 발생 → 사고보고서 유형·경위 선기입 초안 전달', async () => {
        const { initCareCardView, careCardOpen, careCardToIncident } = await import('../../../../src/exams/carework/views/care-card.js');
        const { initCareIncidentView } = await import('../../../../src/exams/carework/views/care-incident.js');
        const { getJSON } = await import('../../../../src/core/storage.js');
        const { STORAGE_KEYS } = await import('../../../../src/core/storage-keys.js');
        // jsdom은 상대 경로 fetch 불가 — 카드 JSON을 stub으로 제공
        const cards = { cards: [{ id: 'fall', category: '사고 대응', title: '낙상 발생', trigger: '낙상 발견 시', steps: [{ phase: '확인', text: '상태 확인' }] }] };
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(cards) })));
        loadPartial('care-card.html');
        await initCareCardView();
        careCardOpen('fall');
        expect(document.querySelector('[data-click="careCardToIncident"]')).toBeTruthy(); // 작성 버튼 노출
        careCardToIncident('fall');
        expect(getJSON(STORAGE_KEYS.CARE_INCIDENT_DRAFT)?.type).toBe('fall'); // 낙상 카드 → 낙상 유형
        // 사고보고서 뷰 진입 — 초안 소비-삭제 + 선기입
        loadPartial('care-incident.html');
        initCareIncidentView();
        expect(getJSON(STORAGE_KEYS.CARE_INCIDENT_DRAFT)).toBeNull();
        expect(/** @type {HTMLSelectElement} */ (document.getElementById('inc-type')).value).toBe('fall');
        expect(/** @type {HTMLInputElement} */ (document.getElementById('inc-desc')).value).toContain('낙상 발생');
        vi.unstubAllGlobals();
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

    it('careHandover — 생성·기록 우선 자동저장·내보내기 핸들러', async () => {
        loadPartial('care-handover.html');
        initCareHandoverView();
        document.getElementById('ho-date').value = '2026-11-01';
        document.getElementById('ho-from').value = '김○○';
        document.getElementById('ho-to').value = '박○○';
        careHandoverGenerate();
        expect(document.querySelector('#ho-preview pre')?.textContent).toMatch(/인수인계서/);
        const arg = /** @type {HTMLElement} */ (document.querySelector('[data-click="careHandoverExport"]')).dataset.arg;
        // 기록 우선 — 미저장 문서의 내보내기는 자동 저장 후 메뉴가 열린다
        await careHandoverExport(arg);
        expect(document.getElementById('ho-saved')?.textContent).toMatch(/김○○/);
        expect(document.querySelector('.care-export-sheet')).toBeTruthy();
        const saved = document.querySelectorAll('#ho-saved .care-log-saved-item').length;
        // 동일 문서 재내보내기·명시 저장 — 중복 기록 없음 (텍스트 동일성 기준)
        await careHandoverExport(arg);
        careHandoverSave();
        expect(document.querySelectorAll('#ho-saved .care-log-saved-item').length).toBe(saved);
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
        careVisitPreview();
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

    it('careClients — CSV 가져오기 EUC-KR(CP949) 파일 한글 디코딩', async () => {
        loadPartial('care-client.html');
        initCareClientView(); // cli-csv-file change 리스너 바인딩
        // '성명,주의사항\n김순자,낙상 주의' — EUC-KR(CP949) 인코딩 (UTF-8 해석 불가 → 폴백 경로)
        const bytes = new Uint8Array([
            0xBC, 0xBA, 0xB8, 0xED, 0x2C, 0xC1, 0xD6, 0xC0, 0xC7, 0xBB, 0xE7, 0xC7, 0xD7, 0x0A,
            0xB1, 0xE8, 0xBC, 0xF8, 0xC0, 0xDA, 0x2C, 0xB3, 0xAB, 0xBB, 0xF3, 0x20, 0xC1, 0xD6, 0xC0, 0xC7,
        ]);
        selectFile('cli-csv-file', new File([bytes], 'euckr.csv'));
        await waitFor(() => listClients().length === 1);
        expect(listClients()[0].name).toBe('김순자');
        expect(listClients()[0].caution).toBe('낙상 주의');
        careClientDelete(listClients()[0].id);
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

    it('careRoster — CSV 왕복: 내보내기 다운로드 + 가져오기 병합 (날짜+근무조+근무자 키)', async () => {
        loadPartial('care-roster.html');
        initCareRosterView(); // ros-csv-file change 리스너 바인딩
        addRoster({ date: '2026-11-10', shift: 'night', worker: '김○○', note: '대체' });

        const dl = spyAnchorDownload();
        careRosterCsvExport();
        await waitFor(() => dl.clicks.length === 1);
        dl.restore();
        expect(dl.clicks[0].download).toBe('근무표.xlsx');

        // 근무조 라벨→키 매핑 + 동일 (날짜,근무조,근무자) 행은 갱신 병합
        careRosterCsvImport(); // proFeatureNotice + 파일 선택 트리거
        selectFile('ros-csv-file', new File([
            '날짜,근무조,근무자,메모\n2026-11-11,주간(데이),박○○,\n2026-11-10,야간(나이트),김○○,수정메모',
        ], 'roster.csv'));
        await waitFor(() => listRoster().length === 2);
        expect(listRoster().find(x => x.worker === '박○○').shift).toBe('day');
        expect(listRoster().find(x => x.worker === '김○○').note).toBe('수정메모');
        expect(lastToast()[0]).toContain('신규 1·갱신 1');
    });

    it('careVisit — Excel 내보내기 다운로드 트리거', async () => {
        loadPartial('care-visit.html');
        const r = addVisit({ date: '2026-11-10', client: '김○○', visitor: '이○○', relation: 'child' });
        const dl = spyAnchorDownload();
        careVisitCsvExport();
        await waitFor(() => dl.clicks.length === 1);
        dl.restore();
        expect(dl.clicks[0].download).toBe('면회기록.xlsx');
        removeVisit(r.id);
    });

    it('careIncident — Excel 내보내기 다운로드 트리거', async () => {
        loadPartial('care-incident.html');
        const r = addIncident({ date: '2026-11-10', client: '김○○', type: 'fall', desc: '미끄러짐' });
        const dl = spyAnchorDownload();
        careIncidentCsvExport();
        await waitFor(() => dl.clicks.length === 1);
        dl.restore();
        expect(dl.clicks[0].download).toBe('사고보고.xlsx');
        removeIncident(r.id);
    });

    it('careLog — Excel 내보내기 다운로드 트리거', async () => {
        loadPartial('care-log.html');
        const r = addCareLog({ date: '2026-11-10', client: '김○○', service: 'visit-care', activities: { physical: ['세면·목욕'] }, note: '양호', text: '…' });
        const dl = spyAnchorDownload();
        careLogCsvExport();
        await waitFor(() => dl.clicks.length === 1);
        dl.restore();
        expect(dl.clicks[0].download).toBe('요양일지.xlsx');
        removeCareLog(r.id);
    });

    it('careFinder — 시설명으로 출력물 기관명 설정', () => {
        careFinderUseOrg('행복요양원');
        expect(getOrgName()).toBe('행복요양원');
    });

    it('careFinder — 출처 링크 + 결과 카드 카카오맵·뷰 상단 장기요양보험 링크', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
            source: '공단 현황 — https://www.data.go.kr/x (필터)', regions: [],
            items: [{ name: '행복요양원', region: '서울', type: '요양원', address: '서울특별시 종로구 비봉길 76', capacity: 38, careWorkers: 18 }],
        }) })));
        loadPartial('care-finder.html');
        const { initCareFinderView } = await import('../../../../src/exams/carework/views/care-finder.js');
        await initCareFinderView();
        const a = /** @type {HTMLAnchorElement|null} */ (document.querySelector('#find-source a'));
        expect(a?.href).toContain('data.go.kr');
        const hrefs = [...document.querySelectorAll('#find-list a')].map(x => /** @type {HTMLAnchorElement} */ (x).href);
        expect(hrefs.some(h => h.includes('map.kakao.com'))).toBe(true);
        expect(document.querySelector('a[href*="longtermcare.or.kr/npbs/r/a/201/selectLtcoSrch"]')).toBeTruthy();
        expect(document.querySelector('#find-list .care-finder-meta')?.textContent).toContain('정원 38명');
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
        for (const id of ['#log-preview', '#care-result', '#ho-preview', '#audit-list', '#audit-progress', '#care-card-detail', '#vis-preview', '#inc-preview', '#ros-preview', '#cli-preview', '#adm-preview']) {
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

    // @spec CO-17 — 기관 자체 양식: {{키}} 파싱·치환·스토어·뷰 계약
    it('customForm — parseFields가 커스텀 키만 추출 (시스템 키 제외·중복 제거)', async () => {
        const { parseFields } = await import('../../../../src/exams/carework/form-template-store.js');
        const fields = parseFields('성명: {{client}} 보호자: {{보호자}} 연락처: {{연락처}} 보호자: {{보호자}} 서명: {{signImage}} 날짜: {{date}}');
        expect(fields.map(f => f.key)).toEqual(['보호자', '연락처']); // 시스템 키(client·signImage·date) 제외, 중복 제거
    });

    it('customForm — fillTemplate이 시스템 키·기입값 치환, 미기입은 공란', async () => {
        const { fillTemplate } = await import('../../../../src/exams/carework/form-template-store.js');
        const { setDocSign } = await import('../../../../src/exams/carework/facility.js');
        setDocSign('김요양', '박시설');
        const md = fillTemplate('작성자: {{author}} 수급자: {{client}} 비고: {{비고}}', { client: '이대상', 비고: '특이없음' });
        expect(md).toContain('작성자: 김요양');
        expect(md).toContain('수급자: 이대상');
        expect(md).toContain('비고: 특이없음');
        expect(fillTemplate('미기입: {{메모}}', {})).toMatch(/미기입: ＿+/); // 미기입 필드는 공란 유지
    });

    it('customForm — 양식 저장·목록·삭제, 기입 문서 저장 한도', async () => {
        const { addFormTemplate, listFormTemplates, removeFormTemplate, saveFormDoc, listFormDocs } =
            await import('../../../../src/exams/carework/form-template-store.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id); // 정리
        const r = addFormTemplate({ title: '동의서', body: '성명: {{client}}' });
        expect(r.ok).toBe(true);
        expect(listFormTemplates()[0].title).toBe('동의서');
        const d = saveFormDoc({ tplId: r.id, title: '동의서', client: '김대상', date: '2026-11-08', values: { 비고: 'x' }, md: 'm' });
        expect(d.ok).toBe(true);
        expect(listFormDocs()[0].client).toBe('김대상');
        removeFormTemplate(r.id);
    });

    it('customForm — 뷰 마크업: 기입 패널 숨김 + 등록·편집은 같은 뷰 수용 (홈은 링크)', async () => {
        const { initCareCustomFormView, careFormTplNew } = await import('../../../../src/exams/carework/views/care-custom-form.js');
        loadPartial('care-custom-form.html');
        initCareCustomFormView();
        expect(document.getElementById('cf-fill')?.classList.contains('is-hidden')).toBe(true); // 양식 미선택 시 기입 패널 숨김
        // 등록·편집은 같은 뷰 — 새 양식 버튼 + 파일 추출 input(다형식 accept) + 저장·기관등록 핸들러
        expect(document.querySelector('[data-click="careFormTplNew"]')).toBeTruthy();
        const inp = /** @type {HTMLInputElement} */ (document.getElementById('cf-tpl-file'));
        expect(inp).toBeTruthy();
        expect(inp.accept).toContain('.docx');
        expect(document.querySelector('[data-click="careFormTplSave"]')).toBeTruthy();
        expect(document.getElementById('cf-tpl-facsave')).toBeTruthy();
        careFormTplNew(); // 새 양식 — 빈 편집기 오픈
        expect(document.getElementById('cf-editor').classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('cf-tpl-label').textContent).toBe('새 양식');
        // 홈 카드는 안내+링크로 축소 — 편집기는 양식 뷰에만 존재
        loadPartial('care-home.html');
        initCareHomeView();
        expect(document.getElementById('home-tpl-body')).toBeNull();
        expect(document.querySelector('a[href="#/care-custom-form"]')).toBeTruthy();
    });

    it('customForm — 기입 플로우: 양식 선택→필드 렌더→문서 생성→저장→삭제', async () => {
        const { initCareCustomFormView, careFormTplUse, careFormDocGenerate, careFormDocSave, careFormDocDelete, careFormDocMd, careFormTplDelete } =
            await import('../../../../src/exams/carework/views/care-custom-form.js');
        const { addFormTemplate, listFormTemplates, removeFormTemplate, listFormDocs } =
            await import('../../../../src/exams/carework/form-template-store.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
        const r = addFormTemplate({ title: '동의서', body: '대상자: {{client}} 서명: {{signImage}} 비고: {{비고}}' });
        loadPartial('care-custom-form.html');
        initCareCustomFormView();
        expect(document.querySelector('[data-click="careFormTplUse"]')).toBeTruthy(); // 목록 렌더
        careFormTplUse(r.id);
        expect(document.getElementById('cf-fill').classList.contains('is-hidden')).toBe(false);
        expect(document.querySelector('[data-cf-field="비고"]')).toBeTruthy(); // 커스텀 필드 렌더
        document.querySelector('[data-cf-field="비고"]').value = '없음';
        careFormDocGenerate();
        expect(document.getElementById('cf-preview').innerHTML).toContain('동의서');
        expect(careFormDocMd()).toContain('동의서');
        const n = listFormDocs().length;
        careFormDocSave();
        expect(listFormDocs().length).toBe(n + 1); // 기입 문서 저장
        careFormDocDelete(listFormDocs()[0].id);
        await careFormTplDelete(r.id);
        expect(listFormTemplates().length).toBe(0);
    });

    it('customForm — 편집은 인라인 편집기에서 완결 (열기→수정→저장→닫기)', async () => {
        const { addFormTemplate, listFormTemplates, removeFormTemplate } =
            await import('../../../../src/exams/carework/form-template-store.js');
        const { initCareCustomFormView, careFormTplEdit, careFormTplSave, careFormTplEditClose } =
            await import('../../../../src/exams/carework/views/care-custom-form.js');
        const { fillTplEditor, readTplEditor } = await import('../../../../src/exams/carework/form-template-editor.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
        loadPartial('care-custom-form.html');
        initCareCustomFormView();
        const r = addFormTemplate({ title: '서약서', body: '본인: {{본인}}' });
        careFormTplEdit(r.id); // 인라인 편집기 오픈 — 홈 이동 없음
        expect(document.getElementById('cf-editor').classList.contains('is-hidden')).toBe(false);
        expect(readTplEditor('cf-tpl').title).toBe('서약서');
        fillTplEditor('cf-tpl', '서약서2', '본인: {{본인}} 날짜: {{date}}');
        expect(document.getElementById('cf-tpl-fields').innerHTML).toContain('본인');
        careFormTplSave();
        const tpl = listFormTemplates().find(t => t.id === r.id);
        expect(tpl.title).toBe('서약서2'); // 같은 id 갱신
        careFormTplEditClose();
        expect(document.getElementById('cf-editor').classList.contains('is-hidden')).toBe(true);
        removeFormTemplate(r.id);
    });

    it('customForm — 편집기 미리보기: MD 표 렌더 + {{키}} 기입란·자동키 칩 구분', async () => {
        const { initCareCustomFormView } = await import('../../../../src/exams/carework/views/care-custom-form.js');
        const { fillTplEditor } = await import('../../../../src/exams/carework/form-template-editor.js');
        loadPartial('care-custom-form.html');
        initCareCustomFormView();
        fillTplEditor('cf-tpl', '동의서', '| 항목 | 내용 |\n|---|---|\n| 성명 | {{client}} |\n| 서명 | {{본인}} |');
        const pv = document.getElementById('cf-tpl-preview');
        expect(pv.querySelector('table')).toBeTruthy(); // MD 표가 실제 표로 렌더
        expect(pv.querySelector('.tpl-ph-auto')?.textContent).toBe('{{client}}'); // 시스템 키는 자동 기입 구분
        expect([...pv.querySelectorAll('.tpl-ph')].some(c => c.textContent === '{{본인}}')).toBe(true); // 커스텀 기입란
        fillTplEditor('cf-tpl', '동의서', '');
        expect(pv.innerHTML).toContain('미리보기'); // 빈 본문 안내
    });

    it('customForm — extractFormDocx: stored zip의 word/document.xml 텍스트·표 추출', async () => {
        const { extractFormDocx } = await import('../../../../src/exams/carework/care-form-pdf.js');
        const enc = new TextEncoder();
        const xml = '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>동의서</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>성명</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>값</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
        const data = enc.encode(xml), n = enc.encode('word/document.xml');
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(18, data.length, true); lh.setUint16(22, data.length, true); lh.setUint16(26, n.length, true);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(20, data.length, true); ch.setUint16(24, data.length, true);
        ch.setUint16(28, n.length, true); ch.setUint32(42, 0, true);
        const eo = new DataView(new ArrayBuffer(22));
        eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, 1, true); eo.setUint16(10, 1, true);
        eo.setUint32(12, 46 + n.length, true); eo.setUint32(16, 30 + n.length + data.length, true);
        const buf = new Uint8Array(30 + n.length + data.length + 46 + n.length + 22);
        buf.set([lh.buffer, n, data, ch.buffer, n, eo.buffer].flatMap(u => [...new Uint8Array(u)]));
        const f = { arrayBuffer: () => Promise.resolve(buf.buffer) };
        const ex = await extractFormDocx(f);
        expect(ex.text).toContain('동의서');
        expect(ex.text).toContain('| 성명 | 값 |'); // 표는 MD 행 복원
    });

    it('customForm — AI 추출 프롬프트·응답 파싱 계약 (buildFormExtractPrompt/parseFormExtractResponse)', async () => {
        const { buildFormExtractPrompt, parseFormExtractResponse } = await import('../../../../src/ai/ai-client.js');
        const p = buildFormExtractPrompt({ text: '급여계획서 본문', hint: '계획서' });
        expect(p).toContain('<form_text>'); // 경계 태그 — 프롬프트 인젝션 방어
        expect(p).toContain('계획서');
        expect(buildFormExtractPrompt({ text: '' })).toBeNull();
        const parsed = parseFormExtractResponse('{"title":"동의서","body":"성명: {{client}}"}');
        expect(parsed.title).toBe('동의서');
        expect(parseFormExtractResponse('not json')).toBeNull();
        expect(parseFormExtractResponse('{"title":""}')).toBeNull();
    });

    // @spec CO-18 — 내장 양식 사본·출력 오버라이드
    it('customForm — renderToolBody: 기본은 블록 그대로, toolKey 사본은 서식 오버라이드', async () => {
        const { renderToolBody } = await import('../../../../src/exams/carework/form-seeds.js');
        const { addFormTemplate, listFormTemplates, removeFormTemplate } =
            await import('../../../../src/exams/carework/form-template-store.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
        // 사본 없음 — 기본: 블록 값 그대로
        expect(renderToolBody('careVisit', { 기록표: '|날|값|' })).toBe('|날|값|');
        // 사본 생성 — 도구 본문이 사본 서식으로 렌더
        addFormTemplate({ title: '방문기록 커스텀', body: '기간: {{기간}}\n{{기록표}}\n메모: {{메모}}', toolKey: 'careVisit' });
        const out = renderToolBody('careVisit', { 기록표: '|날|값|', 기간: '11월' });
        expect(out).toContain('기간: 11월');
        expect(out).toContain('|날|값|');
        expect(out).toMatch(/메모: ＿+/); // 도구 미지급 키는 수기 공란
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
    });

    it('customForm — 기본 양식 사본 생성(연동 배지) + 시드 목록 렌더', async () => {
        const { initCareCustomFormView, careFormSeedCopy, careFormTplDelete } = await import('../../../../src/exams/carework/views/care-custom-form.js');
        const { listFormTemplates, removeFormTemplate } = await import('../../../../src/exams/carework/form-template-store.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
        loadPartial('care-custom-form.html');
        initCareCustomFormView();
        expect(document.querySelectorAll('#cf-seed-list [data-click="careFormSeedCopy"]').length).toBe(6); // 6개 기본 양식
        careFormSeedCopy('careIncident');
        const tpl = listFormTemplates().find(t => t.toolKey === 'careIncident');
        expect(tpl).toBeTruthy();
        expect(tpl.title).toBe('사고·낙상 보고서');
        expect(document.getElementById('cf-seed-list').innerHTML).toContain('사본 있음');
        await careFormTplDelete(tpl.id); // 사본 삭제 → 기본 양식이 '사본 만들기'로 복귀
        expect(document.getElementById('cf-seed-list').innerHTML).not.toContain('사본 있음');
        expect(document.getElementById('cf-seed-list').innerHTML).toContain('사본 만들기');
    });

    it('customForm — mdToHtml 표는 단일 table로 렌더 (행별 분리 회귀 방지)', async () => {
        const { mdToHtml } = await import('../../../../src/exams/carework/doc-md.js');
        const html = mdToHtml('| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
        expect((html.match(/<table>/g) || []).length).toBe(1); // 행마다 별도 표로 깨지지 않음
        expect(html).toContain('<thead><tr><th>a</th><th>b</th></tr></thead>');
        expect((html.match(/<td>/g) || []).length).toBe(4); // 데이터 행은 tbody에
    });

    it('customForm — 블록 키 미리보기: 데이터 없으면 자동 칩, 실데이터는 표로 치환', async () => {
        const { fillTplEditor, setTplBlockState } = await import('../../../../src/exams/carework/form-template-editor.js');
        loadPartial('care-custom-form.html');
        fillTplEditor('cf-tpl', '평가 체크리스트', '{{점검표}}\n\n비고: {{비고}}');
        const pv = document.getElementById('cf-tpl-preview');
        setTplBlockState('cf-tpl', { auto: new Set(['점검표']) });
        expect(pv.querySelector('.tpl-ph-auto')?.textContent).toBe('{{점검표}}'); // 기입 필드가 아닌 도구 자동 영역
        expect(pv.querySelector('.tpl-ph-auto')?.getAttribute('title')).toContain('도구 자동 생성');
        setTplBlockState('cf-tpl', { auto: new Set(['점검표']), values: { 점검표: '| h |\n|---|\n| r |' } });
        expect(pv.querySelector('table td')?.textContent).toBe('r'); // 블록 키가 실데이터 표로 치환
        expect(pv.textContent).not.toContain('{{점검표}}');
        expect(pv.textContent).toContain('{{비고}}'); // 비블록 키는 칩 유지
        setTplBlockState('cf-tpl'); // 상태 초기화 — 이후 테스트로 잔류 방지
    });

    it('customForm — 평가 체크리스트 사본 미리보기에 실제 20항목 점검표 표시', async () => {
        const { initCareCustomFormView, careFormSeedCopy, careFormTplDelete } = await import('../../../../src/exams/carework/views/care-custom-form.js');
        const { toolBlockPreview } = await import('../../../../src/exams/carework/form-seeds.js');
        const { listFormTemplates, removeFormTemplate } = await import('../../../../src/exams/carework/form-template-store.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
        // jsdom은 상대 경로 fetch 불가 — 실제 체크리스트 JSON을 stub으로 제공
        const checklist = JSON.parse(readFileSync(join(ROOT, 'content/exams/carework/실무/audit_checklist.json'), 'utf-8'));
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(checklist) })));
        expect(await toolBlockPreview('careLog')).toBeNull(); // 기록 생성문 블록은 실데이터 없음 — 칩 유지
        loadPartial('care-custom-form.html');
        initCareCustomFormView();
        careFormSeedCopy('careAudit');
        await waitFor(() => document.querySelector('#cf-tpl-preview table')); // 블록 실데이터 비동기 로드
        const pv = document.getElementById('cf-tpl-preview');
        expect(pv.querySelectorAll('tbody tr').length).toBe(20); // 체크리스트 20개 항목 전부 렌더
        expect(pv.querySelector('thead th')?.textContent).toBe('영역');
        const tpl = listFormTemplates().find(t => t.toolKey === 'careAudit');
        await careFormTplDelete(tpl.id);
        vi.unstubAllGlobals();
    });

    it('customForm — 기본 양식 파일로 만들기: 기관 양식(.csv) → 연동 사본 저장·도구 서식 적용', async () => {
        const { initCareCustomFormView, careFormSeedFile, careFormTplSave } = await import('../../../../src/exams/carework/views/care-custom-form.js');
        const { toolOverride } = await import('../../../../src/exams/carework/form-seeds.js');
        const { listFormTemplates, removeFormTemplate } = await import('../../../../src/exams/carework/form-template-store.js');
        const { readTplEditor } = await import('../../../../src/exams/carework/form-template-editor.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
        loadPartial('care-custom-form.html');
        initCareCustomFormView();
        expect(document.querySelectorAll('[data-click="careFormSeedFile"]').length).toBe(6); // 6개 도구 모두 파일 버튼
        careFormSeedFile('careHandover');
        selectFile('cf-seed-file', new File(['구분,항목\n일시,\n인계자,\n인수자,'], '기관양식.csv', { type: 'text/csv' }));
        await waitFor(() => /** @type {HTMLTextAreaElement} */ (document.getElementById('cf-tpl-body'))?.value.includes('| 일시 |'));
        expect(readTplEditor('cf-tpl').body).toContain('| 구분 | 항목 |'); // 추출 표가 MD 표로 편집기 로드
        expect(document.getElementById('cf-tpl-label')?.textContent).toContain('인수인계서'); // 연동 라벨
        careFormTplSave();
        const tpl = listFormTemplates().find(t => t.toolKey === 'careHandover');
        expect(tpl).toBeTruthy(); // toolKey 연동 사본으로 저장
        expect(toolOverride('careHandover')).toContain('인계자'); // 도구 출력 서식이 기관 양식으로
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
    });

    it('customForm — 시드는 실제 필드명 노출 + 오버라이드 시 스칼라 실값 기입', async () => {
        const { renderToolBody, TOOL_FORM_SEEDS } = await import('../../../../src/exams/carework/form-seeds.js');
        const { addFormTemplate, listFormTemplates, removeFormTemplate } =
            await import('../../../../src/exams/carework/form-template-store.js');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
        expect(TOOL_FORM_SEEDS.careIncident.seed).toContain('{{발생일시}}'); // 블록만이 아니라 실제 필드명
        expect(TOOL_FORM_SEEDS.careHandover.seed).toContain('{{인계자}}');
        addFormTemplate({ title: '사고보고서 사본', body: TOOL_FORM_SEEDS.careIncident.seed, toolKey: 'careIncident' });
        const out = renderToolBody('careIncident', { 보고내용: '원문', client: '김철수', 발생일시: '2026-11-08 09:00', 사고유형: '낙상' });
        expect(out).toContain('발생 일시: 2026-11-08 09:00'); // 생성기 주입 스칼라가 실값으로
        expect(out).toContain('사고 유형: 낙상');
        for (const t of listFormTemplates()) removeFormTemplate(t.id);
    });

    it('customForm — textToTemplate이 라벨 패턴을 {{키}}로 변환 (AI 폴백)', async () => {
        const { textToTemplate } = await import('../../../../src/exams/carework/care-form-pdf.js');
        const t = textToTemplate('성명:\n생년월일: ＿＿＿＿', '동의서');
        expect(t.title).toBe('동의서');
        expect(t.body).toContain('{{성명}}');
    });

    it('careHome — 서명 이미지 피커 버튼이 숨긴 file input을 트리거', () => {
        loadPartial('care-home.html');
        initCareHomeView();
        const inp = /** @type {HTMLInputElement} */ (document.getElementById('home-sign-image'));
        const btn = document.querySelector('[data-click="careSignImagePick"]');
        expect(inp).toBeTruthy();
        expect(btn).toBeTruthy(); // 버튼 스타일 피커 — 브라우저 기본 input UI 미사용
        expect(inp.classList.contains('is-hidden')).toBe(true);
        let clicked = false;
        inp.click = () => { clicked = true; };
        careSignImagePick();
        expect(clicked).toBe(true);
    });

});
