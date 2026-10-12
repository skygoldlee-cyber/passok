// tools/build/textbook_anchors.js — 교재 라인 → 섹션 앵커("N.M") 해석 공용 헬퍼.
// @spec AN-10
// 번호체계(NUMBERING_SYSTEM.md): ## 📚 Chapter NN. > ## M. (M은 챕터별 리셋).
// 앵커 "N.M"은 구조 번호라 라인 시프트·콘텐츠 이동에 무관 — 개념 ID(conceptId)가
// L#### 라인 좌표에 의존하면 교재 편집 시 클러스터가 분열되므로 구조 앵커로 대체한다.

'use strict';
const fs = require('fs');

const CHAPTER_RE = /^##\s+(?:📚\s*)?Chapter\s+(\d+)\./; // "## 📚 Chapter 01. 제목"
const SECTION_RE = /^##\s+(\d+)\./;                    // "## 3. 화장품의 영업" (Chapter 접두 없음)

/**
 * 파일의 앵커 경계: [[1-based 라인, "N.M"], ...] 라인 오름차순.
 * 📚 Chapter 헤딩은 N.0 경계(챕터 도입부)로, ## M. 헤딩은 N.M 경계로 기록한다.
 * @param {string} absPath 교재 md 절대경로
 * @returns {Array<[number, string]>}
 */
function anchorBoundariesOf(absPath) {
    if (!fs.existsSync(absPath)) return [];
    const lines = fs.readFileSync(absPath, 'utf-8').replace(/\r\n/g, '\n').split('\n');
    const bounds = [];
    let chap = 0;
    lines.forEach((line, i) => {
        const cm = line.match(CHAPTER_RE);
        if (cm) {
            chap = parseInt(cm[1], 10);
            bounds.push([i + 1, `${chap}.0`]);
            return;
        }
        const sm = line.match(SECTION_RE);
        if (sm) bounds.push([i + 1, `${chap}.${parseInt(sm[1], 10)}`]);
    });
    return bounds;
}

/** 경계 목록에서 라인 → 앵커 문자열 (첫 경계 이전 라인은 null) */
function anchorAt(boundaries, line) {
    let cur = null;
    for (const [ln, a] of boundaries) {
        if (line >= ln) cur = a; else break;
    }
    return cur;
}

/** 파일별 경계 캐시 — 인용마다 디스크 재독을 막는다 */
function makeAnchorResolver() {
    const cache = new Map(); // absPath → boundaries
    return (absPath, line) => {
        if (!cache.has(absPath)) cache.set(absPath, anchorBoundariesOf(absPath));
        return anchorAt(cache.get(absPath), line);
    };
}

/** 교재 인용 링크 타겟 "<경로.md#L123>" → {file, line} (교재 경로만, 참조자료 제외) */
function parseCitationTarget(inner) {
    const m = String(inner || '').match(/^(.*?\.md)#L(\d+)$/);
    return (m && inner.includes('교재')) ? { file: m[1], line: parseInt(m[2], 10) } : null;
}

module.exports = { anchorBoundariesOf, anchorAt, makeAnchorResolver, parseCitationTarget, CHAPTER_RE, SECTION_RE };
