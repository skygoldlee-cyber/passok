// src/exams/carework/views/care-calc.js — 장기요양 비용 계산 뷰
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { computeCareCost, formatWon } from '../care-calc.js';
import { GRADE_LIMITS, REDUCTIONS, EFFECTIVE_YEAR, FACILITY_TYPES } from '../care-calc-data.js';

const $ = (id) => document.getElementById(id);

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
    ];
    const condHtml = `<div class="care-calc-cond"><strong class="care-calc-cond-title">입력 조건</strong>${
        cond.map(([k, v]) => `<div class="care-calc-cond-row"><span>${k}</span><span>${v}</span></div>`).join('')}</div>`;
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
    out.innerHTML = condHtml
        + rows.map(([k, v, c]) => `<div class="care-calc-row${c ? ' ' + c : ''}"><span>${k}</span><strong>${v}</strong></div>`).join('')
        + `<p class="care-calc-src">근거(${EFFECTIVE_YEAR}년 기준): 노인장기요양보험법 §40 · 제공기준 고시 §13 · 본인부담금 감경 고시</p>`;
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
