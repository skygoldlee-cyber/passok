#!/usr/bin/env node
/* ============================================================
 * tools/build/build_landing.js
 * ------------------------------------------------------------
 * landing.template.html + content/exams.json + 시험별 자산 → landing.html 조립.
 *
 * 마커 규약 (템플릿의 한 라인 전체):
 *   <!-- @landing-exams --> → 시험 카드 그리드 HTML (exams.json 순회)
 *   <!-- @landing-demo -->  → 체험 데이터 <script type="application/json"> 블록
 *
 * 데모 데이터 원천 (DA-15 — 시험 id 리터럴 없이 contentRoot에서 유도):
 *   {contentRoot}/landing_demo.json — 미니 퀴즈 문항 (선택 자산)
 *   {contentRoot}/manifest.json     — subjects·exams 문항 수·study.minExamLeadDays
 *
 * --check: landing.html을 재생성 결과와 비교 — 개행 정규화 후 내용 비교
 * @spec LP-02,LP-03,LP-04,LP-08,LP-09
 * ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, 'landing.template.html');
const OUTPUT = path.join(ROOT, 'landing.html');
const EXAMS_JSON = path.join(ROOT, 'content', 'exams.json');

const EXAMS_MARKER_RE = /^[ \t]*<!--\s*@landing-exams\s*-->[ \t]*$/m;
const DEMO_MARKER_RE = /^[ \t]*<!--\s*@landing-demo\s*-->[ \t]*$/m;
const QUESTION_COUNT_RE = /\((\d[\d,]*)제\)/;

/** HTML 텍스트/속성 이스케이프 */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 시험 카드 그리드 HTML — comingSoon은 링크 없이 배지만 (LP-03)
 *  LP-14: exams.json group 필드로 시험 선택 뷰 동형 그룹 섹션 렌더 — group 미지정만이면 평면 그리드 폴백 */
function renderExamCards(exams) {
  const hasGroups = exams.some((e) => e.group);
  const renderCard = (e) => {
    const icon = esc(e.icon || 'fa-solid fa-clipboard-list');
    const title = esc(e.appName || e.name || e.id);
    const desc = esc(e.desc || '');
    const accent = e.theme && e.theme['--color-primary'];
    const style = accent ? ` style="--exam-accent:${esc(accent)}"` : '';
    const year = e.year ? `<span>${esc(e.year)} 시험 대비</span>` : '';
    const discord = e.discordInvite
      ? `<a class="landing-exam-discord" href="${esc(e.discordInvite)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-discord" aria-hidden="true"></i> 커뮤니티</a>` : '';
    const syll = e.syllabus && e.syllabus.primary
      ? `                    <p class="landing-exam-syllabus">1차 — ${esc(e.syllabus.primary)}${e.syllabus.secondary ? ` · 2차 — ${esc(e.syllabus.secondary)}` : ''}</p>\n`
      : '';
    if (e.comingSoon) {
      return `                <div class="landing-exam-card coming-soon"${style}>\n`
        + `                    <i class="${icon} landing-exam-icon" aria-hidden="true"></i>\n`
        + `                    <h3>${title}</h3>\n`
        + `                    <p>${desc}</p>\n`
        + syll
        + `                    <div class="landing-exam-meta"><span class="landing-exam-coming">준비 중</span>${year}${discord}</div>\n`
        + `                </div>`;
    }
    return `                <a class="landing-exam-card" href="./index.html?app=1"${style}>\n`
      + `                    <i class="${icon} landing-exam-icon" aria-hidden="true"></i>\n`
      + `                    <h3>${title}</h3>\n`
      + `                    <p>${desc}</p>\n`
      + syll
      + `                    <div class="landing-exam-meta">${year}${discord}</div>\n`
      + `                </a>`;
  };
  if (!hasGroups) {
    return `                <div class="landing-exam-grid">\n${exams.map(renderCard).join('\n')}\n                </div>`;
  }
  const order = [...new Set(exams.map((e) => e.group || '기타'))];
  return order.map((g) => {
    const members = exams.filter((e) => (e.group || '기타') === g);
    return `                <div class="landing-exam-group">\n`
      + `                    <div class="landing-exam-group-head"><span class="landing-exam-group-name">${esc(g)}</span><span class="landing-exam-group-count">${members.length}개</span></div>\n`
      + `                    <div class="landing-exam-grid">\n${members.map(renderCard).join('\n')}\n                    </div>\n`
      + `                </div>`;
  }).join('\n');
}

/** landing_demo.json 스키마 검증 — 위반 시 예외 */
function validateDemoItems(examId, items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error(`${examId}/landing_demo.json: items 배열이 비어 있습니다`);
  }
  items.forEach((it, i) => {
    const at = `${examId}/landing_demo.json items[${i}]`;
    if (typeof it.question !== 'string' || !it.question.trim()) throw new Error(`${at}: question 누락`);
    if (!Array.isArray(it.choices) || it.choices.length < 2) throw new Error(`${at}: choices 2개 미만`);
    if (!it.choices.every(c => typeof c === 'string')) throw new Error(`${at}: choices는 문자열 배열이어야 함`);
    if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.choices.length) {
      throw new Error(`${at}: answer가 선지 범위 밖 (${it.answer})`);
    }
    for (const k of ['explanation', 'citation']) {
      if (it[k] != null && typeof it[k] !== 'string') throw new Error(`${at}: ${k}는 문자열이어야 함`);
    }
  });
}

/** manifest.json → 학습계획 미리보기 데이터 (과목명 + 문항 수 비중 + 권장 리드타임) */
function loadPlanData(manifestPath) {
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (!Array.isArray(manifest.subjects) || !manifest.subjects.length) return null;
  const counts = new Map();
  for (const ex of manifest.exams || []) {
    const m = String(ex.title || '').match(QUESTION_COUNT_RE);
    if (ex.subject && m) counts.set(ex.subject, (counts.get(ex.subject) || 0) + Number(m[1].replace(/,/g, '')));
  }
  const subjects = manifest.subjects.map(s => ({
    name: s.shortName || s.name || s.key,
    count: counts.get(s.key) || 0,
  }));
  const minLeadDays = Number(manifest.study && manifest.study.minExamLeadDays) || 90;
  return { subjects, minLeadDays };
}

/** 시험별 체험 데이터 수집 — 자산 없는 시험은 제외 (미선언 = 숨김) */
function collectDemoData(exams) {
  const entries = [];
  for (const e of exams) {
    if (!e.contentRoot) continue;
    const root = path.join(ROOT, e.contentRoot);
    let quiz = null;
    const demoFile = path.join(root, 'landing_demo.json');
    if (fs.existsSync(demoFile)) {
      const demo = JSON.parse(fs.readFileSync(demoFile, 'utf-8'));
      validateDemoItems(e.id, demo.items);
      quiz = { items: demo.items };
    }
    const plan = loadPlanData(path.join(root, 'manifest.json'));
    if (!quiz && !plan) continue;
    entries.push({
      id: e.id, appName: e.appName || e.name || e.id,
      ...(quiz ? { quiz } : {}),
      ...(plan ? { plan } : {}),
    });
  }
  return { exams: entries };
}

function build() {
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  if (!EXAMS_MARKER_RE.test(tpl) || !DEMO_MARKER_RE.test(tpl)) {
    console.error('❌ landing.template.html에 @landing-exams/@landing-demo 마커가 없습니다');
    process.exit(1);
  }
  const exams = (JSON.parse(fs.readFileSync(EXAMS_JSON, 'utf-8')).exams) || [];
  const demo = collectDemoData(exams);
  // JSON 내장 — </script> 조기 종료 방지로 '<' 이스케이프
  const demoJson = JSON.stringify(demo).replace(/</g, '\\u003c');
  return tpl
    .replace(EXAMS_MARKER_RE, renderExamCards(exams))
    .replace(DEMO_MARKER_RE,
      `            <script type="application/json" id="landing-demo-data">\n            ${demoJson}\n            </script>`);
}

function main() {
  const isCheck = process.argv.includes('--check');
  const generated = build();
  if (isCheck) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : null;
    const normEol = (s) => s.replace(/\r\n/g, '\n');
    if (current !== null && normEol(current) === normEol(generated)) {
      console.log('✅ landing.html이 최신 조립 상태입니다');
    } else {
      console.error('❌ landing.html이 템플릿/exams.json과 불일치 — npm run build:landing 실행 필요');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUTPUT, generated);
    console.log(`✅ landing.html 생성 — ${generated.split('\n').length}줄`);
  }
}

module.exports = { build, renderExamCards, collectDemoData, loadPlanData, validateDemoItems, esc };
if (require.main === module) main();
