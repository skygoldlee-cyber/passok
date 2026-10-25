// src/views/exam-select.js — 시험 선택(피커) 뷰
// @spec ES-01~03,ES-06
// 멀티시험 플랫폼의 홈: 등록된 시험 목록을 카드로 표시하고 선택 시 시험을 전환한다.
// 카드에는 시험별 진도 요약(외운 카드·퀴즈 정답률·최근 학습일·D-day)과 액센트 스왓치를 표시한다.
import { getExamList, getCurrentExamId, selectExam, peekExamValue, resolveExamThemeTokens } from '../exam-context.js';
import { getItem, setItem } from '../storage.js';
import { STORAGE_KEYS } from '../storage-keys.js';
import { esc } from '../sanitize.js';
import { todayKey } from '../utils.js';
import { switchView } from './navigation.js';
import { showAlert } from '../ui-utils.js';

/**
 * 시험 카드 요약 지표 집계 — 원시 저장값(JSON 문자열)을 파싱해 순수하게 계산 (ES-06).
 * @param {{memorizedJson?:string|null, quizJson?:string|null, calendarJson?:string|null, examDate?:string|null, today:string}} probe
 * @returns {{cards:number, solved:number, accuracy:number|null, lastStudy:string|null, dday:number|null}}
 */
export function summarizeExamProgress(probe) {
    let cards = 0, solved = 0, correct = 0, lastStudy = null, dday = null;
    try {
        const a = JSON.parse(probe.memorizedJson || '[]');
        if (Array.isArray(a)) cards = a.length;
    } catch (e) { /* noop */ }
    try {
        const q = JSON.parse(probe.quizJson || '{}');
        if (q && typeof q === 'object' && !Array.isArray(q)) {
            solved = Object.keys(q).length;
            correct = Object.values(q).filter(r => r && r.correct).length;
        }
    } catch (e) { /* noop */ }
    try {
        const c = JSON.parse(probe.calendarJson || '{}');
        if (c && typeof c === 'object' && !Array.isArray(c)) {
            const days = Object.keys(c).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
            if (days.length) lastStudy = days[days.length - 1];
        }
    } catch (e) { /* noop */ }
    if (typeof probe.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(probe.examDate)) {
        const diff = Math.round((Date.parse(`${probe.examDate}T00:00:00`) - Date.parse(`${probe.today}T00:00:00`)) / 86400000);
        if (Number.isFinite(diff)) dday = diff;
    }
    return { cards, solved, accuracy: solved ? Math.round((correct / solved) * 100) : null, lastStudy, dday };
}

/** 시험 카드 요약행 — 시험 네임스페이스의 진도 키를 읽기 전용 조회해 한 줄로 표시 (ES-06) */
function _examSummaryHtml(examId) {
    const s = summarizeExamProgress({
        memorizedJson: peekExamValue(examId, STORAGE_KEYS.FC_MEMORIZED),
        quizJson: peekExamValue(examId, STORAGE_KEYS.QUIZ_RESULTS),
        calendarJson: peekExamValue(examId, STORAGE_KEYS.STUDY_CALENDAR),
        examDate: peekExamValue(examId, STORAGE_KEYS.EXAM_DATE),
        today: todayKey(),
    });
    if (!s.cards && !s.solved && !s.lastStudy) {
        return '<div class="exam-select-stats exam-select-stats-empty">아직 학습 기록이 없습니다</div>';
    }
    const bits = [];
    if (s.cards) bits.push(`외운 카드 ${s.cards}`);
    if (s.solved) bits.push(`퀴즈 ${s.solved}문 · ${s.accuracy}%`);
    if (s.lastStudy) bits.push(`최근 학습 ${s.lastStudy.slice(5).replace('-', '/')}`);
    const dday = s.dday !== null
        ? `<span class="exam-select-dday${s.dday < 0 ? ' past' : ''}">${s.dday >= 0 ? `D-${s.dday}` : `D+${-s.dday}`}</span>` : '';
    return `<div class="exam-select-stats">${esc(bits.join(' · '))}${dday}</div>`;
}

/**
 * 시험별 콘텐츠 스탬프 확인 맵 조회 (ES-07) — {examId: stamp}.
 * 맵이 완전히 비어 있으면(기능 도입 첫 실행) 현재 스탬프로 시딩해 전원 배지 방지.
 * @returns {Object<string,string>}
 */
function _seenStamps(exams) {
    /** @type {Object.<string, string>} */
    let seen = {};
    try { seen = JSON.parse(getItem(STORAGE_KEYS.EXAM_STAMP_SEEN) || '{}') || {}; } catch (e) { seen = {}; }
    if (!Object.keys(seen).length) {
        for (const e of exams) if (e.contentStamp) seen[e.id] = e.contentStamp;
        setItem(STORAGE_KEYS.EXAM_STAMP_SEEN, JSON.stringify(seen));
    }
    return seen;
}

/** 스탬프 맵 갱신 — 시험 방문(활성화) 시 그 시험의 확인 스탬프를 최신으로 */
function _markStampSeen(examId, stamp) {
    if (!stamp) return;
    /** @type {Object.<string, string>} */
    let seen = {};
    try { seen = JSON.parse(getItem(STORAGE_KEYS.EXAM_STAMP_SEEN) || '{}') || {}; } catch (e) { seen = {}; }
    if (seen[examId] === stamp) return;
    seen[examId] = stamp;
    setItem(STORAGE_KEYS.EXAM_STAMP_SEEN, JSON.stringify(seen));
}

/** 시험 선택 카드 목록 렌더링 */
export function renderExamSelect() {
    const container = document.getElementById('exam-select-list');
    if (!container) return;
    const exams = getExamList();
    // 명시 선택값만 "현재 시험"으로 표시 — 미선택(기본 시험 폴백) 상태는 어떤 카드도 현재로 찍지 않음
    const currentId = getCurrentExamId();

    if (!exams.length) {
        container.innerHTML = '<p style="color:var(--color-text-muted);">등록된 시험이 없습니다. content/exams.json을 확인하세요.</p>';
        return;
    }

    const seen = _seenStamps(exams);
    // 현재(활성) 시험은 사용 중이므로 확인 스탬프를 즉시 최신화한다
    const currentExam = exams.find(e => e.id === currentId);
    if (currentExam && currentExam.contentStamp) _markStampSeen(currentId, currentExam.contentStamp);

    container.innerHTML = exams.map(e => {
        const isCurrent = e.id === currentId;
        const isSoon = !!e.comingSoon;
        const accent = resolveExamThemeTokens(e)['--color-primary'];
        const swatch = accent ? ` style="--exam-accent:${esc(accent)}"` : '';
        // ES-07 — 미방문 시험은 '신규', 방문했는데 스탬프가 달라진 시험은 '갱신됨'
        const changeBadge = (e.contentStamp && !isCurrent)
            ? (!(e.id in seen) ? '<span class="exam-select-change is-new">신규</span>'
                : (seen[e.id] !== e.contentStamp ? '<span class="exam-select-change">갱신됨</span>' : ''))
            : '';
        return `
            <div class="exam-select-card${isCurrent ? ' current' : ''}${isSoon ? ' coming-soon' : ''}"${swatch} data-click="selectExamAction" data-arg="${esc(e.id)}" role="button" tabindex="0" aria-disabled="${isSoon}">
                <div class="exam-select-icon"><i class="${esc(e.icon || 'fa-solid fa-book')}" aria-hidden="true"></i></div>
                <h4>${esc(e.name)}</h4>
                <p>${esc(e.desc || '')}</p>
                ${isSoon ? '' : _examSummaryHtml(e.id)}
                <div class="exam-select-meta">
                    ${e.year ? `<span class="exam-select-year">${esc(e.year)}</span>` : ''}
                    ${changeBadge}
                    ${isCurrent ? '<span class="exam-select-current">현재 시험</span>' : ''}
                    ${isSoon ? '<span class="exam-select-coming-soon">준비중</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

/** 시험 전환 버튼 → 피커 뷰 표시 (렌더링은 라우터의 viewRenderers 디스패치에 위임) */
export function showExamSelect() {
    switchView('exam-select-view', { scrollTop: true });
}

/** 시험 카드 선택 — 준비중 시험은 알림만, 다른 시험이면 selectExam이 리로드, 같으면 대시보드로 복귀 */
export function selectExamAction(id) {
    const def = getExamList().find(e => e.id === id);
    if (def && def.comingSoon) {
        showAlert(`'${def.name || id}' 시험은 현재 준비 중입니다. 업데이트되면 이용하실 수 있습니다.`, '준비 중');
        return;
    }
    if (def && def.contentStamp) _markStampSeen(id, def.contentStamp); // ES-07 — 방문 시 갱신 배지 해소
    if (selectExam(id)) return; // 다른 시험: 페이지 리로드 발생
    switchView('dashboard-view');
}
