// src/exams/carework/care-trend.js — 대상자 관찰 추세 확인 (순수 로직, DOM·저장 비의존)
// @spec CO-03·CO-04 — 시험 전용 도메인 로직 (DA-13)
// 최근 N건 obs 시계열 → 연속 악화 감지. 표현 원칙: 의료적 판단 금지 — "기록 요약·확인 권장" 문구만
const _ORD = {
    meal: { 전: 3, 반: 2, 소: 1, label: '식사량' },
    sleep: { 양호: 3, 불량: 2, 불면: 1, label: '수면' },
};
const _norm = (/** @type {*} */ s) => String(s || '').trim();
const _match = (/** @type {*} */ r, /** @type {string|undefined} */ clientId, /** @type {string|undefined} */ name) => (r.clientId ? r.clientId === clientId : _norm(r.client) === _norm(name));

/**
 * 대상자별 obs 추세 확인 신호
 * @param {Array<*>} logs care-log 레코드
 * @param {{clientId?:string, name?:string, min?:number}} opts min=연속 판정 최소 건수(기본 3)
 * @returns {Array<{key:string,label:string,message:string}>}
 */
export function clientTrends(logs, { clientId, name, min = 3 } = {}) {
    const out = [];
    const mine = (logs || []).filter(r => _match(r, clientId, name))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    for (const [key, ord] of Object.entries(_ORD)) {
        const vals = [];
        for (const r of mine) {
            const v = r.obs?.[key];
            if (!v) break;                    // 관측 끊기면 추세 종료
            vals.push((/** @type {Object.<string,number>} */ (/** @type {unknown} */ (ord)))[v] ?? 0);
            if (vals.length >= min + 1) break;
        }
        const seq = vals.slice(0, min); // 최신순 — 악화는 배열상 비내림차 + 최신값이 가장 낮음
        if (seq.length >= min && seq.every((/** @type {number} */ v, /** @type {number} */ i) => i === 0 || v >= seq[i - 1]) && seq[0] < seq[seq.length - 1]) {
            out.push({ key, label: ord.label, message: `최근 ${min}회 기록에서 ${ord.label} 확인 권장` });
        }
    }
    return out;
}
