// src/reader-toc.js — 교재 리더 목차(TOC) 추출 순수 헬퍼
// @spec TR-06
// textbook-reader.js에서 분리 — 섹션 제목의 계층 판정·메타 섹션 필터·
// 하위 헤딩 추출·슬러그 ID 생성. DOM 비의존 순수 로직.

/** 이야기형 챕터에서 본문이 아닌 메타 섹션으로 간주할 제목 패턴 */
// 접두 규약(🧭 여정도·🔢 암기 미리보기·📋 목차/학습 안내)은 작성 가이드의 장치 섹션과
// 카드 추출(textbook-core skipSection) 이모지 규약에 정합. 📝·🧠·⚡·🗺️·📌 계열은
// 최종 복습·마인드맵 등 실제 콘텐츠라 메타가 아니다 (check:metasections 기준선, TS-17).
const _STORY_META_PATTERNS = [
    /^🧭\s*학습\s*아이콘/,
    /^🧭.*여정도/,
    /^🎯\s*최우선\s*암기\s*축/,
    /^🔢/,
    /^🚀\s*시험\s*직전/,
    /^📖\s*학습\s*안내/,
    /^📋\s*학습\s*안내/,
    /^📖\s*핵심\s*용어\s*정리/,
    /^📋\s*목차/,
    /^📊.*비교표/,
    /^✅\s*확인문제/,
    /^목차\s*$/,
    /^🔍\s*키워드/,
    /^출처:\s/,
];

/**
 * @param {*} title
 * @returns {boolean}
 */
export function isStoryMetaSection(title) {
    const t = (title || '').trim();
    return _STORY_META_PATTERNS.some(p => p.test(t));
}

/**
 * @param {{sections?: {title: string}[]}} chapter
 * @returns {*}
 */
export function filterMetaSections(chapter) {
    return {
        ...chapter,
        sections: (chapter.sections || []).filter(s => !isStoryMetaSection(s.title))
    };
}

// --- TOC 계층 구조 헬퍼 (A: 들여쓰기, F: 하위 헤딩) ---

/**
 * 섹션 제목의 번호 패턴에서 TOC 들여쓰기 레벨 감지
 * @param {*} title
 * @returns {number}
 */
export function getTocLevel(title) {
    const t = (title || '').trim();
    if (/^\d+\.\d+\.\d+/.test(t)) return 3;   // 1.1.1 (3단계)
    if (/^\d+\.\d+/.test(t)) return 2;         // 1.1 (2단계)
    if (/^\d+\./.test(t)) return 1;           // 1. (1단계)
    return 0;                                  // Chapter, 📖, 📊, ✅, 출처, 제N조 등
}

/**
 * 참조문서 헤더 (01_화장품법 등) — 앞의 NN_ 접두사 제거
 * @param {*} title
 * @returns {string}
 */
export function cleanRefTitle(title) {
    const t = (title || '').trim();
    return t.replace(/^\d+_/, '');
}

/**
 * 챕터 내 중복 제목에 소속 Chapter명을 병기한 표시 제목 목록을 생성합니다.
 * "📌 챕터 핵심 요약"·"✅ 확인문제"처럼 모든 챕터에서 반복되는 헤딩이
 * TOC·섹션 헤더에서 구분되지 않는 문제 해소 — 첫 Chapter 이전 섹션·고유 제목은 원문 유지.
 * @param {{ title: string }[]} sections
 * @returns {string[]} sections와 동순서 표시 제목 배열
 */
export function buildSectionDisplayTitles(sections) {
    const titles = (sections || []).map(s => cleanRefTitle(s.title || ''));
    /** @type {Object.<string, number>} */
    const counts = {};
    titles.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    let currentChapter = '';
    return titles.map(t => {
        if (/Chapter\s+\d+/i.test(t)) {
            currentChapter = t.replace(/^📚\s*/, '');
            return t;
        }
        return ((counts[t] || 0) > 1 && currentChapter) ? `${t} — ${currentChapter}` : t;
    });
}

/**
 * 섹션 배열의 각 항목에 TOC 역할을 부여한다.
 * - 'chapter': ## 📚 Chapter 헤더
 * - 'child': 챕터 자식 — 번호 절 + 챕터 내부 카드(번호 절 사이의 무번호 ## 📌/📊 등)
 * - 'top': 챕터 밖 최상위 — 챕터 말미 무번호 절(📌/✅) 및 챕터 외 항목
 * - 'skip': 챕터 헤더 직후 첫 번호 절 이전의 인트로 무번호 절 (TOC 생략)
 *
 * 판정 기준: 무번호 절은 '챕터 종료'가 아니라, 다음 Chapter 전에 번호 절이
 * 다시 나오면 챕터 내부 카드로 본다(절별 ## 📌 요약 카드 관례 대응).
 * @param {{title: string}[]} sections
 * @returns {('chapter'|'child'|'top'|'skip')[]}
 */
export function computeTocRoles(sections) {
    const roles = new Array((sections || []).length).fill('top');
    let inChapter = false;
    let hasSeenNumbered = false;
    (sections || []).forEach((section, idx) => {
        const title = section.title || '';
        const isChapterHeader = /Chapter\s+\d+/i.test(title);
        const isNumbered = getTocLevel(title) >= 1;
        if (isChapterHeader) {
            roles[idx] = 'chapter';
            inChapter = true;
            hasSeenNumbered = false;
        } else if (inChapter) {
            if (isNumbered) {
                roles[idx] = 'child';
                hasSeenNumbered = true;
            } else if (hasSeenNumbered) {
                const nextChapter = sections.findIndex((s, i) => i > idx && /Chapter\s+\d+/i.test(s.title || ''));
                const limit = nextChapter === -1 ? sections.length : nextChapter;
                const hasLaterNumbered = sections.slice(idx + 1, limit)
                    .some(s => getTocLevel(s.title) >= 1);
                if (hasLaterNumbered) {
                    roles[idx] = 'child';
                } else {
                    roles[idx] = 'top';
                    inChapter = false;
                }
            } else {
                roles[idx] = 'skip';
            }
        }
    });
    return roles;
}

/**
 * 섹션 본문에서 ### / #### 하위 헤딩 추출
 * @param {*} content
 * @returns {{level: number, title: string}[]}
 */
export function extractSubHeadings(content) {
    if (!content) return [];
    const lines = content.split('\n');
    const headings = [];
    let inCodeBlock = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
        if (inCodeBlock) continue;
        if (trimmed.startsWith('### ') && !trimmed.startsWith('#### ')) {
            headings.push({ level: 3, title: trimmed.replace(/^###\s+/, '').trim() });
        } else if (trimmed.startsWith('#### ')) {
            headings.push({ level: 4, title: trimmed.replace(/^####\s+/, '').trim() });
        }
    }
    return headings;
}

