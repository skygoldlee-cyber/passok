// src/textbook-core.js — 교재 MD 파싱 공통 코어 (순수 ESM, fs/환경 무의존)
// @spec TR-01,BP-01,CS-01
// 런타임(src/textbook-parser.js)과 빌드(tools/build/plugins/textbook.plugin.js)가
// 이 모듈 하나를 공유한다 — 카드/퀴즈/챕터/ID가 양쪽에서 바이트 단위로 동일해야
// 진행상황 ID가 보존된다. 파싱 규칙 변경은 이 파일에서만 한다.
import { stableId } from '../core/sha256.js';
import { escapeRegExp } from '../core/utils.js';

const cleanText = (/** @type {string} */ text) => {
    if (!text) return '';
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/`\s*(?:🔖(?:기출|빈출)|📌중요|🎯\s*(?:기출|빈출)|🎯\s*중요|★\s*필수|기출|중요)\s*`/g, '')
        .replace(/🔖(?:기출|빈출)/g, '')
        .replace(/📌중요/g, '')
        .replace(/🎯\s*(?:기출|빈출)/g, '')
        .replace(/🎯\s*중요/g, '')
        .replace(/★\s*필수/g, '')
        .replace(/`{2,}/g, '')
        .trim();
};

const GENERIC_SINGLE = new Set([
    '정의','목적','종류','특징','기준','방법','관리','주의사항',
    '내용','구분','적용','원칙','개요','필요성','의의','효과',
    '요건','조건','절차','구조','역할','기능','분류','현황',
    '배경','개념','원리','방향','평가','기본','일반','사항',
    '의무','권리','책임','금지','제한','예외','범위','대상',
    '시기','기간','횟수','위치','크기','형태','상태','수준',
    '단계','순서','과정','결과','영향','문제','대책','방안',
    '조치','처분','제도','정책','사례','전망','비교','차이',
    '장점','단점','이유','원인','증상','치료','예방','안전관리',
    '관능평가',
]);

/** @param {string} term */
function isGenericTerm(term) {
    // 단일 범용어 정확 일치만 탈락 — 접미사 규칙은 '보호 기능'(피부 기능),
    // '개봉 후 사용기간', '자격시험 합격 기준' 등 구체 용어까지 오탐해 폐기.
    // 카드 앞면에 카테고리 배지가 맥락을 제공하므로 복합 용어는 유지한다.
    return GENERIC_SINGLE.has(term);
}

// ── 카드 타입 분류 (8가지 후보 유형) ──
/** @param {string} term @param {string} definition @param {*} _category */
function classifyCardType(term, definition, _category) {
    const text = `${term} ${definition}`;
    // 벌칙·행정처분 (최우선)
    if (/벌금|징역|과태료|벌칙|행정처분|등록취소|영업정지|폐지|처벌/.test(text)) return 'penalty';
    // 금지사항
    if (/금지|안\s*된다|수\s*없|불가|하지\s*아니|금지함/.test(text)) return 'prohibition';
    // 예외
    if (/예외|단,\s|제외|아니하|예외적으로/.test(text)) return 'exception';
    // 숫자·기간
    if (/\d+\s*(일|년|개월|회|명|%|이상|이하|미만|초과|분의|시간|도|배|g|mL|kg|mg)/.test(definition)) return 'number';
    // 요건·조건
    if (/요건|조건|기준|필요|자격|구비|갖추어야/.test(text)) return 'requirement';
    // 구분/비교
    if (/vs|≠|＝|구분|비교|차이|차이점|다르|해당한다|해당하지/.test(text)) return 'comparison';
    // 절차·순서
    if (/절차|순서|단계|과정|신청|신고|등록|승인|보고|통보/.test(text)) return 'procedure';
    // 정의 (기본)
    return 'definition';
}

// ── 카드 중요도 점수 (0-100) ──
/** @param {string} term @param {string} definition @param {*} isKey @param {string} category @param {string} cardType */
function scoreCard(term, definition, isKey, category, cardType) {
    // 시험중요도 (0-100)
    let examImportance = 50;
    if (isKey) examImportance += 30;
    if (['penalty', 'prohibition', 'exception'].includes(cardType)) examImportance += 20;
    else if (['number', 'requirement', 'comparison'].includes(cardType)) examImportance += 10;
    examImportance = Math.min(100, examImportance);

    // 암기필요도 (0-100)
    let memorizeNeed = 50;
    if (/\d+\s*(일|년|개월|회|명|%|이상|이하|미만|초과|분의)/.test(definition)) memorizeNeed += 30;
    if (['number', 'comparison'].includes(cardType)) memorizeNeed += 20;
    if (term.length >= 3 && term.length <= 15) memorizeNeed += 10;
    memorizeNeed = Math.min(100, memorizeNeed);

    // 숫자/조건성 (0-100)
    let numericScore = 0;
    if (/\d+\s*(일|년|개월|회|명|%|이상|이하|미만|초과|분의|시간|도|배)/.test(definition)) numericScore = 100;
    else if (/요건|조건|기준|필요|자격/.test(definition)) numericScore = 70;
    else if (['requirement', 'procedure'].includes(cardType)) numericScore = 50;

    // 기출관련성 (0-100)
    const examRel = isKey ? 100 : (category && /기출|빈출/.test(category) ? 30 : 0);

    // 카드적합성 (0-100)
    let cardFit = 70;
    if (term.length >= 3 && term.length <= 15) cardFit += 20;
    if (term.length > 30) cardFit -= 20;
    if (definition.length > 200) cardFit -= 20;
    if (definition.length < 15) cardFit -= 10;
    if (/^[•·]/.test(definition)) cardFit -= 10;
    cardFit = Math.max(0, Math.min(100, cardFit));

    // 반복학습가치 (0-100)
    let repeatValue = 60;
    if (['definition', 'comparison'].includes(cardType)) repeatValue += 20;
    if (/\*\*[^*]+\*\*/.test(definition)) repeatValue += 10;
    if (/^[•·]/.test(definition)) repeatValue -= 10;
    repeatValue = Math.max(0, Math.min(100, repeatValue));

    // 가중 합산 (정수 연산으로 부동소수점 오차 방지)
    const score = Math.round(
        (examImportance * 30 +
        memorizeNeed * 25 +
        numericScore * 15 +
        examRel * 15 +
        cardFit * 10 +
        repeatValue * 5) / 100
    );
    return Math.max(0, Math.min(100, score));
}

// ── 난이도 분류 ──
/** @param {string} definition @param {string} cardType */
function determineDifficulty(definition, cardType) {
    if (definition.length > 150 || /^[•·]/.test(definition)) return 'hard';
    if (definition.length <= 50 && cardType === 'definition') return 'easy';
    if (/\d+/.test(definition) || definition.length > 80) return 'medium';
    return 'easy';
}

// ── 퀴즈 품질 검사 ──
/** @param {string} type @param {string} question @param {string} answer */
function isValidQuiz(type, question, answer) {
    // 정답이 너무 김 (타이핑 불가)
    if (answer.length > 25) return false;
    // 정답이 •/·로 시작
    if (/^[•·]/.test(answer)) return false;
    // 정답에 '참고 -' 포함 (섹션 참조, 용어 아님)
    if (/참고\s*-/.test(answer)) return false;
    // 질문 정제: 앞쪽 •/· 제거
    const cleanQ = question.replace(/^[•·]\s*/, '').trim();
    // 질문이 너무 짧음 (맥락 부족) — term형은 카드 단계의 desc>10과 동일 하한
    if (cleanQ.length < (type === 'term' ? 11 : 15)) return false;
    // 질문에 [ 빈칸 ] 만 있는 경우 (빈 질문)
    if (/^\[\s*빈칸\s*\]\.?$/i.test(cleanQ)) return false;
    return true;
}

/** @param {string} filename */
function basenameNoMd(filename) {
    // path.basename(filename, '.md') 동등: 경로 구분자 제거 후 .md 확장자 제거
    const base = String(filename).split(/[\\/]/).pop() || '';
    return base.endsWith('.md') ? base.slice(0, -3) : base;
}

const BOLD_MATCH_RE = /\*\*([^*]+)\*\*/g;
const KEY_MARK_RE = /📌중요|🎯\s*중요|★\s*필수/;
// 주의: 끝에 \b 를 쓰면 안 된다 — JS \w 에 한글/%·℃ 가 없어 단위 뒤 공백·괄호에서
// 경계가 성립하지 않아 모든 한글 단위 숫자가 미매칭되던 사장 코드였음.
// 대신 단위 직후 한글/영숫자 붙음만 제외하는 후방 금지로 대체한다.
const NUM_UNIT_MATCH_RE = /\b\d+(?:\.\d+)?\s*(?:%|세 이하|세 이상|개월|일|년|배|종|가지|개|시간|g|ml|kg|℃|도|분|초|주|ppm|㎛|회\/hr|개\/hr|개\/㎥)(?![가-힣0-9A-Za-z])/g;

/**
 * @typedef {object} ParseEnv
 * @property {string} subjectId
 * @property {string} chapterKey
 * @property {*[]} cards
 * @property {*[]} quizzes
 * @property {Array<{line:number,text:string}>} warnings
 * @property {(term:string, answer:string)=>string} makeQuizId
 * @property {string} section
 */

/**
 * 표 행 → 카드 후보 정제 — 스킵 규칙을 한 곳에 모은다. 부적합이면 null.
 * @param {string} rawTerm @param {string} rawDesc
 * @returns {{term:string, desc:string, cleanTerm:string, cleanDesc:string, has기출:boolean, isKey:boolean}|null}
 */
function _cleanTableTermDesc(rawTerm, rawDesc) {
    const term = cleanText(rawTerm);
    const desc = cleanText(rawDesc);
    if (!term || !desc) return null;

    // 비교표의 체크/대시 마커 등 의미 없는 definition 건너뛰기
    if (/^[—–\-✔✖×○●□■☆★]$/.test(desc)) return null;
    // 숫자만 있는 term (표 행 번호, 수치값) 건너뛰기
    if (/^\d+$/.test(term)) return null;

    // ①②③ 등 원번호 기호 및 (L숫자) 줄번호 참조 제거, 한국어 카테고리 꼴표 괄호 제거
    const cleanTerm = term.replace(/\*\*/g, '').replace(/\s*\(L\d+\)\s*/g, '').replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '').replace(/\s*\(([^a-zA-Z()]*?)\)/g, '').trim();
    if (!cleanTerm) return null;
    // 1~2자 키워드는 의미 부족으로 건너뛰기
    if (cleanTerm.length <= 2) return null;
    // 50자 초과 키워드는 키워드로 부적합 (긴 문장/설명이 term에 들어간 경우)
    if (cleanTerm.length > 50) return null;
    // 범용 표현(예: "기능", "시험 기준", "보관 조건")은 키워드로 부적합
    if (isGenericTerm(cleanTerm)) return null;

    const has기출 = /🔖(?:기출|빈출)|🎯\s*(?:기출|빈출)/.test(rawTerm) || /🔖(?:기출|빈출)|🎯\s*(?:기출|빈출)/.test(rawDesc);
    const isKey = has기출 || KEY_MARK_RE.test(rawTerm) || KEY_MARK_RE.test(rawDesc);
    // definition에서도 (L숫자) 줄번호 참조 제거
    const cleanDesc = desc.replace(/\s*\(L\d+\)\s*/g, ' ').trim();

    // term과 definition이 동일하면 의미 없는 카드이므로 건너뛰기
    if (cleanTerm === cleanDesc) return null;
    // definition이 '별표' 참조만 있거나 마크다운 링크만 있는 경우 건너뛰기
    if (/^별표\s*\d/.test(cleanDesc)) return null;
    if (/←.*별표.*참조$/.test(cleanDesc)) return null;
    if (/^\[.+\]\(.+\)$/.test(cleanDesc)) return null;
    // definition이 10자 이하면 설명으로서 의미 부족 (수치/단답형)
    if (cleanDesc.length <= 10) return null;

    return { term, desc, cleanTerm, cleanDesc, has기출, isKey };
}

/**
 * 볼드(**)/단위수치 매치 → 빈칸 퀴즈 방출 (볼드 우선, 없으면 수치 fallback).
 * @param {{boldSrc:string, numSrc:string|null, questionBase:string, context:string, idTerm:string, boldFilter?:(a:string)=>boolean}} spec
 * @param {ParseEnv} env
 * @returns {{emitted:number, candidates:number}} candidates = 후보 매치 수 (0이면 term형 fallback 대상)
 */
function _emitBlankQuizzes(spec, env) {
    const boldMatches = [...spec.boldSrc.matchAll(BOLD_MATCH_RE)];
    const numMatches = spec.numSrc != null ? [...spec.numSrc.matchAll(NUM_UNIT_MATCH_RE)] : [];
    let emitted = 0;
    const pushQuiz = (/** @type {string} */ answer, /** @type {boolean} */ stripBold) => {
        const ans = answer.trim();
        if (stripBold && spec.boldFilter && !spec.boldFilter(ans)) return;
        const pattern = stripBold
            ? `\\*\\*${escapeRegExp(ans)}\\*\\*|${escapeRegExp(ans)}`
            : escapeRegExp(ans);
        const quizText = spec.questionBase.replace(new RegExp(pattern, 'g'), ' [ 빈칸 ] ');
        if (!isValidQuiz('blank', quizText, ans)) return;
        env.quizzes.push({
            id: env.makeQuizId(spec.idTerm, ans),
            category: env.section,
            context: spec.context,
            question: quizText,
            answer: ans,
            type: 'blank'
        });
        emitted++;
    };
    if (boldMatches.length > 0) {
        boldMatches.forEach(m => pushQuiz(m[1] || '', true));
    } else {
        numMatches.forEach(m => pushQuiz(m[0], false));
    }
    return { emitted, candidates: boldMatches.length + numMatches.length };
}

/** 용어→정의 term형 퀴즈 방출 @returns {number} 방출 수 (0 또는 1) @param {ParseEnv} env */
function _emitTermQuiz(/** @type {string} */ cleanTerm, /** @type {string} */ cleanDesc, /** @type {ParseEnv} */ env) {
    if (!isValidQuiz('term', cleanDesc, cleanTerm)) return 0;
    env.quizzes.push({
        id: env.makeQuizId(cleanTerm, cleanTerm),
        category: env.section,
        context: `정의에 알맞은 용어를 적으시오.`,
        question: `${cleanDesc}`,
        answer: cleanTerm,
        type: 'term'
    });
    return 1;
}

/** isKey 표 행 → 빈칸/term형 퀴즈 + 기출 미방출 경고 @param {ParseEnv} env */
function _emitKeyRowQuizzes(/** @type {*} */ cleaned, /** @type {string} */ rawDesc, /** @type {{cells?: string[], line?: number}} */ row, /** @type {ParseEnv} */ env) {
    const { desc, cleanTerm, cleanDesc, has기출 } = cleaned;
    const r = _emitBlankQuizzes({
        boldSrc: rawDesc, numSrc: rawDesc,
        questionBase: cleanDesc,
        context: `[용어: ${cleanTerm}]`,
        idTerm: cleanTerm,
        boldFilter: a => a.length > 1
    }, env);
    let emitted = r.emitted;
    if (r.candidates === 0) emitted += _emitTermQuiz(cleanTerm, cleanDesc, env);
    // 🔖기출/빈출 표시가 있는데 이 행에서 퀴즈가 하나도 안 나오면 경고 수집
    if (has기출 && emitted === 0) {
        env.warnings.push({ line: row.line || 0, text: cleanTerm || desc.substring(0, 40) });
    }
}

/** 표 단일 행 → 카드 + (중요 행이면) 퀴즈·경고 @param {ParseEnv} env */
function _processTableRow(/** @type {{cells?: string[], line?: number}} */ row, /** @type {number} */ termIdx, /** @type {number} */ descIdx, /** @type {ParseEnv} */ env) {
    const cells = row.cells || [];
    if (cells.length < 2) return;
    const rawTerm = cells[termIdx] || '';
    const rawDesc = cells[descIdx] || '';
    const cleaned = _cleanTableTermDesc(rawTerm, rawDesc);
    if (!cleaned) return;
    const { cleanTerm, cleanDesc, isKey } = cleaned;

    // 카드 메타데이터 계산
    const cardType = classifyCardType(cleanTerm, cleanDesc, env.section);
    const importance = scoreCard(cleanTerm, cleanDesc, isKey, env.section, cardType);
    const difficulty = determineDifficulty(cleanDesc, cardType);
    // 중요도 40점 미만은 저품질 카드이므로 제거
    if (importance < 40) return;

    env.cards.push({
        id: stableId(env.subjectId, env.chapterKey, 'card', cleanTerm),
        category: env.section,
        term: cleanTerm,
        definition: cleanDesc,
        isKey: isKey,
        cardType: cardType,
        importance: importance,
        difficulty: difficulty
    });

    if (isKey) {
        _emitKeyRowQuizzes(cleaned, rawDesc, row, env);
    } else if (importance >= 50) {
        _emitTermQuiz(cleanTerm, cleanDesc, env);
    }
}

/** @param {string[]} headers @param {{cells?: string[], line?: number}[]} rows @param {ParseEnv} env */
function _processTableRows(headers, rows, env) {
    if (rows.length === 0) return;
    const termIdx = 0;
    const descIdx = headers.length > 1 ? 1 : 0;
    rows.forEach(row => _processTableRow(row, termIdx, descIdx, env));
}

/** `- **용어** 🔖기출: 설명` 형태 리스트 항목 → 카드 + 볼드 빈칸 퀴즈 @returns {number} 방출 퀴즈 수 @param {ParseEnv} env */
function _processMarkedListItem(/** @type {RegExpMatchArray} */ listMatch, /** @type {ParseEnv} */ env) {
    const term = cleanText(listMatch[1] || '').replace(/\s*\(L\d+\)\s*/g, '').replace(/\s*\(([^a-zA-Z()]*?)\)/g, '').trim();
    if (!(term.length > 2 && term.length <= 50 && !isGenericTerm(term))) return 0;
    const desc = (listMatch[2] || '').trim();
    const cleanDesc = cleanText(desc).replace(/\s*\(L\d+\)\s*/g, ' ').trim();
    if (term === cleanDesc || cleanDesc.length <= 10) return 0;
    const liCardType = classifyCardType(term, cleanDesc, env.section);
    const liImportance = scoreCard(term, cleanDesc, true, env.section, liCardType);
    // 중요도 40점 미만은 저품질 카드이므로 제거
    if (liImportance < 40) return 0;
    const liDifficulty = determineDifficulty(cleanDesc, liCardType);
    env.cards.push({
        id: stableId(env.subjectId, env.chapterKey, 'card', term),
        category: env.section,
        term: term,
        definition: cleanDesc,
        isKey: true,
        cardType: liCardType,
        importance: liImportance,
        difficulty: liDifficulty
    });
    return _emitBlankQuizzes({
        boldSrc: desc, numSrc: null,
        questionBase: cleanDesc,
        context: `[주제: ${term}]`,
        idTerm: term
    }, env).emitted;
}

/** 마커(🔖기출/📌중요/🎯) 포함 비표 라인 → 리스트 카드 또는 지문 빈칸 퀴즈 @param {ParseEnv} env */
function _processMarkerLine(/** @type {string} */ line, /** @type {number} */ lineNum, /** @type {ParseEnv} */ env) {
    // 헤더(###)·볼드 라벨·내용 없는 번호/불릿 항목은 퀴즈 생성 대상이 아니므로
    // 마커 경고에서 제외 (예: "### 1. 항목 🎯 기출", "> **참고 - X 🎯 기출**", "④ 항목명")
    const markerStripped = line.replace(/🔖(?:기출|빈출)|🎯\s*(?:기출|빈출)|📌중요|🎯\s*중요|`/g, '').trim();
    const isLabelLine = /^#{1,6}\s/.test(markerStripped)
        || /^>?\s*\*\*[^*]+\*\*\s*[:：]?\s*$/.test(markerStripped)
        || (/^>?\s*(?:[-*]\s+|[①-⑳]\s*)/.test(markerStripped) && !/[0-9:：,，•·*]/.test(markerStripped));
    if (isLabelLine || !/🔖(?:기출|빈출)|📌중요|🎯\s*(?:기출|빈출)|🎯\s*중요/.test(line)) return;

    const has기출Line = /🔖(?:기출|빈출)|🎯\s*(?:기출|빈출)/.test(line);
    const cleanedLine = cleanText(line);
    const listMatch = line.match(/^[-*]\s+\*\*([^*]+)\*\*(?:\s*(?:🔖(?:기출|빈출)|🎯\s*(?:기출|빈출)|📌중요|🎯\s*중요))?\s*[:：-]\s*(.+)$/);
    const quizzesForLine = listMatch
        ? _processMarkedListItem(listMatch, env)
        : _emitBlankQuizzes({
            boldSrc: line, numSrc: cleanedLine,
            questionBase: cleanedLine,
            context: `[빈출 지문 빈칸 채우기]`,
            idTerm: cleanedLine.substring(0, 15),
            boldFilter: a => a.length > 1 && !a.includes('기출') && !a.includes('중요')
        }, env).emitted;
    // 🔖기출/빈출 지문/리스트인데 퀴즈가 하나도 안 나오면 경고 수집 (조용한 손실 방지)
    if (has기출Line && quizzesForLine === 0) {
        env.warnings.push({ line: lineNum, text: cleanedLine.substring(0, 60) });
    }
}

/** `## ` 섹션 헤더 라인 → {section, skip}. 헤더가 아니면 null — 지도·별표·데이터구조 섹션은 카드/퀴즈 대상 제외 */
function _parseSectionHeader(/** @type {string} */ line) {
    if (!line.startsWith('## ')) return null;
    const section = line.substring(3).trim();
    const skip = section.startsWith('🧭')
        || section.startsWith('🗺️ 과목 지도')
        || section.startsWith('📋 별표')
        || section.startsWith('📊')
        || section.startsWith('🔢')
        || section.startsWith('🔗')
        || section.includes('데이터 구조');
    return { section, skip };
}

/**
 * MD 본문 → 카드/퀴즈/마커 경고.
 * @param {string} content - 마크다운 텍스트
 * @param {string} subjectId
 * @param {string} filename - '1.cosmetic-overview.md' 형태 (카테고리·ID 네임스페이스)
 * @param {string} chapterKey
 * @returns {{cards:*[], quizzes:*[], warnings:Array<{line:number,text:string}>}}
 *   warnings = 🔖(?:기출|빈출) 마커가 있으나 퀴즈 미생성된 항목 (조용한 손실 감시)
 */
export function parseMarkdownContent(content, subjectId, filename, chapterKey) {
    const lines = content.split(/\r?\n/);

    /** @type {*[]} */
    const cards = [];
    /** @type {*[]} */
    const quizzes = [];
    /** @type {Array<{line:number,text:string}>} */
    const warnings = [];

    // 퀴즈 ID 유일화: 한 용어에서 복수 퀴즈(복수 빈칸)가 나올 수 있으므로
    // term만으로는 ID가 충돌한다. 해시 입력에 answer를 결합해 빈칸별로 구분하고,
    // 그래도 겹치면 순번(#n)을 덧붙인다. answer는 정의 본문보다 안정적이므로
    // 진행상황 보존에도 유리하다.
    const quizIdCounts = new Map();
    const makeQuizId = (/** @type {string} */ term, /** @type {string} */ answer) => {
        const base = `${term}|${answer}`;
        const n = (quizIdCounts.get(base) || 0) + 1;
        quizIdCounts.set(base, n);
        const input = n === 1 ? base : `${base}#${n}`;
        return stableId(subjectId, chapterKey, 'quiz', input);
    };

    /** @type {ParseEnv} */
    const env = {
        subjectId, chapterKey,
        cards, quizzes, warnings,
        makeQuizId,
        section: basenameNoMd(filename)
    };

    let skipSection = false;
    let inTable = false;
    /** @type {string[]} */
    let tableHeaders = [];
    /** @type {{cells?: string[], line?: number}[]} */
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
        const line = (lines[i] || '').trim();

        const sec = _parseSectionHeader(line);
        if (sec) {
            env.section = sec.section;
            skipSection = sec.skip;
            continue;
        }

        if (skipSection) continue;

        // HTML 주석(story:slot 마커·생성 배너 등)은 렌더링 무관 — 표·문맥을 끊지 않고 건너뜀
        if (line.startsWith('<!--')) continue;

        if (line.startsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableHeaders = line.split('|').map(h => h.trim()).filter(h => h !== '');
                tableRows = [];
                if (i + 1 < lines.length && (lines[i + 1] || '').trim().includes('---')) {
                    i++;
                }
            } else {
                const rowCells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                if (rowCells.length > 0) {
                    tableRows.push({ cells: rowCells, line: i + 1 });
                }
            }
        } else {
            if (inTable) {
                _processTableRows(tableHeaders, tableRows, env);
                inTable = false;
            }
            _processMarkerLine(line, i + 1, env);
        }
    }

    if (inTable) {
        _processTableRows(tableHeaders, tableRows, env);
    }

    return { cards, quizzes, warnings };
}

/**
 * MD 본문 → 챕터/섹션 구조 (교재 리더용).
 * @param {string} content - 마크다운 텍스트
 * @param {string} filename
 * @param {string} subjectDir - filePath 접두 경로 (콘텐츠 루트 + 과목 dir)
 * @returns {{chapterTitle:string, fileName:string, filePath:string, sections:*[], chapterKey?:string}}
 */
export function parseTextbookContent(content, filename, subjectDir) {
    const lines = content.split(/\r?\n/);

    let chapterTitle = basenameNoMd(filename);
    let chapterTitleSet = false;
    const sections = [];

    let currentSectionTitle = '개요';
    let currentSectionLines = [];
    let currentSubsections = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
            if (!chapterTitleSet) {
                chapterTitle = trimmed.substring(2).trim();
                chapterTitleSet = true;
            }
            continue;
        }

        if (trimmed.startsWith('## ')) {
            if (currentSectionLines.length > 0 || currentSubsections.length > 0) {
                sections.push({
                    title: currentSectionTitle,
                    content: currentSectionLines.join('\n').trim(),
                    subsections: currentSubsections
                });
            }
            currentSectionTitle = trimmed.substring(3).trim();
            currentSectionLines = [];
            currentSubsections = [];
            continue;
        }

        if (trimmed.startsWith('### ')) {
            const subTitle = trimmed.substring(4).trim();
            const subLines = [];
            for (i++; i < lines.length; i++) {
                const subTrimmed = (lines[i] || '').trim();
                if (subTrimmed.startsWith('# ')) {
                    if (!chapterTitleSet) {
                        chapterTitle = subTrimmed.substring(2).trim();
                        chapterTitleSet = true;
                    }
                    break;
                }
                if (subTrimmed.startsWith('## ') || subTrimmed.startsWith('### ')) {
                    i--;
                    break;
                }
                subLines.push(lines[i]);
            }
            currentSubsections.push({
                title: subTitle,
                content: subLines.join('\n').trim()
            });
            continue;
        }

        currentSectionLines.push(line);
    }

    if (currentSectionLines.length > 0 || currentSubsections.length > 0) {
        sections.push({
            title: currentSectionTitle,
            content: currentSectionLines.join('\n').trim(),
            subsections: currentSubsections
        });
    }

    const htmlFilename = filename.replace('.md', '.html');
    const filePathUrl = `./${subjectDir}/${htmlFilename}`;

    return {
        chapterTitle,
        fileName: filename,
        filePath: filePathUrl,
        sections
    };
}

/**
 * 한 과목의 모든 챕터 MD를 파싱해 STUDY_DATA[key] 형태로 조립.
 * @param {import('../core/types.js').ManifestSubject} subjectMeta - manifest.json subjects[] 항목
 * @param {Record<string,string>} mdByFile - { '1.cosmetic-law.md': '<md text>', ... }
 * @param {object} opts
 * @param {string} opts.subjectDir - 챕터 filePath 접두 경로 (필수)
 * @param {'html'|'md'} [opts.filePathMode] - 원본 링크 확장자 (기본 'md')
 * @param {(file:string, stats:{cards:number, quizzes:number, warnings:Array<*>})=>void} [opts.onFile]
 *   파일 단위 통계/경고 수집 훅 (빌드 측 _fileStats·_warnings 수집용)
 * @returns {{name:string, cards:*[], quizzes:*[], chapters:*[]}}
 */
export function buildSubjectData(subjectMeta, mdByFile, opts) {
    const subjectDir = opts.subjectDir;
    const filePathMode = opts.filePathMode || 'md';
    const onFile = opts.onFile;
    const data = {
        name: `${subjectMeta.order}과목: ${subjectMeta.name}`,
        cards: /** @type {import('../core/types.js').Card[]} */ ([]),
        quizzes: /** @type {import('../core/types.js').Quiz[]} */ ([]),
        chapters: /** @type {any[]} */ ([])
    };

    const chapters = subjectMeta.chapters || [];
    chapters.forEach(chapter => {
        const file = chapter.file;
        const md = mdByFile[file];
        if (typeof md !== 'string') {
            throw new Error(`Markdown source missing for chapter file: ${file}`);
        }

        const { cards, quizzes, warnings } = parseMarkdownContent(md, subjectMeta.key, file, chapter.key);
        data.cards.push(...cards);
        data.quizzes.push(...quizzes);
        if (onFile) onFile(file, { cards: cards.length, quizzes: quizzes.length, warnings });

        const chapterData = parseTextbookContent(md, file, subjectDir);
        chapterData.chapterKey = chapter.key;
        if (filePathMode === 'md') {
            // 원본 HTML은 제거되었으므로 링크를 .md 원문으로 변경
            chapterData.filePath = `./${subjectDir}/${file}`;
        }
        data.chapters.push(chapterData);
    });

    // 중복 카드 제거 (같은 chapter 내 용어 사전 표와 본문 표 간 용어 중복 대응)
    /** @type {import('../core/types.js').Card[]} */
    const uniqueCards = [];
    const cardMap = new Set();
    data.cards.forEach(c => {
        if (!cardMap.has(c.id)) {
            cardMap.add(c.id);
            uniqueCards.push(c);
        }
    });
    data.cards = uniqueCards;

    // 중복 퀴즈 제거
    /** @type {import('../core/types.js').Quiz[]} */
    const uniqueQuizzes = [];
    const quizMap = new Set();
    data.quizzes.forEach(q => {
        const key = `${q.question}_${q.answer}`;
        if (!quizMap.has(key)) {
            quizMap.add(key);
            uniqueQuizzes.push(q);
        }
    });
    data.quizzes = uniqueQuizzes;

    // term형 모호성 제거 — 같은 질문에 정답이 둘 이상이면 타이핑 채점이 불가하므로
    // 제외한다 (사실 자체는 카드로 계속 노출되므로 정보 손실 없음)
    const termAnswers = new Map();
    uniqueQuizzes.forEach(q => {
        if (q.type !== 'term') return;
        if (!termAnswers.has(q.question)) termAnswers.set(q.question, new Set());
        termAnswers.get(q.question).add(q.answer);
    });
    const ambiguous = new Set();
    termAnswers.forEach((answers, question) => {
        if (answers.size > 1) ambiguous.add(question);
    });
    if (ambiguous.size > 0) {
        data.quizzes = uniqueQuizzes.filter(q => !(q.type === 'term' && ambiguous.has(q.question)));
    }

    return data;
}
