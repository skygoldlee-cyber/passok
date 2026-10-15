// views/textbook-search.js - 교재 검색 뷰 계층 (Textbook Search View)
// @spec TS-01~16,PF-08
// 인덱스 구축·지연 로드·형태소 매칭·랭킹은 src/search-index.js로 분리 —
// 이 모듈은 검색창 이벤트·결과 버킷 렌더·뷰 이동 위임만 담당한다.
import { escapeHTML, esc, html, raw } from '../sanitize.js';
import { renderMermaidIn } from '../mermaid-render.js';
import { attachImageZoomIn } from '../image-zoom.js';
import { TIMING } from '../config/timing.js';
import { getRefTables, mapSourceToRef, resolveRefPath, refDocDisplayName } from '../pdf-registry.js';
import { formatSectionContentForReader } from '../reader-format.js';
import { escapeRegExp, debounce } from '../utils.js';
import { ensureLazyIndexes, runTextbookSearch, _matchSnippet, _glossSubjectKey } from '../search-index.js';
// [모바일 PWA 견고성] 레지스트리는 window 전역(가드)에서 읽는다(정적 import 하드 의존 지양).

const textbookState = {
    filter: 'all',
    searchQuery: '',
};

const _runSearch = debounce((value) => {
    textbookState.searchQuery = value;
    performTextbookSearch();
}, TIMING.SEARCH_DEBOUNCE_MS);

// 결과 티어 — 정렬·상한·캡 노트를 테이블로 일원화 (탐색 순서: 교재→참조자료→문제은행, 부분 일치는 별도 후미 그룹)
const RESULT_TIERS = [
    { key: 'sections', limit: 30, capNote: '교재 결과가 많아 상위 {limit}건만 표시합니다 (전체 {total}건). 검색어를 더 구체화하거나 과목 필터를 사용하세요.' },
    { key: 'refs', limit: 15, capNote: '참조자료 결과가 많아 상위 {limit}건만 표시합니다 (전체 {total}건).' },
    { key: 'exams', limit: 15, capNote: '문제은행 결과가 많아 상위 {limit}건만 표시합니다 (전체 {total}건).' },
    { key: 'weak', limit: 10 },
];

export function renderTextbookSearch() {
    const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('textbook-search-input'));

    // Bind search input events only once
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';

        searchInput.addEventListener('input', (e) => {
            _runSearch(e.target instanceof HTMLInputElement ? e.target.value.trim() : '');
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                _runSearch.cancel();
                textbookState.searchQuery = (e.target instanceof HTMLInputElement ? e.target.value : '').trim();
                performTextbookSearch();
            }
        });
    }

    // 결과 카드 링크 위임 — '전체 단원 보기'와 카드 내 크로스 과목(data-ref-subject) 링크는
    // 교재리더 뷰로 전환해야 동작한다 (data-ref-subject 본체 이동은 reader-ref-links 문서 위임이 처리)
    const resultsContainer = document.getElementById('textbook-results-container');
    if (resultsContainer && !resultsContainer.dataset.gotoBound) {
        resultsContainer.dataset.gotoBound = 'true';

        const gotoAction = (goto, subjLink) => {
            Promise.all([
                import('./navigation.js'),
                import('./textbook-reader.js')
            ]).then(([nav, reader]) => {
                nav.switchView('textbook-reader-view');
                if (goto) {
                    let payload = [];
                    try { payload = JSON.parse(goto.getAttribute('data-search-goto') || '[]'); } catch (_) { /* 무시 */ }
                    const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('textbook-search-input'));
                    reader.openSubjectSection(payload[0] || '', payload[1] || '', payload[2] || '',
                        { story: payload[3] === 'story', query: (searchInput && searchInput.value || '').trim() });
                } else if (subjLink instanceof HTMLElement) {
                    reader.openSubjectChapter(subjLink.dataset.refSubject || '', subjLink.dataset.refChapter || '');
                }
            });
        };

        resultsContainer.addEventListener('click', (e) => {
            const t = e.target instanceof Element ? e.target : null;
            if (!t) return;
            // 카드 전체 클릭으로 이동 — 단 내부 컨트롤(토글 버튼·참조 링크·이미지 등)은 각자 동작에 양보
            const innerCtl = t.closest('button, a[href], img');
            const subjLink = t.closest('a[data-ref-subject]');
            const goto = t.closest('[data-search-goto]');
            if (innerCtl && innerCtl !== goto && innerCtl !== subjLink) return;
            const useGoto = goto && !(innerCtl && innerCtl === subjLink);
            if (!useGoto && !subjLink) return;
            e.preventDefault();
            e.stopPropagation(); // 문서 위임(reader-ref-links) 중복 실행 차단 — 뷰 전환 후 직접 이동
            gotoAction(useGoto ? goto : null, useGoto ? null : subjLink);
        });

        // 카드 자체 포커스 상태에서 Enter로 동일 이동 (role="link" 키보드 접근성)
        resultsContainer.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const card = e.target instanceof Element ? e.target : null;
            if (!card || e.target !== card || !card.matches('.textbook-result-card[data-search-goto]')) return;
            e.preventDefault();
            gotoAction(card, null);
        });
    }

    performTextbookSearch();
}

export function setTextbookFilter(filterVal) {
    textbookState.filter = filterVal;

    // Update active filter class
    const buttons = document.querySelectorAll('.textbook-filter-buttons .btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-filter') === filterVal) {
            btn.classList.add('active-filter');
        } else {
            btn.classList.remove('active-filter');
        }
    });

    performTextbookSearch();
}

/** 외부(통합 검색 팔레트)에서 검색어 주입 — 뷰 진입 전 호출해도 상태가 유지되어 로드 후 렌더에 반영된다 */
export function setTextbookSearchQuery(query) {
    textbookState.searchQuery = (query || '').trim();
    const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('textbook-search-input'));
    if (searchInput) searchInput.value = textbookState.searchQuery;
    performTextbookSearch();
}

export function clearTextbookSearch() {
    const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('textbook-search-input'));
    if (searchInput) {
        searchInput.value = '';
    }
    textbookState.searchQuery = '';
    performTextbookSearch();
}

function performTextbookSearch() {
    const container = document.getElementById('textbook-results-container');
    const summary = document.getElementById('textbook-search-summary');
    if (!container || !summary) return;

    const query = textbookState.searchQuery.toLowerCase().trim();
    if (!query) {
        // Show empty state
        summary.textContent = '키워드를 입력하면 검색 결과가 여기에 표시됩니다.';
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-book-open" style="font-size: 3rem; color: var(--color-text-muted); margin-bottom: 1rem; display: block;"></i>
                <h3>검색어를 입력하세요</h3>
                <p>위 검색창에 궁금한 교재 키워드를 입력하고 검색 결과를 확인하세요.</p>
            </div>
        `;
        return;
    }

    // TS-10/TS-11/TS-12 — 서사·참조자료·문제은행 인덱스 최초 1회 지연 로드; 완료 시 같은 검색어로 재실행
    // added=0이어도 재실행해야 lazyPending 로딩 표시가 해제된다
    ensureLazyIndexes(() => {
        if (textbookState.searchQuery.toLowerCase().trim() === query) {
            performTextbookSearch();
        }
    });

    const { buckets, allVariantTerms, glossDefs, lazyPending } =
        runTextbookSearch(query, textbookState.filter);

    // 티어별 정렬·상한 (테이블 주도 — 티어 추가 시 RESULT_TIERS 한 곳만 수정)
    for (const t of RESULT_TIERS) {
        t.list = buckets[t.key];
        t.list.sort((a, b) => b._score - a._score);
        t.shown = t.list.slice(0, t.limit);
    }
    const [sections, refs, exams, weak] = RESULT_TIERS;
    const allResults = sections.shown.concat(refs.shown).concat(exams.shown);

    // Update summary text
    summary.innerHTML = `총 <strong style="color: var(--color-primary);">${sections.list.length + refs.list.length + exams.list.length}</strong>건의 관련 내용을 찾았습니다.`
        + (weak.list.length ? ` <span class="text-muted">(+ 부분 일치 ${esc(String(weak.list.length))}건)</span>` : '')
        + (glossDefs.length ? ` <span class="text-muted">(+ 용어 정의 ${esc(String(glossDefs.length))}건)</span>` : '')
        + (lazyPending ? ' <span class="text-muted">(서사·참조자료·문제은행을 추가로 불러오는 중…)</span>' : '');

    // TS-15 — 본문 결과가 없어도 용어 정의 카드는 표시한다 (용어 단독 조회 지원)
    if (allResults.length === 0 && weak.shown.length === 0 && glossDefs.length === 0) {
        // 지연 인덱스 로딩 중이면 '결과 없음' 대신 추가 결과 가능성을 안내
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid ${lazyPending ? 'fa-circle-notch fa-spin' : 'fa-triangle-exclamation'}" style="font-size: 3rem; color: var(--color-${lazyPending ? 'primary' : 'warning'}); margin-bottom: 1rem; display: block;"></i>
                <h3>${lazyPending ? '검색 범위를 확장하는 중입니다' : '일치하는 내용이 없습니다'}</h3>
                <p>${lazyPending ? '서사·참조자료·문제은행 인덱스를 불러오고 있습니다 — 결과가 추가될 수 있습니다.' : '다른 검색어로 검색해보거나 띄어쓰기를 확인해보세요.'}</p>
            </div>
        `;
        return;
    }

    // Render results
    container.innerHTML = '';
    const badgeColors = {};
    {
        const colors = ['badge-cyan', 'badge-violet', 'badge-emerald', 'badge-amber', 'badge-rose', 'badge-indigo'];
        const subjects = (window.DATA_REGISTRY && window.DATA_REGISTRY.subjects) || [];
        subjects.forEach((sub, idx) => { badgeColors[sub.key] = colors[idx % colors.length]; });
    }
    const renderResultCard = (item, idx) => {
        const badgeColor = badgeColors[item.subjId] || 'badge-gray';

        // 참조자료·문제은행 결과 — 문서 단위 + 매치 스니펫 + ExamViewer 라인 딥링크 (TS-11/TS-12)
        if (item.fromRef || item.fromExam) {
            const { snippet, lineNum } = _matchSnippet(item.refText, allVariantTerms);
            const argsJson = esc(JSON.stringify([item.filePath, lineNum, allVariantTerms.join(' ')]));
            const kindLabel = esc(item.fromExam ? '문제은행' : '참조자료');
            const refCardHTML = `
            <div class="textbook-result-card">
                <div class="textbook-card-header">
                    <span class="textbook-card-path">
                        <span class="badge ${badgeColor}">${esc(item.subjName)}</span>
                        <span class="badge badge-gray">${kindLabel}</span>
                        <i class="fa-solid fa-chevron-right"></i>
                        <span>${esc(item.docName)}</span>
                    </span>
                    <button class="btn btn-secondary" data-click="ExamViewer.openExam" data-args='${argsJson}' style="padding: 0.3rem 0.6rem; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="fa-solid fa-book-open"></i> 원문 보기
                    </button>
                </div>
                <h4 class="textbook-card-title">${highlightTextInString(item.docName, allVariantTerms)}</h4>
                <div class="textbook-card-body"><div style="white-space:pre-wrap; word-break:break-word; font-size: 0.9rem;">${highlightTextInString(snippet, allVariantTerms)}</div></div>
            </div>
        `;
            container.insertAdjacentHTML('beforeend', refCardHTML);
            return;
        }

        const isLong = item.content.length > 300;
        const bodyClass = isLong ? 'textbook-card-body collapsed' : 'textbook-card-body';
        const formattedContent = formatSectionContent(item.content, allVariantTerms, item);
        const storyBadge = item.fromStory ? '<span class="badge badge-gray">서사</span>' : '';
        // '전체 단원 보기' → 리더의 해당 "섹션"으로 이동 — 인덱스가 기록한 표시 제목으로
        // 매칭(중복 제목은 챕터 병기로 구분)하고, 실패 시 소속 챕터 앵커로 폴백한다.
        const gotoData = JSON.stringify([
            item.subjId, item.gotoTitle || item.sectionTitle || '', item.chAnchor || '',
            item.fromStory ? 'story' : ''
        ]);

        const cardId = `textbook-card-${idx}`;
        const cardHTML = `
            <div class="textbook-result-card is-clickable" data-search-goto="${esc(gotoData)}" tabindex="0" role="link" aria-label="${esc(item.sectionTitle)} — 교재에서 보기">
                <div class="textbook-card-header">
                    <span class="textbook-card-path">
                        <span class="badge ${badgeColor}">${esc(item.subjName)}</span>
                        ${storyBadge}
                        <i class="fa-solid fa-chevron-right"></i>
                        <span>${esc(item.chapterTitle)}</span>
                    </span>
                    <a href="#" data-search-goto="${esc(gotoData)}" class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> 전체 단원 보기
                    </a>
                </div>
                <h4 class="textbook-card-title">${highlightTextInString(item.sectionTitle, allVariantTerms)}</h4>
                <div class="${bodyClass}" id="${cardId}-body">
                    ${formattedContent}
                </div>
                ${isLong ? `
                <div class="textbook-card-actions">
                    <button class="btn btn-secondary" data-click="toggleTextbookCard" data-arg="${cardId}" id="${cardId}-toggle-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600;">
                        <i class="fa-solid fa-chevron-down"></i> 더 보기
                    </button>
                </div>
                ` : ''}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    };

    // TS-15 — 용어 정의 카드를 본문 결과(교재→참조자료→문제은행→부분 일치)보다
    // 앞에 별도 그룹으로 배치한다. 출처 링크는 data-ref-html 문서 위임이 처리.
    if (glossDefs.length) {
        container.insertAdjacentHTML('beforeend',
            `<div class="search-weak-divider search-gloss-divider">용어 정의 — 용어집에서 ${esc(String(glossDefs.length))}건</div>`);
        const subjects = (window.DATA_REGISTRY && window.DATA_REGISTRY.subjects) || [];
        for (const entry of glossDefs) {
            const kw = String(entry.keyword || '');
            const subjKey = _glossSubjectKey(entry.subjectId);
            const subjName = (subjects.find(s => s.key === subjKey) || {}).name
                || entry.subjectId || '';
            const refPath = entry.refDoc ? resolveRefPath(entry.refDoc + '.pdf') : '';
            const refLabel = refDocDisplayName(entry.refDoc) || entry.refDoc || '';
            const srcHtml = refPath
                ? `<a href="#" data-ref-html="${esc(refPath)}" data-ref-search="${esc(kw.toLowerCase())}" class="glossary-ref-link"><i class="fa-solid fa-file-lines"></i> ${esc(refLabel)}</a>`
                : esc(refLabel);
            const glossCardHTML = html`
            <div class="textbook-result-card search-gloss-card">
                <div class="textbook-card-header">
                    <span class="textbook-card-path">
                        <span class="badge ${badgeColors[subjKey] || 'badge-gray'}">${subjName}</span>
                        <span class="badge badge-emerald">용어</span>
                    </span>
                </div>
                <h4 class="textbook-card-title">${raw(highlightTextInString(kw, allVariantTerms))}</h4>
                <div class="textbook-card-body"><div class="search-gloss-body">${String(entry.explanation || '')}</div></div>
                <div class="search-gloss-src">${raw(srcHtml)}</div>
            </div>`;
            container.insertAdjacentHTML('beforeend', glossCardHTML.toString());
        }
    }

    allResults.forEach((item, idx) => renderResultCard(item, idx));

    // TS-13 — 부분 일치 티어: 본매치(교재→참조자료→문제은행) 뒤에 구분 배치
    if (weak.shown.length) {
        container.insertAdjacentHTML('beforeend',
            `<div class="search-weak-divider">부분 일치 — 어절 중간에 음절만 겹치는 결과 ${esc(String(weak.list.length))}건</div>`);
        weak.shown.forEach((item, idx) => renderResultCard(item, allResults.length + idx));
    }

    for (const t of RESULT_TIERS) {
        if (t.capNote && t.list.length > t.limit) {
            container.insertAdjacentHTML('beforeend',
                `<div class="search-cap-note">${esc(t.capNote.replace('{limit}', String(t.limit)).replace('{total}', String(t.list.length)))}</div>`);
        }
    }

    // Mermaid 다이어그램 렌더링 (pre.mermaid 노드가 있을 때만 온디맨드 로드)
    renderMermaidIn(container, '[search]');
    attachImageZoomIn(container);
}

export function toggleTextbookCard(cardId) {
    const body = document.getElementById(`${cardId}-body`);
    const btn = document.getElementById(`${cardId}-toggle-btn`);
    if (!body || !btn) return;

    if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        body.style.maxHeight = 'none';
        btn.innerHTML = `<i class="fa-solid fa-chevron-up"></i> 접기`;
    } else {
        body.classList.add('collapsed');
        body.style.maxHeight = '';
        btn.innerHTML = `<i class="fa-solid fa-chevron-down"></i> 더 보기`;
        body.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function formatSectionContent(rawContent, searchTerms = [], item = {}) {
    // 리더와 동일한 후처리를 적용 — 출처 스탬프(최종 확인) 숨김,
    // 참조자료/과목간/기출문제 링크를 data-ref-* 액션으로 변환 (원시 경로·죽은 링크 노출 차단)
    const _rt = getRefTables();
    const subjRefFiles = (_rt.REFERENCE_FILES || {})[item.subjId] || [];
    const subjDirName = (_rt.SUBJECT_DIR_MAP || {})[item.subjId] || '';
    const srcMatch = String(rawContent || '').match(/📌\s*\*\*출처\*\*[:：]\s*(.+?)(?:\||\n)/);
    const refPath = srcMatch ? mapSourceToRef(srcMatch[1]) : null;
    let html = formatSectionContentForReader(rawContent, item.filePath, refPath, subjRefFiles, subjDirName, [], item.sectionTitle);

    // 검색 컨텍스트 전달 — 카드 내 참조 링크가 검색어를 물고 열리면 뷰어가
    // 매치 위치로 스크롤한다 (해시 없는 링크는 문서 상단에 떨어지던 문제 — TS-11 후속)
    if (searchTerms.length > 0) {
        const q = escapeHTML(searchTerms.join(' '));
        html = html.replace(/<a\b[^>]*\bdata-ref-(?:html|md)="[^"]*"[^>]*>/g, (tag) =>
            tag.includes('data-ref-search') ? tag : `${tag.slice(0, -1)} data-ref-search="${q}">`);
    }

    // 검색어 하이라이트 (마크다운 파싱 후 적용)
    if (searchTerms.length > 0) {
        searchTerms.forEach(term => {
            if (term.length > 0) {
                html = highlightTextOutsideTags(html, term);
            }
        });
    }

    return html;
}

function highlightTextInString(text, searchTerms = []) {
    let html = escapeHTML(text);
    if (searchTerms.length > 0) {
        searchTerms.forEach(term => {
            if (term.length > 0) {
                const escapedTerm = escapeRegExp(term);
                const termRegex = new RegExp(`(${escapedTerm})`, 'gi');
                html = html.replace(termRegex, '<mark class="txt-highlight">$1</mark>');
            }
        });
    }
    return html;
}

function highlightTextOutsideTags(html, term) {
    const regex = new RegExp(`([^<]*)(<[^>]+>)?`, 'g');
    const escapedTerm = escapeRegExp(term);
    const termRegex = new RegExp(`(${escapedTerm})`, 'gi');

    return html.replace(regex, (match, text, tag) => {
        const highlightedText = text.replace(termRegex, '<mark class="txt-highlight">$1</mark>');
        return highlightedText + (tag || '');
    });
}
