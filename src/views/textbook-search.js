// views/textbook-search.js - 교재 검색 통합 로직 (Textbook Search Integration)
// @spec TS-01~12,PF-08
import { escapeHTML, esc } from '../sanitize.js';
import { renderMermaidIn } from '../mermaid-render.js';
import { attachImageZoomIn } from '../image-zoom.js';
import { TIMING } from '../config/timing.js';
import { DataLoader } from '../data-loader.js';
import { hasFeature, contentPath, dataPath } from '../exam-context.js';
import { injectBundleScript, fetchMd } from '../doc-overlay.js';
import { buildBoundaryVocab, termHitQuality, expandSynonyms } from '../search-morpheme.js';
import { getRefTables, mapSourceToRef } from '../pdf-registry.js';
import { formatSectionContentForReader } from '../reader-format.js';
import { buildSectionDisplayTitles, isStoryMetaSection } from '../reader-toc.js';
import { PATHS } from '../paths.js';
import { escapeRegExp, debounce } from '../utils.js';
// [모바일 PWA 견고성] 레지스트리는 window 전역(가드)에서 읽는다(정적 import 하드 의존 지양).

const textbookState = {
    filter: 'all',
    searchQuery: '',
};

const _runSearch = debounce((value) => {
    textbookState.searchQuery = value;
    performTextbookSearch();
}, TIMING.SEARCH_DEBOUNCE_MS);

let _searchIndex = null;
let _searchIndexKeys = null;
let _tokenIndex = null;    // 어절 → Set<entryIndex> (TS-13 경계 매칭의 후보 축소)
let _morphVocab = null;    // TS-13 형태소 경계 어휘 (어절-두어 빈도 마이닝)

// --- TS-10: 이야기형 서사 지연 인덱싱 ---
// 표준형만 번들되므로 서사 텍스트(비유·예시)는 별도 fetch가 필요하다.
// 첫 검색 실행 시 storyFile을 지연 로드해 '서사' 항목으로 인덱스에 병합한다.
/** @type {Array<object>|null} */
let _storyEntries = null;
/** @type {Promise<number>|null} */
let _storyIndexPromise = null;

/**
 * 검색 대상 텍스트 정제 — 코드블록·머메이드·이미지·링크 URL 같은 마크다운
 * 구문은 내용이 아니라 오매칭 노이즈라 _searchText에서 제외한다.
 * 화면 표시용 content에는 적용하지 않는다.
 */
function _toSearchable(text) {
    return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')                 // 펜스 코드·머메이드 블록
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')           // 이미지 (alt·경로)
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')         // 링크 — 텍스트 유지, URL 제거
        .replace(/`([^`]*)`/g, '$1');                    // 인라인 코드 — 내용 유지
}

/** 이야기형 MD에서 story:start/end 블록을 {title, gotoTitle, chAnchor, text} 목록으로 추출 */
function _extractStoryBlocks(md) {
    const lines = md.split(/\r?\n/);
    /** @type {Array<{title:string, innerTitle:string, h2Ord:number, innerOrd:number, anchor:string, lines:string[]}>} */
    const blocks = [];
    /** @type {{title:string, innerTitle:string, h2Ord:number, innerOrd:number, anchor:string, lines:string[]}|null} */
    let cur = null;
    let lastHeading = '';
    let h2Ord = -1;            // 현재 소속 ## 섹션 서序 (리더의 ## 섹션 카드와 동일 순서)
    let chAnchor = '';
    let sawPreH2Content = false;
    // 리더는 ## 헤딩마다 섹션 카드를 만든다 — 블록 내부 ##도 새 카드이므로 서序를 함께 추적한다
    /** @type {Array<{title:string, meta:boolean}>} */
    const h2List = [];
    for (const l of lines) {
        const t = l.trim();
        const heading = t.match(/^(#{1,6})\s+(.*)/);
        // 첫 ## 이전의 비헤딩 라인 — 파서가 만드는 암묵 '개요' 섹션 존재 여부
        // (# H1·## 섹션 헤더는 파서가 본문에 넣지 않으므로 제외, ### 이하는 본문 취급)
        if (!h2List.length && !(t.startsWith('# ') || t.startsWith('## '))) sawPreH2Content = true;
        if (cur) {
            if (t === '<!-- story:end -->') { blocks.push(cur); cur = null; continue; }
            if (heading) {
                // 파서 규약과 동일하게 정확한 '## '만 새 섹션 카드가 된다
                if (t.startsWith('## ')) {
                    const h2Title = t.substring(3).trim();
                    h2Ord = h2List.length;
                    h2List.push({ title: h2Title, meta: isStoryMetaSection(h2Title) });
                }
                // 블록 내부 첫 헤딩을 서사 제목으로 우선 사용 (예: '## 프롤로그 — …')
                if (!cur.innerTitle) {
                    cur.innerTitle = heading[2].trim();
                    cur.innerOrd = t.startsWith('## ') ? h2Ord : -1;
                }
            }
            cur.lines.push(l);
            continue;
        }
        if (t === '<!-- story:start -->') {
            cur = { title: lastHeading, innerTitle: '', h2Ord, innerOrd: -1, anchor: chAnchor, lines: [] };
            continue;
        }
        if (heading) {
            lastHeading = heading[2].trim();
            // 리더 섹션 카드는 ## 헤딩 — ## 소속과 챕터 앵커를 이동 목적지로 추적한다
            // (###/#### 내부 헤딩은 카드 제목이 아니라 매칭 불가)
            if (t.startsWith('## ')) {
                h2Ord = h2List.length;
                h2List.push({ title: lastHeading, meta: isStoryMetaSection(lastHeading) });
                const m = lastHeading.match(/Chapter\s*(\d+)/i);
                if (m) chAnchor = 'ch' + m[1].padStart(2, '0');
            }
        }
    }
    // 리더 렌더 목록 = 암묵 '개요'(첫 ## 이전 콘텐츠) + 메타 제외 ## —
    // 표시 제목은 중복 시 챕터 병기본이므로 원시 제목으로 넘기면 오이동한다
    const renderedTitles = (sawPreH2Content ? ['개요'] : [])
        .concat(h2List.filter(h => !h.meta).map(h => h.title));
    const displayTitles = buildSectionDisplayTitles(renderedTitles.map(title => ({ title })));
    // 원시 ## 서序 → 렌더 목록 인덱스 (메타 섹션은 -1 — 리더에 없어 이동 불가)
    const renderedIdxOf = [];
    {
        let ri = sawPreH2Content ? 1 : 0;
        h2List.forEach(h => { renderedIdxOf.push(h.meta ? -1 : ri++); });
    }
    return blocks
        .map(b => {
            // 이동 목적지: 블록 자체가 ## 섹션이면 그 카드, 아니면 소속 ## 섹션.
            // 개요 구간 블록(첫 ## 이전)은 첫 렌더 섹션으로 연결한다
            const targetOrd = b.innerOrd >= 0 ? b.innerOrd : b.h2Ord;
            const targetIdx = targetOrd >= 0 ? renderedIdxOf[targetOrd] : (renderedTitles.length ? 0 : -1);
            return {
                title: b.innerTitle || b.title,
                gotoTitle: targetIdx >= 0 ? displayTitles[targetIdx] : '',
                reachable: targetIdx >= 0,
                chAnchor: b.anchor,
                text: b.lines.join('\n')
                    .replace(/<!--[^\n]*?-->/g, '')
                    .split('\n')
                    .filter(l => !l.includes('┈') && !l.trim().startsWith('!['))
                    .join('\n')
                    .trim()
            };
        })
        // 리더에 렌더되지 않는 메타 섹션 소속 블록은 도달 불가 — 결과에서 제외
        .filter(b => b.reachable && b.text.length > 0);
}

/**
 * 활성 시험의 storyFile을 지연 로드해 서사 블록을 검색 인덱스에 병합한다.
 * @returns {Promise<number>} 추가된 인덱스 항목 수
 */
function _ensureStoryIndex() {
    if (_storyIndexPromise) return _storyIndexPromise;
    _storyIndexPromise = (async () => {
        // 미보유 시험도 빈 배열로 마킹 — null이면 로딩중 판정(lazyPending)이 영구 지속된다
        if (!hasFeature('story_textbook')) { _storyEntries = []; return 0; }
        const manifest = await DataLoader._getManifest();
        const STUDY_DATA = (typeof window !== 'undefined' && window.STUDY_DATA) ? window.STUDY_DATA : {};
        /** @type {Array<object>} */
        const entries = [];
        for (const subjMeta of manifest.subjects || []) {
            const subj = STUDY_DATA[subjMeta.key];
            for (const chMeta of subjMeta.chapters || []) {
                if (!chMeta.storyFile) continue;
                try {
                    const md = await DataLoader._getMd(PATHS.TEXTBOOK_FILE(subjMeta.dir, chMeta.storyFile), subjMeta.key);
                    const chapter = (subj && subj.chapters || []).find(c => c.chapterKey === chMeta.key);
                    const chapterTitle = (chapter && chapter.chapterTitle) || chMeta.title || '';
                    for (const block of _extractStoryBlocks(md)) {
                        const sectionTitle = `📖 ${block.title || '서사'}`;
                        entries.push({
                            subjId: subjMeta.key,
                            subjName: (subj && subj.name) || subjMeta.name || subjMeta.key,
                            chapterTitle,
                            filePath: PATHS.TEXTBOOK_FILE_REL(subjMeta.dir, chMeta.storyFile),
                            sectionTitle,
                            // 리더 이야기형 섹션 카드(## 헤딩) 매칭용 — 서사 결과는 이야기형 모드로 열린다
                            gotoTitle: block.gotoTitle || '',
                            chAnchor: block.chAnchor || '',
                            content: block.text,
                            fromStory: true,
                            _searchText: (sectionTitle + ' ' + _toSearchable(block.text)).toLowerCase()
                        });
                    }
                } catch (e) {
                    console.warn('[Search] 서사 인덱스 로드 실패:', chMeta.storyFile, e);
                }
            }
        }
        _storyEntries = entries;
        // 이미 구축된 인덱스가 있으면 서사 항목을 뒤에 붙이고 역색인을 재구축한다
        if (_searchIndex && entries.length) {
            _searchIndex.push(...entries);
            _buildInvertedIndex();
        }
        return entries.length;
    })().catch(() => { _storyIndexPromise = null; return 0; });
    return _storyIndexPromise;
}

// --- TS-11: 참조자료 지연 인덱싱 ---
// ref_md 문서는 번들되지 않으므로 첫 검색 시 지연 fetch해 문서 단위 항목으로 병합한다.
// 조문 원문이라 교재 섹션보다 매치가 넓어, 결과는 '참조자료' 배지로 구분하고 교재 뒤에 배치한다.
/** @type {Array<object>|null} */
let _refEntries = null;
/** @type {Promise<number>|null} */
let _refIndexPromise = null;

/**
 * 활성 시험의 참조자료 문서 목록 — pdf-registry 테이블 기반 (파일시스템 접근 없이 열거).
 * 과목 귀속: REF_MD_SUBJECTS의 ref_md/과목N → SUBJECT_DIR_MAP으로 subject key 역해석.
 * 원료 목록은 ref_md 밖(참조자료/원료/)이지만 과목2(제조·품질) 도메인으로 귀속해 포함한다.
 * @param {object} t getRefTables() 결과
 * @returns {Array<{subjId:string, file:string, path:string, docName:string}>}
 */
export function _listRefDocs(t) {
    const dirToSubj = {};
    for (const [key, dir] of Object.entries(t.SUBJECT_DIR_MAP || {})) dirToSubj[dir] = key;
    // 친화적 표시명 맵 — REFERENCE_* 테이블의 name 우선
    const nameOf = {};
    for (const coll of [t.REFERENCE_FILES, t.REFERENCE_COMMON, t.REFERENCE_INGREDIENTS, t.REFERENCE_LAW]) {
        const list = Array.isArray(coll) ? coll : Object.values(coll || {}).flat();
        for (const e of list) if (e && e.file && e.name) nameOf[e.file] = e.name;
    }
    const docs = [];
    for (const [file, dir] of Object.entries(t.REF_MD_SUBJECTS || {})) {
        const subjId = dirToSubj[dir];
        const path = (t.REF_FILE_TO_PATH || {})[file];
        if (!subjId || !path) continue;
        docs.push({ subjId, file, path, docName: nameOf[file] || file.replace(/\.pdf$/, '') });
    }
    const ingSubj = dirToSubj['과목2'];
    if (ingSubj) {
        for (const e of (t.REFERENCE_INGREDIENTS || [])) {
            if (!e.file) continue;
            docs.push({
                subjId: ingSubj,
                file: e.file,
                path: `${t.contentRoot || 'content'}/참조자료/원료/${e.file}`,
                docName: e.name || e.file
            });
        }
    }
    return docs;
}

/**
 * 문서 본문에서 첫 매치 주변 스니펫 + 라인 번호 계산 (참조자료 결과용).
 * @returns {{snippet: string, lineNum: number}} lineNum은 1-based (ExamViewer.openExam 인자)
 */
export function _matchSnippet(text, terms, radius = 160) {
    const lower = text.toLowerCase();
    let pos = -1;
    let hitTerm = '';
    for (const t of terms) {
        const i = lower.indexOf(t);
        if (i >= 0 && (pos < 0 || i < pos)) { pos = i; hitTerm = t; }
    }
    if (pos < 0) return { snippet: text.slice(0, radius * 2), lineNum: 1 };
    const start = Math.max(0, pos - radius);
    const end = Math.min(text.length, pos + hitTerm.length + radius);
    const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    const lineNum = text.slice(0, pos).split('\n').length;
    return { snippet, lineNum };
}

/** 참조자료 문서를 지연 로드해 검색 인덱스에 병합한다. @returns {Promise<number>} 추가된 항목 수 */
function _ensureRefIndex() {
    if (_refIndexPromise) return _refIndexPromise;
    _refIndexPromise = (async () => {
        const manifest = await DataLoader._getManifest();
        const subjNameOf = {};
        for (const s of manifest.subjects || []) subjNameOf[s.key] = s.name;
        const docs = _listRefDocs(getRefTables());
        const entries = (await Promise.all(docs.map(async (d) => {
            try {
                const resp = await fetch(new URL(d.path, window.location.href).href);
                if (!resp.ok) return null;
                const text = await resp.text();
                return {
                    subjId: d.subjId,
                    subjName: subjNameOf[d.subjId] || d.subjId,
                    docName: d.docName,
                    filePath: d.path,
                    refText: text,
                    fromRef: true,
                    _searchText: `${d.docName}\n${_toSearchable(text)}`.toLowerCase()
                };
            } catch (e) {
                return null; // 오프라인·미캐시 — 해당 문서만 건너뜀
            }
        }))).filter(Boolean);
        _refEntries = entries;
        // 이미 구축된 인덱스가 있으면 참조 항목을 뒤에 붙이고 역색인을 재구축한다
        if (_searchIndex && entries.length) {
            _searchIndex.push(...entries);
            _buildInvertedIndex();
        }
        return entries.length;
    })().catch(() => { _refIndexPromise = null; return 0; });
    return _refIndexPromise;
}

// --- TS-12: 문제은행 지연 인덱싱 ---
// 문제은행 MD는 교재 번들과 별개이므로 첫 검색 시 지연 로드해 문서 단위 항목으로 병합한다.
// 탐색 순서는 교재 → 참조자료 → 문제은행 — 결과는 '문제은행' 배지로 구분해 맨 뒤에 배치.
/** @type {Array<object>|null} */
let _examEntries = null;
/** @type {Promise<number>|null} */
let _examIndexPromise = null;

/**
 * 문제은행 MD 원문 확보 — exam-viewer와 같은 로드 규약:
 * 주입된 __EXAM_MD__ 번들 우선 → http fetch → exams_md 번들 주입 폴백.
 * 실패 시 null — 해당 문서만 건너뛴다 (참조자료 인덱스와 같은 오프라인 규약).
 * @param {string} mdPath '{contentRoot}/문제은행/<file>' 형태
 * @returns {Promise<string|null>}
 */
export async function _loadExamMdText(mdPath) {
    const bundled = () => (
        typeof window !== 'undefined' && window.__EXAM_MD__ && typeof window.__EXAM_MD__[mdPath] === 'string'
    ) ? window.__EXAM_MD__[mdPath] : null;
    const cached = bundled();
    if (cached !== null) return cached;
    if (typeof location === 'undefined' || location.protocol !== 'file:') {
        try { return await fetchMd(mdPath); } catch (e) { /* 번들 폴백으로 진행 */ }
    }
    try {
        const stem = (mdPath.split('/').pop() || '').replace(/\.md$/i, '');
        await injectBundleScript(dataPath('exams_md/') + stem + '.js', 'data-exam-bundle');
        return bundled();
    } catch (e) {
        return null; // 오프라인·미캐시 — 해당 문서만 건너뜀
    }
}

/**
 * 문제은행 문서를 지연 로드해 검색 인덱스에 병합한다 — registry.exams 기반 열거,
 * 과목 귀속은 exams[].subject ↔ subjects[].key (과목 필터·배지에 사용).
 * @returns {Promise<number>} 추가된 항목 수
 */
function _ensureExamIndex() {
    if (_examIndexPromise) return _examIndexPromise;
    _examIndexPromise = (async () => {
        const registry = /** @type {{subjects?: any[], exams?: any[]}} */ (DataLoader.registry || {});
        const subjNameOf = {};
        for (const s of registry.subjects || []) subjNameOf[s.key] = s.name;
        const entries = (await Promise.all((registry.exams || []).map(async (ex) => {
            if (!ex || !ex.file) return null;
            const mdPath = contentPath(`문제은행/${ex.file}`);
            const text = await _loadExamMdText(mdPath);
            if (!text) return null;
            const docName = ex.title || ex.file;
            return {
                subjId: ex.subject || '',
                subjName: subjNameOf[ex.subject] || ex.subject || '',
                docName,
                filePath: mdPath,
                refText: text,
                fromExam: true,
                _searchText: `${docName}\n${_toSearchable(text)}`.toLowerCase()
            };
        }))).filter(Boolean);
        _examEntries = entries;
        // 이미 구축된 인덱스가 있으면 문제은행 항목을 뒤에 붙이고 역색인을 재구축한다
        if (_searchIndex && entries.length) {
            _searchIndex.push(...entries);
            _buildInvertedIndex();
        }
        return entries.length;
    })().catch(() => { _examIndexPromise = null; return 0; });
    return _examIndexPromise;
}

function _getSearchIndex() {
    const STUDY_DATA = (typeof window !== 'undefined' && window.STUDY_DATA) ? window.STUDY_DATA : {};
    const keys = Object.keys(STUDY_DATA).join(',');
    if (_searchIndex && _searchIndexKeys === keys) return _searchIndex;
    _searchIndexKeys = keys;
    _searchIndex = [];
    Object.keys(STUDY_DATA).forEach(subjId => {
        const subj = STUDY_DATA[subjId];
        if (!subj.chapters) return;
        subj.chapters.forEach(chapter => {
            if (!chapter.sections) return;
            // 섹션별 이동 목적지 — 리더 표시 제목(중복 제목은 챕터 병기된 형태) +
            // 소속 챕터 앵커(직전 "Chapter N" 헤더). 섹션 제목에서 챕터 번호를
            // 추출하면 비헤더 섹션은 앵커가 비어 과목 맨 위로 튀는 오이동이 생긴다.
            const displayTitles = buildSectionDisplayTitles(chapter.sections);
            let chAnchor = '';
            chapter.sections.forEach((section, sIdx) => {
                const chM = String(section.title || '').match(/Chapter\s*(\d+)/i);
                if (chM) chAnchor = 'ch' + chM[1].padStart(2, '0');
                // 메타 섹션(비교표·확인문제·요약 등)은 리더가 렌더하지 않아
                // 이동해도 본문에 도달할 수 없다 — 검색 결과에서 제외
                if (isStoryMetaSection(section.title)) return;
                // subsections의 content도 검색 인덱스에 포함
                let fullContent = section.content || '';
                if (section.subsections && section.subsections.length) {
                    section.subsections.forEach(sub => {
                        fullContent += '\n' + (sub.title || '') + '\n' + (sub.content || '');
                    });
                }
                // story:start/end 주석·가시 경계 마커(┈ 라인)는 검색 인덱스에서 제외
                fullContent = fullContent
                    .replace(/<!--[^\n]*?-->/g, '')
                    .split('\n')
                    .filter(l => !l.includes('┈'))
                    .join('\n');
                _searchIndex.push({
                    subjId,
                    subjName: subj.name,
                    chapterTitle: chapter.chapterTitle,
                    filePath: chapter.filePath,
                    sectionTitle: section.title,
                    gotoTitle: displayTitles[sIdx] || section.title,
                    chAnchor,
                    content: fullContent,
                    _searchText: (section.title + ' ' + _toSearchable(fullContent)).toLowerCase()
                });
            });
        });
    });
    // 서사·참조자료 인덱스가 이미 로드돼 있으면 병합 (지연 로드 시에도 인덱스 재구축 없이 유지)
    if (_storyEntries && _storyEntries.length) _searchIndex.push(..._storyEntries);
    if (_refEntries && _refEntries.length) _searchIndex.push(..._refEntries);
    if (_examEntries && _examEntries.length) _searchIndex.push(..._examEntries);
    // 3. 역색인 구축 — 각 섹션의 텍스트를 토큰화하여 단어→섹션 인덱스 생성
    _buildInvertedIndex();
    return _searchIndex;
}

// 3. 역색인 구축 — 한국어는 공백 기준 토큰화 + 2-gram 보조
// TS-13 — 어절 토큰은 _tokenIndex로 분리하고, 형태소 경계 어휘를 어절에서 마이닝한다
function _buildInvertedIndex() {
    _tokenIndex = new Map();

    const allTokens = [];
    _searchIndex.forEach((entry, idx) => {
        const text = entry._searchText;
        // 공백 기준 토큰화
        const tokens = text.split(/\s+/).filter(t => t.length >= 2);
        allTokens.push(...tokens);
        tokens.forEach(token => {
            // 어절 인덱스 (후보 축소 + 형태소 경계 판정의 토큰 컨텍스트)
            if (!_tokenIndex.has(token)) _tokenIndex.set(token, new Set());
            _tokenIndex.get(token).add(idx);
        });
    });
    _morphVocab = buildBoundaryVocab(allTokens);
}

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

    const terms = query.split(/\s+/).filter(t => t.length > 0);
    // TS-10/TS-11/TS-12 — 서사·참조자료·문제은행 인덱스 최초 1회 지연 로드; 완료 시 같은 검색어로 재실행
    // (resolved promise 재사용 시 재실행 루프가 되므로 트리거는 로드 시작 1회에 한정)
    // added=0이어도 재실행해야 lazyPending 로딩 표시가 해제된다
    if (!_storyIndexPromise) {
        _ensureStoryIndex().then(() => {
            if (textbookState.searchQuery.toLowerCase().trim() === query) {
                performTextbookSearch();
            }
        });
    }
    if (!_refIndexPromise) {
        _ensureRefIndex().then(() => {
            if (textbookState.searchQuery.toLowerCase().trim() === query) {
                performTextbookSearch();
            }
        });
    }
    if (!_examIndexPromise) {
        _ensureExamIndex().then(() => {
            if (textbookState.searchQuery.toLowerCase().trim() === query) {
                performTextbookSearch();
            }
        });
    }
    const index = _getSearchIndex();
    /** @type {Array<object>} */
    const results = [];
    /** @type {Array<object>} */
    const refResults = [];
    /** @type {Array<object>} */
    const examResults = [];
    // TS-13 — 모든 그룹이 매치되지만 하나 이상이 부분(중간) 매치뿐인 항목
    /** @type {Array<object>} */
    const weakResults = [];

    // TS-14 — registry.synonyms로 쿼리 용어를 동의 개념군으로 확장 (그룹 내 OR·그룹 간 AND)
    const synMap = (DataLoader.registry && DataLoader.registry.synonyms) || null;
    const termGroups = terms.map(t => expandSynonyms(t, synMap));

    // 3. 역색인 활용 — 각 용어 그룹의 후보 엔트리 집합을 구하고 교집합 계산
    // 어절 토큰 인덱스를 쓰므로 어절 중간 매치까지 후보에 포함된다 (품질은 뒤에서 분류)
    let candidateIndices = null;
    for (const group of termGroups) {
        const groupSet = new Set();
        for (const variant of group) {
            if (variant.includes(' ')) {
                // 공백 포함 변형은 어절 인덱스에 없음 — 텍스트 수준으로 직접 판정
                index.forEach((e, i) => {
                    if (e._searchText.includes(variant)) groupSet.add(i);
                });
            } else if (_tokenIndex) {
                for (const [token, indices] of _tokenIndex) {
                    if (token.includes(variant)) {
                        indices.forEach(i => groupSet.add(i));
                    }
                }
            }
        }
        if (candidateIndices === null) {
            candidateIndices = groupSet;
        } else {
            // 교집합
            candidateIndices = new Set([...candidateIndices].filter(i => groupSet.has(i)));
        }
        if (candidateIndices.size === 0) break;
    }

    // 역색인 결과가 있으면 해당 섹션만 검사, 없으면 전체 검사 (fallback)
    const searchEntries = (candidateIndices && candidateIndices.size > 0)
        ? [...candidateIndices].map(i => ({ entry: index[i], originalIdx: i }))
        : index.map((entry, i) => ({ entry, originalIdx: i }));

    for (const { entry } of searchEntries) {
        if (textbookState.filter !== 'all' && textbookState.filter !== entry.subjId) continue;
        // TS-13/TS-14 — 그룹별 최고 매치 품질: 2=경계(본매치), 1=부분(중간), 0=없음
        // 모든 그룹이 매치돼야 결과이며, 하나라도 부분 매치뿐이면 '부분 일치' 티어로 내린다
        let allStrong = true;
        let hits = 0;
        let titleBoost = 0;
        const head = String(entry.sectionTitle || entry.docName || '').toLowerCase();
        let excluded = false;
        for (const group of termGroups) {
            let gBest = 0;
            let gTitleBoost = 0;
            for (const variant of group) {
                const q = termHitQuality(entry._searchText, variant, _morphVocab);
                if (q > gBest) gBest = q;
                if (q > 0) {
                    const cnt = entry._searchText.split(variant).length - 1;
                    hits += (variant === group[0]) ? cnt : cnt * 0.5;
                }
                // 제목 가산은 경계 정렬 매치에만 — '석유화학'식 어절-중간 겹침은 가산 제외
                if (termHitQuality(head, variant, _morphVocab) === 2) {
                    gTitleBoost = Math.max(gTitleBoost, variant === group[0] ? 50 : 25);
                }
            }
            if (gBest === 0) { excluded = true; break; }
            if (gBest < 2) allStrong = false;
            titleBoost = Math.max(titleBoost, gTitleBoost);
        }
        if (excluded) continue;
        const score = hits + titleBoost;
        const item = entry.fromRef || entry.fromExam ? {
            subjId: entry.subjId,
            subjName: entry.subjName,
            docName: entry.docName,
            filePath: entry.filePath,
            refText: entry.refText,
            fromRef: !!entry.fromRef,
            fromExam: !!entry.fromExam,
            _hits: score
        } : {
            subjId: entry.subjId,
            subjName: entry.subjName,
            chapterTitle: entry.chapterTitle,
            filePath: entry.filePath,
            sectionTitle: entry.sectionTitle,
            gotoTitle: entry.gotoTitle,
            chAnchor: entry.chAnchor,
            content: entry.content,
            fromStory: !!entry.fromStory,
            _score: score
        };
        if (!allStrong) { weakResults.push(item); continue; }
        if (item.fromRef) refResults.push(item);
        else if (item.fromExam) examResults.push(item);
        else results.push(item);
    }

    // 관련도 정렬 — 동점은 문서 순서 유지 (stable sort). 탐색 순서는
    // 교재 → 참조자료 → 문제은행 → 부분 일치 (TS-11/TS-12/TS-13) — 그룹별 히트수 정렬·상한.
    results.sort((a, b) => b._score - a._score);
    refResults.sort((a, b) => b._hits - a._hits);
    examResults.sort((a, b) => b._hits - a._hits);
    weakResults.sort((a, b) => (b._score ?? b._hits ?? 0) - (a._score ?? a._hits ?? 0));
    const SECTION_RESULT_LIMIT = 30;
    const REF_RESULT_LIMIT = 15;
    const EXAM_RESULT_LIMIT = 15;
    const WEAK_RESULT_LIMIT = 10;
    const shownSections = results.slice(0, SECTION_RESULT_LIMIT);
    const shownRefs = refResults.slice(0, REF_RESULT_LIMIT);
    const shownExams = examResults.slice(0, EXAM_RESULT_LIMIT);
    const shownWeak = weakResults.slice(0, WEAK_RESULT_LIMIT);
    const allResults = shownSections.concat(shownRefs).concat(shownExams);
    // 하이라이트·스니펫은 동의어 변형까지 포함, 뷰어 쿼리 전달은 원어만
    const allVariantTerms = termGroups.flat();

    // 지연 인덱스(서사·참조자료·문제은행) 로딩 중 — '결과 없음' 오표시 방지
    const lazyPending = (_storyIndexPromise && _storyEntries === null)
        || (_refIndexPromise && _refEntries === null)
        || (_examIndexPromise && _examEntries === null);

    // Update summary text
    summary.innerHTML = `총 <strong style="color: var(--color-primary);">${results.length + refResults.length + examResults.length}</strong>건의 관련 내용을 찾았습니다.`
        + (weakResults.length ? ` <span class="text-muted">(+ 부분 일치 ${esc(String(weakResults.length))}건)</span>` : '')
        + (lazyPending ? ' <span class="text-muted">(서사·참조자료·문제은행을 추가로 불러오는 중…)</span>' : '');

    if (allResults.length === 0 && shownWeak.length === 0) {
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

    allResults.forEach((item, idx) => renderResultCard(item, idx));

    // TS-13 — 부분 일치 티어: 본매치(교재→참조자료→문제은행) 뒤에 구분 배치
    if (shownWeak.length) {
        container.insertAdjacentHTML('beforeend',
            `<div class="search-weak-divider">부분 일치 — 어절 중간에 음절만 겹치는 결과 ${esc(String(weakResults.length))}건</div>`);
        shownWeak.forEach((item, idx) => renderResultCard(item, allResults.length + idx));
    }

    if (results.length > SECTION_RESULT_LIMIT) {
        container.insertAdjacentHTML('beforeend',
            `<div class="search-cap-note">교재 결과가 많아 상위 ${esc(String(SECTION_RESULT_LIMIT))}건만 표시합니다 (전체 ${esc(String(results.length))}건). 검색어를 더 구체화하거나 과목 필터를 사용하세요.</div>`);
    }
    if (refResults.length > REF_RESULT_LIMIT) {
        container.insertAdjacentHTML('beforeend',
            `<div class="search-cap-note">참조자료 결과가 많아 상위 ${esc(String(REF_RESULT_LIMIT))}건만 표시합니다 (전체 ${esc(String(refResults.length))}건).</div>`);
    }
    if (examResults.length > EXAM_RESULT_LIMIT) {
        container.insertAdjacentHTML('beforeend',
            `<div class="search-cap-note">문제은행 결과가 많아 상위 ${esc(String(EXAM_RESULT_LIMIT))}건만 표시합니다 (전체 ${esc(String(examResults.length))}건).</div>`);
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

