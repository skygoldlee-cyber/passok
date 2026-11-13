// src/charts.js - SVG 차트 및 합격 진단 로직 모듈
// @spec C-01~05
// [모바일 PWA 견고성] 레지스트리는 index.html의 <script type=module data/registry.js>가
// 채우는 window 전역을 "가드"해서 읽는다. 정적 import 로 하드 의존하면, 레지스트리 파일
// 로드가 실패할 때 이 모듈(및 상위 app.js) 전체가 실행되지 않아 흰 화면이 되므로 지양.

import { getSimResultsHistory as getSimResults } from './core/state.js';
import { TIMING } from './config/timing.js';
import { getExamRules, resolveLegacySubjectKey, getActiveRegistry } from './core/exam-context.js';
import { esc } from './core/sanitize.js';

// CSS 변수에서 색상 읽기 (하드코딩 대체)
/** @param {string} name @param {string} fallback */
function cssVar(name, fallback) {
    try {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    } catch (e) { return fallback; }
}
const CHART_COLORS = {
    primary: () => cssVar('--color-primary', '#06b6d4'),
    success: () => cssVar('--color-success', '#10b981'),
    danger: () => cssVar('--color-danger', '#ef4444'),
    white: '#ffffff'
};

/* =======================================================
   📊 공통 툴팁 유틸리티 (Interactive Tooltip)
   ======================================================= */
/** @type {HTMLDivElement|null} */
let _chartTooltip = null;
/** @type {number|null} */
let _tooltipHideTimer = null;

function getChartTooltip() {
    if (_chartTooltip) return _chartTooltip;
    _chartTooltip = document.createElement('div');
    _chartTooltip.className = 'chart-tooltip';
    _chartTooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(_chartTooltip);
    // A-16 (SC 1.4.13) — hoverable: 포인터가 툴팁 위로 이동해도 유지
    _chartTooltip.addEventListener('mouseenter', () => {
        if (_tooltipHideTimer) { clearTimeout(_tooltipHideTimer); _tooltipHideTimer = null; }
    });
    _chartTooltip.addEventListener('mouseleave', () => hideChartTooltip());
    return _chartTooltip;
}

/** @param {string} html @param {number} x @param {number} y */
function showChartTooltip(html, x, y) {
    const tip = getChartTooltip();
    tip.innerHTML = html;
    tip.classList.add('is-visible');
    // 위치 보정: 화면 경계 넘지 않도록
    const rect = tip.getBoundingClientRect();
    let left = x + 12;
    let top = y - rect.height - 8;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 12;
    if (top < 8) top = y + 16;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    if (_tooltipHideTimer) { clearTimeout(_tooltipHideTimer); _tooltipHideTimer = null; }
}

function hideChartTooltip() {
    _tooltipHideTimer = setTimeout(() => {
        if (_chartTooltip) _chartTooltip.classList.remove('is-visible');
    }, TIMING.CHART_TOOLTIP_HIDE_MS);
}

// A-16 ② — Esc로 열린 차트 툴팁 해제 (모듈 1회 등록)
let _tooltipEscBound = false;
function _ensureTooltipEsc() {
    if (_tooltipEscBound) return;
    _tooltipEscBound = true;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _chartTooltip?.classList.contains('is-visible')) {
            _chartTooltip.classList.remove('is-visible');
        }
    });
    // persistent — 터치 개방 후에는 자동 소멸시키지 않고 바깥 터치로만 닫는다
    document.addEventListener('touchstart', (e) => {
        if (!_chartTooltip?.classList.contains('is-visible')) return;
        const t = /** @type {Element|null} */ (e.target);
        if (t && !t.closest('.chart-tooltip') && !t.closest('.chart-dot-interactive, .radar-point-interactive')) {
            _chartTooltip.classList.remove('is-visible');
        }
    }, { passive: true });
}

/**
 * SVG 요소에 hover + touch + 키보드 포커스 툴팁 바인딩.
 * A-15 — 대화형 포인트는 tabindex·aria-label을 부여해 포커스 가능·SR 판독 가능하게 한다.
 * A-16 — 포커스 개방·Esc 해제·hoverable·persistent.
 * @param {SVGElement} el - 툴팁을 붙일 SVG 요소
 * @param {string} html - 툴팁 HTML
 * @param {string} [ariaLabel] - 포인트 데이터의 텍스트 라벨 (SR용)
 */
function bindTooltip(el, html, ariaLabel) {
    el.style.cursor = 'pointer';
    // 키보드·SR 접근 트리거 (Safari 구형 대비 focusable 속성 병기)
    el.setAttribute('tabindex', '0');
    el.setAttribute('focusable', 'true');
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
    const showAtElement = () => {
        const r = el.getBoundingClientRect();
        showChartTooltip(html, r.left + r.width / 2, r.top);
    };
    el.addEventListener('mouseenter', (e) => {
        const me = /** @type {MouseEvent} */ (e);
        showChartTooltip(html, me.clientX, me.clientY);
    });
    el.addEventListener('mouseleave', () => hideChartTooltip());
    el.addEventListener('mousemove', (e) => {
        const me = /** @type {MouseEvent} */ (e);
        showChartTooltip(html, me.clientX, me.clientY);
    });
    // A-16 ① — 키보드 포커스 개방
    el.addEventListener('focus', showAtElement);
    el.addEventListener('blur', () => hideChartTooltip());
    // 모바일 터치 지원 (persistent — 바깥 터치로만 닫힘, _ensureTooltipEsc)
    el.addEventListener('touchstart', (e) => {
        const t = /** @type {TouchEvent} */ (e).touches[0];
        if (t) showChartTooltip(html, t.clientX, t.clientY);
    }, { passive: true });
    _ensureTooltipEsc();
}

/* =======================================================
   📊 모의고사 성적 차트 (Performance Line Chart)
   ======================================================= */
export function renderPerformanceChart() {
    const wrapper = document.getElementById('analytics-chart-wrapper');
    const emptyMsg = document.getElementById('empty-chart-msg');
    if (!wrapper) return;
    
    const history = getSimResults();
    
    if (history.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('is-hidden');
        // Remove old SVG if exists
        const oldSvg = wrapper.querySelector('svg');
        if (oldSvg) oldSvg.remove();
        return;
    }
    
    if (emptyMsg) emptyMsg.classList.add('is-hidden');
    const oldSvg = wrapper.querySelector('svg');
    if (oldSvg) oldSvg.remove();
    
    // 최근 5개 모의고사 성적 데이터 추출
    const recentData = history.slice(-5);
    
    // SVG 차트 그리기 (고정 논리 좌표 적용으로 clientWidth 비의존적 반응형 구현)
    const width = 500;
    const height = 240;
    const paddingLeft = 40;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 40;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const primary = CHART_COLORS.primary();
    // A-15 (SC 1.1.1) — SVG 차트는 role=img + 데이터 요약 aria-label로 텍스트 대체 제공
    const lineSummary = `모의고사 성적 추이 — 최근 ${recentData.length}회: ` +
        recentData.map(d => `${d.date} ${d.rate}%`).join(', ');
    let svgContent = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;" role="img" aria-label="${esc(lineSummary)}">
        <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${primary}" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="${primary}" stop-opacity="0.0"/>
            </linearGradient>
        </defs>
    `;
    
    // Grid Lines (0, 20, 40, 60, 80, 100%)
    for (let percent = 0; percent <= 100; percent += 20) {
        const y = paddingTop + chartHeight - (percent * chartHeight / 100);
        svgContent += `<line class="chart-grid-line" x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}"/>`;
        svgContent += `<text class="chart-label" x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end">${percent}%</text>`;
    }
    
    // X 축 눈금 계산
    const pointsCount = recentData.length;
    /** @type {number[]} */
    const xPositions = [];
    recentData.forEach((d, idx) => {
        const x = paddingLeft + (pointsCount > 1 ? (idx * chartWidth / (pointsCount - 1)) : chartWidth / 2);
        xPositions.push(x);
    });
    
    // 라인 좌표 계산 및 빌드
    let linePath = '';
    let areaPath = '';
    
    recentData.forEach((d, idx) => {
        const x = xPositions[idx];
        const y = paddingTop + chartHeight - (d.rate * chartHeight / 100);
        
        if (idx === 0) {
            linePath += `M ${x} ${y}`;
            areaPath += `M ${x} ${paddingTop + chartHeight} L ${x} ${y}`;
        } else {
            linePath += ` L ${x} ${y}`;
            areaPath += ` L ${x} ${y}`;
        }
        
        if (idx === recentData.length - 1) {
            areaPath += ` L ${x} ${paddingTop + chartHeight} Z`;
        }
    });
    
    // 라인이 1개인 경우 처리 방안
    if (pointsCount === 1) {
        const x = xPositions[0] || 0;
        const y = paddingTop + chartHeight - (((recentData[0] || {}).rate || 0) * chartHeight / 100);
        svgContent += `<circle class="chart-dot" cx="${x}" cy="${y}" r="6" data-idx="0"/>`;
        svgContent += `<text class="chart-value-label" x="${x}" y="${y - 12}">${(recentData[0] || {}).rate}%</text>`;
        svgContent += `<text class="chart-label" x="${x}" y="${height - 15}">${(recentData[0] || {}).date}</text>`;
    } else {
        // 채워진 영역 및 실선 추가
        svgContent += `<path class="chart-area" d="${areaPath}"/>`;
        svgContent += `<path class="chart-line" d="${linePath}"/>`;
        
        // 데이터 도트 및 라벨 추가
        recentData.forEach((d, idx) => {
            const x = xPositions[idx];
            const y = paddingTop + chartHeight - (d.rate * chartHeight / 100);
            svgContent += `<circle class="chart-dot chart-dot-interactive" cx="${x}" cy="${y}" r="5" data-idx="${idx}"/>`;
            svgContent += `<text class="chart-value-label" x="${x}" y="${y - 12}">${d.rate}%</text>`;
            svgContent += `<text class="chart-label" x="${x}" y="${height - 15}">${d.date}</text>`;
        });
    }
    
    svgContent += `</svg>`;
    wrapper.insertAdjacentHTML('beforeend', svgContent);

    // 인터랙티브 툴팁 바인딩 (라인 차트)
    const recentAvg = Math.round(recentData.reduce((s, d) => s + d.rate, 0) / recentData.length);
    wrapper.querySelectorAll('.chart-dot-interactive').forEach(dot => {
        const idx = parseInt(/** @type {SVGElement} */ (dot).dataset.idx || '0', 10);
        const d = recentData[idx];
        if (!d) return;
        const delta = idx > 0 ? d.rate - ((recentData[idx - 1] || {}).rate || 0) : null;
        const deltaHtml = delta !== null
            ? `<span style="color:${delta >= 0 ? CHART_COLORS.success() : CHART_COLORS.danger()};">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</span>`
            : '';
        bindTooltip(/** @type {SVGElement} */ (dot),
            `<div>${d.date}</div>` +
            `<div style="font-size:1.1rem;color:${CHART_COLORS.primary()};">${d.rate}%</div>` +
            (deltaHtml ? `<div style="margin-top:2px;">${deltaHtml}</div>` : '') +
            `<div style="margin-top:2px;color:rgba(255,255,255,0.6);font-size:0.72rem;">최근 평균 ${recentAvg}%</div>`,
            `${idx + 1}회차 ${d.date} — ${d.rate}%`
        );
    });
}

/* =======================================================
   📊 과목별 정답률 집계 (공통 헬퍼)
   - content/manifest.json에서 생성된 DATA_REGISTRY를 사용해 동적으로 과목별 집계
   ======================================================= */
/** @param {*[]} history */
function aggregateSubjectRates(history) {
    /** @type {Object.<string,number[]>} */
    const subjectRates = {};
    const subjects = (getActiveRegistry() || {}).subjects || [];
    subjects.forEach((/** @type {*} */ sub) => {
        subjectRates[sub.key] = [];
    });
    
    history.forEach((/** @type {*} */ r) => {
        if (r.subjectRates) {
            Object.keys(r.subjectRates).forEach(subj => {
                const rate = r.subjectRates[subj];
                if (rate !== null && rate !== undefined) {
                    // subjectN 형식 → registry 과목 키 매핑 (공용 규칙: exam-context.js)
                    const key = resolveLegacySubjectKey(subj);
                    if (subjectRates[key]) {
                        subjectRates[key].push(rate);
                    }
                }
            });
        } else {
            // 구버전 이력의 examId로 과목 매핑
            const exams = (getActiveRegistry() || {}).exams || [];
            const exam = exams.find(e => e.key === r.examId || (r.examId && r.examId.startsWith(e.key)));
            if (exam && subjectRates[exam.subject]) {
                (subjectRates[exam.subject] || []).push(r.rate);
            }
        }
    });
    return subjectRates;
}

/* =======================================================
   📈 합격 가능성 진단 (Pass/Fail Diagnosis)
   ======================================================= */
export function renderPassFailDiagnosis() {
    const area = document.getElementById('prediction-result-area');
    if (!area) return;
    
    const history = getSimResults();
    
    if (history.length === 0) {
        area.innerHTML = `
            <div class="prediction-placeholder">
                <i class="fa-solid fa-user-doctor"></i>
                <p>모의고사 점수를 토대로 과락 및 평균 통과 여부를 진단합니다.</p>
            </div>
        `;
        return;
    }
    
    // 최근 5개 모의고사 평균 점수 계산
    const recentExams = history.slice(-5);
    const avgRate = Math.round(recentExams.reduce((sum, r) => sum + r.rate, 0) / recentExams.length);
    
    // 과목별 최근 점수 추출하여 과락 판정
    const subjectRates = aggregateSubjectRates(history);
    const subjects = (getActiveRegistry() || {}).subjects || [];
    
    // 각 과목 최신 성적 추출
    const getLatestRate = (/** @type {string} */ subjKey) => {
        const rates = subjectRates[subjKey];
        if (!rates || rates.length === 0) return null;
        return rates[rates.length - 1]; // 가장 최신 데이터
    };
    
    /** @type {Object.<string,string>} */
    const subjectNames = {};
    subjects.forEach((/** @type {*} */ sub, /** @type {number} */ idx) => {
        subjectNames[sub.key] = `${idx + 1}과목: ${sub.name}`;
    });
    
    // 합격/과락 기준은 매니페스트 선언값 사용 (시험별 규칙 차이 대응)
    const rules = getExamRules();
    let isGuarak = false;
    /** @type {string[]} */
    const guarakSubjects = [];

    subjects.forEach(sub => {
        const rate = getLatestRate(sub.key);
        if (rate != null && rate < rules.subjectFailBelow) {
            isGuarak = true;
            guarakSubjects.push(sub.name);
        }
    });

    let statusClass = 'pass';
    let statusText = '합격 안정권';
    let advice = '현재 페이스를 유지하시면 무난하게 시험에 통과하실 것으로 예측됩니다!';

    if (avgRate >= rules.passAverage && !isGuarak) {
        statusClass = 'pass';
        statusText = '합격 예측';
    } else if (avgRate >= rules.passAverage && isGuarak) {
        statusClass = 'warning';
        statusText = '과락 경계';
        advice = `평균 점수는 합격선이나, 일부 과목(${guarakSubjects.join(', ')})에서 과락(${rules.subjectFailBelow}점 미만) 위기가 감지되었습니다. 해당 과목을 더 학습하세요!`;
    } else {
        statusClass = 'fail';
        statusText = '합격 미달';
        advice = `평균 점수가 합격 기준(${rules.passAverage}%)에 도달하지 못했습니다. 플래시카드와 훈련소를 통해 암기량을 보충하세요!`;
    }
    
    let subjectsHTML = '<div class="pred-subject-scores">';
    subjects.forEach((sub, idx) => {
        const rate = getLatestRate(sub.key);
        if (rate != null) {
            const shortName = sub.shortName || sub.name;
            subjectsHTML += `
                <div class="pred-subject-row ${rate < rules.subjectFailBelow ? 'danger' : ''}">
                    <span>${idx + 1}과목 (${shortName})</span>
                    <strong>${rate}% ${rate < rules.subjectFailBelow ? '(과락)' : ''}</strong>
                </div>
            `;
        }
    });
    subjectsHTML += '</div>';
    
    area.innerHTML = `
        <div class="pred-card-body">
            <div class="pred-status-header">
                <span class="pred-score-text">최근 평균 ${esc(avgRate)}%</span>
                <span class="pred-status-badge ${esc(statusClass)}">${esc(statusText)}</span>
            </div>
            <div class="pred-advice-box">
                <i class="fa-solid fa-lightbulb" style="color: var(--color-warning); margin-right: 0.5rem;"></i>
                ${esc(advice)}
            </div>
            ${subjectsHTML}
        </div>
    `;
}

/* =======================================================
   📊 과목별 역량 진단 레이더 차트 (N-Axis Radar Chart)
   ======================================================= */
export function renderRadarChart() {
    const wrapper = document.getElementById('radar-chart-wrapper');
    const emptyMsg = document.getElementById('empty-radar-msg');
    if (!wrapper) return;
    
    const history = getSimResults();
    
    if (history.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('is-hidden');
        const oldSvg = wrapper.querySelector('svg');
        if (oldSvg) oldSvg.remove();
        return;
    }
    
    if (emptyMsg) emptyMsg.classList.add('is-hidden');
    const oldSvg = wrapper.querySelector('svg');
    if (oldSvg) oldSvg.remove();
    
    // 과목별 평균 정답률 계산
    const subjectRates = aggregateSubjectRates(history);
    const subjects = (getActiveRegistry() || {}).subjects || [];
    const N = subjects.length;
    
    if (N < 3) {
        if (emptyMsg) {
            emptyMsg.textContent = "레이더 차트 분석은 최소 3개 과목 이상 필요합니다.";
            emptyMsg.classList.remove('is-hidden');
        }
        return;
    }
    
    const getAvgRate = (/** @type {string} */ subjKey) => {
        const rates = subjectRates[subjKey];
        if (!rates || rates.length === 0) return 50; // 기본값 50%
        return Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);
    };
    
    const subjectScores = subjects.map(sub => getAvgRate(sub.key));
    
    // 고정 논리 좌표 적용으로 clientWidth 비의존적 반응형 구현
    const width = 300;
    const height = 240;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) / 2 - 35;
    
    // N-축 좌표 매핑 함수 (12시 방향에서 시계방향으로 2*PI/N씩 회전)
    const getPoint = (/** @type {number} */ idx, /** @type {number} */ value) => {
        const scale = value / 100;
        const angle = (2 * Math.PI * idx) / N - (Math.PI / 2); // 12시 방향 시작을 위해 -PI/2
        const x = cx + scale * maxR * Math.cos(angle);
        const y = cy + scale * maxR * Math.sin(angle);
        return { x, y };
    };
    
    // A-15 — 레이더 차트 데이터 요약 텍스트 대체
    const radarSummary = `과목별 평균 정답률 — ` +
        subjects.map((sub, i) => `${i + 1}과목(${sub.shortName || sub.name}) ${subjectScores[i] || 0}%`).join(', ');
    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;" role="img" aria-label="${esc(radarSummary)}">`;
    
    // 1. Concentric Grid lines (20%, 40%, 60%, 80%, 100%)
    for (let level = 20; level <= 100; level += 20) {
        const points = [];
        for (let i = 0; i < N; i++) {
            const p = getPoint(i, level);
            points.push(`${p.x},${p.y}`);
        }
        svg += `<polygon class="radar-grid-line" points="${points.join(' ')}" />`;
        // grid label (12시 방향 축 근처에 표시)
        const lblP = getPoint(0, level);
        svg += `<text x="${lblP.x + 5}" y="${lblP.y + 4}" fill="rgba(255,255,255,0.2)" font-size="8" font-weight="600">${level}%</text>`;
    }
    
    // 2. Axes Lines & Labels
    subjects.forEach((sub, i) => {
        const edgeP = getPoint(i, 100);
        // 축 선
        svg += `<line class="radar-axis-line" x1="${cx}" y1="${cy}" x2="${edgeP.x}" y2="${edgeP.y}" />`;
        
        // 축 라벨 위치 결정 (100% 원 외부로 조금 더 오프셋)
        const angle = (2 * Math.PI * i) / N - (Math.PI / 2);
        const offset = 15;
        const labelX = cx + (maxR + offset) * Math.cos(angle);
        const labelY = cy + (maxR + offset) * Math.sin(angle) + 4; // 폰트 높이 보정
        
        let textAnchor = 'middle';
        const cos = Math.cos(angle);
        if (cos > 0.1) textAnchor = 'start';
        else if (cos < -0.1) textAnchor = 'end';
        
        const shortName = sub.shortName || sub.name;
        svg += `<text class="radar-axis-label" x="${labelX}" y="${labelY}" text-anchor="${textAnchor}">${i+1}과목 (${shortName})</text>`;
    });
    
    // 3. Data Polygon
    /** @type {string[]} */
    const userPoints = [];
    subjects.forEach((sub, i) => {
        const p = getPoint(i, subjectScores[i] || 0);
        userPoints.push(`${p.x},${p.y}`);
    });
    svg += `<polygon class="radar-polygon" points="${userPoints.join(' ')}" />`;
    
    // 4. Data dots and labels
    subjects.forEach((sub, i) => {
        const p = getPoint(i, subjectScores[i] || 0);
        svg += `<circle class="radar-point radar-point-interactive" cx="${p.x}" cy="${p.y}" data-idx="${i}" />`;
        svg += `<text x="${p.x}" y="${p.y - 8}" fill="${CHART_COLORS.white}" font-size="10" font-weight="700" text-anchor="middle">${subjectScores[i] || 0}%</text>`;
    });
    
    svg += `</svg>`;
    wrapper.insertAdjacentHTML('beforeend', svg);

    // 인터랙티브 툴팁 바인딩 (레이더 차트)
    const overallAvg = Math.round(subjectScores.reduce((s, r) => s + r, 0) / subjectScores.length);
    wrapper.querySelectorAll('.radar-point-interactive').forEach(dot => {
        const idx = parseInt(/** @type {SVGElement} */ (dot).dataset.idx || '0', 10);
        const sub = subjects[idx];
        if (!sub) return;
        const rate = subjectScores[idx] || 0;
        const rates = subjectRates[sub.key] || [];
        const examCount = rates.length;
        const shortName = sub.shortName || sub.name;
        const status = rate < getExamRules().subjectFailBelow ? '과락 위험' : '안정권';
        const statusColor = rate < getExamRules().subjectFailBelow ? CHART_COLORS.danger() : CHART_COLORS.success();
        bindTooltip(/** @type {SVGElement} */ (dot),
            `<div style="font-size:0.85rem;">${idx + 1}과목: ${shortName}</div>` +
            `<div style="font-size:1.1rem;color:${CHART_COLORS.primary()};margin-top:2px;">${rate}%</div>` +
            `<div style="margin-top:2px;color:${statusColor};">${status}</div>` +
            `<div style="margin-top:2px;color:rgba(255,255,255,0.6);font-size:0.72rem;">응시 ${examCount}회 · 전체 평균 ${overallAvg}%</div>`,
            `${idx + 1}과목 ${shortName} — 평균 ${rate}% (${status})`
        );
    });
}
