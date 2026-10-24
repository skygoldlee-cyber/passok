#!/usr/bin/env node
/**
 * check_exam_onboard.js — 시험 팩 온보딩·승격 진단
 *
 * 멀티시험 플랫폼의 "시험 추가 → 파일럿 → 정식 승격" 경로를 한곳에서 진단한다.
 * check_manifest.js가 선언↔파일 정합을 검사하는 것과 달리, 이 체커는 팩의
 * **준비도·등급 정합**(comingSoon ↔ 콘텐츠 볼륨, 필수 선언 누락)을 본다.
 *
 * 판정:
 *   ERROR — 구조 결함 (차단급):
 *     · manifest.json 부재/파싱 실패 · subjects 0개 · subject.dir 부재
 *     · exams[].file 문제은행 부재
 *     - comingSoon 아닌데 문제은행 총 문항 0
 *   WARN — 등급 정합 (비차단, 리포트):
 *     · comingSoon + 과목당 문항 ≥ 승격 기준 → 승격 후보
 *     · 정식 + 총 문항 < 승격 기준 → 콘텐츠 부족 (comingSoon 재고려)
 *     · comingSoon + manifest._pilot·_reform 주석 부재 → 파일럿 근거 명기 권장
 *   INFO — 선택 자산 진단: 참조자료/ · docs/ · knowledge/ · pdf_hosting.json
 *
 * 사용: node tools/check/check_exam_onboard.js [--quiet]
 *   (npm run check:onboard — check:audit 프리셋에 포함, advisory)
 * 종료코드: ERROR 1건 이상이면 1, WARN만이면 0
 */

// @spec DA-06,ES-01
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const QUIET = process.argv.includes('--quiet');

/** 정식 승격 정량 기준 — 과목당 최소 문항 수 (manifest exams 파일 ###Q 실측) */
const GRAD_MIN_PER_SUBJECT = 20;

const errors = [];
const warns = [];
const infos = [];
const err = (s, m) => errors.push(`[${s}] ${m}`);
const warn = (s, m) => warns.push(`[${s}] ${m}`);
const info = (s, m) => infos.push(`[${s}] ${m}`);

const EXAMS_JSON = path.join(ROOT, 'content', 'exams.json');
const examsEntry = JSON.parse(fs.readFileSync(EXAMS_JSON, 'utf-8')).exams || [];
const entryOf = (id) => examsEntry.find((e) => e.id === id) || {};

/** 문제은행 파일의 ###Q 문항 수 (check_manifest.js와 동일 규칙) */
function questionCount(contentRoot, file) {
    const p = path.join(ROOT, contentRoot, '문제은행', file);
    if (!fs.existsSync(p)) return null;
    return (fs.readFileSync(p, 'utf-8').match(/^###\s*Q\d+/gm) || []).length;
}

const targets = getExamTargets(ROOT);
const rows = [];

for (const t of targets) {
    const entry = entryOf(t.id);
    const soon = !!entry.comingSoon;
    const cr = path.join(ROOT, t.contentRoot);

    // ── 구조 검증 ──
    if (!entry.contentRoot || !entry.dataRoot || !entry.registryBundle || !entry.registryGlobal) {
        err(t.id, 'exams.json 필수 필드 누락 (contentRoot·dataRoot·registryBundle·registryGlobal) — scaffold:exam으로 생성 권장');
    }
    if (!fs.existsSync(cr)) { err(t.id, `contentRoot 없음: ${t.contentRoot}`); continue; }
    if (!t.manifest) { err(t.id, 'manifest.json 부재/파싱 실패'); continue; }

    const subjects = t.manifest.subjects || [];
    if (!subjects.length) err(t.id, 'manifest.subjects 비어있음 — 최소 1과목 필요');
    for (const s of subjects) {
        if (s.dir && !fs.existsSync(path.join(cr, s.dir))) {
            err(t.id, `subject "${s.key}" 교재 디렉터리 부재: ${s.dir}`);
        }
    }

    // ── 문항 실측 ──
    let totalQ = 0;
    const qBySubject = {};
    for (const ex of t.manifest.exams || []) {
        const n = ex.file ? questionCount(t.contentRoot, ex.file) : null;
        if (n === null) { err(t.id, `문제은행 파일 부재: ${ex.file}`); continue; }
        totalQ += n;
        if (ex.subject) qBySubject[ex.subject] = (qBySubject[ex.subject] || 0) + n;
    }
    // 주관식 전용 과목 — manifest.written[]의 ### S 문항을 key 과목에 계수 (객관식과 동일 기준 적용)
    for (const w of t.manifest.written || []) {
        if (!w.key || !w.file) continue;
        const wPath = path.join(ROOT, t.contentRoot, '문제은행', w.file);
        if (!fs.existsSync(wPath)) continue;
        const sN = (fs.readFileSync(wPath, 'utf8').match(/^###\s*S\d+/gm) || []).length;
        qBySubject[w.key] = (qBySubject[w.key] || 0) + sN;
    }

    // ── 등급 정합 ──
    if (!soon && totalQ === 0) err(t.id, '정식 시험인데 문제은행 문항 0 — 콘텐츠 투입 또는 comingSoon 표기 필요');
    if (!soon && totalQ > 0 && subjects.length) {
        const thin = subjects.filter((s) => (qBySubject[s.key] || 0) < GRAD_MIN_PER_SUBJECT);
        if (thin.length) {
            warn(t.id, `정식 시험인데 과목 문항 부족 — ${thin.map((s) => `${s.key}:${qBySubject[s.key] || 0}문`).join(', ')} (기준 과목당 ≥${GRAD_MIN_PER_SUBJECT})`);
        }
    }
    if (soon && subjects.length) {
        const ready = subjects.filter((s) => (qBySubject[s.key] || 0) >= GRAD_MIN_PER_SUBJECT).length;
        if (ready === subjects.length && totalQ > 0) {
            warn(t.id, `comingSoon이지만 전 과목 승격 기준 충족 (${totalQ}문) — 정식 전환 검토 (NEW_EXAM_RUNBOOK §승격)`);
        }
        if (!t.manifest._pilot && !t.manifest._reform2028) {
            info(t.id, 'comingSoon 시험 — manifest에 _pilot 등 파일럿 근거 주석 권장');
        }
    }

    // ── 선택 자산 진단 ──
    const hasRefs = fs.existsSync(path.join(cr, '참조자료'));
    const pdfHosting = fs.existsSync(path.join(cr, '참조자료', 'pdf_hosting.json'));
    if (hasRefs && !pdfHosting) info(t.id, '참조자료/ 존재 — 원본 PDF 편입 시 pdf_hosting.json 외부화 선언 검토 (DOC-RBK-12)');
    const optional = ['docs', 'knowledge', '피드백', 'number-drills'].filter((d) => fs.existsSync(path.join(cr, d)));

    rows.push({
        id: t.id, soon, subjects: subjects.length,
        textbookFiles: subjects.reduce((n, s) => n + (s.chapters || []).length, 0),
        totalQ, features: Object.keys(entry.features || {}).length,
        optional: optional.join('+') || '-',
    });
}

// ── 리포트 ──
console.log('시험 팩 온보딩·승격 진단\n');
console.log('  ' + 'id'.padEnd(10) + '등급'.padEnd(6) + '과목'.padEnd(5) + '챕터'.padEnd(5) + '문항'.padEnd(8) + 'features'.padEnd(9) + '선택자산');
for (const r of rows) {
    console.log('  ' + r.id.padEnd(10) + (r.soon ? '준비중' : '정식').padEnd(6)
        + String(r.subjects).padEnd(5) + String(r.textbookFiles).padEnd(5)
        + String(r.totalQ).padEnd(8) + String(r.features).padEnd(9) + r.optional);
}

for (const m of infos) console.log(`\nℹ ${m}`);
for (const m of warns) console.log(`\n⚠ ${m}`);
if (errors.length) {
    console.log(`\n❌ 구조 오류 ${errors.length}건:`);
    for (const m of errors) console.log(`  ✗ ${m}`);
    process.exit(1);
}
if (!QUIET || warns.length) {
    console.log(`\n✅ 구조 오류 0건 · 승격 힌트(경고) ${warns.length}건 · 참고 ${infos.length}건`);
}
process.exit(0);
