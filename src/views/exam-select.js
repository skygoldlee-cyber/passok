// src/views/exam-select.js — 시험 선택(피커) 뷰
// @spec ES-01~03,ES-06
// 멀티시험 플랫폼의 홈: 등록된 시험 목록을 카드로 표시하고 선택 시 시험을 전환한다.
// 카드에는 시험별 진도 요약(외운 카드·퀴즈 정답률·최근 학습일·D-day)과 액센트 스왓치를 표시한다.
/** @typedef {import('../types.js').ExamDef} ExamDef */
import { hardReload } from '../pwa/version-watch.js';
import { getExamList, getCurrentExamId, clearCurrentExam, selectExam, peekExamValue, resolveExamThemeTokens } from '../exam-context.js';
import { getItem, setItem } from '../storage.js';
import { STORAGE_KEYS } from '../storage-keys.js';
import { esc } from '../sanitize.js';
import { todayKey } from '../utils.js';
import { switchView } from './navigation.js';
import { showAlert, showToast } from '../ui-utils.js';

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

    // 선택 해제 버튼은 저장된 선택이 있을 때만 표시
    const clearBtn = document.getElementById('exam-select-clear');
    if (clearBtn) clearBtn.classList.toggle('is-hidden', !currentId);

    const cardHtml = e => {
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
    };

    // 유사 시험 그룹핑 — exams.json의 group 필드로 섹션을 나눈다.
    const groups = groupExamsForSelect(exams);
    if (!groups) {
        container.innerHTML = exams.map(cardHtml).join('');
        return;
    }
    container.innerHTML = groups.map(([g, members]) => `
        <div class="exam-select-group">
            <div class="exam-select-group-head"><span class="exam-select-group-name">${esc(g)}</span>
                <span class="exam-select-group-count">${members.length}개</span></div>
            <div class="exam-select-group-grid exam-select-grid">${members.map(cardHtml).join('')}</div>
        </div>`).join('');
}

/**
 * 시험 목록을 그룹 섹션으로 묶는다 (순수 함수 — 테스트 가능).
 * - group 필드가 하나도 없으면 null (기존 평면 그리드 유지)
 * - group 미지정 시험은 '기타' 섹션, 항상 맨 뒤
 * - 그룹 내 순서·그룹 간 순서는 exams.json 선언 순서 유지
 * @param {ExamDef[]} exams
 * @returns {[string, ExamDef[]][]|null}
 */
export function groupExamsForSelect(exams) {
    if (!exams.some(e => e.group)) return null;
    const order = [];
    const byGroup = new Map();
    for (const e of exams) {
        const g = e.group || '기타';
        if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
        byGroup.get(g).push(e);
    }
    order.sort((a, b) => (a === '기타' ? 1 : 0) - (b === '기타' ? 1 : 0));
    return order.map(g => [g, byGroup.get(g)]);
}

/** 시험 전환 버튼 → 피커 뷰 표시 (렌더링은 라우터의 viewRenderers 디스패치에 위임) */
export function showExamSelect() {
    switchView('exam-select-view', { scrollTop: true });
}

/** 선택 해제 — current_exam 제거로 "선택 없음" 상태로 되돌림. 다음 부팅부터 피커가 초기화면 */
export function resetExamSelection() {
    clearCurrentExam();
    // 브랜딩 즉시 복귀 — 문서 타이틀·로고를 플랫폼 브랜드로 (app-shell 임포트는 모듈 DOM 접근으로 Node 테스트에서 크래시)
    if (typeof document !== 'undefined') {
        document.title = 'PassOK';
        document.body.classList.add('exam-unselected'); // 미선택 내비 dim (ES-09)
        const logoMain = document.querySelector('.logo-text h1');
        const logoSub = document.querySelector('.logo-text span');
        if (logoMain) logoMain.textContent = 'PassOK';
        if (logoSub) logoSub.textContent = '';
        // 시험 스코프 메뉴도 즉시 숨김 — 성분 사전 등 미선택 노출 차단 (examSwitch는 피커 진입로라 유지)
        document.querySelectorAll('[data-feature]').forEach(node => {
            const el = /** @type {HTMLElement} */ (node);
            if (el.dataset.feature !== 'examSwitch') el.classList.add('is-hidden');
        });
    }
    renderExamSelect();
    showToast('시험 선택이 해제됐습니다 — 다음 실행부터 시험 선택이 먼저 표시됩니다', 'info');
}

/** 강제 새로고침 — SW 캐시 우회 + 페이지 리로드 (Ctrl+F5 동일 효과). 구현은 pwa/version-watch.js */
export async function hardReloadApp() {
    return hardReload();
}

/** 시험 카드 선택 — 준비중 시험은 알림만, 다른 시험이면 selectExam이 리로드, 같으면 대시보드로 복귀 */
// P-14 — 선택 팩 다운로드 진행 표시: cachePack 요청 후 packCached 응답까지 토스트로 안내.
// 다른 시험 선택 시 selectExam이 즉시 리로드하므로 플래그를 localStorage에 남겨
// 부팅(app-shell)에서 복구 표시한다 — 완료 시 제거.
export const PACK_DL_FLAG = 'pack_dl_pending';
let _packDlListener = null;
function _showPackDownloadStatus(examId) {
    showToast('오프라인 학습 자료를 내려받는 중…', 'info');
    try { setItem(PACK_DL_FLAG, examId); } catch { /* 무시 */ }
    if (_packDlListener) navigator.serviceWorker.removeEventListener('message', _packDlListener);
    _packDlListener = (e) => {
        if (e.data?.type === 'passok:packCached' && e.data.examId === examId) {
            if (e.data.failed === 0) {
                showToast(`오프라인 자료 준비 완료 (${e.data.total}파일)`, 'success');
            } else {
                showToast(`오프라인 자료 일부 다운로드 실패 (${e.data.total - e.data.failed}/${e.data.total})`, 'warning');
            }
            try { setItem(PACK_DL_FLAG, ''); } catch { /* 무시 */ }
            navigator.serviceWorker.removeEventListener('message', _packDlListener);
            _packDlListener = null;
        }
    };
    navigator.serviceWorker.addEventListener('message', _packDlListener);
}

export function selectExamAction(id) {
    const def = getExamList().find(e => e.id === id);
    if (def && def.comingSoon) {
        showAlert(`'${def.name || id}' 시험은 현재 준비 중입니다. 업데이트되면 이용하실 수 있습니다.`, '준비 중');
        return;
    }
    if (def && def.contentStamp) _markStampSeen(id, def.contentStamp); // ES-07 — 방문 시 갱신 배지 해소
    // P-14 — 팩 전환: 이전 팩의 지연 캐시 해제 + 선택 팩 지연 다운로드 (백그라운드, 진입 차단 없음)
    const swCtl = navigator.serviceWorker?.controller;
    if (swCtl) {
        const prevId = getCurrentExamId();
        if (prevId && prevId !== id) swCtl.postMessage({ type: 'passok:evictPack', examId: prevId });
        swCtl.postMessage({ type: 'passok:cachePack', examId: id });
        _showPackDownloadStatus(id);
    }
    if (selectExam(id)) return; // 다른 시험: 페이지 리로드 발생
    switchView('dashboard-view');
}
