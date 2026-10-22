// tools/build/plugins/textbook.plugin.js — 교재 빌드 플러그인 (파일 I/O 어댑터)
// @spec BP-01,CS-01
// 실제 파싱·중복제거 로직은 src/reader/textbook-core.js 단일 구현 — 런타임 파서
// (src/reader/textbook-parser.js)와 공유해 카드/퀴즈/챕터/ID가 동일하다.
// 이 파일은 디스크 읽기 + _warnings/_fileStats 메타 부착만 담당한다.
// (require(ESM) — Node >= 20.19 필요)
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const esmRequire = createRequire(__filename);
const { buildSubjectData } = esmRequire('../../../src/reader/textbook-core.js');

module.exports = {
  name: 'textbook',
  build(subject, ctx) {
    const subjPath = path.join(ctx.workspaceDir, ctx.contentRoot || 'content', subject.dir);
    if (!fs.existsSync(subjPath)) {
      throw new Error(`Directory not found: ${subjPath}`);
    }

    // #3: 마커 감시 경고 (빌드 산출물/해시에는 포함되지 않는 메타. index.js가 소비 후 제거)
    const markerWarnings = [];
    // 파일 단위 카드/퀴즈 수 — 이전 빌드와의 파일별 diff로 무소음 드롭 탐지
    const fileStats = {};

    const mdByFile = {};
    for (const chapter of subject.chapters || []) {
      const filePath = path.join(subjPath, chapter.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      mdByFile[chapter.file] = fs.readFileSync(filePath, 'utf-8');
    }

    const data = buildSubjectData(subject, mdByFile, {
      subjectDir: `${ctx.contentRoot || 'content'}/${subject.dir}`,
      filePathMode: 'html',
      onFile: (file, stats) => {
        fileStats[`${subject.dir}/${file}`] = { cards: stats.cards, quizzes: stats.quizzes };
        if (stats.warnings.length > 0) {
          markerWarnings.push({
            file: `${subject.dir}/${file}`,
            count: stats.warnings.length,
            samples: stats.warnings
          });
        }
      }
    });

    // 산출물에는 섞이지 않도록 언더스코어 필드로 부착 (index.js가 delete)
    Object.defineProperty(data, '_warnings', {
      value: markerWarnings,
      enumerable: false
    });
    Object.defineProperty(data, '_fileStats', {
      value: fileStats,
      enumerable: false
    });

    return data;
  }
};
