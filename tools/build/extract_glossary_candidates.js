// tools/build/extract_glossary_candidates.js
// @spec BP-14
// 참조문서({contentRoot}/참조자료/ref_md/**)에서 용어 후보를 자동 추출해
// 리포트로 출력한다. 용어설명집(glossary) 확장의 1차 소스.
//
// 추출 패턴:
//   [정의]  "원자재"란 ~을 말한다 / 가. 로션제란 ~ / ### 위생관리란 ~
//           — 따옴표 정의 + 항목 기호 정의 + 교재 헤딩 정의
//   [약칭]  (이하 "안전확보 조치"라 한다) — 약칭 + 선행 원명(fullForm) 캡처
//   [영문]  자외선차단지수(SPF) — 한글 용어의 영문·약어 병기 (화학식 필터)
//
// 스캔 소스: {contentRoot}/참조자료/ref_md/** + {contentRoot}/교재/<subjKey>/*_표준형.md
// (교재 표준형은 비따옴표 'X란' 정의가 있는 문서 — 과목3/4처럼 ref_md에 정의 조항이
//  희박한 과목의 커버리지를 메운다. 이야기형은 표준형과 중복이라 제외)
//
// 기존 GLOSSARY_INDEX(src/keyword-index.js의 _EXAM_GLOSSARY_INDEX)와 대조해
// NEW/EXISTS로 분류한다. glossary JSON·manifest.synonyms 병합은 리포트 검토 후
// --apply로 수행 — 기본 대상은 [정의] 패턴 신규분, --patterns로 범위 조정.
//
// 실행: npm run report:glossary  (= node tools/build/extract_glossary_candidates.js)
//       node tools/build/extract_glossary_candidates.js --json <outPath>
//       node tools/build/extract_glossary_candidates.js --apply [--patterns 정의,약칭]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const { getExamTargets } = require('./exam_targets.js');

const TERM_MIN = 2;
const TERM_MAX = 30;
const DEF_MAX = 140;

// [정의-따옴표] 8. "원자재"란 화장품 원료 및 자재를 말한다.
const RE_DEF_QUOTED = /["“‘]([^"”’\n]{2,30})["”’]\s*이?란\s+/g;
// [정의-기호] 가. 로션제란 ~ / 8. 원자재란 ~ / #### 3.2 위생관리란 ~
// — 줄 시작의 번호·가나다 기호·마크다운 헤딩 뒤 bare 용어
const RE_DEF_MARKER = /^\s*(?:[-*•]\s+|\d+\s*[.)、]\s*|\(?[가-하]\s*[.)、]\s*|#{1,6}\s*(?:[\d.]+\s*)*)([가-힣][가-힣A-Za-z·()]{1,29})\s*이?란\s+/;
// [약칭] 이하 "안전확보 조치"라 한다 / 이하 이 조에서 "교육실시기관"이라 한다
const RE_ALIAS = /이하\s*(?:이\s*[조절관항]에서\s*)?["“']([^"”'\n]{1,25})["”']\s*(?:이)?라(?:고)?\s*한다/g;
// [영문] 자외선차단지수(SPF) / 질산란탄(Lanthanium Nitrate)
const RE_ENG = /([가-힣]{2,20})\(\s*([A-Za-z][A-Za-z0-9 .·&/'+-]{0,40})\s*\)/g;

// 추출 제외 — 너무 일반적인 구성요소 명사
const STOP_TERMS = new Set([
    '등', '경우', '때', '중', '의', '것', '수', '예', '또는', '및', '각',
    '항목', '기준', '방법', '사항', '내용', '기타', '그림', '표',
    '제출서류', // 시행규칙 서식 정정 조문 오검출 ('대표\n자)' 줄바꿈 → '자)' 기호 오인)
]);

/** 영문 병기의 화학식·기호 노이즈 필터 — 원소 기호 나열·숫자 포함이면 화학식으로 간주 */
function isFormulaLike(eng) {
    const inner = String(eng || '').trim();
    if (!inner) return true;
    if (/[0-9]/.test(inner)) return true;                    // La(NO3)·n20 등
    const toks = inner.split(/[\s/+-]+/).filter(Boolean);
    if (!toks.length) return true;
    // 1글자 토큰이 2개 이상이면 원소 나열 화학식 (C H O · C H ClN H SO)
    if (toks.filter(t => t.replace(/[.,()·]/g, '').length === 1).length >= 2) return true;
    return toks.every(t => t.replace(/[.,()·]/g, '').length <= 2); // Si Cl 등
}

/** 후보 용어의 노이즈 필터 */
function isNoisyTerm(term) {
    const t = String(term || '').trim();
    if (t.length < TERM_MIN || t.length > TERM_MAX) return true;
    if (/^[0-9.]+$/.test(t)) return true;                    // 숫자 전용 라벨
    if (/^[^가-힣A-Za-z]+$/.test(t)) return true;            // 문장부호 전용
    if (STOP_TERMS.has(t)) return true;
    return false;
}

function clipDef(text) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > DEF_MAX ? s.slice(0, DEF_MAX) + '…' : s;
}

// 정의문 완전 캡처 — ref_md는 줄바꿈으로 문장·어미가 끊기므로(예: '말\n한다')
// 종결어미 내부 공백을 허용하고, 종결까지 다음 줄을 이어 붙인다.
// '포함한다/정한다'는 정의 중간에 올 수 있어(예: '…첨부문서 등을 포함한다)을 말한다') 종결어미에서 제외.
// 종결 미발견 시 첫 문장 마침표·400자 상한으로 절단한다.
const DEF_END_RE = /(말\s*한\s*다|말\s*함|의\s*미\s*한\s*다|뜻\s*한\s*다|이\s*른\s*다|일\s*컫\s*는\s*다|총\s*칭\s*함|총\s*칭\s*한\s*다)[.。)]*/;
const DEF_CAP = 400;
function fullDef(lines, startLi, rest) {
    let li = startLi;
    let text = rest.replace(/\s+/g, ' ').trim();
    let m = text.match(DEF_END_RE);
    while (!m && text.length < DEF_CAP && li + 1 < lines.length) {
        text += ' ' + lines[++li].trim();
        text = text.replace(/\s+/g, ' ');
        m = text.match(DEF_END_RE);
    }
    if (m) text = text.slice(0, m.index + m[0].length);
    else {
        const dot = text.indexOf('. ');
        if (dot >= 0) text = text.slice(0, dot + 1);
        if (text.length > DEF_CAP) text = text.slice(0, DEF_CAP);
    }
    // 다음 정의 항목이 붙은 경우 절단 — 종결어미가 연결어미('말하며')면
    // 다음 항목까지 캡처되므로 '아. 고형제란'·'7. "원료"란' 마커에서 끊는다.
    const nextItem = text.search(/\s[가-하]\s*[.、)]\s*\S+란\s|\s\d+\s*[.、]\s*["“‘]/);
    if (nextItem > 0) text = text.slice(0, nextItem);
    // 개정이력 꼬리·표 구분자 제거
    return text.replace(/\s*<개정[^>]*>\s*$/, '').replace(/\s*[|｜].*$/, '').trim();
}

function* walkMd(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walkMd(p);
        else if (e.name.endsWith('.md')) yield p;
    }
}

/** src/keyword-index.js의 _EXAM_GLOSSARY_INDEX JSON 리터럴 파싱 (시험별 대조용) */
function loadExamGlossaryKeywords() {
    const file = path.join(ROOT, 'src', 'keyword-index.js');
    if (!fs.existsSync(file)) return {};
    const src = fs.readFileSync(file, 'utf-8');
    const m = src.match(/_EXAM_GLOSSARY_INDEX\s*=\s*(\{[\s\S]*?\});/);
    if (!m) return {};
    try {
        const idx = JSON.parse(m[1]);
        const out = {};
        for (const [examId, entries] of Object.entries(idx)) {
            out[examId] = new Set(
                Object.values(entries).map(e => String(e.keyword || '').trim().toLowerCase()));
        }
        return out;
    } catch (_) { return {}; }
}

function extractFromFile(filePath, relDoc) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    const found = [];
    lines.forEach((line, i) => {
        const lineNo = i + 1;
        // [정의-따옴표] — 정의문은 문장 종결까지 완전 캡처 (--apply가 그대로 병합)
        for (const m of line.matchAll(RE_DEF_QUOTED)) {
            const term = m[1].trim();
            if (isNoisyTerm(term)) continue;
            found.push({ term, pattern: '정의', definition: fullDef(lines, i, line.slice(m.index + m[0].length)), refDoc: relDoc, line: lineNo });
        }
        // [정의-기호] — 줄 시작 기호 뒤 bare 용어만 (일반 문장의 '~란' 오검출 차단)
        const dm = line.match(RE_DEF_MARKER);
        if (dm && !isNoisyTerm(dm[1].trim())) {
            found.push({ term: dm[1].trim(), pattern: '정의', definition: fullDef(lines, i, line.slice(dm[0].length)), refDoc: relDoc, line: lineNo });
        }
        // [약칭] — '(이하 "X"라 한다)'면 괄호 앞 명사구를 원명(fullForm)으로 캡처.
        // 약칭==원명 꼬리면 법령 동일어 고정(sameTerm)이라 synonyms 가치 없음.
        for (const m of line.matchAll(RE_ALIAS)) {
            const term = m[1].trim();
            if (isNoisyTerm(term)) continue;
            let fullForm = '';
            const paren = Math.max(line.lastIndexOf('(', m.index), line.lastIndexOf('（', m.index));
            if (paren >= 0 && /^\s*이하/.test(line.slice(paren + 1))) {
                // ref_md는 어절 중간에서 줄이 끊기므로 이전 라인 꼬리를 붙여 캡처한다.
                // 캡처 시작 직전 문자가 단어 문자면 첫 어절이 잘린 것 — 폐기하고,
                // '제N조…에 따른'·'매년마다' 류 조문참조 선두 토큰을 제거해 원명만 남긴다.
                const prevTail = i > 0 ? lines[i - 1].trimEnd() : '';
                // 직전 라인이 어절 중간에서 끊겼으면('…판매'+'업자') 공백 없이 연결
                const glued = prevTail && /[가-힣A-Za-zㆍ·0-9]$/.test(prevTail)
                    && /^[가-힣A-Za-zㆍ·]/.test(line);
                const before = prevTail ? prevTail + (glued ? '' : ' ') + line.slice(0, paren)
                    : line.slice(0, paren);
                const win = before.slice(-80);
                const pm = win.match(/([가-힣A-Za-zㆍ·][가-힣A-Za-zㆍ·\s]*)$/);
                if (pm) {
                    const absStart = before.length - win.length + pm.index;
                    let ff = pm[1].trim();
                    if (absStart > 0 && /[가-힣A-Za-zㆍ·]/.test(before[absStart - 1])) {
                        ff = ff.replace(/^\S+\s*/, '');
                    }
                    // 선두 '이란'·조문참조 토큰·접속사를 반복 제거 ('항 각 호에 따른' 류)
                    ff = ff.replace(/^이란\s+/, '');
                    let prev;
                    do {
                        prev = ff;
                        ff = ff.replace(
                            /^(?:\S*[조항호목관절]\s*에\s*따른?|[가-힣]*법\s*제?\d+(?:의\d+)?[조항호목]?|각\s*호|매?년\s*마다|및|또는|와|과)\s*/,
                            '').trim();
                    } while (ff !== prev && ff);
                    fullForm = ff;
                }
            }
            const sameTerm = !fullForm || fullForm.includes(term) || term.includes(fullForm);
            found.push({ term, pattern: '약칭', fullForm, sameTerm, definition: clipDef(line.slice(m.index)), refDoc: relDoc, line: lineNo });
        }
        // [영문 병기]
        for (const m of line.matchAll(RE_ENG)) {
            const term = m[1].trim();
            const eng = m[2].trim();
            if (isNoisyTerm(term) || isFormulaLike(eng)) continue;
            found.push({ term, pattern: '영문', english: eng, definition: `${term}(${eng})`, refDoc: relDoc, line: lineNo });
        }
    });
    return found;
}

/**
 * 추출 후보를 {glossaryDir}/subject{N}.json에 병합한다 (--apply).
 * 큐레이션 스키마 {keyword, definition}에 추출 출처 표식(autoExtracted)만 추가.
 * - 대상: status==='NEW' && pattern ∈ patterns (기본 '정의'만 — 약칭·영문은 synonyms 후보)
 * - 건너뜀: 이미 JSON에 있는 키워드, 과목 디렉터리('과목N') 불명, 정의문 없음
 * @param {Array<object>} candidates
 * @param {string} glossaryDir - {contentRoot}/교재/glossary
 * @param {{patterns?: string[]}} [opts]
 * @returns {{added:number, skipped:number, files:string[]}}
 */
export function applyGlossaryCandidates(candidates, glossaryDir, { patterns = ['정의'] } = {}) {
    const byFile = new Map();
    const touched = new Set();
    let added = 0, skipped = 0;
    for (const c of candidates) {
        const sm = String(c.subjectDir || '').match(/^과목(\d+)$/);
        if (c.status !== 'NEW' || !patterns.includes(c.pattern) || !sm || !c.definition) {
            skipped++;
            continue;
        }
        const file = path.join(glossaryDir, `subject${sm[1]}.json`);
        if (!byFile.has(file)) {
            byFile.set(file, fs.existsSync(file)
                ? JSON.parse(fs.readFileSync(file, 'utf-8'))
                : []);
        }
        const items = byFile.get(file);
        const kw = c.term.trim();
        if (items.some(it => String(it.keyword || '').trim() === kw)) { skipped++; continue; }
        items.push({ keyword: kw, definition: c.definition, autoExtracted: true });
        touched.add(file);
        added++;
    }
    if (touched.size) fs.mkdirSync(glossaryDir, { recursive: true });
    for (const file of touched) {
        fs.writeFileSync(file, JSON.stringify(byFile.get(file), null, 2) + '\n', 'utf-8');
    }
    return { added, skipped, files: [...touched].map(f => path.basename(f)) };
}

/**
 * synonyms 병합용 원명 품질 게이트 — 순수 명사구만 허용.
 * 토큰별로 조사('을'·'는'…)·서술/수식 어미('하는'·'된'·'따른') 종결을 배제한다.
 * 예외: '또는'·'및' 등 병렬 접속은 합성 명칭에 유효('신고필증 또는 …통지서')라 허용,
 * '의'는 생략조사로 명칭에 흔해('교육의 실시기관') 허용.
 */
function isNounPhrase(s) {
    const t = String(s || '').trim();
    if (t.length < 2 || t.length > 40) return false;
    const toks = t.split(/\s+/).filter(w => !/^(또는|및|내지|혹은)$/.test(w));
    const BAD_END = /(을|를|이|가|은|는|에|에서|로|으로|도|만|란|라|한|된|함|춘|위한|따른|따라|하거나|하여|하고|하며|하는|되는|있는|없는|이다|있다|된다|한다)$/;
    return toks.length > 0 && toks.every(w => /^[가-힣A-Za-zㆍ·0-9()]+$/.test(w) && !BAD_END.test(w));
}

/**
 * 후보를 manifest.json의 synonyms에 병합한다 (--apply-synonyms).
 * - 영문 NEW: {용어: [영문]} — 영문·약어 검색어가 한글 용어 본문에 도달 (TS-14 역방향)
 * - 약칭 NEW && !sameTerm: {원명: [약칭]} — '세안용 비누'→'화장비누' 류 실질 약칭만
 *   (동일어 고정 '책임판매관리자(이하 "책임판매관리자")'는 쌍 가치 없어 제외)
 * - 영문 필터: 순수 소문자 단조어(≥4자)는 화학명 파편일 가능성이 높아 제외
 *   (예: '징크설페이트 = anhydrous' — 'zinc sulfate anhydrous' 절단 오검출)
 * @param {Array<object>} candidates
 * @param {string} manifestPath - {contentRoot}/manifest.json
 * @returns {{added:number, skipped:number}}
 */
export function applySynonymCandidates(candidates, manifestPath) {
    const mf = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (!mf.synonyms || typeof mf.synonyms !== 'object') mf.synonyms = {};
    let added = 0, skipped = 0;
    const merge = (key, alt) => {
        const k = String(key || '').trim();
        const a = String(alt || '').trim();
        if (!k || !a || k.toLowerCase() === a.toLowerCase()) { skipped++; return; }
        const arr = mf.synonyms[k] || (mf.synonyms[k] = []);
        if (arr.some(v => String(v).toLowerCase() === a.toLowerCase())) { skipped++; return; }
        arr.push(a);
        added++;
    };
    for (const c of candidates) {
        if (c.status !== 'NEW') { skipped++; continue; }
        if (c.pattern === '영문' && c.english && !/^[a-z]{4,}$/.test(c.english)
            // 수화물·상태 접미사 단독은 화학명 절단 파편 ('징크설페이트=Monohydrate')
            && !/^(anhydrous|monohydrate|dihydrate|trihydrate|hydrate|powder|extracts?|distillates?|solution|standard|TS)$/i.test(c.english)) {
            merge(c.term, c.english);
        } else if (c.pattern === '약칭' && c.fullForm && !c.sameTerm && isNounPhrase(c.fullForm)) {
            merge(c.fullForm, c.term);
        } else skipped++;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(mf, null, 2) + '\n', 'utf-8');
    return { added, skipped };
}

function main() {
    const args = process.argv.slice(2);
    const jsonIdx = args.indexOf('--json');
    const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
    const doApply = args.includes('--apply');
    const doApplySyn = args.includes('--apply-synonyms');
    const patIdx = args.indexOf('--patterns');
    const applyPatterns = patIdx >= 0
        ? args[patIdx + 1].split(',').map(s => s.trim()).filter(Boolean)
        : ['정의'];

    const glossByExam = loadExamGlossaryKeywords();
    const targets = getExamTargets(ROOT);
    const allReport = [];

    for (const target of targets) {
        const refRoot = path.join(ROOT, target.contentRoot, '참조자료', 'ref_md');
        const existing = glossByExam[target.id] || new Set();
        const byTerm = new Map(); // term → candidate (첫 출현 유지, hits 누적)
        let fileCount = 0;
        let tbFileCount = 0;
        for (const md of walkMd(refRoot)) {
            fileCount++;
            const rel = path.relative(ROOT, md).replace(/\\/g, '/');
            const relDoc = path.relative(path.join(ROOT, target.contentRoot, '참조자료', 'ref_md'), md).replace(/\\/g, '/');
            const subjectDir = relDoc.split('/')[0] || '';
            for (const c of extractFromFile(md, relDoc)) {
                c.subjectDir = subjectDir;
                c.file = rel;
                const key = c.term.toLowerCase();
                const prev = byTerm.get(key);
                if (prev) { prev.hits++; continue; }
                byTerm.set(key, { ...c, hits: 1, status: existing.has(key) ? 'EXISTS' : 'NEW' });
            }
        }

        // --- 교재 표준형 스캔 — ref_md에 정의 조항이 희박한 과목(3/4)의 커버리지 보완.
        // 과목 귀속은 manifest.subjects[].order (key가 교재 디렉터리명).
        const manifestPath = path.join(ROOT, target.contentRoot, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            for (const s of manifest.subjects || []) {
                const dirKey = s && s.key;
                const subjDir = s && s.order ? '과목' + s.order : '';
                if (!dirKey || !subjDir) continue;
                for (const md of walkMd(path.join(ROOT, target.contentRoot, '교재', dirKey))) {
                    if (!md.endsWith('_표준형.md')) continue;
                    tbFileCount++;
                    const rel = path.relative(ROOT, md).replace(/\\/g, '/');
                    const relDoc = '교재/' + path.relative(
                        path.join(ROOT, target.contentRoot, '교재'), md).replace(/\\/g, '/');
                    for (const c of extractFromFile(md, relDoc)) {
                        c.subjectDir = subjDir;
                        c.src = '교재';
                        c.file = rel;
                        const key = c.term.toLowerCase();
                        const prev = byTerm.get(key);
                        if (prev) { prev.hits++; continue; }
                        byTerm.set(key, { ...c, hits: 1, status: existing.has(key) ? 'EXISTS' : 'NEW' });
                    }
                }
            }
        }
        const cands = [...byTerm.values()];
        allReport.push({ examId: target.id, fileCount, tbFileCount, candidates: cands });

        // --- 리포트 출력 ---
        const news = cands.filter(c => c.status === 'NEW');
        const olds = cands.filter(c => c.status === 'EXISTS');
        console.log(`\n# 용어 후보 추출 — ${target.id} (ref_md ${fileCount}개 + 교재 표준형 ${tbFileCount}개 파일)`);
        console.log(`후보 ${cands.length}건 — 신규 ${news.length} · 기존 용어집 ${olds.length}`);
        for (const c of cands.sort((a, b) =>
            a.subjectDir.localeCompare(b.subjectDir)
            || a.pattern.localeCompare(b.pattern)
            || a.term.localeCompare(b.term, 'ko'))) {
            const tag = c.status === 'NEW' ? '신규' : '기존';
            const eng = c.english ? ` = ${c.english}` : '';
            const ff = c.fullForm ? ` ← ${c.fullForm}` : '';
            const srcTag = c.src === '교재' ? ' · 교재' : '';
            console.log(`- [${tag}/${c.pattern}] ${c.term}${eng}${ff} (${c.subjectDir} · ${c.refDoc}:L${c.line}${c.hits > 1 ? ` · ${c.hits}회` : ''}${srcTag})`);
            if (c.definition && c.pattern !== '영문') console.log(`    ${clipDef(c.definition)}`);
        }

        // --- --apply: 신규 후보를 교재/glossary/subjectN.json에 병합 ---
        if (doApply) {
            const glossaryDir = path.join(ROOT, target.contentRoot, '교재', 'glossary');
            const res = applyGlossaryCandidates(cands, glossaryDir, { patterns: applyPatterns });
            console.log(`\n[apply ${target.id}] 패턴 ${applyPatterns.join(',')} 신규분 → glossary 병합: `
                + `${res.added}건 추가 · ${res.skipped}건 건너뜀`
                + (res.files.length ? ` · 갱신 파일: ${res.files.join(', ')}` : ''));
            console.log('  → npm run build:keyword-index (또는 build:data)로 keyword-index.js 재생성 필요');
        }

        // --- --apply-synonyms: 약칭·영문 후보를 manifest.synonyms에 병합 ---
        if (doApplySyn) {
            const mf = path.join(ROOT, target.contentRoot, 'manifest.json');
            if (!fs.existsSync(mf)) {
                console.log(`\n[apply-syn ${target.id}] manifest.json 없음 — 건너뜀`);
            } else {
                const res = applySynonymCandidates(cands, mf);
                console.log(`\n[apply-syn ${target.id}] 약칭(실질)+영문 → manifest.synonyms 병합: `
                    + `${res.added}건 추가 · ${res.skipped}건 건너뜀`);
                console.log('  → npm run build:data로 registry.js 재생성 필요');
            }
        }
    }

    if (jsonOut) {
        const outPath = path.resolve(ROOT, jsonOut);
        fs.writeFileSync(outPath, JSON.stringify(allReport, null, 2), 'utf-8');
        console.log(`\nJSON 리포트 저장: ${outPath}`);
    }
}

// 모듈 import(테스트) 시에는 실행하지 않는다 — 스크립트 직접 실행 시에만 main
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
