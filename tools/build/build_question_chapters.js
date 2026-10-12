/**
 * 문항 → 교재 챕터 매핑 인덱스 생성
 *
 * 목적: 모의고사 결과 화면의 "단원별 취약 분석"에 사용.
 *   - 문제은행 문항(choice/blank/ox)은 정답 섹션의 첫 교재 인용(path#L번호)으로 챕터를 해석
 *   - 복수정답형(combo) 문항은 citation의 L번호를 런타임에 CHAPTER_RANGES로 해석
 *
 * 출력: {dataRoot}/question_chapters.js  (클래식 스크립트 — file:// 호환)
 *   window.QUESTION_CHAPTERS = { "subject1_q1": "Chapter 01. ...", ... }
 *   window.CHAPTER_RANGES    = { "law": [[시작라인, "Chapter 01. ..."], ...], ... }
 *   window.CID_SECTION       = { "law": { "123": "1.2", ... }, ... } — 레거시 conceptId(L####) → §앵커
 *   window.CHAPTER_TITLES    = { "law": { "1": "Chapter 01. ...", ... }, ... } — §앵커 챕터 표시명
 *
 * 실행: node tools/build/build_question_chapters.js   (build:data 체인에 포함)
 */

// @spec BP-01 AN-10

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { getExamTargets } = require('./exam_targets.js');
const { makeAnchorResolver, CHAPTER_RE } = require('./textbook_anchors.js');

// 챕터/단원 헤딩: "## 📚 Chapter 01. 화장품법의 이해" 또는 "## 3. 영업의 등록" (번호 있는 ## 절만)
const CHAPTER_HEADING_RE = /^##\s+(?:📚\s*)?((?:Chapter\s+)?\d+\..+?)\s*$/;
// 문항 구분: "**Q12.**"
const QUESTION_BLOCK_RE = /\*\*Q(\d+)\.\*\*/g;
// 교재(표준형) 인용 링크: [라벨](<../교재/.../파일.md#L123>) — 참조자료 경로는 제외
const TEXTBOOK_CIT_RE = /\]\(<([^>]*?교재[^>]*?\.md)#L(\d+)>\)/g;

/** 파일의 챕터 경계: [[1-based 라인, "Chapter 01. ..."], ...] (라인 오름차순) */
function chapterRangesOf(absPath) {
    if (!fs.existsSync(absPath)) return [];
    const lines = fs.readFileSync(absPath, 'utf-8').replace(/\r\n/g, '\n').split('\n');
    const ranges = [];
    lines.forEach((line, i) => {
        const m = line.match(CHAPTER_HEADING_RE);
        if (m) ranges.push([i + 1, m[1].trim()]);
    });
    return ranges;
}

/** 파일의 챕터 번호 → 제목 맵 { 1: "Chapter 01. ..." } (📚 Chapter 헤딩 기준) */
function chapterTitlesOf(absPath) {
    if (!fs.existsSync(absPath)) return {};
    const lines = fs.readFileSync(absPath, 'utf-8').replace(/\r\n/g, '\n').split('\n');
    const titles = {};
    lines.forEach(line => {
        const m = line.match(CHAPTER_RE);
        const t = line.match(CHAPTER_HEADING_RE);
        if (m && t) titles[parseInt(m[1], 10)] = t[1].trim();
    });
    return titles;
}

/** 라인 번호 → 챕터 제목 (해당 라인 이하의 마지막 챕터) */
function chapterAt(ranges, line) {
    let cur = null;
    for (const [ln, title] of ranges) {
        if (line >= ln) cur = title; else break;
    }
    return cur;
}

function buildForExam(target) {
    if (!target.manifest) {
        console.warn(`[question-chapters] ${target.id}: manifest 없음 — 건너뜀`);
        return;
    }
    const subjects = target.manifest.subjects || [];
    const exams = target.manifest.exams || [];

    // 1) 과목별 표준형 교재의 챕터 경계 수집 (파일명 → ranges)
    const fileRanges = {};    // basename → [[line,title]]
    const subjectRanges = {}; // subjKey → 첫 표준형 파일의 ranges (combo 런타임 매핑용)
    const chapterTitles = {}; // subjKey → { "N": "Chapter 01. ..." } — §앵커 챕터 표시명 (AN-10)
    let ambig = 0;
    for (const subj of subjects) {
        chapterTitles[subj.key] = chapterTitles[subj.key] || {};
        for (const ch of subj.chapters || []) {
            if (!ch.file) continue;
            const abs = path.join(ROOT, target.contentRoot, subj.dir || '', ch.file);
            const ranges = chapterRangesOf(abs);
            if (!ranges.length) continue;
            fileRanges[ch.file] = ranges;
            if (!subjectRanges[subj.key]) subjectRanges[subj.key] = ranges;
            for (const [n, t] of Object.entries(chapterTitlesOf(abs))) {
                if (chapterTitles[subj.key][n] && chapterTitles[subj.key][n] !== t) ambig++;
                else chapterTitles[subj.key][n] = t;
            }
        }
    }

    // 2) 문제은행 각 문항의 첫 교재 인용 → 챕터 해석 + 인용 라인 전수의 §앵커 환산
    const questionChapters = {};
    const cidSection = {}; // subjKey → { "라인": "N.M" } — 레거시 conceptId(L####) → §앵커 (AN-10)
    const resolveAnchor = makeAnchorResolver();
    let mapped = 0;
    let unmapped = 0;
    for (const exam of exams) {
        const mdPath = path.join(ROOT, target.contentRoot, '문제은행', exam.file);
        if (!fs.existsSync(mdPath)) continue;
        const subjKey = exam.subject;
        cidSection[subjKey] = cidSection[subjKey] || {};
        const md = fs.readFileSync(mdPath, 'utf-8').replace(/\r\n/g, '\n');

        // **Qn.** 블록 단위로 분할
        const marks = [...md.matchAll(QUESTION_BLOCK_RE)];
        for (let i = 0; i < marks.length; i++) {
            const qNum = parseInt(marks[i][1], 10);
            const block = md.slice(marks[i].index, i + 1 < marks.length ? marks[i + 1].index : md.length);
            // 인용 라인 전수를 §앵커로 환산해 적재 — 과거 번들의 conceptId가 첫 인용 외의
            // 라인을 참조했어도 이관 경로가 열리도록 전수 수집한다 (AN-10)
            for (const cm of block.matchAll(TEXTBOOK_CIT_RE)) {
                const anchor = resolveAnchor(path.resolve(path.dirname(mdPath), cm[1]), parseInt(cm[2], 10));
                if (!anchor) continue;
                const prev = cidSection[subjKey][cm[2]];
                if (prev && prev !== anchor) ambig++;
                else cidSection[subjKey][cm[2]] = anchor;
            }
            // 첫 번째 교재 인용만 사용 (참조자료 인용은 챕터 해석 불가)
            TEXTBOOK_CIT_RE.lastIndex = 0;
            const cit = TEXTBOOK_CIT_RE.exec(block);
            if (!cit) { unmapped++; continue; }
            const fileName = path.basename(cit[1]);
            const line = parseInt(cit[2], 10);
            const title = chapterAt(fileRanges[fileName] || [], line);
            if (!title) { unmapped++; continue; }
            questionChapters[`${exam.key}_q${qNum}`] = title;
            mapped++;
        }
    }

    // 3) 번들 출력
    const outDir = path.join(ROOT, target.dataRoot);
    fs.mkdirSync(outDir, { recursive: true });
    const body = '// 자동 생성된 문항→챕터 매핑입니다. 수정하지 마십시오. (tools/build/build_question_chapters.js)\n' +
        `var QUESTION_CHAPTERS = ${JSON.stringify(questionChapters)};\n` +
        `var CHAPTER_RANGES = ${JSON.stringify(subjectRanges)};\n` +
        `var CID_SECTION = ${JSON.stringify(cidSection)};\n` +
        `var CHAPTER_TITLES = ${JSON.stringify(chapterTitles)};\n` +
        'window.QUESTION_CHAPTERS = QUESTION_CHAPTERS;\n' +
        'window.CHAPTER_RANGES = CHAPTER_RANGES;\n' +
        'window.CID_SECTION = CID_SECTION;\n' +
        'window.CHAPTER_TITLES = CHAPTER_TITLES;\n';
    fs.writeFileSync(path.join(outDir, 'question_chapters.js'), body, 'utf8');
    console.log(`[question-chapters] ${target.id}: 문항 ${mapped}건 매핑 (미해석 ${unmapped}건, 다중파일 충돌 ${ambig}건), 과목 ${Object.keys(subjectRanges).length}개 챕터 경계 → ${target.dataRoot}/question_chapters.js`);
}

for (const target of getExamTargets(ROOT)) {
    buildForExam(target);
}
