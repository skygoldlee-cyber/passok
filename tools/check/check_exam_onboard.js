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

/** 정식 승격 정량 기준 — 과목당 모의고사 N회분 문항 (manifest exams 파일 ###Q 실측).
 *  과목당 출제 문항 수는 manifest.integratedExam.questionsPerSubject 선언 우선,
 *  미선언 시 DEFAULT_Q_PER_SUBJECT로 간주한다. */
const MOCK_ROUNDS_REQUIRED = 3;
const MOCK_ROUNDS_RECOMMENDED = 6;
const DEFAULT_Q_PER_SUBJECT = 20;
/** 정식 승격 팩 과목별 표준형 교재 최소 본문량 — 비공백 문자 기준.
 *  ~A4 13쪽 분량. 시중 수험서 절당 4쪽·최소 5절 구성을 하한으로 삼는다. */
const MIN_TEXTBOOK_CHARS_PER_SUBJECT = 20000;
/** 과목 1회 출제 문항 수 — questionsPerSubject 선언 우선, 미선언 20 간주 */
const perSubjectQ = (manifest, subjKey) =>
    ((manifest.integratedExam || {}).questionsPerSubject || {})[subjKey] || DEFAULT_Q_PER_SUBJECT;

/** 과목별 요구 문항 수 — 모의고사 MOCK_ROUNDS_REQUIRED회 비반복 구성 가능량 (active 승격 기준) */
const requiredFor = (manifest, subjKey) => MOCK_ROUNDS_REQUIRED * perSubjectQ(manifest, subjKey);

/** 과목별 권장 문항 수 — 모의고사 MOCK_ROUNDS_RECOMMENDED회 비반복 구성량 (품질 권장, 비차단) */
const recommendedFor = (manifest, subjKey) => MOCK_ROUNDS_RECOMMENDED * perSubjectQ(manifest, subjKey);

/** 정식 팩 최소 sanity 바닥 — 과목당 1회분 미만이면 모의고사 1회도 비반복 구성 불가 */
const floorFor = (manifest, subjKey) => perSubjectQ(manifest, subjKey);

/** 기준 상향(모의고사 3회분) 이전 정식 승격 팩 — 신기준 미달은 오류가 아닌 보강 권장(warn)으로 보고 */
const MOCK3X_GRANDFATHERED = new Set(['broker', 'indsafe', 'compapp2', 'carework']);
/** 교재 볼륨 하한 신설 이전 active 팩 — 스텁 볼륨도 차단이 아닌 보강 권장(warn)으로 보고 */
const TEXTBOOK_VOLUME_GRANDFATHERED = new Set(['broker', 'indsafe', 'compapp2']);

/** 성숙도 티어 — draft(선언) < pilot(출제기준+표준형 챕터) < active(pilot+과목당 ≥최소 문항) */
const TIERS = ['draft', 'pilot', 'active'];
/** retired — 퇴역 팩: 성숙도 요건 면제. 빌드·기존 사용자 접근은 유지하고 승격/신규 요건 검사 대상에서만 제외 */
const VALID_TIERS = [...TIERS, 'retired'];
const tierOf = (entry) => entry.tier || (entry.comingSoon ? 'pilot' : 'active');

/** 참조자료/ref_md 하위의 출제기준 문서 경로 (파일명 매칭, 깊이 제한) */
function findSyllabusDoc(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return null;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
            const found = findSyllabusDoc(path.join(dir, e.name), depth + 1);
            if (found) return found;
        } else if (e.isFile() && e.name.endsWith('.md') && e.name.includes('출제기준')) {
            return path.join(dir, e.name);
        }
    }
    return null;
}

/** 출제기준 문서가 과목|주요항목|세부내용 표 형식을 포함하는지 (감사 파싱 가능 형식) */
function hasSyllabusTable(file) {
    return /\|\s*과목\s*\|/m.test(fs.readFileSync(file, 'utf8'));
}

/** 챕터 파일 존재 + 번호 챕터 헤딩 (## N. 또는 ## Chapter NN. — 표준 규약은 Chapter NN., 이모지 접두 허용) */
function isStandardChapter(file) {
    if (!fs.existsSync(file)) return false;
    return /^##\s+(?:\S+\s+)*(?:Chapter\s+)?\d+\./m.test(fs.readFileSync(file, 'utf8').slice(0, 20000));
}

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

/** 과목별 표준형 교재 본문량 — manifest chapters[] 선언 파일의 비공백 문자 합계 */
function textbookChars(contentRoot, subject) {
    let total = 0;
    for (const c of subject.chapters || []) {
        const f = typeof c === 'string' ? c : c.file;
        if (!f) continue;
        const p = path.join(ROOT, contentRoot, subject.dir || '', f);
        if (fs.existsSync(p)) {
            total += fs.readFileSync(p, 'utf-8')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/[#>*`\-\[\]()|]/g, '')
                .replace(/\s/g, '').length;
        }
    }
    return total;
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
        const thin = subjects.filter((s) => (qBySubject[s.key] || 0) < floorFor(t.manifest, s.key));
        if (thin.length) {
            warn(t.id, `정식 시험인데 과목 문항 부족 — ${thin.map((s) => `${s.key}:${qBySubject[s.key] || 0}문`).join(', ')} (기준 과목당 모의고사 1회분)`);
        }
    }
    if (soon && subjects.length) {
        const ready = subjects.filter((s) => (qBySubject[s.key] || 0) >= requiredFor(t.manifest, s.key)).length;
        if (ready === subjects.length && totalQ > 0) {
            warn(t.id, `comingSoon이지만 전 과목 승격 기준 충족 (${totalQ}문) — 정식 전환 검토 (NEW_EXAM_RUNBOOK §승격)`);
        }
        if (!t.manifest._pilot && !t.manifest._reform2028) {
            info(t.id, 'comingSoon 시험 — manifest에 _pilot 등 파일럿 근거 주석 권장');
        }
    }

    // ── 성숙도 티어 요건 (tier 전이 시점 차단 게이트) ──
    const tier = tierOf(entry);
    if (!VALID_TIERS.includes(tier)) {
        err(t.id, `tier 값이 유효하지 않습니다: ${entry.tier} (draft|pilot|active|retired)`);
    } else if (tier === 'retired') {
        info(t.id, 'tier retired — 성숙도 요건 면제 (퇴역 팩 — 콘텐츠 요건 검사 대상 아님)');
    } else {
        if (!entry.tier) info(t.id, `tier 미선언 — 추정 "${tier}" (exams.json에 명시 권장)`);
        const lvl = TIERS.indexOf(tier);
        if (lvl >= 1) {
            const syl = findSyllabusDoc(path.join(cr, '참조자료', 'ref_md'));
            if (!syl) {
                err(t.id, `tier ${tier} 요건: 출제기준 문서 없음 — 참조자료/ref_md 하위에 출제기준 md 필요`);
            } else if (!hasSyllabusTable(syl)) {
                warn(t.id, `출제기준 문서가 표 형식(과목|주요항목|세부내용)이 아님 — 감사 정밀도를 위해 표 형식 변환 권장`);
            }
            const noChap = subjects.filter(s => !(s.chapters || []).some(c => c.file && isStandardChapter(path.join(cr, s.dir || '', c.file))));
            if (noChap.length) {
                err(t.id, `tier ${tier} 요건: 표준형 챕터 부재 — ${noChap.map(s => s.key).join(', ')} (## Chapter NN. 헤딩 챕터 필요)`);
            }
        }
        if (lvl >= 2 && subjects.length) {
            const thinT = subjects.filter((s) => (qBySubject[s.key] || 0) < requiredFor(t.manifest, s.key));
            if (thinT.length) {
                const msg = `tier active 요건: 과목당 모의고사 ${MOCK_ROUNDS_REQUIRED}회분 미충족 — ${thinT.map((s) => `${s.key}:${qBySubject[s.key] || 0}/필요${requiredFor(t.manifest, s.key)}문`).join(', ')}`;
                if (MOCK3X_GRANDFATHERED.has(t.id)) warn(t.id, `${msg} (기준 상향 전 승격 팩 — 보강 권장)`);
                else err(t.id, msg);
            }
            const tbBySubject = Object.fromEntries(subjects.map((s) => [s.key, textbookChars(t.contentRoot, s)]));
            const thinVol = subjects.filter((s) => (tbBySubject[s.key] || 0) < MIN_TEXTBOOK_CHARS_PER_SUBJECT);
            if (thinVol.length) {
                const msg = `tier active 요건: 과목당 표준형 교재 ${MIN_TEXTBOOK_CHARS_PER_SUBJECT}자 미충족 — ${thinVol.map((s) => `${s.key}:${tbBySubject[s.key] || 0}자`).join(', ')}`;
                if (TEXTBOOK_VOLUME_GRANDFATHERED.has(t.id)) warn(t.id, `${msg} (볼륨 기준 신설 전 승격 팩 — 교재 보강 권장)`);
                else err(t.id, msg);
            }
        }
    }

    // ── 모의고사 권장량(6회분) 진단 — 승격 요건(3회분) 충족 팩에만 증산 권장 안내 ──
    if (subjects.length) {
        const readyAll = subjects.every((s) => (qBySubject[s.key] || 0) >= requiredFor(t.manifest, s.key));
        const recThin = subjects.filter((s) => (qBySubject[s.key] || 0) < recommendedFor(t.manifest, s.key));
        if (readyAll && recThin.length) {
            info(t.id, `모의고사 권장 ${MOCK_ROUNDS_RECOMMENDED}회분 미달 — ${recThin.map((s) => `${s.key}:${qBySubject[s.key] || 0}/권장${recommendedFor(t.manifest, s.key)}문`).join(', ')} (승격 요건 ${MOCK_ROUNDS_REQUIRED}회분은 충족, 증산 권장)`);
        }
    }

    // ── 선택 자산 진단 ──
    const hasRefs = fs.existsSync(path.join(cr, '참조자료'));
    const pdfHosting = fs.existsSync(path.join(cr, '참조자료', 'pdf_hosting.json'));
    if (hasRefs && !pdfHosting) info(t.id, '참조자료/ 존재 — 원본 PDF 편입 시 pdf_hosting.json 외부화 선언 검토 (DOC-RBK-12)');
    const optional = ['docs', 'knowledge', '피드백', 'number-drills'].filter((d) => fs.existsSync(path.join(cr, d)));

    const minRounds = subjects.length
        ? Math.min(...subjects.map((s) => Math.floor((qBySubject[s.key] || 0) / perSubjectQ(t.manifest, s.key))))
        : null;

    rows.push({
        id: t.id, soon, tier, subjects: subjects.length,
        textbookFiles: subjects.reduce((n, s) => n + (s.chapters || []).length, 0),
        textbookKChars: Math.round(subjects.reduce((n, s) => n + textbookChars(t.contentRoot, s), 0) / 1000),
        totalQ, features: Object.keys(entry.features || {}).length,
        minRounds, optional: optional.join('+') || '-',
    });
}

// ── 리포트 ──
console.log('시험 팩 온보딩·승격 진단\n');
const ID_W = Math.max(10, Math.max(...rows.map(r => r.id.length)) + 1);
console.log('  ' + 'id'.padEnd(ID_W) + '등급'.padEnd(8) + 'tier'.padEnd(7) + '과목'.padEnd(5) + '챕터'.padEnd(5) + '교재k자'.padEnd(8) + '문항'.padEnd(8) + '모의회분'.padEnd(9) + 'features'.padEnd(9) + '선택자산');
for (const r of rows) {
    console.log('  ' + r.id.padEnd(ID_W) + (r.soon ? '준비중' : '정식').padEnd(8) + String(r.tier).padEnd(7)
        + String(r.subjects).padEnd(5) + String(r.textbookFiles).padEnd(5) + String(r.textbookKChars).padEnd(8)
        + String(r.totalQ).padEnd(8) + String(r.minRounds === null ? '-' : `${r.minRounds}/권장${MOCK_ROUNDS_RECOMMENDED}`).padEnd(9)
        + String(r.features).padEnd(9) + r.optional);
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
