// src/search-index.js — 통합검색 인덱스 코어 (순수 로직, DOM 무의존)
// @spec TS-10~16,TS-17
// views/textbook-search.js에서 분리 — 인덱스 구축·무효화·지연 로드(서사·참조·
// 문제은행)·역색인·형태소 어휘·매칭/랭킹을 담당한다. 뷰 계층은 이 모듈의
// runTextbookSearch 결과를 렌더만 한다.
import { DataLoader } from './data-loader.js';
import { hasFeature, contentPath, dataPath, getActiveExamId } from './exam-context.js';
import { injectBundleScript, fetchMd } from './doc-overlay.js';
import { buildBoundaryVocab, termHitQuality, expandSynonyms } from './search-morpheme.js';
import { getAllGlossaryKeywords, getGlossaryEntry } from './glossary-query.js';
import { getRefTables } from './pdf-registry.js';
import { buildSectionDisplayTitles, isStoryMetaSection } from './reader-toc.js';
import { PATHS } from './paths.js';

let _searchIndex = null;
let _searchIndexKeys = null;
let _tokenIndex = null;    // 어절 → Set<entryIndex> (TS-13 경계 매칭의 후보 축소)
let _morphVocab = null;    // TS-13 형태소 경계 어휘 (어절-두어 빈도 마이닝)
let _indexExamId = null;   // 인덱스를 구축한 시험 — 시험 전환 시 지연 병합분도 함께 폐기

// --- TS-10: 이야기형 서사 지연 인덱싱 ---
// 표준형만 번들되므로 서사 텍스트(비유·예시)는 별도 fetch가 필요하다.
// 첫 검색 실행 시 storyFile을 지연 로드해 '서사' 항목으로 인덱스에 병합한다.
/** @type {Array<object>|null} */
let _storyEntries = null;
/** @type {Promise<number>|null} */
let _storyIndexPromise = null;

// --- TS-11: 참조자료 지연 인덱싱 ---
// ref_md 문서는 번들되지 않으므로 첫 검색 시 지연 fetch해 문서 단위 항목으로 병합한다.
// 조문 원문이라 교재 섹션보다 매치가 넓어, 결과는 '참조자료' 배지로 구분하고 교재 뒤에 배치한다.
/** @type {Array<object>|null} */
let _refEntries = null;
/** @type {Promise<number>|null} */
let _refIndexPromise = null;

// --- TS-12: 문제은행 지연 인덱싱 ---
// 문제은행 MD는 교재 번들과 별개이므로 첫 검색 시 지연 로드해 문서 단위 항목으로 병합한다.
// 탐색 순서는 교재 → 참조자료 → 문제은행 — 결과는 '문제은행' 배지로 구분해 맨 뒤에 배치.
/** @type {Array<object>|null} */
let _examEntries = null;
/** @type {Promise<number>|null} */
let _examIndexPromise = null;

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

/** 지연 병합분이 준비되면 구축된 인덱스에 뒤에 붙이고 역색인을 재구축한다 */
function _mergeLazyEntries(entries) {
    if (_searchIndex && entries.length) {
        _searchIndex.push(...entries);
        _buildInvertedIndex();
    }
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
        _mergeLazyEntries(entries);
        return entries.length;
    })().catch(() => { _storyIndexPromise = null; return 0; });
    return _storyIndexPromise;
}

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
        _mergeLazyEntries(entries);
        return entries.length;
    })().catch(() => { _refIndexPromise = null; return 0; });
    return _refIndexPromise;
}

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
        _mergeLazyEntries(entries);
        return entries.length;
    })().catch(() => { _examIndexPromise = null; return 0; });
    return _examIndexPromise;
}

// 지연 인덱스 소스 목록 — 시작 여부 확인 + 기동을 테이블로 일원화
/** @type {Array<[() => Promise<number>|null, () => Promise<number>]>} */
const _LAZY_SOURCES = [
    [() => _storyIndexPromise, _ensureStoryIndex],
    [() => _refIndexPromise, _ensureRefIndex],
    [() => _examIndexPromise, _ensureExamIndex],
];

/**
 * 미기동 지연 인덱스를 기동하고, 각 소스 완료 시 onReady를 1회씩 호출한다.
 * resolved promise 재사용 시 재실행 루프가 되므로 트리거는 로드 시작 1회에 한정.
 * @param {() => void} onReady - 지연 소스 완료 콜백 (뷰의 검색 재실행 트리거)
 */
export function ensureLazyIndexes(onReady) {
    for (const [pending, ensure] of _LAZY_SOURCES) {
        if (pending()) continue;
        ensure().then(onReady);
    }
}

/** 지연 인덱스(서사·참조자료·문제은행) 로딩 중 여부 — '결과 없음' 오표시 방지 */
export function lazyIndexesPending() {
    return (_storyIndexPromise !== null && _storyEntries === null)
        || (_refIndexPromise !== null && _refEntries === null)
        || (_examIndexPromise !== null && _examEntries === null);
}

function _getSearchIndex() {
    const STUDY_DATA = (typeof window !== 'undefined' && window.STUDY_DATA) ? window.STUDY_DATA : {};
    const examId = getActiveExamId();
    const keys = examId + '|' + Object.keys(STUDY_DATA).join(',');
    if (_searchIndex && _searchIndexKeys === keys) return _searchIndex;
    if (_indexExamId !== null && _indexExamId !== examId) {
        // 리로드 없는 시험 전환 방어 — 이전 시험의 서사·참조·문제은행 병합분 폐기
        _storyEntries = null; _storyIndexPromise = null;
        _refEntries = null; _refIndexPromise = null;
        _examEntries = null; _examIndexPromise = null;
        _morphVocab = null; _tokenIndex = null;
    }
    _indexExamId = examId;
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
    _buildInvertedIndex();
    return _searchIndex;
}

// 역색인 구축 — 어절 토큰은 _tokenIndex로 분리하고, 형태소 경계 어휘를 어절에서 마이닝한다
function _buildInvertedIndex() {
    _tokenIndex = new Map();

    const allTokens = [];
    _searchIndex.forEach((entry, idx) => {
        const text = entry._searchText;
        const tokens = text.split(/\s+/).filter(t => t.length >= 2);
        allTokens.push(...tokens);
        tokens.forEach(token => {
            // 어절 인덱스 (후보 축소 + 형태소 경계 판정의 토큰 컨텍스트)
            if (!_tokenIndex.has(token)) _tokenIndex.set(token, new Set());
            _tokenIndex.get(token).add(idx);
        });
    });
    // TS-16 — 용어집 키워드를 독립 어절로 주입: 코퍼스 빈도가 낮아 접두
    // 마이닝(2회+)에 잡히지 않는 도메인 형태소도 DP 커버의 분해 단위가 된다
    for (const { keyword } of getAllGlossaryKeywords()) {
        const kw = String(keyword || '').trim().toLowerCase();
        if (kw.length >= 2 && !/\s/.test(kw)) allTokens.push(kw);
    }
    _morphVocab = buildBoundaryVocab(allTokens);
}

// TS-15 — 용어집 subjectId('과목N') → registry subj key 역매핑 (필터 귀속·배지 표시용)
export function _glossSubjectKey(subjectId) {
    const map = getRefTables().SUBJECT_DIR_MAP || {};
    for (const [key, dir] of Object.entries(map)) {
        if (dir === subjectId) return key;
    }
    return '';
}

// TS-15 — 쿼리 변형(동의어 포함)과 경계 매치하는 용어집 항목을 키워드별 대표로
// 수집한다. 큐레이션 우선·정확 매치 > 경계 매치·짧은 키워드 우선·상한 5건.
// 키워드 자체도 형태소 경계 규칙(termHitQuality)으로 판정해 '화' 같은
// 음절 우연이 아닌 어절/형태소 경계 매치만 정의 카드로 올린다.
function _matchGlossaryDefs(variants, filter) {
    if (!variants.length || !_morphVocab) return [];
    const repByKw = new Map();
    for (const { keyword, idxKey } of getAllGlossaryKeywords()) {
        const kwLower = String(keyword || '').trim().toLowerCase();
        if (kwLower.length < 2) continue;
        const prev = repByKw.get(kwLower);
        if (prev && prev.curated) continue;      // 큐레이션 항목이 이미 대표
        const entry = getGlossaryEntry(idxKey);
        if (entry && (!prev || entry.curated)) repByKw.set(kwLower, entry);
    }
    const hits = [];
    for (const entry of repByKw.values()) {
        const kwLower = String(entry.keyword || '').trim().toLowerCase();
        if (filter !== 'all' && filter !== _glossSubjectKey(entry.subjectId)) continue;
        let score = 0;
        for (const variant of variants) {
            if (kwLower === variant) { score = 3; break; }
            if (termHitQuality(kwLower, variant, _morphVocab) === 2) score = Math.max(score, 1);
        }
        if (score) hits.push({ entry, score });
    }
    hits.sort((a, b) => b.score - a.score
        || String(a.entry.keyword).length - String(b.entry.keyword).length);
    return hits.slice(0, 5).map(h => h.entry);
}

/**
 * 통합검색 실행 — 쿼리를 동의어 그룹으로 확장해 역색인 후보를 교집합으로 좁히고,
 * 형태소 경계 품질(termHitQuality)로 교재→참조자료→문제은행→부분 일치 티어에
 * 버킷한다. 정렬·표시 상한·렌더는 뷰 계층 몫.
 * @param {string} query - 소문자 정규화된 검색어 (빈 문자열 가드는 호출자)
 * @param {string} filter - 과목 필터 ('all' 또는 subjId)
 * @returns {{
 *   buckets: {sections: object[], refs: object[], exams: object[], weak: object[]},
 *   allVariantTerms: string[],
 *   glossDefs: object[],
 *   lazyPending: boolean
 * }} 각 항목에는 _score(관련도 점수)가 부여돼 있다
 */
export function runTextbookSearch(query, filter = 'all') {
    const index = _getSearchIndex();
    const terms = query.split(/\s+/).filter(t => t.length > 0);
    /** @type {{sections: object[], refs: object[], exams: object[], weak: object[]}} */
    const buckets = { sections: [], refs: [], exams: [], weak: [] };

    // TS-14 — registry.synonyms로 쿼리 용어를 동의 개념군으로 확장 (그룹 내 OR·그룹 간 AND)
    const synMap = (DataLoader.registry && DataLoader.registry.synonyms) || null;
    const termGroups = terms.map(t => expandSynonyms(t, synMap));

    // 역색인 활용 — 각 용어 그룹의 후보 엔트리 집합을 구하고 교집합 계산
    // 어절 토큰 인덱스를 쓰므로 어절 중간 매치까지 후보에 포함된다 (품질은 뒤에서 분류)
    let candidateIndices = null;
    let impossible = false;
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
            candidateIndices = new Set([...candidateIndices].filter(i => groupSet.has(i)));
        }
        if (candidateIndices.size === 0) { impossible = true; break; }
    }

    // 한 그룹이라도 후보가 없으면 AND 매치 불가 — 전체 스캔 생략
    const searchEntries = impossible ? [] : [...(candidateIndices || [])].map(i => index[i]);

    for (const entry of searchEntries) {
        if (filter !== 'all' && filter !== entry.subjId) continue;
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
        // 엔트리 필드를 그대로 얇게 복사해 _score를 부여 — 버킷은 플래그로 구분
        const item = { ...entry, _score: hits + titleBoost };
        if (!allStrong) buckets.weak.push(item);
        else if (item.fromRef) buckets.refs.push(item);
        else if (item.fromExam) buckets.exams.push(item);
        else buckets.sections.push(item);
    }

    return {
        buckets,
        allVariantTerms: termGroups.flat(),
        glossDefs: _matchGlossaryDefs(termGroups.flat(), filter),
        lazyPending: lazyIndexesPending(),
    };
}
