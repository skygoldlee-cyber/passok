// tools/audit/audit_ce06.js — CE-06 가독성·정보 밀도 규약 감사 (advisory)
// @spec CE-06
//
// 실행: node tools/audit/audit_ce06.js [--exam <id>] [--json]
//
// 규약 정본: docs/dev/runbooks/TEXTBOOK_AUTHORING_GUIDE.md §3.10
// 측정 항목:
//   - 문장 40~60자 / 60자 초과 (본문 재서술만 — 원문 인용 섹션 면제)
//   - 문단 4문장 이상
//   - 표 4열 초과 / 데이터 6행 초과 (2열 용어·체크리스트 표는 행 면제)
//   - 섹션(`##`)당 표 3개 이상
//   - 목록 8항목 이상 / 들여쓰기 3단계 이상
//   - mermaid 다이어그램 상자 8개 이상
// 면제 규칙: 제N조 조문 비율이 높은 섹션·'참조 자료'·법령/고시 명칭 섹션은
//   원문 인용으로 간주해 문장·문단 규칙을 적용하지 않는다.
// 항상 종료코드 0 — advisory 리포트 전용.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const { getExamTargets } = require('../build/exam_targets.js');

const args = process.argv.slice(2);
const examFilter = args.includes('--exam') ? args[args.indexOf('--exam') + 1] : null;

// ── 원문 인용 섹션 판정 ────────────────────────────────────────────
const REF_TITLE_RE = /참조 자료|법령 원문|원문 보기/;
const LAW_TITLE_RE = /(법률|보험법|복지법|개인정보 보호법|시행령|시행규칙|고시|훈령|예규|지침)\s*$/;
const ARTICLE_RE = /^제\d+조/;

function isQuoteSection(title, lines) {
    if (REF_TITLE_RE.test(title) || LAW_TITLE_RE.test(title)) return true;
    const prose = lines.filter((l) => l.trim() && !l.trim().startsWith('#'));
    if (!prose.length) return false;
    const arts = prose.filter((l) => ARTICLE_RE.test(l.trim().replace(/^###\s*/, '')));
    return arts.length / prose.length >= 0.4;
}

function sentencesOf(text) {
    const t = text.replace(/[*`_>#[\]()|]/g, ' ');
    return t.split(/(?<=[.?!다함음임됨여요])(?:\s|$)/).map((s) => s.trim()).filter((s) => s.length > 4);
}

function auditFile(abs) {
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    const sections = []; // {title, rows:[{ln, code}]}
    let cur = { title: '(머리말)', rows: [] };
    let inCode = false;
    for (const ln of lines) {
        if (ln.trim().startsWith('```')) {
            inCode = !inCode;
            cur.rows.push({ ln, code: true });
            continue;
        }
        if (!inCode && /^##(?!#)\s/.test(ln)) {
            sections.push(cur);
            cur = { title: ln.replace(/^#+\s*/, '').trim(), rows: [] };
        }
        cur.rows.push({ ln, code: inCode });
    }
    sections.push(cur);

    const r = {
        sent60: [], sentMid: 0, para4: [], bigTable: [], secTables: [],
        list8: [], deepList: 0, mermaid8: [],
    };

    for (const sec of sections) {
        const quote = isQuoteSection(sec.title, sec.rows.map((x) => x.ln));
        let tblCount = 0;
        let inTbl = false, tblRows = 0, tblCols = 0, tblLine = 0;
        let listRun = 0;
        let para = [];
        let inMermaid = false, mermaidNodes = 0;

        const flushTbl = () => {
            if (!inTbl) return;
            tblCount++;
            if (tblCols > 4 || (tblCols > 2 && tblRows > 7)) {
                // 2열 표는 행 상한 면제(용어·체크리스트 성격) — 3열+·행 초과만 집계
                r.bigTable.push({ sec: sec.title, dim: `${tblCols}열×${tblRows}행`, line: tblLine });
            }
            inTbl = false;
        };
        const flushList = () => {
            if (listRun >= 8) r.list8.push({ sec: sec.title, n: listRun });
            listRun = 0;
        };
        const flushPara = () => {
            if (para.length > 3) r.para4.push({ sec: sec.title, n: para.length });
            para = [];
        };

        for (const { ln, code } of sec.rows) {
            const s = ln.trim();
            if (code) {
                if (/```\s*mermaid/.test(s)) { inMermaid = true; mermaidNodes = 0; }
                else if (inMermaid && s === '') inMermaid = false;
                else if (inMermaid) {
                    mermaidNodes += (s.match(/[[({][^\])}]*[\])}]/g) || []).length;
                }
                continue;
            }
            if (inMermaid) {
                if (mermaidNodes > 7) { r.mermaid8.push({ sec: sec.title, n: mermaidNodes }); inMermaid = false; }
                continue;
            }
            // 표
            if (s.startsWith('|') && s.endsWith('|')) {
                if (!inTbl) { inTbl = true; tblRows = 0; tblCols = 0; tblLine = 0; }
                const cells = ln.split('|').slice(1, -1);
                if (!/^[\s:\-]+$/.test(cells.join('|'))) {
                    tblRows++;
                    tblCols = Math.max(tblCols, cells.length);
                }
                continue;
            }
            flushTbl();
            // 목록
            if (/^[-*]\s/.test(s)) {
                listRun++;
                if (/^\s{6,}[-*]\s/.test(ln)) r.deepList++;
            } else flushList();
            // 본문 문장·문단 (원문 인용 섹션 면제)
            if (s && !s.startsWith('#') && !s.startsWith('>') && !/^[-*]\s/.test(s) && !quote) {
                para.push(s);
                for (const sen of sentencesOf(s)) {
                    if (sen.length > 60) r.sent60.push({ sec: sec.title, len: sen.length, head: sen.slice(0, 40) });
                    else if (sen.length > 40) r.sentMid++;
                }
            } else if (!s) flushPara();
        }
        flushTbl(); flushList(); flushPara();
        if (tblCount >= 3) r.secTables.push({ sec: sec.title, n: tblCount });
    }
    return r;
}

// ── 대상 수집: 각 시험 교재 MD (이야기형·하위 story 제외 — 파생물은 원본에서 측정) ──
const targets = getExamTargets(ROOT).filter((t) => !examFilter || t.id === examFilter);
const files = [];
for (const t of targets) {
    const dir = path.join(ROOT, t.contentRoot, '교재');
    if (!fs.existsSync(dir)) continue;
    for (const sub of fs.readdirSync(dir)) {
        const sd = path.join(dir, sub);
        if (!fs.statSync(sd).isDirectory() || sub === 'glossary') continue;
        for (const f of fs.readdirSync(sd)) {
            if (!f.endsWith('.md') || f.endsWith('_이야기형.md')) continue;
            files.push({ exam: t.id, rel: path.relative(ROOT, path.join(sd, f)).replace(/\\/g, '/') });
        }
    }
}

const tot = { sent60: 0, sentMid: 0, para4: 0, bigTable: 0, secTables: 0, list8: 0, deepList: 0, mermaid8: 0 };
const report = [];
for (const f of files) {
    const r = auditFile(path.join(ROOT, f.rel));
    const n = { sent60: r.sent60.length, sentMid: r.sentMid, para4: r.para4.length, bigTable: r.bigTable.length, secTables: r.secTables.length, list8: r.list8.length, deepList: r.deepList, mermaid8: r.mermaid8.length };
    const sum = n.sent60 + n.para4 + n.bigTable + n.secTables + n.list8 + n.mermaid8;
    for (const k of Object.keys(tot)) tot[k] += n[k];
    if (sum > 0) report.push({ ...f, n, detail: r });
}

console.log(`CE-06 가독성·밀도 감사 — 교재 ${files.length}개 파일 (${targets.map((t) => t.id).join(', ')})`);
console.log(`합계: 60자+ ${tot.sent60} · 40~60자 ${tot.sentMid} · 문단4+ ${tot.para4} · 표초과 ${tot.bigTable} · 섹션표3+ ${tot.secTables} · 목록8+ ${tot.list8} · 들여3단 ${tot.deepList} · 도식8+ ${tot.mermaid8}`);
console.log('');
for (const e of report) {
    console.log(`📄 ${e.rel}`);
    const p = [];
    if (e.n.sent60) p.push(`60자+ ${e.n.sent60}`);
    if (e.n.sentMid) p.push(`40~60자 ${e.n.sentMid}`);
    if (e.n.para4) p.push(`문단4+ ${e.n.para4}`);
    if (e.n.bigTable) p.push(`표초과 ${e.n.bigTable}`);
    if (e.n.secTables) p.push(`섹션표3+ ${e.n.secTables}`);
    if (e.n.list8) p.push(`목록8+ ${e.n.list8}`);
    if (e.n.deepList) p.push(`들여3단 ${e.n.deepList}`);
    if (e.n.mermaid8) p.push(`도식8+ ${e.n.mermaid8}`);
    console.log(`   ${p.join(' · ')}`);
    for (const v of e.detail.bigTable.slice(0, 3)) console.log(`     ⚠ 표 ${v.dim} [${v.sec.slice(0, 24)}]`);
    for (const v of e.detail.sent60.slice(0, 3)) console.log(`     ⚠ ${v.len}자 [${v.sec.slice(0, 24)}] ${v.head}…`);
    for (const v of e.detail.list8.slice(0, 3)) console.log(`     ⚠ 목록 ${v.n}항목 [${v.sec.slice(0, 24)}]`);
}
process.exit(0); // advisory — 비차단
