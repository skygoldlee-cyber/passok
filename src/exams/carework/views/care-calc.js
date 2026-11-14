// src/exams/carework/views/care-calc.js — 장기요양 비용 계산 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { computeCareCost, formatWon } from '../care-calc.js';
import { markFunnel } from '../care-funnel.js';
import { GRADE_LIMITS, REDUCTIONS, EFFECTIVE_YEAR, FACILITY_TYPES } from '../care-calc-data.js';
import { docHeadHtml, refreshOrgName } from '../facility.js';
import { docMdHead, mdTable } from '../doc-md.js';
import { showConfirm } from '../../../ui-utils.js';
export { careShare } from '../care-share.js';

/** @param {string} id */
const $ = (id) => document.getElementById(id);
/** @param {*} s */
const esc = (s) => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}))[c] || c);

/** @param {string} id @param {string} fallback */
const _val = (id, fallback) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fallback;
};

const NC_FIELDS = { meal: 'care-nc-meal', snack: 'care-nc-snack', room: 'care-nc-room', groom: 'care-nc-groom', other: 'care-nc-other' };
const NC_LABELS = { meal: '식재료비', snack: '간식비', room: '상급침실료', groom: '이미용비', other: '기타 비급여' };
const NC_HOME_KEYS = ['meal', 'snack', 'groom', 'other']; // 상급침실료는 시설만

/** @param {string} id */
const _selLabel = (id) => {
    const el = /** @type {HTMLSelectElement|null} */ ($(id));
    const opt = el && el.options ? el.options[el.selectedIndex] : null;
    return opt ? opt.textContent : '';
};

/** 공단 책정 기준은 매년 고시 갱신 — 데이터 연도가 현재 연도보다 오래되면 구버전 */
const rateYearStale = () => new Date().getFullYear() > EFFECTIVE_YEAR;

/** 시설급여 이용액 자동 산정 — 등급별 1일당 수가 × 입소 일수 (고시 정량값) */
/** @param {string} facTypeKey @param {string} gradeKey @param {number} days */
function facilityUse(facTypeKey, gradeKey, days) {
    const f = FACILITY_TYPES.find((/** @type {*} */ x) => x.key === facTypeKey);
    const rate = f && f.rates[gradeKey];
    return rate && days > 0 ? { use: rate * days, rate, days } : null;
}

function readForm() {
    const type = _val('care-type', 'home');
    const ncKeys = type === 'facility' ? Object.keys(NC_FIELDS) : NC_HOME_KEYS;
    const nonCovered = ncKeys.reduce((/** @type {number} */ s, /** @type {string} */ k) => s + (Number(_val((/** @type {Object.<string,string>} */ (NC_FIELDS))[k] || '', '0')) || 0), 0);
    let monthlyUse = Number(_val('care-use', '0')) || 0, basis = null;
    if (type === 'facility') {
        const days = Number(_val('care-fac-days', '0')) || 0;
        const f = facilityUse(_val('care-fac-type', ''), _val('care-grade', 'g1'), days);
        if (f) { monthlyUse = f.use; basis = f; }
    }
    return {
        type,
        grade: _val('care-grade', 'g1'),
        monthlyUse,
        nonCovered,
        reduction: _val('care-reduction', 'none'),
        _basis: basis,
    };
}

/** 계산 문서 데이터 — 화면 HTML과 내보내기 MD가 같은 표 내용을 공유 (CO-13 표준 초안) */
function _calcDocData() {
    const in_ = readForm();
    const r = computeCareCost(in_);
    if (!r) return null;
    // 입력 조건 — 인쇄·PDF 출력물이 결과만 보이지 않도록 조건을 결과물 상단에 병기
    const ncKeys = in_.type === 'facility' ? Object.keys(NC_FIELDS) : NC_HOME_KEYS;
    const cond = /** @type {string[][]} */ ([
        ['급여 유형', in_.type === 'facility' ? '시설급여' : '재가급여'],
        ['장기요양등급', _selLabel('care-grade')],
        ...(in_.type === 'facility'
            ? [['시설 유형', _selLabel('care-fac-type')], ['월 입소 일수', `${_val('care-fac-days', '0')}일`]]
            : [['월 예상 급여 이용액', formatWon(in_.monthlyUse)]]),
        ...ncKeys.map((/** @type {string} */ k) => /** @type {[string, number]} */ ([k, Number(_val((/** @type {Object.<string,string>} */ (NC_FIELDS))[k] || '', '0')) || 0]))
            .filter(([, v]) => v > 0)
            .map(([k, v]) => [`비급여·${(/** @type {Object.<string,string>} */ (NC_LABELS))[k] || k}`, formatWon(v)]),
        ['본인부담 감경', _selLabel('care-reduction')],
        ['적용 기준', `${EFFECTIVE_YEAR}년 고시`],
    ]);
    // 공단 책정 기준표 — 선택 급여유형의 등급별 고시 금액 (재가=월 한도액, 시설=1일 수가)
    const f = in_.type === 'facility' ? (FACILITY_TYPES.find((/** @type {*} */ x) => x.key === _val('care-fac-type', '')) || FACILITY_TYPES[0]) : null;
    const basisTitle = f ? `공단 책정 기준 — ${f.label} 1일 수가 (${EFFECTIVE_YEAR}년)` : `공단 책정 기준 — 재가 등급별 월 한도액 (${EFFECTIVE_YEAR}년)`;
    const basisRows = (f ? GRADE_LIMITS.filter((/** @type {*} */ g) => f.rates[g.key]).map((/** @type {*} */ g) => [g.label, `${formatWon(f.rates[g.key])}/일`])
        : GRADE_LIMITS.map((/** @type {*} */ g) => [g.label, formatWon(g.home)]))
        .map((/** @type {string[]} */ row) => ({ row, sel: row[0] === _selLabel('care-grade') }));
    const rows = /** @type {string[][]} */ ([
        ['총 이용액', formatWon(r.covered + r.overLimit)],
        ['공단 부담', formatWon(r.publicPay)],
        ['급여 본인부담금', formatWon(r.selfCovered)],
        ...(r.overLimit ? [['한도 초과 자부담', formatWon(r.overLimit)]] : []),
        ...(('nonCovered' in r && r.nonCovered) ? [['비급여 자부담', formatWon(/** @type {number} */ (r.nonCovered))]] : []),
        ...(r.limit ? [['등급 월 한도', formatWon(/** @type {number} */ (r.limit))]] : []),
        ['실제 월 납부액', formatWon(r.selfPay), 'care-calc-total'],
        ...(in_._basis ? [[`급여비용 산정 — ${formatWon(in_._basis.rate)}/일 × ${in_._basis.days}일`, '']] : []),
    ]);
    return { in_, cond, basisTitle, basisRows, rows };
}

export function careCalcRun() {
    const d = _calcDocData();
    const out = $('care-result');
    if (!out) return;
    if (!d) { out.innerHTML = '<p class="care-calc-err">입력을 확인하세요.</p>'; return; }
    const sel = (/** @type {boolean} */ b) => b ? ' class="care-doc-sel"' : '';
    const basisHtml = `<div class="care-doc-sec">${esc(d.basisTitle)}</div>`
        + `<table class="care-doc"><tbody>${d.basisRows
            .map((/** @type {*} */ b) => `<tr${sel(b.sel)}><td>${b.row[0]}</td><td class="care-doc-num">${b.row[1]}</td></tr>`).join('')}</tbody></table>`;
    const docRow = (/** @type {string[]} */ t) => `<tr${t[2] ? ` class="${t[2]}"` : ''}><td>${t[0]}</td><td class="care-doc-num">${t[1]}</td></tr>`;
    out.innerHTML =
        docHeadHtml('장기요양 비용 계산 결과')
        + `<div class="care-doc-sec">입력 조건</div><table class="care-doc"><tbody>${d.cond.map(docRow).join('')}</tbody></table>`
        + basisHtml
        + `<div class="care-doc-sec">계산 결과</div><table class="care-doc"><tbody>${d.rows.map(docRow).join('')}</tbody></table>`
        + `<p class="care-calc-src">근거(${EFFECTIVE_YEAR}년 기준): 노인장기요양보험법 §40 · 제공기준 고시 §13 · 본인부담금 감경 고시</p>`
        + (rateYearStale() ? `<p class="care-calc-err">⚠ ${EFFECTIVE_YEAR}년 고시 기준 — 현재 연도 고시가 아직 반영되지 않았으므로 결과는 참고용입니다.</p>` : '')
        + `<p class="care-doc-disclaimer">※ 계산 결과는 참고용 예상액입니다 — 실제 청구액은 공단 심사·기관 계약에 따라 달라질 수 있습니다.</p>`;
}

/** 계산 결과 MD 초안 — 조건·책정 기준·결과를 표로 (docx 파생 원본) */
export function careCalcDocMd() {
    const d = _calcDocData();
    if (!d) return '';
    return docMdHead('장기요양 비용 계산 결과')
        + '\n### 입력 조건\n\n' + mdTable(['항목', '내용'], d.cond)
        + `\n\n### ${d.basisTitle}\n\n` + mdTable(['등급', '금액'], d.basisRows.map((/** @type {*} */ b) => b.sel ? [`▶ ${b.row[0]}`, b.row[1]] : b.row))
        + '\n\n### 계산 결과\n\n' + mdTable(['항목', '금액'], d.rows.map((/** @type {string[]} */ r) => [r[0] || '', r[1] || '']))
        + `\n\n근거(${EFFECTIVE_YEAR}년 기준): 노인장기요양보험법 §40 · 제공기준 고시 §13 · 본인부담금 감경 고시`
        + '\n\n※ 계산 결과는 참고용 예상액입니다 — 실제 청구액은 공단 심사·기관 계약에 따라 달라질 수 있습니다.';
}

export async function careCalcReset() {
    if (!await showConfirm('입력한 내용을 초기화할까요?', '초기화 확인')) return;
    ['care-use', ...Object.values(NC_FIELDS)].forEach(id => {
        const e = /** @type {HTMLInputElement|null} */ ($(id));
        if (e) e.value = '';
    });
    const out = $('care-result'); if (out) out.innerHTML = '';
}

export function careCalcPrint() {
    careCalcRun();
    const out = $('care-result');
    if (!out || !out.textContent.trim() || out.querySelector('.care-calc-err')) return; // 오류 상태는 화면에 이미 표시됨 — 백지 인쇄 방지
    window.print();
}

export function initCareCalcView() {
    markFunnel('tool:care-calc');
    void refreshOrgName();
    // 적용 기준 연도 — 공단 고시는 매년 갱신되므로 계산 전 기준 연도를 항상 표시, 미반영 시 경고
    const yl = $('care-year-label');
    if (yl) yl.textContent = String(EFFECTIVE_YEAR);
    const yn = $('care-year-note');
    if (yn) {
        yn.textContent = rateYearStale()
            ? `적용 기준: ${EFFECTIVE_YEAR}년 고시 — ${new Date().getFullYear()}년 고시가 아직 반영되지 않았습니다. 결과는 ${EFFECTIVE_YEAR}년 기준 참고용입니다.`
            : `적용 기준: ${EFFECTIVE_YEAR}년 고시`;
        yn.classList.toggle('care-calc-err', rateYearStale());
    }
    // 등급별 재가 월 한도표 — 당해연도(EFFECTIVE_YEAR) 기준만 표시
    const lt = $('care-limit-table');
    if (lt && !lt.children.length) {
        const won = (/** @type {number} */ n) => n.toLocaleString('ko-KR');
        lt.innerHTML = '<thead><tr><th>등급</th><th>월 한도액 (' + EFFECTIVE_YEAR + '년)</th></tr></thead>'
            + `<tbody>${GRADE_LIMITS.map((/** @type {*} */ g) => `<tr><td>${g.label}</td><td>${won(g.home)}원</td></tr>`).join('')}</tbody>`;
    }
    const g = $('care-grade');
    if (g && !g.children.length)
        g.innerHTML = GRADE_LIMITS.map((/** @type {*} */ x) => `<option value="${x.key}">${x.label}</option>`).join('');
    const r = $('care-reduction');
    if (r && !r.children.length)
        r.innerHTML = REDUCTIONS.map((/** @type {*} */ x) => `<option value="${x.key}">${x.label}</option>`).join('');
    const ft = /** @type {HTMLSelectElement|null} */ ($('care-fac-type'));
    if (ft && !ft.children.length)
        ft.innerHTML = FACILITY_TYPES.map((/** @type {*} */ x) => `<option value="${x.key}">${x.label}</option>`).join('');
    // 시설 일당 수가표 — 시설 유형 선택에 따라 해당 수가 렌더 (1일 수가·20% 본인부담 병기)
    const rt = $('care-fac-rate-table');
    if (ft && rt) {
        const won = (/** @type {number} */ n) => n.toLocaleString('ko-KR');
        const renderRates = () => {
            const f = FACILITY_TYPES.find((/** @type {*} */ x) => x.key === ft.value) || FACILITY_TYPES[0];
            rt.innerHTML = '<thead><tr><th>등급</th><th>1일 수가</th><th>본인부담 20%</th></tr></thead>'
                + `<tbody>${GRADE_LIMITS.filter((/** @type {*} */ g) => f.rates[g.key]).map((/** @type {*} */ g) => `<tr><td>${g.label}</td><td>${won(f.rates[g.key])}원</td><td>${won(Math.round(f.rates[g.key] * 0.2))}원</td></tr>`).join('')}</tbody>`;
        };
        ft.addEventListener('change', renderRates);
        renderRates();
    }
    // 상급침실료·이용액 입력은 급여 유형별로 토글 — 시설은 수가×일수 자동 산정
    const t = /** @type {HTMLSelectElement|null} */ ($('care-type'));
    const roomWrap = $('care-nc-room-wrap');
    const useWrap = $('care-use-wrap');
    const facWrap = $('care-fac-wrap');
    if (t && roomWrap && useWrap && facWrap) {
        const syncType = () => {
            const fac = t.value === 'facility';
            roomWrap.hidden = !fac;
            useWrap.hidden = fac;
            facWrap.hidden = !fac;
        };
        t.addEventListener('change', syncType);
        syncType();
    }
}
