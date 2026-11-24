#!/usr/bin/env node
/**
 * audit_content_scorecard.js — 콘텐츠 검수 스코어카드 (advisory)
 *
 * check_exam_onboard.js(승격 게이트)의 측정 모듈(tools/lib/exam_readiness.js)과
 * 문제은행 파서(tools/ai/lib/qbank.js)를 재사용해, 팩별·과목별 검수 지표를
 * 한 화면에 모은다 — 어디가 얼마나 부족한지를 숫자로 보여주는 조감 계층.
 *
 *   과목 지표: 문항 실측/필요/권장(모의고사 회분) · 해설 커버리지 · 인용 커버리지
 *             · 정답 누락 · 표준형 교재 본문량
 *   팩 지표  : 위 항목 합계 + 최소 회분 + 요구 미달 부족 문항 합계(보강 백로그)
 *
 * 사용법:
 *   node tools/audit/audit_content_scorecard.js            # 전 팩 요약 + 보강 우선순위
 *   node tools/audit/audit_content_scorecard.js --exam cosmetic  # 팩 과목별 상세
 *   node tools/audit/audit_content_scorecard.js --json     # JSON 출력
 *   npm run audit:scorecard [-- --exam <id>]
 */

// @spec none (콘텐츠 검수 조감 — 게이트 아님)
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');
const { parseQuestionBank } = require('../ai/lib/qbank.js');
const R = require('../lib/exam_readiness.js');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const examIdx = args.indexOf('--exam');
const ONLY_EXAM = examIdx >= 0 ? args[examIdx + 1] : null;

const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const pctStr = (a, b) => (b ? `${pct(a, b)}%` : '—');
const pad = (s, n, end = true) => String(s)[end ? 'padEnd' : 'padStart'](n);
const INLINE_CITATION = /\[[^\]]*?\bL\d+\]\(<[^>]+\.md#L\d+>\)/;

/** 문제은행 파일의 문항별 커버리지 — 포맷이 팩·파일마다 다르므로 3계층으로 인식:
 *  ① 정답블록 `**Qn.**`(말미 표준형·broker 교배형) — qbank 파서의 answers 맵
 *  ② `## 모범답안 …` 섹션 하위 `**Qn**`/`**Sn**` 요지 목록 (주관식 서술형)
 *  ③ 문항 블록 인라인 `> **정답:**`·`**모범답안**:` (마커 없는 구형식)
 *  문항 열거는 게이트와 동일한 ###Q/###S 정규식(파서의 교배형 조기 종료 회피) */
function fileCoverage(absPath) {
    const { answers } = parseQuestionBank(absPath);
    const lines = fs.readFileSync(absPath, 'utf-8').split(/\r?\n/);
    const qAt = [];
    const modelAns = new Set();
    const modelMarks = []; // 모범답안 섹션 내 **Sn.** 마커 위치 — 인용을 문항별 범위로 귀속
    let inModel = false;
    lines.forEach((l, i) => {
        const qm = l.match(/^###\s*[QS](\d+)/);
        if (qm) qAt.push({ num: +qm[1], line: i });
        if (/^##\s/.test(l)) inModel = /정답|모범답안|답안|해설|근거/.test(l); // 정답·근거/모범답안 요지 섹션
        if (inModel) {
            const mm = l.match(/\*\*[QS](\d+)\.?\*\*/);
            if (mm) { modelAns.add(+mm[1]); modelMarks.push({ num: +mm[1], line: i }); }
        }
    });
    const modelRange = new Map(); // num → [start, end) 라인 범위
    modelMarks.forEach((mk, i) => {
        const next = modelMarks[i + 1];
        let end = next ? next.line : lines.length;
        for (let j = mk.line + 1; j < end; j++) if (/^##\s/.test(lines[j])) { end = j; break; }
        modelRange.set(mk.num, [mk.line, end]);
    });
    const out = { q: qAt.length, answered: 0, explained: 0, cited: 0, malformed: 0 };
    lines.forEach((l) => {
        // 이형 정답 마커 (****Qn**.** 등) — 표준 **Qn.** 규격 미충족으로 파서가 못 읽는 결함
        if (/^\*{3,}\s*[QS]\d+\s*\*+\.?\s*\**\s*$/.test(l)) out.malformed++;
    });
    qAt.forEach((q, i) => {
        const ans = answers.get(q.num);
        let has = !!ans || modelAns.has(q.num), ex = !!(ans && ans.explain) || modelAns.has(q.num), ci = !!(ans && ans.citations.length);
        if (!has || !ci) {
            const end = i + 1 < qAt.length ? qAt[i + 1].line : lines.length;
            for (let j = q.line; j < end; j++) {
                const l = lines[j];
                if (/>\s*\*\*정답\s*[:：]/.test(l)) has = true;
                if (/\*\*모범답안[^*]*\*\*/.test(l)) { has = true; ex = true; } // 주관식 교배형(요지 변형 포함) — 모범답안이 정답+해설 겸용
                if (/\*\*해설\*\*\s*[:：]/.test(l)) ex = true;
                if (INLINE_CITATION.test(l)) ci = true;
            }
            if (!ci && modelRange.has(q.num)) { // 공유 모범답안 섹션의 **Sn.** 블록 인용 귀속 (발문·답안 분리형)
                const [ms, me] = modelRange.get(q.num);
                for (let j = ms; j < me; j++) if (INLINE_CITATION.test(lines[j])) { ci = true; break; }
            }
        }
        if (has) out.answered++;
        if (ex) out.explained++;
        if (ci) out.cited++;
    });
    return out;
}

/** 팩 하나의 과목별 검수 지표 수집 */
function collectPack(t, entry) {
    const cr = path.join(ROOT, t.contentRoot);
    if (!fs.existsSync(cr)) return { id: t.id, tier: R.tierOf(entry), sparse: true };
    if (!t.manifest) return { id: t.id, tier: R.tierOf(entry), noManifest: true };
    const m = t.manifest;
    const subjects = m.subjects || [];

    const qBySubject = {};      // 과목키 → 문항 수
    const covBySubject = {};    // 과목키 → {answered, explained, cited, files}
    const acc = (k) => (covBySubject[k] = covBySubject[k] || { answered: 0, explained: 0, cited: 0 });

    let totalQ = 0, answered = 0, explained = 0, cited = 0, missingFiles = 0, malformed = 0;
    for (const ex of m.exams || []) {
        if (!ex.file) continue;
        const n = R.questionCount(ROOT, t.contentRoot, ex.file);
        if (n === null) { missingFiles++; continue; }
        const subj = ex.subject;
        totalQ += n;
        if (subj) qBySubject[subj] = (qBySubject[subj] || 0) + n;

        const cov = fileCoverage(path.join(cr, '문제은행', ex.file));
        const a = subj ? acc(subj) : acc('_none');
        answered += cov.answered; a.answered += cov.answered;
        explained += cov.explained; a.explained += cov.explained;
        cited += cov.cited; a.cited += cov.cited;
        malformed += cov.malformed;
    }
    // 주관식(###S) 문항 — 게이트와 동일하게 과목 문항에 계수 + 모범답안 커버리지 계측
    for (const w of m.written || []) {
        if (!w.key || !w.file) continue;
        const wPath = path.join(cr, '문제은행', w.file);
        const n = R.writtenCount(wPath);
        totalQ += n;
        qBySubject[w.key] = (qBySubject[w.key] || 0) + n;
        const cov = fileCoverage(wPath);
        const a = acc(w.key);
        answered += cov.answered; a.answered += cov.answered;
        explained += cov.explained; a.explained += cov.explained;
        cited += cov.cited; a.cited += cov.cited;
        malformed += cov.malformed;
    }

    const rows = subjects.map((s) => {
        const q = qBySubject[s.key] || 0;
        const cov = covBySubject[s.key] || { answered: 0, explained: 0, cited: 0 };
        const tb = R.textbookChars(ROOT, t.contentRoot, s);
        return {
            key: s.key,
            q, perRound: R.perSubjectQ(m, s.key),
            required: R.requiredFor(m, s.key),
            recommended: R.recommendedFor(m, s.key),
            rounds: R.perSubjectQ(m, s.key) ? q / R.perSubjectQ(m, s.key) : 0,
            deficit: Math.max(0, R.requiredFor(m, s.key) - q),
            answered: cov.answered, explained: cov.explained, cited: cov.cited,
            noAnswer: q - cov.answered,
            textbookChars: tb,
            textbookShort: tb < R.MIN_TEXTBOOK_CHARS_PER_SUBJECT,
        };
    });

    const minRounds = rows.length ? Math.min(...rows.map((r) => r.rounds)) : 0;
    const deficit = rows.reduce((n, r) => n + r.deficit, 0);
    const tbShort = rows.filter((r) => r.textbookShort).length;
    // active 요건 관점 상태: 요구(3회분)·교재 하한 충족 여부 — retired·draft는 요건 대상 아님
    const tier = R.tierOf(entry);
    const meetsReq = rows.length > 0 && rows.every((r) => r.q >= r.required);
    const status = tier === 'retired' ? 'retired'
        : rows.length === 0 ? '과목없음'
        : tier === 'active' ? (meetsReq && !tbShort ? '충족' : '미달')
        : meetsReq ? '승격가능' : '보강필요';

    return {
        id: t.id, tier, soon: !!entry.comingSoon, subjects: subjects.length,
        totalQ, answered, explained, cited, missingFiles, malformed,
        minRounds: Math.floor(minRounds * 10) / 10, deficit, tbShort,
        textbookK: Math.round(rows.reduce((n, r) => n + r.textbookChars, 0) / 1000),
        status, rows,
    };
}

function printSummary(packs) {
    const W = Math.max(10, Math.max(...packs.map((p) => p.id.length)) + 1);
    console.log('콘텐츠 검수 스코어카드 — 팩별 요약\n');
    const cols = [pad('id', W), pad('tier', 8), pad('문항', 7, false), pad('최소회분', 10, false), pad('부족문항', 10, false),
        pad('해설', 7, false), pad('인용', 7, false), pad('정답누락', 10, false), pad('교재k자', 9, false), pad('교재미달', 9, false), '상태'];
    console.log('  ' + cols.join(' '));
    for (const p of packs) {
        if (p.sparse || p.noManifest) {
            console.log('  ' + pad(p.id, W) + pad(p.tier, 8) + (p.sparse ? '[sparse 제외]' : '[manifest 부재]'));
            continue;
        }
        const row = [pad(p.id, W), pad(p.tier, 8), pad(p.totalQ, 7, false), pad(`${p.minRounds}/${R.MOCK_ROUNDS_REQUIRED}`, 10, false),
            pad(p.deficit || '-', 10, false), pad(pctStr(p.explained, p.answered), 7, false), pad(pctStr(p.cited, p.answered), 7, false),
            pad((p.totalQ - p.answered) || '-', 10, false), pad(p.textbookK, 9, false), pad(p.tbShort || '-', 9, false), p.status];
        console.log('  ' + row.join(' '));
    }
}

function printDetail(p) {
    if (p.sparse || p.noManifest) { console.log(`[${p.id}] ${p.sparse ? 'sparse 제외 상태' : 'manifest 부재'}`); return; }
    console.log(`\n[${p.id}] tier=${p.tier} · 과목 ${p.subjects} · 총 문항 ${p.totalQ} · 상태 ${p.status}\n`);
    const W = Math.max(10, Math.max(...p.rows.map((r) => r.key.length)) + 1);
    const cols = [pad('과목', W), pad('문항', 7, false), pad('필요', 7, false), pad('권장', 7, false), pad('회분', 7, false),
        pad('해설', 7, false), pad('인용', 7, false), pad('정답누락', 10, false), pad('교재자', 9, false), ''];
    console.log('  ' + cols.join(' '));
    for (const r of p.rows) {
        const row = [pad(r.key, W), pad(r.q, 7, false), pad(r.required, 7, false), pad(r.recommended, 7, false),
            pad(r.rounds.toFixed(1), 7, false), pad(pctStr(r.explained, r.answered), 7, false), pad(pctStr(r.cited, r.answered), 7, false),
            pad(r.noAnswer || '-', 10, false), pad(r.textbookChars, 9, false), r.textbookShort ? '⚠' : ''];
        console.log('  ' + row.join(' '));
    }
    const gaps = p.rows.filter((r) => r.deficit > 0);
    if (gaps.length) {
        console.log(`\n  보강 백로그: ${gaps.map((r) => `${r.key} +${r.deficit}문`).join(' · ')} (합계 ${p.deficit}문)`);
    }
    const lowCov = p.rows.filter((r) => r.answered && (pct(r.explained, r.answered) < 90 || pct(r.cited, r.answered) < 95));
    if (lowCov.length) {
        console.log(`  커버리지 검수: ${lowCov.map((r) => `${r.key} 해설${pctStr(r.explained, r.answered)}/인용${pctStr(r.cited, r.answered)}`).join(' · ')}`);
    }
}

function main() {
    const examsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf8'));
    const entryOf = (id) => (examsJson.exams || []).find((e) => e.id === id) || {};
    const targets = getExamTargets(ROOT);
    const packs = targets
        .filter((t) => !ONLY_EXAM || t.id === ONLY_EXAM)
        .map((t) => collectPack(t, entryOf(t.id)));

    if (ONLY_EXAM && !packs.length) { console.error(`알 수 없는 시험 id: ${ONLY_EXAM}`); process.exit(1); }
    if (AS_JSON) { console.log(JSON.stringify(packs, null, 2)); return; }

    if (ONLY_EXAM) { printDetail(packs[0]); return; }

    // 팩 요약 — active 먼저, 그다음 pilot, 나머지 (티어 순 + 부족 문항 큰 순)
    const order = { active: 0, pilot: 1, draft: 2, retired: 3 };
    packs.sort((a, b) => (order[a.tier] ?? 9) - (order[b.tier] ?? 9) || (b.deficit || 0) - (a.deficit || 0));
    printSummary(packs);

    const backlog = packs.filter((p) => !p.sparse && !p.noManifest && (p.deficit > 0 || p.tbShort > 0 || p.totalQ - p.answered > 0 || p.malformed > 0));
    if (backlog.length) {
        console.log('\n── 검수 우선순위 (요구 미달·커버리지 결손 상위) ──\n');
        for (const p of backlog) {
            const bits = [];
            if (p.deficit) bits.push(`문항 보강 ${p.deficit}문`);
            if (p.tbShort) bits.push(`교재 미달 ${p.tbShort}과목`);
            const noAns = p.totalQ - p.answered;
            if (noAns) bits.push(`정답 누락 ${noAns}문`);
            if (p.malformed) bits.push(`정답 마커 이형 ${p.malformed}건`);
            const exPct = pct(p.explained, p.answered), ciPct = pct(p.cited, p.answered);
            if (exPct !== null && exPct < 90) bits.push(`해설 ${exPct}%`);
            if (ciPct !== null && ciPct < 95) bits.push(`인용 ${ciPct}%`);
            console.log(`  ${p.id} [${p.tier}] — ${bits.join(' · ')}`);
        }
    }
    console.log(`\n측정 정본: tools/lib/exam_readiness.js (check:onboard와 동일 기준 — 요구 모의고사 ${R.MOCK_ROUNDS_REQUIRED}회분·교재 ${R.MIN_TEXTBOOK_CHARS_PER_SUBJECT}자)`);
    console.log('과목별 상세: npm run audit:scorecard -- --exam <id>');
}

main();
