// views/textbook-reader.js - 교재 리더 오케스트레이터 (과목·챕터 선택·뷰 상태·진입점)
// @spec TR-01~19,SA-02~05,G-01~09,ST-01~07
//   (챕터 렌더 → reader-render.js · 이야기형 로드 → reader-loader.js ·
//    위치/진척 → reader-progress.js · 참조 링크 → reader-ref-links.js ·
//    툴바·스크롤스파이·표 모달 → reader-toolbar.js)
import { proFeatureNotice } from '../pro-upgrade.js';
import { trackAction } from '../usage-stats.js';
import { filterMetaSections, buildSectionDisplayTitles } from '../reader/reader-toc.js';
import {
    readerAudioState,
    showAudioToast,
    stopReaderAudio,
    toggleReaderAudio,
    toggleReaderPlayPause,
    cycleReaderAudioRate,
    seekReaderAudio,
    toggleReaderAutoScroll
} from './reader-audio.js';

export {
    stopReaderAudio,
    toggleReaderAudio,
    toggleReaderPlayPause,
    cycleReaderAudioRate,
    seekReaderAudio,
    toggleReaderAutoScroll
};
// [모바일 PWA 견고성] 오디오 매니페스트는 window 전역(가드)에서 읽는다(정적 import 하드 의존 지양).
import { DataLoader } from '../data-loader.js';
import {
    readerChapterContext, initReaderToolbar
} from './reader-toolbar.js';
import {
    textbookReaderState, saveReaderPosition, loadReaderPosition, startReadingSession
} from './reader-progress.js';
import { loadStoryChapter } from './reader-loader.js';
import { renderChapterContentInternal } from './reader-render.js';
import { escapeRegExp } from '../utils.js';

export { textbookReaderState, startReadingSession, stopReadingSession } from './reader-progress.js';

/** 렌더된 섹션 카드 중 제목 매칭 탐색 — 정확 매칭 우선, 없으면 첫 부분 매칭 */
function _findSectionCardByTitle(container, sectionTitle) {
    let exact = /** @type {Element|null} */ (null);
    let partial = /** @type {Element|null} */ (null);
    container.querySelectorAll('.reader-section-card').forEach(card => {
        const titleEl = card.querySelector('.reader-section-title');
        const title = (titleEl && titleEl.textContent || '').trim();
        if (!exact && title === sectionTitle) exact = card;
        else if (!partial && title.includes(sectionTitle)) partial = card;
    });
    return exact || partial;
}

/** 챕터 앵커('chNN') → "Chapter NN" 헤더 섹션 카드 탐색 */
function _findSectionCardByChapter(container, chapterAnchor) {
    const chNum = String(chapterAnchor || '').replace(/^ch/i, '');
    const num = parseInt(chNum, 10);
    if (!chNum || isNaN(num)) return null;
    // "Chapter 01"·"Chapter 1" 모두 매칭하되 'Chapter 10' 등의 오매칭은 숫자 경계로 차단
    const re = new RegExp('Chapter\\s+0*' + num + '(?!\\d)', 'i');
    let found = /** @type {Element|null} */ (null);
    container.querySelectorAll('.reader-section-card').forEach(card => {
        if (found) return;
        const titleEl = card.querySelector('.reader-section-title');
        if (titleEl && re.test(titleEl.textContent || '')) found = card;
    });
    return found;
}

/**
 * 섹션 제목 → STUDY_DATA에서 소속 챕터 앵커('chNN') 역해석.
 * 리더에 렌더되지 않는 메타 섹션(확인문제·학습 아이콘 등)을 찾을 때의 폴백 —
 * 호출자가 앵커를 모르고 제목만 넘겨도 올바른 챕터 헤더로 유도한다.
 */
function _chapterAnchorForTitle(subjId, title) {
    const STUDY_DATA = (typeof window !== 'undefined' && window.STUDY_DATA) ? window.STUDY_DATA : {};
    const subj = STUDY_DATA[subjId];
    if (!subj || !title) return '';
    for (const chapter of subj.chapters || []) {
        const secs = chapter.sections || [];
        const displayTitles = buildSectionDisplayTitles(secs);
        let anchor = '';
        for (let i = 0; i < secs.length; i++) {
            const m = String(secs[i].title || '').match(/Chapter\s*(\d+)/i);
            if (m) anchor = 'ch' + m[1].padStart(2, '0');
            if (secs[i].title === title || displayTitles[i] === title) return anchor;
        }
    }
    return '';
}

/** 검색 이동으로 삽입된 검색어 하이라이트 마크 */
const _SEARCH_HIT_SEL = 'mark.reader-search-hit';
/** 한 카드에 삽입할 하이라이트 상한 — 광범위 토큰의 과도한 DOM 분할 방지 */
const _SEARCH_HIT_MAX = 80;

/** 이전 검색 이동의 하이라이트 해제 (재렌더 시 자연 소거되지만 동일 DOM 재사용 대비) */
function _clearReaderSearchHighlights(container) {
    container.querySelectorAll(_SEARCH_HIT_SEL).forEach(m => {
        m.replaceWith(document.createTextNode(m.textContent || ''));
    });
    container.normalize();
}

/**
 * 카드 본문에서 검색어(공백 분리 토큰, OR)를 mark.reader-search-hit으로 감싼다.
 * @returns {Element|null} 첫 매치 mark — 없으면 null
 */
function _highlightQueryInCard(card, query) {
    const terms = String(query || '').trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return null;
    const body = card.querySelector('.reader-section-body') || card;
    const splitRe = new RegExp('(' + terms.map(escapeRegExp).join('|') + ')', 'gi');
    const probe = new RegExp(splitRe.source, 'i');
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    /** @type {Text[]} */
    const nodes = [];
    let node;
    while ((node = /** @type {Text|null} */ (walker.nextNode()))) {
        if (probe.test(node.nodeValue || '')) nodes.push(node);
    }
    let first = null;
    let marked = 0;
    for (const textNode of nodes) {
        if (marked >= _SEARCH_HIT_MAX) break;
        const parts = (textNode.nodeValue || '').split(splitRe);
        if (parts.length < 2 || !textNode.parentNode) continue;
        const frag = document.createDocumentFragment();
        parts.forEach((part, i) => {
            if (!part) return;
            if (i % 2 === 1) {
                const mark = document.createElement('mark');
                mark.className = 'reader-search-hit txt-highlight';
                mark.textContent = part;
                frag.appendChild(mark);
                if (!first) first = mark;
                marked++;
            } else {
                frag.appendChild(document.createTextNode(part));
            }
        });
        textNode.parentNode.replaceChild(frag, textNode);
    }
    return first;
}

/** 섹션 카드 펼침 + 스크롤 (미발견 시 상단으로) */
function _scrollToSectionCard(container, card) {
    if (!card) {
        container.scrollTop = 0;
        return;
    }
    card.classList.remove('collapsed');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** 마지막으로 큐잉된 챕터 렌더의 완료 promise — 검색 이동 등이 렌더 완료를 기다리는 데 사용 */
let _readerRenderPromise = null;

/**
 * 과목 로드 → 챕터 렌더를 큐잉하고 완료 promise를 추적한다.
 * 이 함수로 시작된 렌더만 _readerRenderPromise가 바뀌므로,
 * 호출자는 이전 promise와 비교해 새 렌더가 큐잉됐는지 판별할 수 있다.
 */
function _queueChapterRender(subjId, chapterIdx) {
    _readerRenderPromise = DataLoader.loadSubject(subjId)
        .then(() => renderChapterContent(subjId, chapterIdx),
            err => console.error('loadSubject failed:', err))
        .catch(err => console.error('renderChapterContent failed:', err));
    return _readerRenderPromise;
}

/** 새 렌더가 큐잉됐으면 그 완료 promise, 아니면 즉시 해결된 promise */
function _renderSettled(prevRender) {
    return (_readerRenderPromise && _readerRenderPromise !== prevRender)
        ? _readerRenderPromise
        : Promise.resolve();
}

/**
 * 교재 리더를 특정 과목·챕터로 이동시킨다.
 * (뷰 전환은 호출 측에서 수행 — 매뉴얼 뷰어의 subj: 링크, 교차 참조 링크 공용)
 * @param {string} subject - 과목 키 (law/manufacturing/safety/understanding)
 * @param {string} [chapterAnchor] - 'ch01' 형태 챕터 앵커 (선택)
 */
export function openSubjectChapter(subject, chapterAnchor = '') {
    if (!subject) return;
    const prevRender = _readerRenderPromise;
    // 과목 선택 드롭다운 업데이트
    const subjectSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('reader-subject-select'));
    if (subjectSelect) {
        subjectSelect.value = subject;
        // change 이벤트 트리거
        subjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // 재렌더가 큐잉됐으면 완료까지 대기 — 고정 지연은 느린 로드에서 미렌더 DOM을 스캔한다
    const pending = _renderSettled(prevRender);
    if (chapterAnchor) {
        pending.then(() => {
            const container = document.getElementById('textbook-reader-container');
            if (!container) return;
            _scrollToSectionCard(container, _findSectionCardByChapter(container, chapterAnchor));
        });
    } else {
        // 챕터 앵커 없으면 상단으로
        pending.then(() => {
            const container = document.getElementById('textbook-reader-container');
            if (container) container.scrollTop = 0;
        });
    }
}

/**
 * 교재 리더를 특정 과목의 섹션 제목으로 이동시킨다.
 * chapter 앵커("Chapter N" 형식 종속) 대신 렌더된 섹션 제목 텍스트로 매칭하므로
 * 교재 형식이 바뀌어도 동작한다. (통합 검색 팔레트·검색 결과 카드에서 사용)
 * @param {string} subject - 과목 키
 * @param {string} sectionTitle - 섹션 제목 (정확 매칭 우선, 없으면 부분 매칭)
 * @param {string} [chapterAnchor] - 제목 매칭 실패 시 폴백할 'chNN' 챕터 앵커
 *   (메타 섹션 등 리더에 렌더되지 않는 결과 대비)
 * @param {{story?: boolean, query?: string}} [opts] - 결과 출처와 렌더 모드를 맞춘다:
 *   story=true면 이야기형으로, 미지정이면 표준형으로 전환 후 이동. query 지정 시 착지한
 *   카드 본문의 해당 토큰을 하이라이트하고 첫 매치 위치로 스크롤한다.
 */
export function openSubjectSection(subject, sectionTitle, chapterAnchor = '', opts = {}) {
    if (!subject) return;
    // 서사 결과는 이야기형으로, 표준형 결과는 표준형으로 — 단방향 전환이면
    // 이야기형 모드에서 표준형 결과의 섹션 매칭이 실패할 수 있다
    const wantStory = !!opts.story;
    if (wantStory !== textbookReaderState.storyMode) {
        textbookReaderState.storyMode = wantStory;
        const storyToggle = /** @type {HTMLInputElement|null} */ (document.getElementById('reader-story-mode-toggle'));
        if (storyToggle) storyToggle.checked = wantStory;
        if (wantStory) {
            trackAction('story_textbook');
            proFeatureNotice('story_textbook', '이야기형 교재 본문 읽기');
        } else if (readerAudioState.audio) {
            // 이야기형 오디오 재생 중 표준형 결과로 이동 — 수동 토글 해제와 동일하게 재생 정지
            stopReaderAudio();
            showAudioToast('표준형 모드로 전환되어 오디오 재생이 중지되었습니다.');
        }
    }
    const prevRender = _readerRenderPromise;
    const subjectSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('reader-subject-select'));
    if (subjectSelect) {
        subjectSelect.value = subject;
        subjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (!sectionTitle && !chapterAnchor) return;
    // 재렌더가 큐잉됐으면 완료까지 대기 — 고정 지연(800ms)은 느린 이야기형 로드에서
    // 미렌더 DOM을 스캔해 착지 실패로 이어진다
    _renderSettled(prevRender).then(() => {
        const container = document.getElementById('textbook-reader-container');
        if (!container) return;
        _clearReaderSearchHighlights(container);
        const card = (sectionTitle && _findSectionCardByTitle(container, sectionTitle))
            || _findSectionCardByChapter(container,
                chapterAnchor || _chapterAnchorForTitle(subject, sectionTitle));
        // 검색어가 카드 본문에 있으면 그 위치로 직접 스크롤 (긴 섹션에서 재검색 불필요)
        if (card && opts.query) {
            const hit = _highlightQueryInCard(card, opts.query);
            if (hit) {
                card.classList.remove('collapsed');
                hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        }
        _scrollToSectionCard(container, card);
    });
}

export function renderTextbookReader() {
    const subjectSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('reader-subject-select'));
    const container = document.getElementById('textbook-reader-container');

    if (!subjectSelect || !container) return;

    // Initialize reader convenience toolbar (font size, theme, focus mode, etc.)
    initReaderToolbar();
    startReadingSession(); // SC-15 읽기 하트비트 — 뷰 비활성 동안 틱 no-op

    // Always repopulate subject select to ensure fresh state
    const previousValue = subjectSelect.value || textbookReaderState.selectedSubject;
    subjectSelect.innerHTML = '<option value="">과목을 선택하세요</option>';

    // DataLoader를 사용하여 레지스트리 기반으로 과목 목록 구성
    const subjects = (typeof DataLoader !== 'undefined' && DataLoader.registry)
        ? DataLoader.getSubjectList()
        : [];

    subjects.forEach(subj => {
        const option = document.createElement('option');
        option.value = subj.key;
        option.textContent = subj.name;
        subjectSelect.appendChild(option);
    });

    // Restore subject selection
    if (previousValue && subjectSelect.querySelector(`option[value="${previousValue}"]`)) {
        subjectSelect.value = previousValue;
        textbookReaderState.selectedSubject = previousValue;
    }

    // 1. 교재 읽기 이어하기 — 저장된 위치 복원 (TR-04: 세션 내 뷰 복귀에서도 복원)
    const savedPos = loadReaderPosition();

    // Restore previous selections
    if (savedPos && savedPos.subject) {
        textbookReaderState.selectedSubject = savedPos.subject;
        textbookReaderState.selectedChapter = savedPos.chapter || '0';
        textbookReaderState.storyMode = savedPos.storyMode || false;
    }

    if (textbookReaderState.selectedSubject) {
        subjectSelect.value = textbookReaderState.selectedSubject;
        // 단원 선택 UI 제거: 과목 선택 시 자동으로 chapter 0(전체) 로드
        textbookReaderState.selectedChapter = '0';
        _queueChapterRender(textbookReaderState.selectedSubject, 0).then(() => {
            // 스크롤 위치 복원 (콘텐츠 렌더링 후)
            if (savedPos && savedPos.scrollTop > 0) {
                const cont = document.getElementById('textbook-reader-container');
                if (cont) {
                    requestAnimationFrame(() => {
                        cont.scrollTop = savedPos.scrollTop;
                    });
                }
            }
        });
    }

    // Bind events only once
    if (!subjectSelect.dataset.bound) {
        subjectSelect.dataset.bound = 'true';

        subjectSelect.addEventListener('change', (e) => {
            const subjId = (/** @type {HTMLSelectElement|null} */ (e.target) || { value: '' }).value;
            textbookReaderState.selectedSubject = subjId;
            const hadAudio = !!readerAudioState.audio;
            stopReaderAudio();
            if (hadAudio) showAudioToast('과목이 변경되어 오디오 재생이 중지되었습니다.');

            if (subjId) {
                // 단원 선택 UI 제거: 과목 선택 시 자동으로 chapter 0(전체) 로드
                textbookReaderState.selectedChapter = '0';
                saveReaderPosition(); // 1. 교재 읽기 이어하기
                _queueChapterRender(subjId, 0);
            } else {
                textbookReaderState.selectedChapter = '';
                saveReaderPosition();
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-book-open" style="font-size: 3rem; color: var(--color-text-muted); margin-bottom: 1rem; display: block;"></i>
                        <h3>읽을 교재를 선택하세요</h3>
                        <p>위에서 과목을 선택하면 해당 교재의 본문 내용이 표시됩니다.</p>
                    </div>
                `;
                // 챕터 액션 그룹 및 오디오 플레이어 초기화
                const ag = document.getElementById('reader-chapter-actions-group');
                if (ag) ag.innerHTML = '';
                const ap = document.getElementById('reader-audio-player-area');
                if (ap) { ap.classList.add('is-hidden'); ap.innerHTML = ''; }
            }
        });
    }

    // Story mode checkbox binding (bind once)
    const storyToggle = /** @type {HTMLInputElement|null} */ (document.getElementById('reader-story-mode-toggle'));
    if (storyToggle && !storyToggle.dataset.bound) {
        storyToggle.dataset.bound = 'true';
        storyToggle.checked = textbookReaderState.storyMode;
        storyToggle.addEventListener('change', (e) => {
            if ((/** @type {HTMLInputElement} */ (e.target)).checked) {
                trackAction('story_textbook');
                proFeatureNotice('story_textbook', '이야기형 교재 본문 읽기');
            }
            // 표준형으로 돌아가면 오디오 버튼/플레이어가 숨겨지므로 재생 중인 오디오 정지
            if (!(/** @type {HTMLInputElement} */ (e.target)).checked && readerAudioState.audio) {
                stopReaderAudio();
                showAudioToast('표준형 모드로 전환되어 오디오 재생이 중지되었습니다.');
            }
            // 읽던 섹션 위치 보존 — 서사 블록이 본문 사이에 삽입돼 scrollTop 절대값이 어긋나므로
            // 현재 보이는 섹션 앵커(reader-section-N)를 기억하고 같은 섹션으로 복원한다.
            const container = document.getElementById('textbook-reader-container');
            let anchorIdx = -1, anchorOffset = 0;
            if (container) {
                const cTop = container.getBoundingClientRect().top;
                const secs = container.querySelectorAll('[id^="reader-section-"]');
                for (const s of secs) {
                    const relTop = s.getBoundingClientRect().top - cTop;
                    if (relTop <= 40) {
                        anchorIdx = parseInt(s.id.replace('reader-section-', ''), 10);
                        anchorOffset = -relTop; // 섹션 상단이 뷰포트 위로 얼마나 지났는지
                    } else break;
                }
            }
            textbookReaderState.storyMode = (/** @type {HTMLInputElement} */ (e.target)).checked;
            // TR-14: storyMode는 readerLastPosition 안에만 영속화되므로 토글 즉시 저장 —
            // 저장이 다음 스크롤/과목 변경으로 밀리면 "토글만 하고 종료" 시 모드가 유실된다
            saveReaderPosition();
            // Re-render current chapter if one is selected
            if (textbookReaderState.selectedSubject && textbookReaderState.selectedChapter) {
                _readerRenderPromise = Promise.resolve(renderChapterContent(
                    textbookReaderState.selectedSubject, parseInt(textbookReaderState.selectedChapter)
                )).catch(err => console.error('renderChapterContent failed:', err));
                _readerRenderPromise.then(() => {
                    const cont = document.getElementById('textbook-reader-container');
                    const target = anchorIdx >= 0 ? document.getElementById(`reader-section-${anchorIdx}`) : null;
                    if (cont && target) {
                        const absTop = target.getBoundingClientRect().top - cont.getBoundingClientRect().top + cont.scrollTop;
                        cont.scrollTop = Math.max(0, absTop + anchorOffset);
                    }
                });
            }
        });
    }
}

function renderChapterContent(subjId, chapterIdx) {
    const container = document.getElementById('textbook-reader-container');
    if (!container) return Promise.resolve();

    chapterIdx = parseInt(chapterIdx);
    const STUDY_DATA = (typeof window !== 'undefined' && window.STUDY_DATA) ? window.STUDY_DATA : {};
    const subj = STUDY_DATA[subjId];
    if (!subj || !subj.chapters || isNaN(chapterIdx) || !subj.chapters[chapterIdx]) return Promise.resolve();

    const originalChapter = subj.chapters[chapterIdx];

    // 다른 단원으로 이동하면 이전 오디오 정지
    if (readerAudioState.audio &&
        (readerChapterContext.subjId !== subjId || readerChapterContext.chapterIdx !== chapterIdx)) {
        stopReaderAudio();
        showAudioToast('단원이 변경되어 오디오 재생이 중지되었습니다.');
    }

    readerChapterContext.subjId = subjId;
    readerChapterContext.chapterIdx = chapterIdx;

    const isStory = textbookReaderState.storyMode;
    if (isStory) {
        return loadStoryChapter(subjId, chapterIdx, originalChapter).then(chapter => {
            return renderChapterContentInternal(subjId, chapterIdx, subj, chapter, true);
        }).catch(err => {
            console.warn('[Story Mode] 이야기형 MD 로드 실패, 기본 모드로 전환:', err);
            showAudioToast('이야기형 파일을 불러올 수 없어 기본 모드로 표시합니다.');
            const filteredChapter = filterMetaSections(originalChapter);
            return renderChapterContentInternal(subjId, chapterIdx, subj, filteredChapter, false);
        });
    }
    const filteredChapter = filterMetaSections(originalChapter);
    // TR-12: Promise는 렌더 완료까지 기다려야 한다 — renderChapterContentInternal은 async라
    // 미반환 시 호출자의 rAF 복원이 렌더 말미의 scrollTop=0 리셋에 덮여 읽기 위치 복원이 실패한다
    return renderChapterContentInternal(subjId, chapterIdx, subj, filteredChapter, false);
}

