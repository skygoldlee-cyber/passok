// src/search-sources.js — 통합검색 콘텐츠 소스 프로바이더 (플랫폼 콘텐츠 계층)
// @spec TS-10~12,TS-15~16,TS-18
// search-index.js 코어는 콘텐츠 종류를 모른다 — 인덱싱·역색인·매칭/랭킹만 담당하고,
// 각 콘텐츠 소스는 이 모듈이 registerSearchSource()로 등록한다.
// 교재 번들(STUDY_DATA)·서사 MD·참조자료·문제은행의 구조 지식과
// 리더 이동 규약(gotoTitle·chAnchor)은 전부 이 계층의 관심사다.
//
// 소스 프로바이더가 반환하는 범용 엔트리 계약 (SearchDoc):
//   kind        소스 종류 ('section'|'story'|'ref'|'exam') — 버킷·카드 티어 키
//   title       표시 제목 / crumb  보조 라벨 (챕터 제목 등)
//   subjId/subjName  과목 귀속 (과목 필터·배지 표시)
//   text        스니펫·본문 렌더 대상 원문
//   filePath    원본 파일 경로 (참조 링크 해석 컨텍스트)
//   nav         이동 페이로드 — {goto:[subjId,표시제목,챕터앵커,모드]} 또는 {mdPath}
//   _searchText 소문자·공백 정규화된 검색 텍스트 (코어가 인덱싱)
import { DataLoader } from './data-loader.js';
import { hasFeature, contentPath, dataPath, getActiveExamId } from './exam-context.js';
import { injectBundleScript, fetchMd } from './doc-overlay.js';
import { getRefTables } from './pdf-registry.js';
import { buildSectionDisplayTitles, isStoryMetaSection } from './reader-toc.js';
import { PATHS } from './paths.js';
import { registerSearchSource, registerVocabContributor, _toSearchable, _getMorphVocab } from './search-index.js';
import { termHitQuality } from './search-morpheme.js';
import { getAllGlossaryKeywords, getGlossaryEntry, glossarySubjectKey } from './glossary-query.js';

/** SearchDoc 생성 — _searchText는 제목+본문의 소문자·공백 정규화본 */
function _doc(fields) {
    return {
        ...fields,
        // 공백 연속을 단일 스페이스로 정규화 — 구문(phrase) 매치가 개행에 끊기지 않게 한다
        _searchText: `${fields.title || ''} ${_toSearchable(fields.text)}`.toLowerCase().replace(/\s+/g, ' '),
    };
}

/**
 * 교재 번들(STUDY_DATA)의 섹션들을 검색 엔트리로 수집한다.
 * 이동 목적지는 리더 표시 제목(중복 제목은 챕터 병기) + 소속 챕터 앵커 —
 * 리더의 카드 렌더 규약(메타 섹션 미렌더·## 섹션 단위)을 여기서 해석한다.
 * @param {Object} [studyData] - 테스트 주입용. 생략 시 window.STUDY_DATA
 * @returns {Array<object>} kind='section' 엔트리 목록
 */
export function collectTextbookSections(studyData) {
    const STUDY_DATA = studyData
        || ((typeof window !== 'undefined' && window.STUDY_DATA) ? window.STUDY_DATA : {});
    const entries = [];
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
                entries.push(_doc({
                    kind: 'section',
                    subjId,
                    subjName: subj.name,
                    title: section.title,
                    crumb: chapter.chapterTitle,
                    filePath: chapter.filePath,
                    text: fullContent,
                    nav: { goto: [subjId, displayTitles[sIdx] || section.title, chAnchor, ''] },
                }));
            });
        });
    });
    return entries;
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
 * 활성 시험의 storyFile을 로드해 서사 블록 엔트리를 반환한다 (지연 소스, kind='story').
 * features.story_textbook 미보유 시험은 빈 배열 — 미기동으로 두면 로딩중 판정이 영구 지속된다.
 * @returns {Promise<Array<object>>}
 */
async function loadStoryEntries() {
    if (!hasFeature('story_textbook')) return [];
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
                    entries.push(_doc({
                        kind: 'story',
                        subjId: subjMeta.key,
                        subjName: (subj && subj.name) || subjMeta.name || subjMeta.key,
                        title: `📖 ${block.title || '서사'}`,
                        crumb: chapterTitle,
                        filePath: PATHS.TEXTBOOK_FILE_REL(subjMeta.dir, chMeta.storyFile),
                        text: block.text,
                        // 서사 결과는 이야기형 ## 섹션 카드로 이동 — 리더 story 모드 플래그
                        nav: { goto: [subjMeta.key, block.gotoTitle || '', block.chAnchor || '', 'story'] },
                    }));
                }
            } catch (e) {
                console.warn('[Search] 서사 인덱스 로드 실패:', chMeta.storyFile, e);
            }
        }
    }
    return entries;
}

/**
 * 활성 시험의 참조자료 문서 목록 — pdf-registry 테이블 기반 (파일시스템 접근 없이 열거).
 * 과목 귀속: REF_MD_SUBJECTS의 ref_md/과목N → SUBJECT_DIR_MAP으로 subject key 역해석.
 * 원료 목록 등 ref_md 밖 문서(REFERENCE_INGREDIENTS)는 항목의 subject/dir 필드로 귀속한다
 * (references.json 선언 — 코어에 시험 도메인 귀속을 하드코딩하지 않는다).
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
    for (const e of (t.REFERENCE_INGREDIENTS || [])) {
        if (!e.file) continue;
        // dir은 references.json 엔트리별 선언 — 미선언 항목은 경로 해석 불가라 제외
        // (코드 기본값 없음 — 디렉터리 규약은 시험 소유)
        if (!e.dir) continue;
        // subject은 과목 디렉터리명('과목N') 또는 과목 키 모두 허용 — 미지정 시 미귀속('')으로 포함
        const ingSubj = dirToSubj[e.subject]
            || ((t.SUBJECT_DIR_MAP || {})[e.subject] ? e.subject : '');
        docs.push({
            subjId: ingSubj,
            file: e.file,
            path: `${t.contentRoot || 'content'}/참조자료/${e.dir}/${e.file}`,
            docName: e.name || e.file
        });
    }
    return docs;
}

/**
 * 참조자료 문서를 로드해 문서 단위 엔트리로 반환한다 (지연 소스, kind='ref').
 * 오프라인·미캐시 문서는 건너뛴다.
 * @returns {Promise<Array<object>>}
 */
async function loadRefEntries() {
    const manifest = await DataLoader._getManifest();
    const subjNameOf = {};
    for (const s of manifest.subjects || []) subjNameOf[s.key] = s.name;
    const docs = _listRefDocs(getRefTables());
    return (await Promise.all(docs.map(async (d) => {
        try {
            const resp = await fetch(new URL(d.path, window.location.href).href);
            if (!resp.ok) return null;
            const text = await resp.text();
            return _doc({
                kind: 'ref',
                subjId: d.subjId,
                subjName: subjNameOf[d.subjId] || d.subjId || '공통',
                title: d.docName,
                filePath: d.path,
                text,
                nav: { mdPath: d.path },
            });
        } catch (e) {
            return null; // 오프라인·미캐시 — 해당 문서만 건너뜀
        }
    }))).filter(Boolean);
}

/**
 * MD 원문 확보 — 뷰어들과 같은 로드 규약:
 * 주입된 번들 전역 우선 → http fetch → 번들 스크립트 주입 폴백.
 * 실패 시 null — 해당 문서만 건너뛴다 (오프라인 규약).
 * @param {string} mdPath 전체 경로 (예: '{contentRoot}/문제은행/<file>')
 * @param {string} globalKey 번들 전역명 ('__EXAM_MD__' | '__DOC_MD__')
 * @param {string} bundleDir 번들 스크립트 디렉터리 (dataPath('exams_md/') 등)
 * @param {string} bundleAttr 중복 주입 방지용 스크립트 속성
 * @returns {Promise<string|null>}
 */
async function _loadMdText(mdPath, globalKey, bundleDir, bundleAttr) {
    const bundled = () => (
        typeof window !== 'undefined' && window[globalKey] && typeof window[globalKey][mdPath] === 'string'
    ) ? window[globalKey][mdPath] : null;
    const cached = bundled();
    if (cached !== null) return cached;
    if (typeof location === 'undefined' || location.protocol !== 'file:') {
        try { return await fetchMd(mdPath); } catch (e) { /* 번들 폴백으로 진행 */ }
    }
    try {
        const stem = (mdPath.split('/').pop() || '').replace(/\.md$/i, '');
        await injectBundleScript(bundleDir + stem + '.js', bundleAttr);
        return bundled();
    } catch (e) {
        return null; // 오프라인·미캐시 — 해당 문서만 건너뜀
    }
}

/** 문제은행 MD — __EXAM_MD__ 번들/exams_md 경로 규약 */
export async function _loadExamMdText(mdPath) {
    return _loadMdText(mdPath, '__EXAM_MD__', dataPath('exams_md/'), 'data-exam-bundle');
}

/** 시험 문서(docs/) MD — __DOC_MD__ 번들/docs_md 경로 규약 (manual-viewer와 동일) */
async function _loadDocMdText(mdPath) {
    return _loadMdText(mdPath, '__DOC_MD__', dataPath('docs_md/'), 'data-doc-bundle');
}

/**
 * 문제은행 문서를 로드해 문서 단위 엔트리로 반환한다 (지연 소스, kind='exam').
 * 과목 귀속은 registry.exams[].subject ↔ subjects[].key.
 * @returns {Promise<Array<object>>}
 */
async function loadExamEntries() {
    const registry = /** @type {{subjects?: any[], exams?: any[]}} */ (DataLoader.registry || {});
    const subjNameOf = {};
    for (const s of registry.subjects || []) subjNameOf[s.key] = s.name;
    return (await Promise.all((registry.exams || []).map(async (ex) => {
        if (!ex || !ex.file) return null;
        const mdPath = contentPath(`문제은행/${ex.file}`);
        const text = await _loadExamMdText(mdPath);
        if (!text) return null;
        const docName = ex.title || ex.file;
        return _doc({
            kind: 'exam',
            subjId: ex.subject || '',
            subjName: subjNameOf[ex.subject] || ex.subject || '',
            title: docName,
            filePath: mdPath,
            text,
            nav: { mdPath },
        });
    }))).filter(Boolean);
}

/**
 * 시험 팩 선언 문서 로드 (지연 소스, 기본 kind='doc').
 * manifest.searchDocs: [{file, title, subject?, kind?, feature?}] —
 *   file    contentRoot 상대 경로 (예: 'docs/user_manual.md')
 *   subject 과목 키 (미지정 시 미귀속)
 *   kind    결과 버킷·배지 종류 (기본 'doc')
 *   feature feature 플래그 게이트 — 비활성 시험에서는 건너뜀
 * 시험 팩이 검색 범위를 코드 수정 없이 manifest 선언으로 확장하는 경로다.
 * @returns {Promise<Array<object>>}
 */
export async function _loadExamDocEntries() {
    const manifest = await DataLoader._getManifest();
    const docs = manifest.searchDocs || [];
    const subjNameOf = {};
    for (const s of manifest.subjects || []) subjNameOf[s.key] = s.name;
    return (await Promise.all(docs.map(async (d) => {
        if (!d || !d.file) return null;
        if (d.feature && !hasFeature(d.feature)) return null;
        const mdPath = contentPath(d.file);
        const text = await _loadDocMdText(mdPath);
        if (!text) return null;
        return _doc({
            kind: d.kind || 'doc',
            subjId: d.subject || '',
            subjName: subjNameOf[d.subject] || d.subject || '',
            title: d.title || d.file,
            filePath: mdPath,
            text,
            nav: { mdPath },
        });
    }))).filter(Boolean);
}

// --- 용어 정의 카드 (TS-15) ---
// 용어집 데이터 접근·과목 귀속 해석은 glossary-query가 소유한다 — 이 계층이
// 쿼리 변형과 경계 매치하는 항목을 고르고, 코어는 형태소 어휘(_getMorphVocab)만 빌려준다.
// 용어집 인덱스는 시험 내 불변이므로 시험 id 키로 캐시한다.

let _glossReps = null; // {examId, map} — 키워드별 대표 용어집 항목 캐시

/** 키워드 → 대표 용어집 항목 맵 (큐레이션 우선) */
function _glossRepresentatives() {
    const examId = getActiveExamId();
    if (_glossReps && _glossReps.examId === examId) return _glossReps.map;
    const repByKw = new Map();
    for (const { keyword, idxKey } of getAllGlossaryKeywords()) {
        const kwLower = String(keyword || '').trim().toLowerCase();
        if (kwLower.length < 2) continue;
        const prev = repByKw.get(kwLower);
        if (prev && prev.curated) continue;      // 큐레이션 항목이 이미 대표
        const entry = getGlossaryEntry(idxKey);
        if (entry && (!prev || entry.curated)) repByKw.set(kwLower, entry);
    }
    _glossReps = { examId, map: repByKw };
    return repByKw;
}

/**
 * 쿼리 변형(동의어 포함)과 경계 매치하는 용어집 항목을 키워드별 대표로 수집한다.
 * 큐레이션 우선·정확 매치 > 경계 매치·짧은 키워드 우선·상한 5건.
 * 키워드 자체도 형태소 경계 규칙(termHitQuality)으로 판정해 '화' 같은
 * 음절 우연이 아닌 어절/형태소 경계 매치만 정의 카드로 올린다.
 * runUnifiedSearch 직후에 호출해야 한다 (형태소 어휘는 인덱스 구축 산출물).
 * @param {string[]} variants - runUnifiedSearch의 allVariantTerms
 * @param {string} filter - 과목 필터 ('all' 또는 subjId)
 * @returns {Array<object>} 용어집 항목 목록 (최대 5건)
 */
export function matchGlossaryDefs(variants, filter) {
    const vocab = _getMorphVocab();
    if (!variants.length || !vocab) return [];
    const repByKw = _glossRepresentatives();
    const hits = [];
    for (const entry of repByKw.values()) {
        const kwLower = String(entry.keyword || '').trim().toLowerCase();
        if (filter !== 'all' && filter !== glossarySubjectKey(entry.subjectId)) continue;
        let score = 0;
        for (const variant of variants) {
            if (kwLower === variant) { score = 3; break; }
            if (termHitQuality(kwLower, variant, vocab) === 2) score = Math.max(score, 1);
        }
        if (score) hits.push({ entry, score });
    }
    hits.sort((a, b) => b.score - a.score
        || String(a.entry.keyword).length - String(b.entry.keyword).length);
    return hits.slice(0, 5).map(h => h.entry);
}

// --- 소스 등록 (TS-18) ---
// 교재는 즉시 수집(eager) 소스 — 인덱스 구축 시 동기 호출.
// 서사·참조자료·문제은행은 지연(lazy) 소스 — 첫 검색 시 비동기 로드 후 병합.
// rev()는 소스 데이터의 변경 신호 — 반환값이 바뀌면 인덱스 캐시가 무효화된다.
let _initialized = false;

/** 플랫폼 기본 검색 소스 등록 — idempotent (뷰·테스트 초기화에서 반복 호출 안전) */
export function initSearchSources() {
    if (_initialized) return;
    _initialized = true;
    registerSearchSource({
        id: 'textbook',
        kind: 'section',
        load: collectTextbookSections,
        rev: () => Object.keys((typeof window !== 'undefined' && window.STUDY_DATA) || {}).join(','),
    });
    registerSearchSource({ id: 'story', kind: 'story', lazy: true, load: loadStoryEntries });
    registerSearchSource({ id: 'ref', kind: 'ref', lazy: true, load: loadRefEntries });
    registerSearchSource({ id: 'exam', kind: 'exam', lazy: true, load: loadExamEntries });
    registerSearchSource({ id: 'exam-docs', kind: 'doc', lazy: true, load: _loadExamDocEntries });
    // TS-16 — 용어집 키워드를 형태소 어휘에 주입하는 공급자 (코어가 인덱스 구축 시 호출)
    registerVocabContributor(() => getAllGlossaryKeywords().map(({ keyword }) => keyword));
}
