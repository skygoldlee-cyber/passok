// check_scenario_items.js — 4단계 선택형 시나리오 문항 검증
// @spec none — 콘텐츠 검증 도구 (DOC-USR-22 구현 자산, 요구사항 ID 미부여)
//   · 스키마: conceptId 해소, role 유효값, options 5개, answer ∈ options, rationale 5개
//   · 수치 정합: 문항의 FACT 토큰이 표준형 본문에 없으면 경고 (서사 검사와 동일 규약 — BP-11)
//   · 인물 설정: 최복순에 편마비·휠체어 금지 (인물 설정표 규칙 1)
const fs = require('fs');
const path = require('path');
const { FACT_TOKEN_RE } = require('../build/story_merge.js');

const ROOT = path.resolve(__dirname, '..', '..');
const EXAM_ROOT = path.join(ROOT, 'content', 'exams', 'carework');
const ITEMS = path.join(EXAM_ROOT, 'items', 'scenario_items.json');
const CONCEPTS = path.join(EXAM_ROOT, 'concepts.json');
const STD = path.join(EXAM_ROOT, '교재', 'careprac', '2과목_요양보호실기.md');

const ROLE_OK = new Set(['pre', 'scenario', 'review']);
const normToken = s => String(s).replace(/\s+/g, '');
const LABELS = ['①', '②', '③', '④', '⑤'];

const errors = [];
const warns = [];

const concepts = JSON.parse(fs.readFileSync(CONCEPTS, 'utf8')).concepts;
const items = JSON.parse(fs.readFileSync(ITEMS, 'utf8')).items;
const std = fs.readFileSync(STD, 'utf8');
const body = normToken(std);
const conceptIds = new Set(concepts.map(c => c.id));

// 개념 검증
const seen = new Set();
for (const c of concepts) {
    for (const k of ['id', 'subject', 'chapter', 'title', 'bodyAnchor']) {
        if (c[k] == null) errors.push(`concepts: ${c.id || '?'} — 필드 누락: ${k}`);
    }
    if (seen.has(c.id)) errors.push(`concepts: id 중복 — ${c.id}`);
    seen.add(c.id);
    const slotRe = new RegExp(`<!-- story:slot:${c.storySlot} -->`);
    if (c.storySlot && !slotRe.test(std)) errors.push(`concepts: ${c.id} — storySlot ${c.storySlot}이 표준형에 없음`);
}

// 문항 검증
for (const it of items) {
    const loc = `items: ${it.id || '?'}`;
    if (!conceptIds.has(it.conceptId)) errors.push(`${loc} — conceptId 미해소: ${it.conceptId}`);
    if (!ROLE_OK.has(it.role)) errors.push(`${loc} — role 비정상: ${it.role}`);
    if (!Array.isArray(it.options) || it.options.length !== 5) errors.push(`${loc} — options 5개 아님 (${it.options?.length})`);
    if (!LABELS.includes(it.answer)) errors.push(`${loc} — answer 형식(①~⑤) 아님: ${it.answer}`);
    if (!Array.isArray(it.rationale) || it.rationale.length !== 5) errors.push(`${loc} — rationale 5개 아님 (${it.rationale?.length})`);
    // 수치·조문 토큰 정합 — 사실로 주장되는 텍스트(지문 + 정답 보기)만 대조.
    // 오답 보기의 수치는 의도적 함정값이라 본문에 없는 것이 정상이다.
    const ai = LABELS.indexOf(it.answer);
    const assertText = [it.stem, ai >= 0 ? it.options[ai] : ''].join(' ');
    for (const m of assertText.matchAll(FACT_TOKEN_RE)) {
        const t = m[0].trim();
        if (!body.includes(normToken(t))) warns.push(`${loc} — 주장 수치 '${t}'이 표준형 본문에 없음 (지문·정답 재확인 필요)`);
    }
    // 인물 설정 가드 — 최복순에 편마비·휠체어 배정 금지
    const text = [it.stem, ...(it.options || [])].join(' ');
    if (/최복순/.test(text) && /편마비|휠체어|와상|욕창|연하곤란/.test(text)) {
        errors.push(`${loc} — 인물 설정 위반: 최복순에 편마비·휠체어 배정 (인물 설정표 규칙 1 — 최복순=무릎 관절염·기본 ADL 자립)`);
    }
    // 검수 게이트 — approved 없는 문항은 사람 검수 대기 상태 (파일럿 전 reviewed 전환 필요)
    if (it.approved !== true) warns.push(`${loc} — 미검수 문항 (approved 미설정 — 수치·법조항 검수 후 승인 필요)`);
}

const dup = new Set();
for (const it of items) { if (dup.has(it.id)) errors.push(`items: id 중복 — ${it.id}`); dup.add(it.id); }

// eval_pool.json — 학습 경로 격리 평가 풀 (role eval/pretest, rationale·cutOnWrong 선택)
const EVAL_POOL = path.join(EXAM_ROOT, 'items', 'eval_pool.json');
const evalItems = fs.existsSync(EVAL_POOL) ? JSON.parse(fs.readFileSync(EVAL_POOL, 'utf8')).items || [] : [];
const EVAL_ROLE_OK = new Set(['eval', 'pretest']);
const evalIds = new Set();
for (const it of evalItems) {
    const loc = `eval_pool: ${it.id || '?'}`;
    if (!conceptIds.has(it.conceptId)) errors.push(`${loc} — conceptId 미해소: ${it.conceptId}`);
    if (!EVAL_ROLE_OK.has(it.role)) errors.push(`${loc} — role 비정상: ${it.role}`);
    if (!Array.isArray(it.options) || it.options.length !== 5) errors.push(`${loc} — options 5개 아님 (${it.options?.length})`);
    if (!LABELS.includes(it.answer)) errors.push(`${loc} — answer 형식(①~⑤) 아님: ${it.answer}`);
    if (evalIds.has(it.id)) errors.push(`${loc} — id 중복`);
    evalIds.add(it.id);
}
// 격리 불변식 — eval/pre테스트 id가 학습 풀에 섞이면 평가 무효
for (const it of items) if (evalIds.has(it.id)) errors.push(`items: ${it.id} — eval_pool과 id 중복 (격리 위반)`);

const approved = items.filter(i => i.approved).length;
const unapproved = items.length - approved;
console.log(`concepts ${concepts.length}개 · items ${items.length}개 (approved ${approved}, 미검수 ${unapproved}) · eval_pool ${evalItems.length}개`);
warns.forEach(w => console.log(`⚠️  ${w}`));
if (errors.length) {
    errors.forEach(e => console.error(`❌ ${e}`));
    process.exit(1);
}
console.log(`✅ 시나리오 문항 검증 통과${warns.length ? ` (경고 ${warns.length}건)` : ''}`);
