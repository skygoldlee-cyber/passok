// src/exams/carework/care-log.js — 요양일지·서비스기록지 생성 로직
// @spec none — 시험 전용 도메인 로직 (DA-13)
// 제공기준 고시 기록 항목 기반 표준 일지 텍스트 자동 조립 (DOC-DSN-42 Phase 3)
import { toCsv } from '../../content/csv-utils.js';
import { fmtDocName } from '../../content/name-fmt.js';

export const SERVICE_TYPES = [
    { key: 'visit-care', label: '방문요양' },
    { key: 'visit-bath', label: '방문목욕' },
    { key: 'visit-nurse', label: '방문간호 보조' },
    { key: 'daycare', label: '주야간보호' },
    { key: 'shortstay', label: '단기보호' },
];

export const ACTIVITY_GROUPS = [
    { key: 'physical', label: '신체활동 지원', items: ['세면·목욕', '식사 보조', '배설·의복', '체위 변경', '이동·보행'] },
    { key: 'household', label: '가사·일상생활 지원', items: ['청소·정리', '세탁', '식사 준비', '외출·물품구매 동행'] },
    { key: 'cognitive', label: '정서·인지 지원', items: ['말벗·정서 지원', '인지활동·여가', '상태 관찰'] },
];

/** @param {*} in_ */
const _reqOk = in_ => Boolean(in_ && in_.date && in_.client && in_.service);

/** @param {string} k */
const _svcLabel = k => SERVICE_TYPES.find((/** @type {*} */ s) => s.key === k)?.label || k;

/** 일시 표기 — 'YYYY-MM-DD HH:MM~HH:MM' (시작시각 없으면 일자만) */
/** @param {*} in_ */
const _when = in_ => `${in_.date}${in_.start ? ` ${in_.start}~${in_.end || ''}` : ''}`;

/** 빈 입력 대체 — '  ' → 기본 문구 */
/** @param {string} s @param {string} d */
const _or = (s, d) => (s || '').trim() || d;

/** 선택 활동 → [그룹라벨, '항목 · 항목'] 쌍 (미선택 그룹 생략) */
/** @param {*} acts */
const _actRows = acts => /** @type {string[][]} */ (ACTIVITY_GROUPS
    .map(g => {
        const sel = ((acts || {})[g.key] || []).filter(Boolean);
        return sel.length ? [g.label, sel.join(' · ')] : null;
    }).filter(Boolean));

/** @param {string[]} head @param {string[][]} rows */
const _kvTbl = (head, rows) =>
    ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|',
        ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');

/** @param {{date:string, client:string, service:string, start:string, end:string, activities:Object<string,string[]>, note:string, obs?:Object<string,string>}} in_ */
export function buildCareLog(in_) {
    if (!_reqOk(in_)) return null;
    const lines = ['■ 요양일지',
        `일시: ${_when(in_)}`,
        `대상자: ${fmtDocName(in_.client)} 님`,
        `급여 종류: ${_svcLabel(in_.service)}`,
        '', '■ 제공 서비스 내용'];
    for (const [label, text] of _actRows(in_.activities)) lines.push(`[${label}] ${text}`);
    const obs = obsText(in_.obs);
    if (obs) lines.push(`[상태 관찰] ${obs}`);
    lines.push('', '■ 특이사항');
    lines.push(`- ${_or(in_.note, '특이사항 없음')}`);
    lines.push('', '제공자: 요양보호사 ____________');
    return lines.join('\n');
}

const _OBS_LABELS = /** @type {[string, string][]} */ ([['meal', '식사량'], ['sleep', '수면'], ['voided', '배변']]);
// 공단 급여제공기록지 표현 — 칩 축약값(전/반/소)은 출력에서 정식 표기로 확장
// (P1-4 '붙여넣기 재사용' — 기록지에 그대로 옮길 수 있는 문구여야 함)
const _OBS_FULL = /** @type {Object<string, Object<string,string>>} */ ({
    meal: { '전': '전량', '반': '½ 이상', '소': '½ 미만' },
});
/** 관찰 칩 입력 → '식사량: 전량 · 수면: 양호 · 배변: 정상' (미선택 항목 생략) */
/** @param {*} obs */
const obsText = obs => _OBS_LABELS
    .map(([k, label]) => obs && obs[k] ? `${label}: ${(_OBS_FULL[k] || {})[obs[k]] || obs[k]}` : '')
    .filter(Boolean).join(' · ');

/**
 * 요양일지 격식표 MD — 기본정보·제공서비스·관찰·특이사항을 표로 구성 (내보내기 표준 초안).
 * buildCareLog(평문 미리보기·복사)와 쌍 — docx·기관 양식 블록({{기록내용}})에 삽입된다.
 * @param {*} in_
 */
export function buildCareLogMd(in_) {
    if (!_reqOk(in_)) return null;
    const out = [_kvTbl(['항목', '내용'], [
        ['일시', _when(in_)],
        ['대상자', `${fmtDocName(in_.client)} 님`],
        ['급여 종류', _svcLabel(in_.service)],
    ])];
    const rows = _actRows(in_.activities);
    const obs = obsText(in_.obs);
    if (obs) rows.push(['상태 관찰', obs]);
    if (rows.length) out.push(_kvTbl(['구분', '제공 서비스 내용'], rows));
    out.push(_kvTbl(['특이사항'], [[_or(in_.note, '특이사항 없음')]]));
    return out.join('\n\n');
}

/** CO-07 공단 급여제공기록지 양식 — ERP·공단 앱에 붙여넣는 텍스트 (이중 입력 해소) */
/** @param {*} in_ */
export function buildRecordText(in_) {
    if (!in_ || !in_.date || !in_.client) return null;
    const acts = Object.values(in_.activities || {}).flat().filter(Boolean);
    return [
        '급여제공기록지',
        `대상자: ${fmtDocName(in_.client)}`,
        `일시: ${in_.date} ${in_.start || ''}~${in_.end || ''}`,
        `급여종류: ${_svcLabel(in_.service)}`,
        `서비스 내용: ${acts.length ? acts.join(', ') : '(내용 기록)'}`,
        `특이사항: ${_or(in_.note, '없음')}`,
    ].join('\n');
}

/** 저장 일지 목록 → CSV 텍스트 (UTF-8 BOM — Excel 한글 호환). 활동은 '그룹: 항목·항목' 병합 */
/** @param {*[]} items */
export function careLogsToCsv(items) {
    const svcLabel = (/** @type {string} */ k) => SERVICE_TYPES.find((/** @type {*} */ s) => s.key === k)?.label || k || '';
    const actText = (/** @type {*} */ acts) => ACTIVITY_GROUPS
        .map((/** @type {*} */ g) => (acts && acts[g.key] && acts[g.key].length) ? `${g.label}: ${acts[g.key].join('·')}` : '')
        .filter(Boolean).join(' | ');
    return toCsv(['일자', '대상자', '급여종류', '시작', '종료', '활동', '특이사항'], items, (/** @type {*} */ x) => [
        x.date || '', x.client || '', svcLabel(x.service), x.start || '', x.end || '',
        actText(x.activities), x.note || '',
    ]);
}
