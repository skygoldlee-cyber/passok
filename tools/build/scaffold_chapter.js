#!/usr/bin/env node
// tools/build/scaffold_chapter.js — 참조자료→교재 챕터 스캐폴더 (CS-11 도출 계약)
// @spec BP-15
//
// {contentRoot}/참조자료/ref_md/과목N/의 지정 문서로부터 교재 골격 MD를
// 결정론적으로 생성한다. 백매터 `## 📚 참조 자료` 링크 목록·`📌출처` 블록·
// `원문 보기` 링크는 CS-11 추적성 계약 형식으로 자동 배치되고, 본문은
// `<!-- 작성 -->` 슬롯으로 남아 사람이 출제기준에 따라 재서술한다.
// 방법론 정본: TEXTBOOK_AUTHORING_GUIDE §6 "참조자료 기반 도출".
//
// 사용:
//   node tools/build/scaffold_chapter.js --exam <id> --subject <N> \
//       --refs <doc[,doc...]|all> --out "교재/<subjKey>/<파일>_표준형.md" \
//       --title "<과목 제목>" [--dry-run] [--force]
//
//   --exam     시험 id (생략 시 default 시험)
//   --subject  ref_md 과목 디렉터리 번호 (ref_md/과목N/)
//   --refs     문서 베이스명 쉼표 목록 또는 all (ref_md/과목N/<doc>/<doc>.md)
//   --out      contentRoot 기준 상대 출력 경로 (필수)
//   --title    문서 H1 제목 (기본 "N과목 <manifest 과목명>")
//   --dry-run  파일 쓰기 없이 결과 출력
//   --force    기존 파일 덮어쓰기
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('./exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');

function fail(msg) {
    console.error(`✗ ${msg}`);
    process.exit(1);
}

const VALUE_OPTS = new Set(['exam', 'subject', 'refs', 'out', 'title']);

function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            if (VALUE_OPTS.has(key)) {
                args[key] = argv[++i];
            } else {
                args[key] = true;
            }
        } else {
            args._.push(a);
        }
    }
    return args;
}

/** 링크 URL 인코딩 — 실제 교재 파일 규약: 공백→%20, (→%28, )→%29 */
function encodeRefUrl(rel) {
    return rel.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/**
 * 지정 문서의 ref_md 경로 조각 해석.
 * @returns {{docName:string, dirRel:string, mdRel:string}} dirRel/mdRel은 contentRoot 기준
 */
function resolveRefDoc(contentRoot, subjectNum, docName) {
    const dirRel = `참조자료/ref_md/과목${subjectNum}/${docName}`;
    const mdRel = `${dirRel}/${docName}.md`;
    const abs = path.join(ROOT, contentRoot, mdRel);
    if (!fs.existsSync(abs)) {
        fail(`ref_md 문서 없음: ${contentRoot}/${mdRel}`);
    }
    return { docName, dirRel, mdRel };
}

/** 과목N 디렉터리의 문서 베이스명 목록 (하위 <doc>/<doc>.md 쌍만) */
function listRefDocs(contentRoot, subjectNum) {
    const refDir = path.join(ROOT, contentRoot, '참조자료', 'ref_md', `과목${subjectNum}`);
    if (!fs.existsSync(refDir)) {
        fail(`참조자료 디렉터리 없음: ${contentRoot}/참조자료/ref_md/과목${subjectNum}`);
    }
    return fs.readdirSync(refDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && fs.existsSync(path.join(refDir, e.name, `${e.name}.md`)))
        .map(e => e.name)
        .sort();
}

/** 교재 파일에서 참조하는 상대 링크 — 교재/<key>/file.md 기준 `../참조자료/…` 규약 */
function refLink(contentRoot, mdRel) {
    // 교재 파일은 {contentRoot}/교재/<subjKey>/에 위치 — `../참조자료/` 상대 경로가 규약
    return `<../참조자료/${encodeRefUrl(mdRel.replace(/^참조자료\//, ''))}>`;
}

/** 챕터 골격 MD 생성 (순수 함수 — 테스트 대상) */
function buildChapterSkeleton({ title, refs, contentRoot }) {
    const lines = [];
    lines.push(`# 📕 ${title}`, '');
    lines.push('<!-- 작성: 프론트 매터 (§3.2 영역 1) — 🧭 학습 아이콘 · 🚀 시험 직전 1분 전체 지도 · 🎯 최우선 암기 축 · 🔢 숫자 암기 미리보기 · 📋 목차 · 🎯 과목 시각화 개요 · 📚 학습 보조 자료 -->', '');

    refs.forEach((r, idx) => {
        const link = refLink(contentRoot, r.mdRel);
        const chNo = String(idx + 1).padStart(2, '0');
        lines.push(`## 📚 Chapter ${chNo}. ${r.docName} — <!-- 작성: 챕터 부제 -->`, '');
        lines.push('<!-- 작성: 본문 — 참조 원문을 근거로 재서술 (CS-11 도출 원자 ②). 출제기준으로 선별한 조문·표만 다룸 -->', '');
        lines.push('### <!-- 작성: 섹션 제목 (예: 제1조 목적·정의) -->', '');
        lines.push('<!-- 작성: 본문 -->', '');
        lines.push(`> 📌 **출처**: ${r.docName} <!-- 작성: 제N조 --> | **참조 자료**: [${r.docName}.md](${link}) | **시행일**: <!-- 작성 --> | **최종 확인**: <!-- 작성 -->`, '');
        lines.push(`> **원문 보기**: [${r.docName}.md](${link})`, '');
    });

    lines.push('---', '');
    lines.push('## 📚 참조 자료 (법령 원문)', '');
    lines.push('> 아래 참조 자료는 학습 보조용입니다. 본문 학습 후 필요 시 클릭하여 원문을 확인하세요.', '');
    refs.forEach(r => {
        lines.push(`• [${r.docName}.md](${refLink(contentRoot, r.mdRel)})`);
    });
    lines.push('');
    lines.push('<!-- 작성: 백매터 후속 섹션 — ⚡ 시험 직전 체크리스트 · 📝 기출문제 · 🧠 30초 회상 (§3.2 영역 3) -->');
    return lines.join('\n') + '\n';
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || args._.includes('help')) {
        console.log('사용: node tools/build/scaffold_chapter.js --exam <id> --subject <N> --refs <doc[,doc...]|all> --out <상대경로> [--title "제목"] [--dry-run] [--force]');
        return;
    }
    if (!args.subject) fail('--subject <과목번호> 필요');
    if (!args.refs) fail('--refs <문서[,문서...]|all> 필요');
    if (!args.out) fail('--out <교재 출력 상대경로> 필요');

    const targets = getExamTargets(ROOT);
    const target = args.exam
        ? targets.find(t => t.id === args.exam)
        : targets.find(t => t.isDefault) || targets[0];
    if (!target) fail(`시험 없음: ${args.exam || '(default)'}`);

    const subjectNum = String(parseInt(args.subject, 10));
    if (!/^\d+$/.test(subjectNum)) fail(`--subject는 숫자: ${args.subject}`);

    const docNames = args.refs === 'all'
        ? listRefDocs(target.contentRoot, subjectNum)
        : args.refs.split(',').map(s => s.trim()).filter(Boolean);
    if (docNames.length === 0) fail(`선택 문서 없음: ref_md/과목${subjectNum}`);

    const refs = docNames.map(d => resolveRefDoc(target.contentRoot, subjectNum, d));

    const subj = target.manifest && (target.manifest.subjects || [])
        .find(s => String(s.order) === subjectNum);
    const title = args.title || `${subjectNum}과목 ${subj ? subj.name : '<!-- 작성: 과목명 -->'}`;

    const md = buildChapterSkeleton({ title, refs, contentRoot: target.contentRoot });

    if (args['dry-run']) {
        process.stdout.write(md);
        console.error(`\n[dry-run] ${target.id} · 과목${subjectNum} · ref ${refs.length}건 — 쓰기 없음`);
        return;
    }

    const outAbs = path.resolve(ROOT, target.contentRoot, args.out);
    const relOut = path.relative(ROOT, outAbs);
    if (!relOut.startsWith(target.contentRoot)) fail(`--out은 ${target.contentRoot}/ 하위여야 함: ${relOut}`);
    if (fs.existsSync(outAbs) && !args.force) fail(`파일 존재 — --force 필요: ${relOut}`);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, md, 'utf-8');

    console.log(`✅ 챕터 골격 생성: ${relOut}`);
    console.log(`   시험 ${target.id} · ref ${refs.length}건 — ${refs.map(r => r.docName).join(', ')}`);
    console.log('   다음: <!-- 작성 --> 슬롯을 출제기준으로 채움 → npm run build:data → check:content');
}

if (require.main === module) main();

module.exports = { buildChapterSkeleton, encodeRefUrl, refLink, listRefDocs, parseArgs };
