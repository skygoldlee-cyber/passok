// src/exams/carework/views/care-calc.js — 장기요양 비용 계산 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { computeCareCost, formatWon } from '../care-calc.js';
import { markFunnel } from '../care-funnel.js';
import { GRADE_LIMITS, REDUCTIONS, EFFECTIVE_YEAR, FACILITY_TYPES } from '../care-calc-data.js';
import { docHeadHtml, refreshOrgName } from '../facility.js';
export { careShare } from '../care-share.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const _val = (id, fallback) => {
    const el = /** @type {HTMLSelectElement|HTMLInputElement|null} */ ($(id));
    return el && el.value ? el.value : fallback;
};

const NC_FIELDS = { meal: 'care-nc-meal', snack: 'care-nc-snack', room: 'care-nc-room', groom: 'care-nc-groom', other: 'care-nc-other' };
const NC_LABELS = { meal: '식재료비', snack: '간식비', room: '상급침실료', groom: '이미용비', other: '기타 비급여' };
const NC_HOME_KEYS = ['meal', 'snack', 'groom', 'other']; // 상급침실료는 시설만

const _selLabel = (id) => {
    const el = /** @type {HTMLSelectElement|null} */ ($(id));
    const opt = el && el.options ? el.options[el.selectedIndex] : null;
    return opt ? opt.textContent : '';
};

/** 공단 책정 기준은 매년 고시 갱신 — 데이터 연도가 현재 연도보다 오래되면 구버전 */
const rateYearStale = () => new Date().getFullYear() > EFFECTIVE_YEAR;

/** 시설급여 이용액 자동 산정 — 등급별 1일당 수가 × 입소 일수 (고시 정량값) */
function facilityUse(facTypeKey, gradeKey, days) {
    const f = FACILITY_TYPES.find(x => x.key === facTypeKey);
    const rate = f && f.rates[gradeKey];
    return rate && days > 0 ? { use: rate * days, rate, days } : null;
}

function readForm() {
    const type = _val('care-type', 'home');
    const ncKeys = type === 'facility' ? Object.keys(NC_FIELDS) : NC_HOME_KEYS;
    const nonCovered = ncKeys.reduce((s, k) => s + (Number(_val(NC_FIELDS[k], '0')) || 0), 0);
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

export function careCalcRun() {
    const in_ = readForm();
    const r = computeCareCost(in_);
    const out = $('care-result');
    if (!out) return;
    if (!r) { out.innerHTML = '<p class="care-calc-err">입력을 확인하세요.</p>'; return; }
    // 입력 조건 — 인쇄·PDF 출력물이 결과만 보이지 않도록 조건을 결과물 상단에 병기
    const ncKeys = in_.type === 'facility' ? Object.keys(NC_FIELDS) : NC_HOME_KEYS;
    const cond = [
        ['급여 유형', in_.type === 'facility' ? '시설급여' : '재가급여'],
        ['장기요양등급', _selLabel('care-grade')],
        ...(in_.type === 'facility'
            ? [['시설 유형', _selLabel('care-fac-type')], ['월 입소 일수', `${_val('care-fac-days', '0')}일`]]
            : [['월 예상 급여 이용액', formatWon(in_.monthlyUse)]]),
        ...ncKeys.map(k => /** @type {[string, number]} */ ([k, Number(_val(NC_FIELDS[k], '0')) || 0]))
            .filter(([, v]) => v > 0)
            .map(([k, v]) => [`비급여·${NC_LABELS[k]}`, formatWon(v)]),
        ['본인부담 감경', _selLabel('care-reduction')],
        ['적용 기준', `${EFFECTIVE_YEAR}년 고시`],
    ];
    // 공단 책정 기준표 — 선택 급여유형의 등급별 고시 금액 (재가=월 한도액, 시설=1일 수가), 선택 등급 강조
    const sel = (k) => k === in_.grade ? ' class="care-doc-sel"' : '';
    let basisHtml;
    if (in_.type === 'facility') {
        const f = FACILITY_TYPES.find(x => x.key === _val('care-fac-type', '')) || FACILITY_TYPES[0];
        basisHtml = `<div class="care-doc-sec">공단 책정 기준 — ${esc(f.label)} 1일 수가 (${EFFECTIVE_YEAR}년)</div>`
            + `<table class="care-doc"><tbody>${GRADE_LIMITS.filter(g => f.rates[g.key])
                .map(g => `<tr${sel(g.key)}><td>${g.label}</td><td class="care-doc-num">${formatWon(f.rates[g.key])}/일</td></tr>`).join('')}</tbody></table>`;
    } else {
        basisHtml = `<div class="care-doc-sec">공단 책정 기준 — 재가 등급별 월 한도액 (${EFFECTIVE_YEAR}년)</div>`
            + `<table class="care-doc"><tbody>${GRADE_LIMITS
                .map(g => `<tr${sel(g.key)}><td>${g.label}</td><td class="care-doc-num">${formatWon(g.home)}</td></tr>`).join('')}</tbody></table>`;
    }
    const docRow = (/** @type {string[]} */ t) => `<tr${t[2] ? ` class="${t[2]}"` : ''}><td>${t[0]}</td><td class="care-doc-num">${t[1]}</td></tr>`;
    const rows = [
        ['총 이용액', formatWon(r.covered + r.overLimit)],
        ['공단 부담', formatWon(r.publicPay)],
        ['급여 본인부담금', formatWon(r.selfCovered)],
        ...(r.overLimit ? [['한도 초과 자부담', formatWon(r.overLimit)]] : []),
        ...(r.nonCovered ? [['비급여 자부담', formatWon(r.nonCovered)]] : []),
        ...(r.limit ? [['등급 월 한도', formatWon(r.limit)]] : []),
        ['실제 월 납부액', formatWon(r.selfPay), 'care-calc-total'],
        ...(in_._basis ? [[`급여비용 산정 — ${formatWon(in_._basis.rate)}/일 × ${in_._basis.days}일`, '']] : []),
    ];
    out.innerHTML =
        docHeadHtml('장기요양 비용 계산 결과')
        + `<div class="care-doc-sec">입력 조건</div><table class="care-doc"><tbody>${cond.map(docRow).join('')}</tbody></table>`
        + basisHtml
        + `<div class="care-doc-sec">계산 결과</div><table class="care-doc"><tbody>${rows.map(docRow).join('')}</tbody></table>`
        + `<p class="care-calc-src">근거(${EFFECTIVE_YEAR}년 기준): 노인장기요양보험법 §40 · 제공기준 고시 §13 · 본인부담금 감경 고시</p>`
        + (rateYearStale() ? `<p class="care-calc-err">⚠ ${EFFECTIVE_YEAR}년 고시 기준 — 현재 연도 고시가 아직 반영되지 않았으므로 결과는 참고용입니다.</p>` : '')
        + `<p class="care-doc-disclaimer">※ 계산 결과는 참고용 예상액입니다 — 실제 청구액은 공단 심사·기관 계약에 따라 달라질 수 있습니다.</p>`;
}

export function careCalcReset() {
    ['care-use', ...Object.values(NC_FIELDS)].forEach(id => {
        const e = /** @type {HTMLInputElement|null} */ ($(id));
        if (e) e.value = '';
    });
    const out = $('care-result'); if (out) out.innerHTML = '';
}

export function careCalcPrint() { careCalcRun(); window.print(); }

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
        const won = (n) => n.toLocaleString('ko-KR');
        lt.innerHTML = '<thead><tr><th>등급</th><th>월 한도액 (' + EFFECTIVE_YEAR + '년)</th></tr></thead>'
            + `<tbody>${GRADE_LIMITS.map(g => `<tr><td>${g.label}</td><td>${won(g.home)}원</td></tr>`).join('')}</tbody>`;
    }
    const g = $('care-grade');
    if (g && !g.children.length)
        g.innerHTML = GRADE_LIMITS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const r = $('care-reduction');
    if (r && !r.children.length)
        r.innerHTML = REDUCTIONS.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    const ft = /** @type {HTMLSelectElement|null} */ ($('care-fac-type'));
    if (ft && !ft.children.length)
        ft.innerHTML = FACILITY_TYPES.map(x => `<option value="${x.key}">${x.label}</option>`).join('');
    // 시설 일당 수가표 — 시설 유형 선택에 따라 해당 수가 렌더 (1일 수가·20% 본인부담 병기)
    const rt = $('care-fac-rate-table');
    if (ft && rt) {
        const won = (n) => n.toLocaleString('ko-KR');
        const renderRates = () => {
            const f = FACILITY_TYPES.find(x => x.key === ft.value) || FACILITY_TYPES[0];
            rt.innerHTML = '<thead><tr><th>등급</th><th>1일 수가</th><th>본인부담 20%</th></tr></thead>'
                + `<tbody>${GRADE_LIMITS.filter(g => f.rates[g.key]).map(g => `<tr><td>${g.label}</td><td>${won(f.rates[g.key])}원</td><td>${won(Math.round(f.rates[g.key] * 0.2))}원</td></tr>`).join('')}</tbody>`;
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
