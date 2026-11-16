// tools/build/build_textbook_print.js — 표준형 교재 인쇄 산출물 빌드 (DR-09, DOC-DSN-52 Phase 2)
// @spec DR-09
//
// 표준형 교재 MD의 각 절(## M.) 말미에 개념 문항 딥링크 QR 칩을 주입하고
// ref-pipeline/md2doc.py로 PDF·DOCX·인쇄 HTML을 산출한다.
//
//   §N.M 앵커 = "## 📚 Chapter N." 아래 "## M." 절 (textbook_anchors.js 규약, AN-10)
//   QR 대상 = https://passok.vercel.app/#/trainer/concept/<N.M> (DR-08)
//
// 절별 문항 수는 과목 문제은행({contentRoot}/문제은행/*.md)의 교재 인용
// `](<...교재....md#L####>)`을 §앵커로 해석해 집계한다 — 인용 파일이 현재 교재와
// 일치하는 것만 유효(과목 내 다중 교재 파일의 앵커 번호는 파일 독립).
// 0문 절은 칩을 생략하고, 칩에는 문항 수를 표기한다.
//
// 실행:
//   node tools/build/build_textbook_print.js --exam <id> [--subject <key>]
//       [--out <dir>] [--md-only] [--formats pdf,docx]
//   npm run build:textbook-print -- --exam carework
//
// 산출: <out>/<subject>/<file>_QR.md (+ images/ 스테이징) — 기본 dist/textbook-print/<exam>/
//       --md-only 없으면 md2doc으로 동일 디렉터리에 .pdf/.docx/.print.html 추가.

'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getExamTargets } = require('./exam_targets.js');
const { makeAnchorResolver, parseCitationTarget, CHAPTER_RE, SECTION_RE } =
    require('./textbook_anchors.js');

const ROOT = path.join(__dirname, '..', '..');
const APP_BASE = 'https://passok.vercel.app';

const QUESTION_BLOCK_RE = /\*\*Q(\d+)\.\*\*/g;
const CIT_RE = /\]\(<([^>]+)>\)/g; // 인용 링크 타겟 — parseCitationTarget으로 교재 필터

// ── 순수 로직 (테스트 가능) ─────────────────────────────────────

/**
 * 문제은행 MD에서 문항별 §앵커 수집.
 * @param {string} bankMd 문제은행 MD 텍스트
 * @param {string} bankDir 문제은행 파일 디렉터리 (인용 상대경로 해석 기준)
 * @param {(absPath:string,line:number)=>string|null} resolveAnchor 라인→앵커 해석기
 * @returns {Map<string, Map<string, Set<string>>>} 파일절대경로 → 앵커 → 문항id 집합
 */
function countQuestionsByAnchor(bankMd, bankDir, resolveAnchor) {
    const counts = new Map();
    const marks = [...bankMd.matchAll(QUESTION_BLOCK_RE)];
    for (let i = 0; i < marks.length; i++) {
        const qid = `q${marks[i][1]}`;
        const block = bankMd.slice(marks[i].index, i + 1 < marks.length ? marks[i + 1].index : bankMd.length);
        const anchors = new Set(); // 한 문항이 같은 절을 여러 번 인용해도 1회만 집계
        for (const cm of block.matchAll(CIT_RE)) {
            const t = parseCitationTarget(cm[1]);
            if (!t) continue;
            const abs = path.resolve(bankDir, t.file);
            const anchor = resolveAnchor(abs, t.line);
            if (anchor) anchors.add(`${abs}	${anchor}`);
        }
        for (const key of anchors) {
            const [file, anchor] = key.split('	');
            if (!counts.has(file)) counts.set(file, new Map());
            const m = counts.get(file);
            if (!m.has(anchor)) m.set(anchor, new Set());
            m.get(anchor).add(qid);
        }
    }
    return counts;
}

/** QR 칩 HTML — 인쇄 시 셀 분할 방지 + 문항 수 표기 */
function qrChipHtml(cid, title, count, qrPngB64) {
    return [
        `<div class="concept-qr" data-cid="${cid}" style="display:flex;align-items:center;gap:10px;border:1.5px solid #94a3b8;border-radius:8px;padding:6px 12px;margin:12px 0;page-break-inside:avoid;width:fit-content">`,
        `<img src="data:image/png;base64,${qrPngB64}" alt="§${cid} 문항 QR" style="width:26mm;height:26mm">`,
        `<span style="font-size:9pt;color:#334155"><strong>이 절 문항 ${count}개 풀기</strong> §${cid}<br>` +
        `<span style="font-size:7.5pt;color:#64748b">${title}</span><br>` +
        `<span style="font-size:7.5pt;color:#64748b">QR 스캔 → 앱에서 바로 출제</span></span>`,
        `</div>`,
    ].join('\n');
}

/** 절 말미 판정 시 뒤로 밀어낼 후행 라인 — 빈 줄·:::page 같은 펜스 마커 */
const TRAILING_RE = /^\s*$|^:::/;

/**
 * 교재 MD에 절별 QR 칩 주입.
 * @param {string} mdText 표준형 교재 MD
 * @param {object} opts
 * @param {(cid:string)=>number} opts.countFor 앵커 → 문항 수 (0이면 칩 생략)
 * @param {(url:string)=>string} opts.qrPngB64 URL → PNG base64
 * @param {string} [opts.appBase] 앱 베이스 URL
 * @returns {{md:string, chips:Array<{cid:string,title:string,count:number}>, skipped:Array<{cid:string,title:string}>}}
 */
function injectQrChips(mdText, opts) {
    const { countFor, qrPngB64, appBase = APP_BASE } = opts;
    const lines = mdText.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    const chips = [];
    const skipped = [];
    let chapter = 0, pending = null; // pending = {cid, title}

    const flush = () => {
        if (!pending) return;
        const count = countFor(pending.cid) || 0;
        if (count > 0) {
            const url = `${appBase}/#/trainer/concept/${pending.cid}`;
            // 후행 빈 줄/펜스 마커 뒤로 물러나 칩을 절 본문 끝에 배치
            const tail = [];
            while (out.length && TRAILING_RE.test(out[out.length - 1])) tail.unshift(out.pop());
            out.push('', qrChipHtml(pending.cid, pending.title, count, qrPngB64(url)));
            out.push(...tail);
            chips.push({ ...pending, count });
        } else {
            skipped.push(pending);
        }
        pending = null;
    };

    for (const line of lines) {
        const isH2 = /^##\s/.test(line);
        if (isH2) flush();
        const ch = line.match(CHAPTER_RE);
        const sec = line.match(SECTION_RE);
        if (ch) chapter = parseInt(ch[1], 10);
        else if (sec && chapter) pending = { cid: `${chapter}.${sec[1]}`, title: line.replace(/^##\s+/, '').trim() };
        else if (isH2) chapter = 0; // 비번호 ## 헤딩(표지·목차 등) — 장 컨텍스트 해제
        out.push(line);
    }
    flush();
    return { md: out.join('\n'), chips, skipped };
}

// ── 빌드 실행부 ────────────────────────────────────────────────

function parseArgs(argv) {
    const a = { exam: null, subject: null, out: null, mdOnly: false, formats: ['pdf', 'docx'] };
    for (let i = 2; i < argv.length; i++) {
        const v = argv[i];
        if (v === '--exam') a.exam = argv[++i];
        else if (v === '--subject') a.subject = argv[++i];
        else if (v === '--out') a.out = argv[++i];
        else if (v === '--md-only') a.mdOnly = true;
        else if (v === '--formats') a.formats = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
        else if (v === '--help' || v === '-h') { console.log('usage: build_textbook_print.js --exam <id> [--subject <key>] [--out dir] [--md-only] [--formats pdf,docx]'); process.exit(0); }
        else { console.error(`알 수 없는 인자: ${v}`); process.exit(2); }
    }
    if (!a.exam) { console.error('--exam <id> 필수'); process.exit(2); }
    return a;
}

/** 장 시작은 새 쪽 — `## 📚 Chapter` 앞에 :::page 주입 (PDF·DOCX 공통 페이지 브레이크, 기존 마커는 중복 안 함) */
function addChapterPageBreaks(mdText) {
    const out = [];
    for (const l of mdText.replace(/\r\n/g, '\n').split('\n')) {
        if (CHAPTER_RE.test(l)) {
            let prev = out.length - 1;
            while (prev >= 0 && !out[prev].trim()) prev--;
            if (prev < 0 || out[prev].trim() !== ':::page') out.push(':::page', '');
        }
        out.push(l);
    }
    return out.join('\n');
}

/** 표지 제목 — 교재 첫 `# ` 헤딩, 없으면 파일명 */
function titleOf(mdText, fileName) {
    const m = mdText.match(/^#\s+(.+)$/m);
    return (m ? m[1].trim() : fileName.replace(/\.md$/, '')).replace(/_표준형$/, '');
}

/** 디렉터리 재귀 복사 (images/ 스테이징용) */
function copyDir(src, dst) {
    if (!fs.existsSync(src)) return 0;
    let n = 0;
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, e.name), d = path.join(dst, e.name);
        if (e.isDirectory()) n += copyDir(s, d);
        else { fs.copyFileSync(s, d); n++; }
    }
    return n;
}

function main() {
    const args = parseArgs(process.argv);
    const target = getExamTargets(ROOT).find(t => t.id === args.exam);
    if (!target) { console.error(`시험 없음: ${args.exam}`); process.exit(2); }
    if (!target.manifest) { console.error(`manifest 없음: ${target.manifestPath}`); process.exit(2); }
    const { qrPng } = require('../../src/content/qr.js');
    const qrPngB64 = url => {
        const p = qrPng(url, 96);
        return p ? Buffer.from(p.data).toString('base64') : '';
    };
    const resolveAnchor = makeAnchorResolver();
    const outRoot = args.out || path.join(ROOT, 'dist', 'textbook-print', target.id);

    const subjects = (target.manifest.subjects || []).filter(s => !args.subject || s.key === args.subject);
    let built = 0;
    for (const subj of subjects) {
        // 표준형 교재 파일 — *_표준형.md 패턴 (전 팩 파일명 규약)
        const stdFiles = (subj.chapters || []).map(c => c.file).filter(f => f && f.endsWith('_표준형.md'));
        if (!stdFiles.length) { console.warn(`[textbook-print] ${subj.key}: 표준형 파일 없음 — 건너뜀`); continue; }

        // 과목 문항 수 집계 — 이 과목의 문제은행 전수
        const perFile = new Map(); // 파일절대경로 → Map(앵커→count)
        for (const exam of (target.manifest.exams || []).filter(e => e.subject === subj.key)) {
            const bankPath = path.join(ROOT, target.contentRoot, '문제은행', exam.file);
            if (!fs.existsSync(bankPath)) continue;
            const bankMd = fs.readFileSync(bankPath, 'utf-8').replace(/\r\n/g, '\n');
            for (const [file, anchors] of countQuestionsByAnchor(bankMd, path.dirname(bankPath), resolveAnchor)) {
                const m = perFile.get(file) || new Map();
                for (const [anchor, qids] of anchors) m.set(anchor, (m.get(anchor) || 0) + qids.size);
                perFile.set(file, m);
            }
        }

        for (const file of stdFiles) {
            const mdPath = path.join(ROOT, target.contentRoot, subj.dir || '', file);
            if (!fs.existsSync(mdPath)) { console.warn(`[textbook-print] 파일 없음: ${mdPath}`); continue; }
            const anchors = perFile.get(mdPath) || new Map();
            const countFor = cid => {
                let n = 0;
                for (const [anchor, cnt] of anchors) if (anchor === cid) n += cnt;
                return n;
            };
            const stageDir = path.join(outRoot, subj.key);
            fs.mkdirSync(stageDir, { recursive: true });
            const stageMd = path.join(stageDir, file.replace(/\.md$/, '_QR.md'));
            const { md, chips, skipped } = injectQrChips(
                addChapterPageBreaks(fs.readFileSync(mdPath, 'utf-8')), { countFor, qrPngB64 });
            fs.writeFileSync(stageMd, md, 'utf8');
            copyDir(path.join(path.dirname(mdPath), 'images'), path.join(stageDir, 'images'));
            console.log(`[textbook-print] ${subj.key}/${file}: 칩 ${chips.length}개 주입 (0문 절 생략 ${skipped.length}개) → ${path.relative(ROOT, stageMd)}`);
            built++;

            if (!args.mdOnly) {
                const py = process.env.PYTHON || 'python';
                // PDF는 교재 전용 템플릿(표지·목차·러닝헤드) 2패스 산출, 나머지 포맷은 md2doc
                if (args.formats.includes('pdf')) {
                    const title = titleOf(fs.readFileSync(mdPath, 'utf-8'), file);
                    const r = spawnSync(py, [path.join(ROOT, 'ref-pipeline', 'textbook_pdf.py'),
                        '--in', stageMd, '--out', stageMd.replace(/\.md$/, '.pdf'),
                        '--title', title, '--subtitle', `${target.manifest.name || target.id} ${subj.name || ''}`.trim(),
                        '--keep-html'], { stdio: 'inherit' });
                    if (r.status !== 0) console.warn(`[textbook-print] textbook_pdf 실패 (${file}, exit ${r.status}) — 스테이징 MD는 유지`);
                }
                const rest = args.formats.filter(f => f !== 'pdf');
                if (rest.length) {
                    const margs = [path.join(ROOT, 'ref-pipeline', 'md2doc.py'), '--cli', '--in', stageMd,
                        '--out-dir', stageDir];
                    for (const f of rest) margs.push(`--${f}`);
                    const r = spawnSync(py, margs, { stdio: 'inherit' });
                    if (r.status !== 0) console.warn(`[textbook-print] md2doc 실패 (${file}, exit ${r.status}) — 스테이징 MD는 유지`);
                }
            }
        }
    }
    if (!built) { console.error('[textbook-print] 대상 없음 — exam/subject 확인'); process.exit(1); }
}

if (require.main === module) main();
module.exports = { injectQrChips, qrChipHtml, countQuestionsByAnchor, addChapterPageBreaks, titleOf };
