// tests/dom/exams/carework/facility-sync.test.js
// @spec CO-14·CO-15 — facility_records write-through 동기·페이로드 계약 검증
// 서버 전송은 facility.js를 mock — 검증 대상은 호출 계약(doc_type·payload·_sync 표기)과
// 멤버십 부재 시 로컬 전용 동작 (오프라인 우선)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/exams/carework/facility.js', () => ({
    myMembership: vi.fn(async () => null),
    submitRecord: vi.fn(async () => ({ id: 'srv_1' })),
    pushState: vi.fn(async () => ({ id: 'srv_1' })),
    upsertRecord: vi.fn(async () => ({ id: 'srv_1' })),
    listRecords: vi.fn(async () => []),
    setDocWebhook: vi.fn(async () => ({ ok: true })),
    docHeadHtml: vi.fn((t) => `<div>${t}</div>`),
    docSignHtml: vi.fn(() => ''),
    refreshOrgName: vi.fn(async () => ''),
    getOrgName: vi.fn(() => ''),
    getDocSign: vi.fn(() => ({ author: '', confirmer: '', receiver: '', signImage: '' })),
    ROLES: { worker: '요양보호사', manager: '관리책임자' },
}));

const flush = () => new Promise(r => setTimeout(r, 0));
const member = { facility_id: 'fac_1', role: 'worker', facilities: { id: 'fac_1', name: '테스트요양원' } };

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
});

describe('CO-14/15 요양일지 write-through', () => {
    it('멤버십 있으면 submitRecord — 구조화 페이로드만·자유서술 제외·_sync 표기', async () => {
        const { myMembership, submitRecord } = await import('../../../../src/exams/carework/facility.js');
        myMembership.mockResolvedValue(member);
        const { addCareLog, listCareLogs } = await import('../../../../src/exams/carework/care-log-store.js');
        const r = addCareLog({
            client: '김철수', service: '방문요양', date: '2026-11-06', start: '09:00', end: '11:00',
            activities: { daily: ['식사 보조'] }, obs: { meal: '전' }, note: '자유 서술 메모', text: '원문 텍스트',
        });
        expect(r.ok).toBe(true);
        await flush(); await flush();
        expect(submitRecord).toHaveBeenCalledTimes(1);
        const arg = submitRecord.mock.calls[0][0];
        expect(arg.facilityId).toBe('fac_1');
        expect(arg.docType).toBe('care_log');
        expect(arg.localId).toBe(r.id);
        expect(arg.client).toBe('김철수');
        expect(arg.payload.obs).toEqual({ meal: '전' });
        // CO-06/14 계약 — 자유서술 원문은 L0 유지, 서버 페이로드에 미포함
        expect(arg.payload.note).toBeUndefined();
        expect(arg.payload.text).toBeUndefined();
        expect(listCareLogs()[0]._sync).toBe('done');
    });

    it('멤버십 없으면 서버 호출 없이 로컬 저장만 — _sync 미표기', async () => {
        const { myMembership, submitRecord } = await import('../../../../src/exams/carework/facility.js');
        myMembership.mockResolvedValue(null);
        const { addCareLog, listCareLogs, syncPendingCareLogs } = await import('../../../../src/exams/carework/care-log-store.js');
        addCareLog({ client: '이영희', service: '방문요양', date: '2026-11-06', activities: {}, obs: {}, note: '', text: '' });
        await flush(); await flush();
        expect(submitRecord).not.toHaveBeenCalled();
        expect(listCareLogs()[0]._sync).toBeUndefined();
        // 재전송 경로 — 가입 후에도 호출은 하지 않음 (미가입 유지 시 no-op)
        await syncPendingCareLogs();
        expect(submitRecord).not.toHaveBeenCalled();
    });
});

describe('CO-15 상태형 upsert — roster·audit·client', () => {
    it('근무 배정 저장 → pushState doc_type=roster·local_id=id·_sync 표기', async () => {
        const { pushState } = await import('../../../../src/exams/carework/facility.js');
        const { addRoster, listRoster } = await import('../../../../src/exams/carework/roster-store.js');
        const r = addRoster({ date: '2026-11-07', shift: 'day', worker: '김요양', note: '' });
        expect(r.ok).toBe(true);
        await flush(); await flush();
        expect(pushState).toHaveBeenCalledTimes(1);
        const arg = pushState.mock.calls[0][0];
        expect(arg.docType).toBe('roster');
        expect(arg.localId).toBe(r.id);
        expect(arg.payload.shift).toBe('day');
        expect(listRoster()[0]._sync).toBe('done');
    });

    it('점검 스냅샷 → pushState doc_type=audit·local_id=audit_state·payload.checks', async () => {
        const { pushState } = await import('../../../../src/exams/carework/facility.js');
        const { toggleCheck, loadChecks, pushAuditState } = await import('../../../../src/exams/carework/care-audit.js');
        toggleCheck('a1'); toggleCheck('a2');
        expect(loadChecks()).toEqual({ a1: true, a2: true });
        await pushAuditState();
        expect(pushState).toHaveBeenCalledTimes(1);
        const arg = pushState.mock.calls[0][0];
        expect(arg.docType).toBe('audit');
        expect(arg.localId).toBe('audit_state');
        expect(arg.payload.checks).toEqual({ a1: true, a2: true });
    });

    it('대상자 저장 → pushState doc_type=client — name+room만 서버 전송 (CO-11 최소 필드)', async () => {
        const { pushState } = await import('../../../../src/exams/carework/facility.js');
        const { saveClient, listClients } = await import('../../../../src/exams/carework/care-client-store.js');
        const r = saveClient({ name: '박복순', room: '201', birth: '1940-01-01', allergy: '페니실린', phone: '010-1111-2222', memo: '낙상 주의' });
        expect(r.ok).toBe(true);
        await flush(); await flush();
        expect(pushState).toHaveBeenCalledTimes(1);
        const arg = pushState.mock.calls[0][0];
        expect(arg.docType).toBe('client');
        expect(arg.payload).toEqual({ name: '박복순', room: '201' });  // 생년월일·병력·연락처·메모는 L0 유지
        expect(listClients()[0]._sync).toBe('done');
    });
});

describe('CO-11 시설 명부 양방향 머지', () => {
    it('서버 명단 중 로컬 미등재 성명만 추가 — 가져온 항목은 _sync=done(에코 차단)·중복 성명 스킵', async () => {
        const { myMembership, listRecords, pushState } = await import('../../../../src/exams/carework/facility.js');
        myMembership.mockResolvedValue(member);
        listRecords.mockResolvedValue([
            { id: 'r1', doc_type: 'client', client: '서버대상A', payload: { name: '서버대상A', room: '301' } },
            { id: 'r2', doc_type: 'client', client: '로컬대상', payload: { name: '로컬대상', room: '999' } }, // 로컬과 성명 중복 → 스킵
        ]);
        const { saveClient, listClients, syncFacilityClients } = await import('../../../../src/exams/carework/care-client-store.js');
        const loc = saveClient({ name: '로컬대상', room: '101' });
        expect(loc.ok).toBe(true);
        await flush(); await flush();
        expect(pushState).toHaveBeenCalledTimes(1);  // 로컬분 업로드
        await syncFacilityClients();
        const names = listClients().map(x => x.name);
        expect(names).toContain('서버대상A');
        expect(names).toContain('로컬대상');
        expect(names.filter(n => n === '로컬대상')).toHaveLength(1);
        const merged = listClients().find(x => x.name === '서버대상A');
        expect(merged.room).toBe('301');
        expect(merged._sync).toBe('done');           // 서버 기원 — 재업로드 에코 차단 표기
        // 머지된 항목을 다시 밀어내지 않음 — pushState는 로컬 저장 1건만
        expect(pushState).toHaveBeenCalledTimes(1);
    });
});
