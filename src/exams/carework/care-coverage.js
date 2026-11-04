// src/exams/carework/care-coverage.js
// @spec CO-10 — 평가 증적 커버리지 (점검 항목 ↔ 기록 유무 매칭, 품질 판단 아님)
/** 점검 항목별 증적 기록 유무 — 기록 존재만 확인, 품질·적합성은 판단하지 않음
 * @param {{logs?: any[], visits?: any[], incidents?: any[], handovers?: any[], clients?: any[]}} [stores]
 */
export function auditCoverage(stores = {}) {
    const { logs = [], visits = [], incidents = [], handovers = [], clients = [] } = stores;
    const items = [
        { key: '명부', ok: clients.length > 0 },
        { key: '일지', ok: logs.length > 0 },
        { key: '관찰(obs)', ok: logs.some(l => l.obs && (l.obs.meal || l.obs.sleep || l.obs.void)) },
        { key: '방문·면회', ok: visits.length > 0 },
        { key: '인수인계', ok: handovers.length > 0 },
        { key: '사고보고', ok: incidents.length > 0 },
    ];
    const missing = items.filter(i => !i.ok).map(i => i.key);
    return { covered: items.length - missing.length, total: items.length, missing,
        text: `증적 커버리지 ${items.length - missing.length}/${items.length}${missing.length ? ` — 부족: ${missing.join('·')}` : ' — 전항목 기록 있음'}` };
}
