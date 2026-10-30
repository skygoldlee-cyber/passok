// views/textbook-search.js - 교재 검색 뷰 계층 (Textbook Search View)
// @spec TS-01~16,TS-18,PF-08
// 인덱스 구축·지연 로드·형태소 매칭·랭킹은 src/search-index.js로 분리 —
// 이 모듈은 검색창 이벤트·결과 버킷 렌더·뷰 이동 위임만 담당한다.
import { escapeHTML, esc, html, raw } from '../sanitize.js';
import { renderMermaidIn } from '../reader/mermaid-render.js';
import { attachImageZoomIn } from '../reader/image-zoom.js';
import { TIMING } from '../config/timing.js';
import { DataLoader } from '../content/data-loader.js';
import { getRefTables, mapSourceToRef, resolveRefPath, refDocDisplayName } from '../pdf-registry.js';
import { formatSectionContentForReader } from '../reader/reader-format.js';
import { escapeRegExp, debounce } from '../utils.js';
import { ensureLazyIndexes, runUnifiedSearch, _matchSnippet } from '../search/search-index.js';
import { glossarySubjectKey } from '../reader/glossary-query.js';
import { initSearchSources, matchGlossaryDefs } from '../search/search-sources.js';

const textbookState = {
    filter: 'all',
    searchQuery: '',
};

const _runSearch = debounce((value) => {
    textbookState.searchQuery = value;
    performTextbookSearch();
}, TIMING.SEARCH_DEBOUNCE_MS);

// 결과 티어 — 정렬·상한·캡 노트를 테이블로 일원화 (탐색 순서: 교재→참조자료→문제은행, 부분 일치는 별도 후미 그룹)
// kinds는 엔트리 kind → 표시 티어 매핑 (TS-18 — 코어는 kind 버킷만 반환, 표시 그룹핑은 뷰 몫)
// '*' 티어는 앞 티어가 소비하지 않은 모든 kind를 받는다 — 시험 팩이 새 kind 소스를
// 등록해도 뷰 수정 없이 결과가 표시된다.
const RESULT_TIERS = [
    { kinds: ['section', 'story'], limit: 30, capNote: '교재 결과가 많아 상위 {limit}건만 표시합니다 (전체 {total}건). 검색어를 더 구체화하거나 과목 필터를 사용하세요.' },
    { kinds: ['ref'], limit: 15, capNote: '참조자료 결과가 많아 상위 {limit}건만 표시합니다 (전체 {total}건).' },
    { kinds: ['exam'], limit: 15, capNote: '문제은행 결과가 많아 상위 {limit}건만 표시합니다 (전체 {total}건).' },
    { kinds: '*', limit: 10, capNote: '기타 결과가 많아 상위 {limit}건만 표시합니다 (전체 {total}건).' },
    { kinds: ['weak'], limit: 10 },
];

// kind → 배지 라벨 (문서 카드용). 미등록 kind는 키 자체를 표시한다.
const KIND_LABELS = { ref: '참조자료', exam: '문제은행', doc: '문서' };

export function renderTextbookSearch() {
    initSearchSources(); // TS-18 — 플랫폼 콘텐츠 소스 등록 (idempotent)
    const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('textbook-search-input'));

    // 도메인 검색 카피 — manifest uiText.search가 플레이스홀더·안내 문구를 덮어쓴다 (DA-12)
    const searchText = (DataLoader.registry && DataLoader.registry.uiText
        && DataLoader.registry.uiText.search) || {};
    const descEl = document.getElementById('textbook-search-desc');
    if (searchInput && searchText.placeholder) searchInput.placeholder = searchText.placeholder;
    if (descEl && searchText.subtitle) descEl.textContent = searchText.subtitle;

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
                <i class="fa-solid fa-book-open"></i>
                <h3>검색어를 입력하세요</h3>
                <p>위 검색창에 궁금한 교재 키워드를 입력하고 검색 결과를 확인하세요.</p>
            </div>
        `;
        return;
    }

    // TS-10/TS-11/TS-12 — 서사·참조자료·문제은행 인덱스 최초 1회 지연 로드; 완료 시 같은 검색어로 재실행
    // added=0이어도 재실행해야 lazyPending 로딩 표시가 해제된다.
    // 2자 미만 쿼리에서는 지연 로드를 기동하지 않는다 — 한 글자 입력에 전 문서 fetch가 걸리는 것을 막는다.
    if (query.length >= 2) {
        ensureLazyIndexes(() => {
            if (textbookState.searchQuery.toLowerCase().trim() === query) {
                performTextbookSearch();
            }
        });
    }

    const { buckets, allVariantTerms, lazyPending, failedTerms } =
        runUnifiedSearch(query, textbookState.filter);
    // TS-15 — 용어 정의 카드는 콘텐츠 계층(search-sources)이 인덱스 산출 어휘로 선별한다
    const glossDefs = matchGlossaryDefs(allVariantTerms, textbookState.filter);

    const [sections, refs, exams, others, weak] = applyResultTiers(buckets);
    const allResults = sections.shown.concat(refs.shown, exams.shown, others.shown);

    // Update summary text
    summary.innerHTML = `총 <strong class="text-primary">${sections.list.length + refs.list.length + exams.list.length + others.list.length}</strong>건의 관련 내용을 찾았습니다.`
        + (weak.list.length ? ` <span class="text-muted">(+ 부분 일치 ${esc(String(weak.list.length))}건)</span>` : '')
        + (glossDefs.length ? ` <span class="text-muted">(+ 용어 정의 ${esc(String(glossDefs.length))}건)</span>` : '')
        + (failedTerms && failedTerms.length ? ` <span class="text-muted">(미발견 용어: ${esc(failedTerms.join(', '))})</span>` : '')
        + (lazyPending ? ' <span class="text-muted">(추가 검색 소스를 불러오는 중…)</span>' : '');

    // AND 불성립 시 어떤 용어가 실패했는지 안내하고 제외 재검색 버튼을 제공한다.
    // 실패 용어가 있으면 본문 버킷은 모두 비지만 용어집 카드는 남을 수 있으므로
    // 안내는 결과 렌더와 별도로 맨 앞에 둔다 (지연 로딩 중에는 잠정 결과라 표시 보류).
    let failedHtml = '';
    if (!lazyPending && failedTerms && failedTerms.length) {
        const remaining = query.split(/\s+/).filter(t => !failedTerms.includes(t));
        const retryBtn = remaining.length
            ? `<button class="btn btn-secondary" data-click="setTextbookSearchQuery" data-args='${esc(JSON.stringify([remaining.join(' ')]))}'><i class="fa-solid fa-rotate-right"></i> 미발견 용어를 빼고 검색</button>`
            : '';
        failedHtml = `<p>다음 용어는 검색 대상에서 찾지 못했습니다: <strong>${esc(failedTerms.join(', '))}</strong></p>${retryBtn}`;
    }

    // TS-15 — 본문 결과가 없어도 용어 정의 카드는 표시한다 (용어 단독 조회 지원)
    if (allResults.length === 0 && weak.shown.length === 0 && glossDefs.length === 0) {
        // 지연 인덱스 로딩 중이면 '결과 없음' 대신 추가 결과 가능성을 안내
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid ${lazyPending ? 'fa-circle-notch fa-spin empty-icon-primary' : 'fa-triangle-exclamation empty-icon-warning'}"></i>
                <h3>${lazyPending ? '검색 범위를 확장하는 중입니다' : '일치하는 내용이 없습니다'}</h3>
                <p>${lazyPending ? '추가 검색 소스(서사·참조자료·문제은행·선언 문서)를 불러오고 있습니다 — 결과가 추가될 수 있습니다.' : '다른 검색어로 검색해보거나 띄어쓰기를 확인해보세요.'}</p>
                ${raw(failedHtml)}
            </div>
        `;
        return;
    }

    // Render results
    container.innerHTML = '';
    if (failedHtml) {
        container.insertAdjacentHTML('beforeend',
            `<div class="search-failed-terms">${raw(failedHtml)}</div>`);
    }
    const badgeColors = {};
    {
        const colors = ['badge-cyan', 'badge-violet', 'badge-emerald', 'badge-amber', 'badge-rose', 'badge-indigo'];
        const subjects = (DataLoader.registry && DataLoader.registry.subjects) || [];
        subjects.forEach((sub, idx) => { badgeColors[sub.key] = colors[idx % colors.length]; });
    }
    const renderResultCard = (item, idx) =>
        renderSearchResultCard(container, item, idx, allVariantTerms, badgeColors);

    renderGlossaryCards(container, glossDefs, allVariantTerms, badgeColors);

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

// 티어별 정렬·상한 (테이블 주도 — 티어 추가 시 RESULT_TIERS 한 곳만 수정)
// kinds '*'는 선언되지 않은 나머지 kind 버킷을 전부 받는 폴백 티어다 (TS-18).
function applyResultTiers(buckets) {
    const consumedKinds = new Set(['weak']);
    for (const t of RESULT_TIERS) {
        const ks = Array.isArray(t.kinds)
            ? t.kinds
            : Object.keys(buckets).filter(k => !consumedKinds.has(k));
        ks.forEach(k => consumedKinds.add(k));
        t.list = ks.flatMap(k => buckets[k] || []);
        t.list.sort((a, b) => b._score - a._score);
        t.shown = t.list.slice(0, t.limit);
    }
    return RESULT_TIERS;
}

// 문서 결과 — nav.mdPath를 가진 모든 소스 (참조자료·문제은행·시험 선언 문서 등).
// 문서 단위 + 매치 스니펫 + ExamViewer 라인 딥링크 (TS-11/TS-12/TS-18)
function renderDocResultCard(container, item, allVariantTerms, badgeColor) {
    const { snippet, lineNum } = _matchSnippet(item.text, allVariantTerms);
    const argsJson = esc(JSON.stringify([item.nav.mdPath, lineNum, allVariantTerms.join(' ')]));
    const kindLabel = esc(KIND_LABELS[item.kind] || item.kind);
    const subjBadgeHtml = item.subjName ? `<span class="badge ${badgeColor}">${esc(item.subjName)}</span>` : '';
    // 카드 전체가 원문 딥링크 — 섹션 카드의 is-clickable 규약과 동일 (data-click 위임)
    const refCardHTML = `
    <div class="textbook-result-card is-clickable" data-click="ExamViewer.openExam" data-args='${argsJson}' tabindex="0" role="link" aria-label="${esc(item.title)} — 원문 보기">
        <div class="textbook-card-header">
            <span class="textbook-card-path">
                ${subjBadgeHtml}
                <span class="badge badge-gray">${kindLabel}</span>
                <i class="fa-solid fa-chevron-right"></i>
                <span>${esc(item.title)}</span>
            </span>
            <button class="btn btn-secondary textbook-card-btn" data-click="ExamViewer.openExam" data-args='${argsJson}'>
                <i class="fa-solid fa-book-open"></i> 원문 보기
            </button>
        </div>
        <h4 class="textbook-card-title">${highlightTextInString(item.title, allVariantTerms)}</h4>
        <div class="textbook-card-body"><div class="search-ref-snippet">${highlightTextInString(snippet, allVariantTerms)}</div></div>
    </div>
`;
    container.insertAdjacentHTML('beforeend', refCardHTML);
}

// 섹션 결과 카드 — 포맷 본문 + '전체 단원 보기' 이동 링크 (nav.goto가 있는 소스만)
function renderSectionResultCard(container, item, idx, allVariantTerms, badgeColor) {
    const isLong = item.text.length > 300;
    const bodyClass = isLong ? 'textbook-card-body collapsed' : 'textbook-card-body';
    const formattedContent = formatSectionContent(item.text, allVariantTerms, item);
    const storyBadge = item.kind === 'story' ? '<span class="badge badge-gray">서사</span>' : '';
    // '전체 단원 보기' → 리더의 해당 "섹션"으로 이동 — 소스 프로바이더가 기록한
    // 이동 페이로드(표시 제목·챕터 앵커·모드 플래그)를 그대로 전달한다.
    // nav.goto가 없는 소스는 이동 링크 없이 카드만 렌더한다.
    const gotoData = (item.nav && item.nav.goto) ? JSON.stringify(item.nav.goto) : '';
    const gotoAttr = gotoData ? ` data-search-goto="${esc(gotoData)}" tabindex="0" role="link" aria-label="${esc(item.title)} — 교재에서 보기"` : '';
    const gotoLink = gotoData
        ? `<a href="#" data-search-goto="${esc(gotoData)}" class="btn btn-secondary textbook-card-btn"><i class="fa-solid fa-arrow-up-right-from-square"></i> 전체 단원 보기</a>`
        : '';
    const subjBadge = item.subjName ? `<span class="badge ${badgeColor}">${esc(item.subjName)}</span>` : '';
    const crumbHtml = item.crumb ? `<i class="fa-solid fa-chevron-right"></i><span>${esc(item.crumb)}</span>` : '';

    const cardId = `textbook-card-${idx}`;
    const cardHTML = `
        <div class="textbook-result-card${gotoData ? ' is-clickable' : ''}"${gotoAttr}>
            <div class="textbook-card-header">
                <span class="textbook-card-path">
                    ${subjBadge}
                    ${storyBadge}
                    ${crumbHtml}
                </span>
                ${gotoLink}
            </div>
            <h4 class="textbook-card-title">${highlightTextInString(item.title, allVariantTerms)}</h4>
            <div class="${bodyClass}" id="${cardId}-body">
                ${formattedContent}
            </div>
            ${isLong ? `
            <div class="textbook-card-actions">
                <button class="btn btn-secondary textbook-card-toggle-btn" data-click="toggleTextbookCard" data-arg="${cardId}" id="${cardId}-toggle-btn">
                    <i class="fa-solid fa-chevron-down"></i> 더 보기
                </button>
            </div>
            ` : ''}
        </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHTML);
}

function renderSearchResultCard(container, item, idx, allVariantTerms, badgeColors) {
    const badgeColor = badgeColors[item.subjId] || 'badge-gray';
    if (item.nav && item.nav.mdPath) {
        renderDocResultCard(container, item, allVariantTerms, badgeColor);
        return;
    }
    renderSectionResultCard(container, item, idx, allVariantTerms, badgeColor);
}

// TS-15 — 용어 정의 카드를 본문 결과(교재→참조자료→문제은행→부분 일치)보다
// 앞에 별도 그룹으로 배치한다. 출처 링크는 data-ref-html 문서 위임이 처리.
function renderGlossaryCards(container, glossDefs, allVariantTerms, badgeColors) {
    if (!glossDefs.length) return;
    container.insertAdjacentHTML('beforeend',
        `<div class="search-weak-divider search-gloss-divider">용어 정의 — 용어집에서 ${esc(String(glossDefs.length))}건</div>`);
    const subjects = (DataLoader.registry && DataLoader.registry.subjects) || [];
    for (const entry of glossDefs) {
        const kw = String(entry.keyword || '');
        const subjKey = glossarySubjectKey(entry.subjectId);
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
    let html = formatSectionContentForReader(rawContent, item.filePath, refPath, subjRefFiles, subjDirName, [], item.title);

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
