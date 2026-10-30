// views/reader-loader.js — 이야기형 챕터 로딩 + LRU 캐시
// @spec ST-01
// textbook-reader.js에서 분리. 이야기형 MD를 지연 로드·파싱해 렌더용
// chapter 객체로 변환한다 — 캐시 키는 `${subjId}:${chapterIdx}` (세션 전용,
// 영속 저장 아님).
import { DataLoader } from '../../content/data-loader.js';
import { PATHS } from '../../paths.js';
import { CACHE } from '../../config/cache.js';
import { parseTextbookContent } from '../../reader/textbook-parser.js';
import { isStoryMetaSection } from '../../reader/reader-toc.js';

// --- 이야기형 MD 캐시: { "subjId:chapterIdx": { chapterTitle, sections, filePath } } ---
// LRU 캐시: 최대 항목 수를 초과하면 가장 오래된 항목 제거 (메모리 누수 방지)
const _storyChapterCache = {};
const _STORY_CACHE_MAX_ENTRIES = CACHE.STORY_CACHE_MAX_ENTRIES;
const _storyCacheKeyOrder = [];

function _touchStoryCacheKey(key) {
    const idx = _storyCacheKeyOrder.indexOf(key);
    if (idx >= 0) _storyCacheKeyOrder.splice(idx, 1);
    _storyCacheKeyOrder.push(key);
}

function _evictStoryCacheIfNeeded() {
    while (_storyCacheKeyOrder.length > _STORY_CACHE_MAX_ENTRIES) {
        const oldest = _storyCacheKeyOrder.shift();
        delete _storyChapterCache[oldest];
    }
}

/**
 * 이야기형 챕터 로드 — 매니페스트의 storyFile(없으면 파일명 규칙 추론)로
 * MD를 가져와 렌더용 chapter 객체로 변환. 실패 시 호출자가 기본 모드로 폴백.
 * @param {string} subjId
 * @param {number} chapterIdx
 * @param {Object} originalChapter 표준형 chapter 객체 (chapterKey·fileName 참조용)
 */
export async function loadStoryChapter(subjId, chapterIdx, originalChapter) {
    const cacheKey = `${subjId}:${chapterIdx}`;
    if (_storyChapterCache[cacheKey]) {
        _touchStoryCacheKey(cacheKey); // LRU: 캐시 히트 시 최근 사용 위치로 이동
        return _storyChapterCache[cacheKey];
    }

    const manifest = await DataLoader._getManifest();
    const subjMeta = manifest.subjects.find(s => s.key === subjId);
    if (!subjMeta) throw new Error('과목 메타데이터 없음: ' + subjId);

    const chapterMeta = (subjMeta.chapters || []).find(c => c.key === originalChapter.chapterKey);
    const storyFile = (chapterMeta && chapterMeta.storyFile)
        ? chapterMeta.storyFile
        : originalChapter.fileName.replace(/_표준형\.md$/i, '_이야기형.md').replace(/\.md$/i, '_이야기형.md');

    const relPath = PATHS.TEXTBOOK_FILE(subjMeta.dir, storyFile);
    const md = await DataLoader._getMd(relPath, subjId);
    const subjectDir = PATHS.TEXTBOOK_DIR(subjMeta.dir);
    const parsed = parseTextbookContent(md, storyFile, subjectDir);

    const storyChapter = {
        chapterTitle: parsed.chapterTitle,
        sections: parsed.sections.filter(s => !isStoryMetaSection(s.title)),
        filePath: PATHS.TEXTBOOK_FILE_REL(subjMeta.dir, storyFile),
        fileName: storyFile
    };

    _storyChapterCache[cacheKey] = storyChapter;
    _touchStoryCacheKey(cacheKey);
    _evictStoryCacheIfNeeded();
    return storyChapter;
}
