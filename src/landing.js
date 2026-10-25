// src/landing.js — 서비스 소개 랜딩 페이지 스크립트
// @spec LP-04,LP-05,LP-09
// 체험 데모 위젯(미니 퀴즈·학습계획 미리보기), 설치 CTA, 버전 표기.
// ES 모듈 — 순수 함수는 export해 단위 테스트에서 직접 검증한다.
// DOM 진입은 #landing-main 존재 시에만 (테스트 임포트 안전).

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const MS_PER_DAY = 86400000;

/** 내장 데모 JSON 파싱 — 블록 부재·파싱 실패 시 null (에러 무전파) */
export function parseDemoData(doc = (typeof document !== 'undefined' ? document : null)) {
    const el = doc && doc.getElementById('landing-demo-data');
    if (!el) return null;
    try {
        const data = JSON.parse(el.textContent || 'null');
        return data && Array.isArray(data.exams) ? data : null;
    } catch (_) { return null; }
}

/** 오늘 → 시험일 잔여 일수 (자정 기준, 과거/당일이면 0 이하 반환) */
export function daysUntil(examDate, now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(examDate + 'T00:00:00');
    if (Number.isNaN(target.getTime())) return NaN;
    return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * 잔여 일수 → 학습계획 미리보기.
 * @returns {{days:number, weeks:number, compressed:boolean,
 *            phases:Array<{name:string, weeks:number}>} | null}
 *   weeks<1이면 null (표시 불가)
 */
export function computePlanPreview(daysLeft, minLeadDays = 90) {
    if (!Number.isFinite(daysLeft) || daysLeft < 1) return null;
    const weeks = Math.ceil(daysLeft / 7);
    // 단계 비율: 개념 통독 40% → 문제 풀이·복습 40% → 모의고사·마무리 20%
    let p1 = Math.max(1, Math.round(weeks * 0.4));
    let p2 = Math.max(1, Math.round(weeks * 0.4));
    let p3 = weeks - p1 - p2;
    if (p3 < 1) { // 3주 미만 등 극단적 단기 — 마무리를 우선 보장하고 조정
        p3 = weeks >= 3 ? 1 : Math.max(0, weeks - 2);
        if (p1 + p2 + p3 > weeks) p2 = Math.max(0, weeks - p1 - p3);
        if (p1 + p2 + p3 > weeks) p1 = Math.max(0, weeks - p2 - p3);
    }
    return {
        days: daysLeft,
        weeks,
        compressed: daysLeft < minLeadDays,
        phases: [
            { name: '개념 통독', weeks: p1 },
            { name: '문제 풀이 · 오답 복습', weeks: p2 },
            { name: '모의고사 · 마무리', weeks: p3 },
        ].filter(p => p.weeks > 0),
    };
}

/** 과목별 문항 수 → 비중 (%) 배열. 전부 0/누락이면 균등 */
export function subjectShares(subjects) {
    if (!Array.isArray(subjects) || !subjects.length) return [];
    const total = subjects.reduce((s, x) => s + (Number(x.count) || 0), 0);
    const each = 100 / subjects.length;
    return subjects.map(x => ({
        name: x.name,
        count: Number(x.count) || 0,
        pct: total > 0 ? Math.round(((Number(x.count) || 0) / total) * 100) : Math.round(each),
    }));
}

/* ===================== DOM 렌더 (브라우저 전용) ===================== */

function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
}

function appCta(label) {
    const a = el('a', 'btn btn-primary', label);
    a.href = './index.html';
    return a;
}

/** 미니 퀴즈 위젯 — 선지 선택 → 정오답·해설·인용 → 다음 문항 → 결과 CTA (LP-04) */
function renderQuiz(host, examData) {
    const items = examData.quiz && examData.quiz.items;
    if (!Array.isArray(items) || !items.length) return;
    let idx = 0, score = 0;
    const head = el('div', 'demo-head');
    head.append(el('h3', null, '미니 퀴즈 체험'), el('span', 'demo-exam-tag', examData.appName || examData.name || ''));
    const body = el('div');
    host.append(head, body);

    function renderItem() {
        body.replaceChildren();
        const item = items[idx];
        body.append(el('p', 'demo-progress', `${idx + 1} / ${items.length}`));
        body.append(el('p', 'demo-question', item.question));
        const list = el('div', 'demo-choices');
        item.choices.forEach((choice, ci) => {
            const btn = el('button', 'demo-choice', `${CIRCLED[ci] || ci + 1} ${choice}`);
            btn.type = 'button';
            btn.addEventListener('click', () => {
                [...list.children].forEach((b, bi) => {
                    b.disabled = true;
                    if (bi === item.answer) b.classList.add('correct');
                });
                if (ci === item.answer) score += 1;
                else btn.classList.add('incorrect');
                if (item.explanation || item.citation) {
                    const ex = el('div', 'demo-explain', item.explanation || '');
                    if (item.citation) ex.append(el('span', 'demo-cite', `📌 ${item.citation}`));
                    body.append(ex);
                }
                const actions = el('div', 'demo-actions');
                const next = el('button', 'btn btn-secondary', idx + 1 < items.length ? '다음 문제' : '결과 보기');
                next.type = 'button';
                next.addEventListener('click', () => { idx += 1; idx < items.length ? renderItem() : renderResult(); });
                actions.append(next);
                body.append(actions);
            });
            list.append(btn);
        });
        body.append(list);
    }

    function renderResult() {
        body.replaceChildren();
        const r = el('div', 'demo-result');
        r.append(el('p', 'demo-result-score', `${score} / ${items.length}`));
        r.append(el('p', null, '실제 앱에서는 모든 문항이 교재 원문 인용과 연결됩니다.'));
        r.append(appCta('앱에서 계속하기'));
        body.append(r);
    }
    renderItem();
}

/** 학습계획 미리보기 — 시험일 입력 → 잔여 주수·단계·과목 비중 (LP-09) */
function renderPlan(host, examData) {
    const plan = examData.plan;
    if (!plan || !Array.isArray(plan.subjects) || !plan.subjects.length) return;
    const head = el('div', 'demo-head');
    head.append(el('h3', null, '학습계획 미리보기'), el('span', 'demo-exam-tag', examData.appName || examData.name || ''));
    const form = el('div', 'demo-plan-form');
    const label = el('label', null, '시험일을 입력하세요');
    const input = document.createElement('input');
    input.type = 'date';
    const tomorrow = new Date(Date.now() + MS_PER_DAY);
    input.min = tomorrow.toISOString().slice(0, 10);
    label.append(input);
    const go = el('button', 'btn btn-secondary', '계획 보기');
    go.type = 'button';
    form.append(label, go);
    const result = el('div', 'demo-plan-result');
    host.append(head, form, result);

    go.addEventListener('click', () => {
        result.replaceChildren();
        const days = daysUntil(input.value);
        const preview = computePlanPreview(days, plan.minLeadDays || 90);
        if (!preview) {
            result.append(el('p', 'demo-plan-note', '오늘 이후의 시험일을 선택해 주세요.'));
            return;
        }
        result.append(el('p', 'demo-dday', `D-${preview.days} · 잔여 ${preview.weeks}주`));
        if (preview.compressed) {
            result.append(el('p', 'demo-plan-note', `권장 리드타임(${plan.minLeadDays}일) 미만 — 압축 플랜입니다.`));
        }
        const phases = el('div', 'demo-phases');
        preview.phases.forEach(p => {
            const row = el('div', 'demo-phase', `${p.name} — ${p.weeks}주`);
            const bar = el('div', 'demo-phase-bar');
            const fill = el('span');
            fill.className = 'demo-fill';
            fill.style.setProperty('--w', `${(p.weeks / preview.weeks) * 100}%`);
            fill.style.width = `${(p.weeks / preview.weeks) * 100}%`;
            bar.append(fill);
            row.append(bar);
            phases.append(row);
        });
        result.append(phases);
        const subs = el('div', 'demo-subjects');
        subjectShares(plan.subjects).forEach(s => {
            const row = el('div', 'demo-subject', `${s.name} ${s.pct}%`);
            const bar = el('div', 'demo-subject-bar');
            const fill = el('span');
            fill.style.width = `${s.pct}%`;
            bar.append(fill);
            row.append(bar);
            subs.append(row);
        });
        result.append(subs);
        result.append(appCta('이 계획으로 시작하기'));
    });
}

/** 설치 CTA — __deferredPrompt(pwa-install-capture) + standalone 감지 (LP-05) */
function initInstallCta() {
    const btn = document.getElementById('landing-install-btn');
    if (!btn) return;
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if (standalone || navigator.standalone === true) {
        // 이미 설치됨 — 설치 버튼을 앱 열기로 전환
        btn.replaceWith(appCta('앱 열기'));
        return;
    }
    btn.addEventListener('click', async () => {
        const prompt = window.__deferredPrompt;
        if (!prompt) { window.location.href = './index.html'; return; }
        prompt.prompt();
        try { await prompt.userChoice; } catch (_) { /* 무시 */ }
        window.__deferredPrompt = null;
    });
}

function init() {
    if (typeof document === 'undefined' || !document.getElementById('landing-main')) return;
    const data = parseDemoData();
    const section = document.getElementById('landing-demo-section');
    if (data && section) {
        for (const exam of data.exams) {
            renderQuiz(document.getElementById('landing-quiz-slot'), exam);
            renderPlan(document.getElementById('landing-plan-slot'), exam);
        }
        if (document.querySelector('#landing-quiz-slot .demo-head, #landing-plan-slot .demo-head')) {
            section.classList.remove('is-hidden');
        }
    }
    initInstallCta();
    const ver = document.getElementById('landing-version');
    if (ver && window.APP_VERSION) ver.textContent = window.APP_VERSION;
}
init();
