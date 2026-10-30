// views/reader-render.js — 챕터 본문 렌더 (TOC·섹션 카드·바인딩)
// @spec TR-01,TR-02,TR-05,TR-15,TR-20,TR-27,SA-02,SA-03
// textbook-reader.js에서 분리 — _renderChapterContentInternal 이관.
// 파일 로컬 상태를 쓰지 않는 순수 렌더 경로로, 진입·상태·진척은
// textbook-reader.js / reader-progress.js가 담당한다.
import { esc } from '../../sanitize.js';
import { refreshProBadges } from '../../pro/pro-upgrade.js';
import { formatSectionContentForReader, markStoryNarrative } from '../../reader/reader-format.js';
import { renderStudyAids, bindStudyAidToggles } from '../../study/study-aids.js';
import { renderMermaidIn } from '../../reader/mermaid-render.js';
import { attachImageZoomIn } from '../../reader/image-zoom.js';
import {
    getRefTables, mapSourceToRef
} from '../../pdf-registry.js';
import { collectGlossaryItems, renderGlossaryTable, appendGlossaryTocItem } from '../glossary-renderer.js';
import {
    getTocLevel,
    extractSubHeadings, buildSectionDisplayTitles
} from '../../reader/reader-toc.js';
import {
    getAudioPathForChapter
} from './reader-audio.js';
import { hasFeature } from '../../exam-context.js';
import {
    getReaderBookmarks, toggleReaderBookmark, bookmarkKeyOf,
    applyReaderThemeClass,
    bindReaderScrollEvents
} from './reader-toolbar.js';
import { getReaderNotes, getReaderNote, setReaderNote } from '../../study/reader-notes.js';
import { bindReferenceLinks, refreshRefLinkNotices } from './reader-ref-links.js';

// ── 렌더 보조 UI ─────────────────────────────────────────────
function showReaderAuxUi() {
    const toolbar = document.getElementById('reader-toolbar');
    const toc = document.getElementById('reader-toc');
    const progressBar = document.getElementById('reader-progress-bar');
    const stickyHeading = document.getElementById('reader-sticky-heading');
    if (toolbar) toolbar.classList.remove('is-hidden');
    if (toc) toc.classList.remove('is-hidden');
    if (progressBar) progressBar.classList.remove('is-hidden');
    if (stickyHeading) stickyHeading.classList.add('is-hidden'); // hidden until scroll
}

// ── TOC 생성 (A: 계층 들여쓰기, B: 접기/펼치기, D: 브레드크럼, F: 하위 헤딩) ──
// 섹션 아이템 + 하위 헤딩 HTML 생성 (하위 헤딩은 기본 접힘)
function buildTocSectionItem(section, idx, minLevel, displayTitle) {
    const title = displayTitle || section.title;
    const level = Math.max(minLevel, getTocLevel(section.title));
    const subHeadings = extractSubHeadings(section.content);
    const hasChildren = subHeadings.length > 0;
    let html = `<div class="reader-toc-item toc-level-${level}${hasChildren ? ' has-children' : ''}" data-section-idx="${idx}" data-toc-title="${esc(title)}">`;
    if (hasChildren) {
        html += `<i class="fa-solid fa-chevron-right toc-toggle-icon"></i>`;
    }
    html += `<span class="toc-text">${esc(title)}</span>`;
    html += `</div>`;
    if (hasChildren) {
        html += `<div class="reader-toc-children collapsed" data-parent-idx="${idx}">`;
        subHeadings.forEach((sh, hIdx) => {
            const subLevel = sh.level === 3 ? 0 : 1;
            html += `<div class="reader-toc-sub-item toc-sub-level-${subLevel}" data-section-idx="${idx}" data-heading-idx="${hIdx}" data-toc-title="${esc(sh.title)}">`;
            html += `<span class="toc-sub-text">${esc(sh.title)}</span>`;
            html += `</div>`;
        });
        html += `</div>`;
    }
    return html;
}

function buildTocHtml(chapter, displayTitles) {
    let tocHtml = '';
    let inChapter = false;
    let hasSeenNumbered = false;
    chapter.sections.forEach((section, idx) => {
        // 참조문서 헤더 (01_화장품법 등) — NN_ 접두사 제거 + 중복 제목 챕터 병기
        const displayTitle = displayTitles[idx];

        const isChapterHeader = /Chapter\s+\d+/i.test(section.title);
        const level = getTocLevel(section.title);
        const isNumberedChild = level >= 1; // 1., (1), ①

        if (isChapterHeader) {
            if (inChapter) tocHtml += `</div>`; // close previous chapter children
            // Chapter parent item
            tocHtml += `<div class="reader-toc-item toc-chapter" data-section-idx="${idx}" data-toc-title="${esc(section.title)}">`;
            tocHtml += `<i class="fa-solid fa-chevron-down toc-toggle-icon"></i>`;
            tocHtml += `<span class="toc-text">${esc(section.title)}</span>`;
            tocHtml += `</div>`;
            // Start chapter children container (기본 펼침)
            tocHtml += `<div class="reader-toc-children toc-chapter-children" data-parent-idx="${idx}">`;
            inChapter = true;
            hasSeenNumbered = false;
        } else if (inChapter) {
            if (isNumberedChild) {
                // 번호 있는 섹션 → Chapter 자식
                hasSeenNumbered = true;
                tocHtml += buildTocSectionItem(section, idx, 1, displayTitle);
            } else if (hasSeenNumbered) {
                // 번호 섹션 이후 비번호 섹션 → Chapter 종료, 최상위 레벨
                tocHtml += `</div>`;
                inChapter = false;
                tocHtml += buildTocSectionItem(section, idx, 0, displayTitle);
            }
            // else: Chapter 헤더 직후 비번호 섹션 (intro) → TOC에서 생략
        } else {
            // Chapter 밖 — 최상위 레벨
            tocHtml += buildTocSectionItem(section, idx, 0, displayTitle);
        }
    });
    if (inChapter) tocHtml += `</div>`; // close last chapter children
    return tocHtml;
}

// TOC 아이템 클릭 — 섹션 스크롤 + 접기 토글 (B)
function bindTocItemClicks(tocList) {
    tocList.querySelectorAll('.reader-toc-item').forEach(node => {
        const item = /** @type {HTMLElement} */ (node);
        item.addEventListener('click', (e) => {
            const toggleIcon = (/** @type {Element|null} */ (e.target))?.closest('.toc-toggle-icon');
            const idx = parseInt(item.dataset.sectionIdx || '');
            if (toggleIcon) {
                // 토글: 바로 다음 형제 children 컨테이너 찾기
                let next = item.nextElementSibling;
                while (next && !next.classList.contains('reader-toc-children')) {
                    next = next.nextElementSibling;
                }
                if (next && Number((/** @type {HTMLElement} */ (next)).dataset.parentIdx) === idx) {
                    const collapsed = next.classList.toggle('collapsed');
                    toggleIcon.classList.toggle('fa-chevron-down', !collapsed);
                    toggleIcon.classList.toggle('fa-chevron-right', collapsed);
                }
                return;
            }
            // 섹션으로 스크롤
            const target = document.getElementById(`reader-section-${idx}`);
            if (target) {
                if (target.classList.contains('collapsed')) {
                    target.classList.remove('collapsed');
                }
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// TOC 하위 헤딩 클릭 — 헤딩 스크롤 (F)
function bindTocSubItemClicks(tocList) {
    tocList.querySelectorAll('.reader-toc-sub-item').forEach(node => {
        const sub = /** @type {HTMLElement} */ (node);
        sub.addEventListener('click', () => {
            const secIdx = parseInt(sub.dataset.sectionIdx || '');
            const hIdx = parseInt(sub.dataset.headingIdx || '');
            const sectionEl = document.getElementById(`reader-section-${secIdx}`);
            if (!sectionEl) return;
            if (sectionEl.classList.contains('collapsed')) {
                sectionEl.classList.remove('collapsed');
            }
            const headings = sectionEl.querySelectorAll('h3.md-h3, h4.md-h4');
            if (headings[hIdx]) {
                headings[hIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// TOC 툴팁 (JavaScript 기반 — 컨테이너 overflow로 인한 잘림 방지)
// hover 가능 기기(데스크톱)에서만 의미 있음 — 모바일은 탭 즉시 네비게이션되어
// 툴팁이 잔류/깜빡임만 유발
function bindTocTooltips(tocList) {
    let tocTooltip = document.getElementById('toc-tooltip');
    if (!tocTooltip) {
        tocTooltip = document.createElement('div');
        tocTooltip.id = 'toc-tooltip';
        tocTooltip.setAttribute('role', 'tooltip');
        document.body.appendChild(tocTooltip);
    }
    const showTocTooltip = (el) => {
        const title = el.dataset.tocTitle;
        if (!title) return;
        tocTooltip.textContent = title;
        const rect = el.getBoundingClientRect();
        tocTooltip.style.left = (rect.right + 6) + 'px';
        tocTooltip.style.top = rect.top + 'px';
        // 화면 오른쪽을 넘어가면 왼쪽에 표시
        const tipRect = tocTooltip.getBoundingClientRect();
        if (tipRect.right > window.innerWidth - 8) {
            tocTooltip.style.left = (rect.left - tipRect.width - 6) + 'px';
        }
        tocTooltip.classList.add('is-visible');
    };
    const hideTocTooltip = () => {
        tocTooltip.classList.remove('is-visible');
    };
    const hoverCapable = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (hoverCapable) {
        tocList.querySelectorAll('.reader-toc-item, .reader-toc-sub-item').forEach(el => {
            el.addEventListener('mouseenter', () => showTocTooltip(el));
            el.addEventListener('mouseleave', hideTocTooltip);
            el.addEventListener('focus', () => showTocTooltip(el));
            el.addEventListener('blur', hideTocTooltip);
        });
    }
}

function renderToc(tocList, chapter, displayTitles) {
    tocList.innerHTML = buildTocHtml(chapter, displayTitles);
    bindTocItemClicks(tocList);
    bindTocSubItemClicks(tocList);
    bindTocTooltips(tocList);
}

// 챕터 출처 텍스트 → 참조자료 경로 (컨텍스트 사이드바 + L-line PDF 링크용)
function resolveChapterRefPath(chapter) {
    let sourceText = '';
    for (const s of chapter.sections) {
        const m = (s.content || '').match(/📌\s*\*\*출처\*\*[:：]\s*(.+?)(?:\||\n)/);
        if (m) { sourceText = m[1]; break; }
    }
    return mapSourceToRef(sourceText);
}

// 챕터 액션을 툴바에 동적 주입 (오디오 — 기출 필터/원본/참조자료 버튼은 2026-10 제거, SA-01·RR-07)
function injectChapterActions(subjId, chapterIdx, hasAudio) {
    const actionsGroup = document.getElementById('reader-chapter-actions-group');
    if (!actionsGroup) return;
    let actionsHtml = '';
    if (hasAudio) {
        actionsHtml += `<button id="reader-audio-toggle-btn" class="reader-tool-btn" data-click="toggleReaderAudio" data-args='["${subjId}", ${chapterIdx}]' title="오디오 듣기">
            <i class="fa-solid fa-headphones" aria-hidden="true"></i> 오디오 <span class="pro-badge" data-pro-feature="audiobook">PRO</span>
        </button>`;
    }
    actionsGroup.innerHTML = actionsHtml;
    // 오디오 미보유 시험은 액션 그룹이 완전히 빈다 — 고아 분리선이 남지 않게 함께 숨김
    actionsGroup.classList.toggle('is-hidden', !actionsHtml);
    const divider = actionsGroup.previousElementSibling;
    if (divider && divider.classList.contains('reader-toolbar-divider')) {
        divider.classList.toggle('is-hidden', !actionsHtml);
    }
    refreshProBadges(actionsGroup);
}

// 오디오 플레이어 영역을 툴바 아래에 렌더 (미보유 시험은 숨김)
function renderAudioPlayerArea(hasAudio) {
    const audioPlayerArea = document.getElementById('reader-audio-player-area');
    if (!audioPlayerArea) return;
    if (hasAudio) {
        audioPlayerArea.classList.remove('is-hidden');
        audioPlayerArea.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.55rem;">
                <i class="fa-solid fa-circle-play" style="color: var(--color-primary);"></i>
                <span id="reader-audio-now-playing" style="color: var(--color-text-main); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
                <span id="reader-audio-status" class="is-hidden" style="margin-left: auto; font-size: 0.78rem; color: var(--warning);"></span>
            </div>
            <div id="reader-audio-controls" style="display: flex; align-items: center; gap: 0.6rem;">
                <button id="reader-audio-playpause-btn" class="btn btn-secondary" data-click="toggleReaderPlayPause" title="재생" style="display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; padding: 0; border-radius: 50%; flex-shrink: 0;">
                    <i class="fa-solid fa-play"></i>
                </button>
                <span id="reader-audio-current" style="font-variant-numeric: tabular-nums; flex-shrink: 0;">0:00</span>
                <input type="range" id="reader-audio-seek" min="0" max="100" value="0" step="0.1" disabled data-input="seekReaderAudio" style="flex: 1; accent-color: var(--color-primary); cursor: pointer; height: 4px;">
                <span id="reader-audio-duration" style="font-variant-numeric: tabular-nums; flex-shrink: 0;">0:00</span>
                <button id="reader-audio-rate-btn" class="btn btn-secondary" data-click="cycleReaderAudioRate" title="재생 속도" style="font-size: 0.78rem; padding: 0.25rem 0.5rem; flex-shrink: 0; min-width: 3rem;">1x</button>
                <button id="reader-audio-scroll-btn" class="btn btn-secondary" data-click="toggleReaderAutoScroll" title="오디오 위치에 맞춰 자동으로 스크롤" style="font-size: 0.78rem; padding: 0.25rem 0.5rem; flex-shrink: 0; white-space: nowrap;">
                    <i class="fa-solid fa-arrows-up-down"></i> 스크롤 따라가기
                </button>
            </div>
        `;
    } else {
        audioPlayerArea.classList.add('is-hidden');
        audioPlayerArea.innerHTML = '';
    }
}

// 섹션 카드 HTML 생성 — ctx: {subjId, chapterIdx, displayTitles, bookmarks,
//   chapterRefPath, subjRefFiles, subjDirName, glossaryItems, notes}
function buildSectionsHtml(chapter, ctx) {
    const { subjId, chapterIdx, displayTitles, bookmarks,
        chapterRefPath, subjRefFiles, subjDirName, glossaryItems, notes } = ctx;
    let html = '';
    chapter.sections.forEach((section, idx) => {
        // 북마크 키는 콘텐츠 기반 (TR-27) — 위치 인덱스는 교재 편집 시 오표적
        const bookmarkKey = bookmarkKeyOf(subjId,
            chapter.chapterKey || chapter.chapterTitle || chapterIdx, section.title || idx);
        const isBookmarked = bookmarks.includes(bookmarkKey);
        // 섹션 메모 (TR-30) — 북마크 키를 공유하므로 위치 이동에도 따라붙는다
        const noteText = (notes && notes[bookmarkKey] && notes[bookmarkKey].note) || '';
        const allContent = [section.content || '', ...((section.subsections || []).map(s => s.content || ''))].join('\n');
        const secSrcMatch = allContent.match(/📌\s*\*\*출처\*\*[:：]\s*(.+?)(?:\||\n)/);
        const secRefPath = secSrcMatch ? mapSourceToRef(secSrcMatch[1]) : null;
        const refPath = secRefPath || chapterRefPath;
        let sectionHtml = formatSectionContentForReader(section.content, chapter.filePath, refPath, subjRefFiles, subjDirName, glossaryItems, section.title);
        if (section.subsections && section.subsections.length > 0) {
            for (const sub of section.subsections) {
                sectionHtml += `<h5 class="reader-subsection-title">${esc(sub.title)}</h5>`;
                sectionHtml += `<div class="reader-subsection-content">${formatSectionContentForReader(sub.content, chapter.filePath, refPath, subjRefFiles, subjDirName, glossaryItems, sub.title)}</div>`;
            }
        }
        html += `
            <div class="reader-section-card${noteText ? ' has-note' : ''}" id="reader-section-${idx}" data-section-idx="${idx}">
                <div class="reader-section-header" data-section-idx="${idx}">
                    <i class="fa-solid fa-chevron-down reader-section-toggle"></i>
                    <h4 class="reader-section-title">${esc(displayTitles[idx])}</h4>
                    <button class="reader-note-btn${noteText ? ' has-note' : ''}" data-note-key="${esc(bookmarkKey)}"
                            data-note-subj="${esc(subjId)}" data-note-title="${esc(section.title || '')}"
                            title="메모 ${noteText ? '보기·수정' : '추가'}" aria-label="섹션 메모">
                        <i class="fa-${noteText ? 'solid' : 'regular'} fa-note-sticky"></i>
                    </button>
                    <button class="reader-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-key="${esc(bookmarkKey)}" title="북마크 ${isBookmarked ? '제거' : '추가'}">
                        <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i>
                    </button>
                </div>
                <div class="reader-section-body">
                    ${noteText ? `<div class="reader-note-view"><i class="fa-solid fa-note-sticky" aria-hidden="true"></i> <span class="reader-note-text">${esc(noteText)}</span></div>` : ''}
                    <div class="textbook-reader-section-content">
                        ${sectionHtml}
                    </div>
                </div>
            </div>
        `;
    });
    return html;
}

/**
 * 섹션 메모 버튼 바인딩 (TR-30) — 컨테이너 단위, 재렌더마다 재호출.
 * @param {HTMLElement} container
 */
export function bindReaderNotes(container) {
    if (!container) return;
    container.querySelectorAll('.reader-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            _toggleNoteEditor(/** @type {HTMLElement} */ (btn));
        });
    });
}

/**
 * 섹션 메모 인라인 에디터 토글 (TR-30) — 카드 본문 상단에 textarea를 둔다.
 * 저장/삭제 즉시 카드의 메모 표시·버튼 상태를 갱신한다 (재렌더 없이).
 */
function _toggleNoteEditor(btn) {
    const card = btn.closest('.reader-section-card');
    const body = card && card.querySelector('.reader-section-body');
    if (!card || !body) return;
    const existing = body.querySelector('.reader-note-editor');
    if (existing) { existing.remove(); return; }

    const key = btn.dataset.noteKey || '';
    const editor = document.createElement('div');
    editor.className = 'reader-note-editor';
    editor.innerHTML = `
        <textarea class="form-input reader-note-input" rows="3"
            placeholder="이 섹션에 대한 메모를 남기세요…" aria-label="섹션 메모">${esc(getReaderNote(key))}</textarea>
        <div class="btn-row reader-note-actions">
            <button type="button" class="btn btn-sm btn-primary" data-note-save>저장</button>
            <button type="button" class="btn btn-sm btn-secondary" data-note-delete>삭제</button>
            <button type="button" class="btn btn-sm btn-secondary" data-note-close>닫기</button>
        </div>`;
    body.prepend(editor);
    const input = /** @type {HTMLTextAreaElement|null} */ (editor.querySelector('.reader-note-input'));
    input?.focus();

    const refresh = () => {
        const text = getReaderNote(key);
        card.classList.toggle('has-note', !!text);
        btn.classList.toggle('has-note', !!text);
        btn.title = `메모 ${text ? '보기·수정' : '추가'}`;
        const icon = btn.querySelector('i');
        if (icon) icon.className = `fa-${text ? 'solid' : 'regular'} fa-note-sticky`;
        let view = body.querySelector('.reader-note-view');
        if (text) {
            if (!view) {
                view = document.createElement('div');
                view.className = 'reader-note-view';
                view.innerHTML = '<i class="fa-solid fa-note-sticky" aria-hidden="true"></i> <span class="reader-note-text"></span>';
                const content = body.querySelector('.textbook-reader-section-content');
                body.insertBefore(view, content || null);
            }
            const span = view.querySelector('.reader-note-text');
            if (span) span.textContent = text;
        } else if (view) {
            view.remove();
        }
    };
    editor.querySelector('[data-note-save]')?.addEventListener('click', () => {
        setReaderNote(key, input ? input.value : '', { subject: btn.dataset.noteSubj, title: btn.dataset.noteTitle });
        refresh();
        editor.remove();
    });
    editor.querySelector('[data-note-delete]')?.addEventListener('click', () => {
        setReaderNote(key, '');
        if (input) input.value = '';
        refresh();
        editor.remove();
    });
    editor.querySelector('[data-note-close]')?.addEventListener('click', () => editor.remove());
}

// 본문 목차 하이퍼링크 → 대응 섹션으로 스크롤 (5단계 매칭 폴백)
function bindTocJumpLinks(container) {
    container.querySelectorAll('a[data-toc-jump]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const jumpText = ((/** @type {HTMLElement} */ (link)).dataset.tocJump || '').trim();
            if (!jumpText) return;
            // 이모지 제거한 정규화 텍스트 (매칭용)
            const normalize = (s) => s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '').replace(/\s+/g, ' ').trim();
            const jumpNorm = normalize(jumpText);
            // 목차 항목 텍스트가 포함된 섹션 찾기
            const sectionCards = container.querySelectorAll('.reader-section-card');
            let found = /** @type {Element|null} */ (null);
            // 1순위: 정확 매칭 (이모지 포함) — 첫 매칭 채택 (마지막 매칭은 뒤쪽 챕터로 오이동)
            sectionCards.forEach(card => {
                if (found) return;
                const titleEl = card.querySelector('.reader-section-title');
                if (!titleEl) return;
                const title = titleEl.textContent.trim();
                if (title.includes(jumpText) || jumpText.includes(title)) {
                    found = card;
                }
            });
            // 2순위: 이모지 무시 매칭
            if (!found && jumpNorm) {
                sectionCards.forEach(card => {
                    if (found) return;
                    const titleEl = card.querySelector('.reader-section-title');
                    if (!titleEl) return;
                    const titleNorm = normalize(titleEl.textContent.trim());
                    if (titleNorm && (titleNorm.includes(jumpNorm) || jumpNorm.includes(titleNorm))) {
                        found = card;
                    }
                });
            }
            // 3순위: Chapter NN 매칭 (목차 "Chapter 01." → 섹션 "📚 Chapter 01. xxx")
            if (!found && /Chapter\s+\d+/i.test(jumpText)) {
                const chMatch = jumpText.match(/Chapter\s+(\d+)/i);
                if (chMatch) {
                    const chNum = chMatch[1];
                    sectionCards.forEach(card => {
                        if (found) return;
                        const titleEl = card.querySelector('.reader-section-title');
                        if (!titleEl) return;
                        const title = titleEl.textContent.trim();
                        if (new RegExp('Chapter\\s+' + chNum + '\\b', 'i').test(title)) {
                            found = card;
                        }
                    });
                }
            }
            // 4순위: 키워드 기반 매칭 (핵심 명사 추출)
            if (!found && jumpNorm) {
                // 핵심 키워드 추출 (2자 이상 한글/영어 단어)
                const keywords = jumpNorm.match(/[\uac00-\ud7a3]{2,}|[A-Za-z]{2,}/g) || [];
                if (keywords.length > 0) {
                    let bestMatch = null;
                    let bestScore = 0;
                    sectionCards.forEach(card => {
                        const titleEl = card.querySelector('.reader-section-title');
                        if (!titleEl) return;
                        const titleNorm = normalize(titleEl.textContent.trim());
                        if (!titleNorm) return;
                        let score = 0;
                        keywords.forEach(kw => {
                            if (titleNorm.includes(kw)) score += kw.length;
                        });
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = card;
                        }
                    });
                    // 키워드의 50% 이상 매칭 시 채택
                    if (bestMatch && bestScore >= keywords.join('').length * 0.5) {
                        found = bestMatch;
                    }
                }
            }
            // 5순위: 섹션 본문 내용에서 텍스트 검색 (마인드맵 매핑 표 링크용)
            if (!found && jumpNorm) {
                sectionCards.forEach(card => {
                    if (found) return;
                    const body = card.querySelector('.reader-section-body');
                    if (!body) return;
                    const bodyText = body.textContent || '';
                    if (bodyText.includes(jumpNorm)) {
                        found = card;
                    }
                });
            }
            if (found) {
                if (found.classList.contains('collapsed')) {
                    found.classList.remove('collapsed');
                }
                found.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

export async function renderChapterContentInternal(subjId, chapterIdx, subj, chapter, isStoryMode) {
    const container = document.getElementById('textbook-reader-container');
    if (!container) return;

    container.classList.toggle('story-mode', !!isStoryMode);
    showReaderAuxUi();

    const bookmarks = getReaderBookmarks();

    // 챕터마다 반복되는 제목(📌 챕터 핵심 요약 등)에 소속 챕터명 병기 — TOC·섹션 헤더 공용
    const displayTitles = buildSectionDisplayTitles(chapter.sections);

    const tocList = document.getElementById('reader-toc-list');
    if (tocList) renderToc(tocList, chapter, displayTitles);

    // [멀티시험] 오디오북·참조자료는 시험 features 플래그로 게이트
    // 오디오 MP3는 이야기형 교재 내레이션이므로 이야기형 모드(story_textbook Pro)에서만 표시.
    // 매니페스트 조회는 단원 인덱스 기반이므로 정규 챕터 객체로 해석한다 —
    // 이야기형 chapter 객체는 신규 객체라 indexOf 실패 + fileName 규칙 불일치로 경로를 못 찾는다.
    const audioChapter = (subj.chapters && subj.chapters[chapterIdx]) || chapter;
    const audioPath = (hasFeature('audiobook') && isStoryMode) ? getAudioPathForChapter(subjId, audioChapter) : null;
    const hasAudio = !!audioPath;

    const chapterRefPath = resolveChapterRefPath(chapter);

    // --- 용어집 항목 사전 계산 (glossary-renderer 모듈 위임) ---
    const glossaryItems = collectGlossaryItems(chapter.sections, chapterRefPath, mapSourceToRef, subjId);
    const hasGlossary = glossaryItems.length > 0;

    // TOC에 용어집 항목 추가
    if (hasGlossary && tocList) {
        appendGlossaryTocItem(tocList);
    }

    let html = `
        <div class="reader-readable-width">
    `;

    injectChapterActions(subjId, chapterIdx, hasAudio);
    renderAudioPlayerArea(hasAudio);

    try {
        html += await renderStudyAids(chapter, subjId);
    } catch (err) {
        console.warn('[Reader] 학습 보조 렌더링 실패:', err);
    }

    // D: 브레드크럼 — 제거됨 (TOC 하이라이트 + sticky heading으로 대체)

    const _rt = getRefTables();
    const subjRefFiles = (_rt.REFERENCE_FILES || {})[subjId] || [];
    const subjDirName = (_rt.SUBJECT_DIR_MAP || {})[subjId] || '';

    html += buildSectionsHtml(chapter, {
        subjId, chapterIdx, displayTitles, bookmarks,
        chapterRefPath, subjRefFiles, subjDirName, glossaryItems,
        notes: getReaderNotes(),
    });

    // --- 과목별 용어집 테이블 (glossary-renderer 모듈 위임) ---
    if (hasGlossary) {
        html += renderGlossaryTable(glossaryItems);
    }

    html += `
        <div class="reader-chapter-end-marker" role="separator" aria-label="단원 끝">— 단원 끝 —</div>
        </div><!-- /reader-readable-width -->
    `;

    container.innerHTML = html;

    // 참조 링크 원문 최신화 배지 (인라인 [data-law-url] — 구 드롭다운 트리거 대체, RR-19)
    refreshRefLinkNotices();

    // 이야기형: 📖 장면·💭 에필로그·프롤로그 범위에 서사 스타일 태깅 (명조체+색상 구분)
    if (isStoryMode) {
        container.querySelectorAll('.textbook-reader-section-content, .reader-subsection-content')
            .forEach(el => markStoryNarrative(el));
    }

    // Study aid toggles (기출 핵심, 숫자 암기표)
    bindStudyAidToggles(container);

    // Section collapse toggles
    container.querySelectorAll('.reader-section-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if ((/** @type {Element|null} */ (e.target))?.closest('.reader-bookmark-btn, .reader-note-btn')) return;
            const card = header.closest('.reader-section-card');
            if (card) card.classList.toggle('collapsed');
        });
    });

    bindTocJumpLinks(container);

    // Bookmark buttons
    container.querySelectorAll('.reader-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReaderBookmark((/** @type {HTMLElement} */ (btn)).dataset.bookmarkKey, btn);
        });
    });

    // Section note buttons (TR-30) — 섹션 카드 본문 상단의 인라인 에디터 토글
    bindReaderNotes(container);

    // Scroll position reset + scroll spy binding
    container.scrollTop = 0;
    bindReaderScrollEvents();
    applyReaderThemeClass();

    // Mermaid 다이어그램 렌더링 (pre.mermaid 노드가 있을 때만 온디맨드 로드)
    renderMermaidIn(container, '[reader]');
    attachImageZoomIn(container);

    // 참조자료 링크 이벤트 바인딩
    bindReferenceLinks();
}
