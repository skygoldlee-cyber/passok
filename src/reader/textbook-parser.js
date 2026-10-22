// src/textbook-parser.js — 교재 MD 런타임 파서 진입점 (브라우저 ESM)
// @spec TR-01
// 실제 파싱 로직은 src/textbook-core.js — 빌드 플러그인
// (tools/build/plugins/textbook.plugin.js)과 동일 코어를 공유해
// 카드/퀴즈/챕터/ID가 빌드 산출물과 바이트 단위로 동일하다.
// 이 파일은 런타임 컨텍스트(contentPath) 주입 + 기존 export 시그니처 유지만 담당.
import { contentPath } from '../exam-context.js';
import { parseMarkdownContent, parseTextbookContent, buildSubjectData as buildSubjectDataCore } from './textbook-core.js';

// parseMarkdownFile(content, subjectId, filename, chapterKey)
// → 카드/퀴즈/경고. 경고 항목은 {line, text} 객체 (빌드 측 감시와 동일 형식).
export function parseMarkdownFile(content, subjectId, filename, chapterKey) {
    return parseMarkdownContent(content, subjectId, filename, chapterKey);
}

export { parseTextbookContent };

/**
 * 한 과목의 모든 챕터 MD를 파싱해 STUDY_DATA[key] 형태로 조립.
 * @param {import('../types.js').ManifestSubject} subjectMeta - manifest.json subjects[] 항목
 * @param {Record<string,string>} mdByFile - { '1.cosmetic-law.md': '<md text>', ... }
 * @param {{filePathMode?: 'html'|'md'}} [opts] - 원본 링크 경로 확장자 (기본 'md')
 * @returns {{name:string, cards:Array, quizzes:Array, chapters:Array}}
 */
export function buildSubjectData(subjectMeta, mdByFile, opts = {}) {
    return buildSubjectDataCore(subjectMeta, mdByFile, {
        subjectDir: contentPath(subjectMeta.dir),
        filePathMode: opts.filePathMode || 'md'
    });
}
