#!/usr/bin/env node
/**
 * fix_refmd_glyphs.js — ref_md PUA 글리프 정제
 *
 * pdf2md 변환 시 PDF 내장 전용폰트(MT Extra 수식 템플릿·Wingdings 불릿)의
 * 글리프가 사설영역(U+E000–F8FF, U+F0000–FFFFD) 코드포인트로 추출되어
 * 뷰어에 깨진 문자로 표시된다. 컨텍스트 기준으로 해독한 매핑 테이블로
 * 실제 의미 문자(불릿·괄호·연산자·아래첨자 숫자·수식 변수)로 치환한다.
 *
 * 사용:
 *   node tools/sync/fix_refmd_glyphs.js          # 일괄 치환
 *   node tools/sync/fix_refmd_glyphs.js --check  # 보고만 (미수정)
 *
 * 매핑 근거(컨텍스트 해독):
 *   f0xx — Wingdings 불릿 (f0d8 ▸ 화살촉, f0fc ✓, f0e0 → 화살표, f06c •,
 *          f0a7 ▪, f075/f0c6/f000 •)
 *   e044/e045 ( ) · e046 − · e047 = · e048/e052 + · e049/e04a [ ] ·
 *   e04b/e04c ( ) · e053 소수점 · e05c √ · e067 Σ · e06d 분수선 /
 *   e034–e03d — 수식 아래첨자 숫자 (C₁₀H₁₃N₅O₄·0.040·E^1%₁cm 실측 해독)
 *   e002 C · e005 F · e00f P · e012 S · e013 N · e015 V — (SPF), ×V×N 등
 *   e0ex–e0fx — 수식 이탤릭 변수/단위 (x,e,g,i,k,m,n,S · α)
 *   e000 A (분자 기호) · e042 % · e035 D (n_D 아래첨자)
 *
 * 잔여 미매핑 PUA는 치환하지 않고 보고한다 — check_refmd_glyphs 게이트가 감지.
 */

// @spec none (ref_md 글리프 정제)
const fs = require('fs');
const path = require('path');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');

// 코드포인트 → 치환 문자 (해독 근거는 파일 헤더 주석)
const GLYPH_MAP = {
    // Wingdings 불릿·화살표
    0xf000: '•', 0xf06c: '•', 0xf075: '•', 0xf0a7: '▪', 0xf0c6: '•',
    0xf0d8: '▸', 0xf0e0: '→', 0xf0fc: '✓',
    // NCS 학습모듈 PDF 잔재 (iteng 편입 실측) — Wingdings 공백·불릿·원형 번호·화살표
    0xf020: ' ', 0xf09f: '•', 0xf06d: '•', 0xf0e8: '→',
    0xf02b1: '①', 0xf02b2: '②', 0xf02b3: '③', 0xf02b4: '④',
    0xf02b5: '⑤', 0xf02b6: '⑥', 0xf02b7: '⑦', 0xf02b8: '⑧', 0xf02b9: '⑨',
    0xf00da: '•',
    0xf09e: '·', // NCS 모듈 중간점 (경영·회계·사무, 공감·경청 실측)
    // ERD 까마귀발 표기 조각 (기능모델링 모듈 실측) — 주변 텍스트가 규칙을 설명하므로 공백 중화
    0xe0e6: ' ', 0xe0fc: ' ', 0xe0fd: ' ',
    // 수식 괄호·연산자
    0xe044: '(', 0xe045: ')', 0xe04b: '(', 0xe04c: ')',
    0xe046: '−', 0xe047: '=', 0xe048: '+', 0xe052: '+',
    0xe049: '[', 0xe04a: ']', 0xe053: '.', 0xe05c: '√',
    0xe067: 'Σ', 0xe06d: '/', 0xe042: '%',
    // 수식 아래첨자 숫자 → 유니코드 아래첨자 (자리 의미 보존)
    0xe03d: '₀', 0xe034: '₁', 0xe036: '₃', 0xe037: '₄',
    0xe038: '₅', 0xe039: '₆', 0xe03a: '₇', 0xe03b: '₈',
    // 수식 변수·단위 문자
    0xe000: 'A', 0xe002: 'C', 0xe005: 'F', 0xe00f: 'P',
    0xe012: 'S', 0xe013: 'N', 0xe015: 'V', 0xe035: 'D',
    0xe09d: 'α', 0xe0e5: 'x', 0xe0e9: 'e', 0xe0eb: 'g',
    0xe0ed: 'i', 0xe0ef: 'k', 0xe0f1: 'm', 0xe0f2: 'n', 0xe0f7: 'S',
    // NCS 2차 수집 공통 — 도서명 인용부호·불릿·항목 번호 (감정평가·손해사정·사무행정 계열 다수 파일 실측)
    0xf0854: '『', 0xf0855: '』',
    0xf06e: '∙', 0xf081: '①', 0xf082: '②', 0xf53a: '한',
    0xf02ef: '·', 0xf046: '※', 0xf0a0: '·', 0xf85e: '·',
    0xe0bb: 'ℓ',
};

// 파일명 부분일치 → 해당 파일 전용 매핑 (내장폰트 배정이 문서마다 다름 — GLYPH_MAP보다 우선)
// 한국전기설비규정(KEC) — 수식 템플릿 폰트 전수 해독:
//   e000–e012 = A–S 알파벳열 (e013은 예외적으로 N — N·m 단위·N_h 수평력 실측),
//   e034–e03d = 평문 숫자 1,2,3,4,5,6,7,8,9,0 (R≤120V·50V·1.2 계수 실측 — 아래첨자 아님),
//   e0f7 = 소문자 s (Z_s·m³/s — 대문자 S 아님), e0f9 = u (S_u 인장강도)
const FILE_GLYPH_MAP = {
    '한국전기설비규정': {
        // 알파벳 블록 (이탤릭 대문자)
        0xe000: 'A', 0xe001: 'B', 0xe002: 'C', 0xe003: 'D', 0xe004: 'E',
        0xe005: 'F', 0xe006: 'G', 0xe007: 'H', 0xe008: 'I', 0xe009: 'J',
        0xe00a: 'K', 0xe00b: 'L', 0xe00c: 'M', 0xe00d: 'N', 0xe00e: 'O',
        0xe00f: 'P', 0xe010: 'Q', 0xe011: 'R', 0xe012: 'S', 0xe013: 'N',
        0xe014: 'U', 0xe015: 'V', 0xe016: 'W', 0xe017: 'X', 0xe018: 'Y',
        0xe019: 'Z', 0xe021: 'h', 0xe02d: '′',
        // 평문 숫자 블록 (첨자 아님 — R≤120V 실측)
        0xe034: '1', 0xe035: '2', 0xe036: '3', 0xe037: '4', 0xe038: '5',
        0xe039: '6', 0xe03a: '7', 0xe03b: '8', 0xe03c: '9', 0xe03d: '0',
        // 연산자·괄호·기호
        0xe042: '%', 0xe043: 's', 0xe044: '(', 0xe045: ')', 0xe046: '−',
        0xe047: '=', 0xe048: '+', 0xe049: '[', 0xe04a: ']', 0xe04b: '(',
        0xe04c: ')', 0xe050: '′', 0xe052: '+', 0xe053: '.', 0xe054: '/',
        0xe055: '<', 0xe056: '≤', 0xe05c: '√', 0xe067: 'Σ', 0xe06d: '/',
        // 계수열 (645.16 볼트하중 표)
        0xe07c: 'C', 0xe07d: 'C', 0xe07e: 'C', 0xe07f: 'C', 0xe080: 'C', 0xe081: 'C',
        // 그리스·특수기호
        0xe088: 'Δ', 0xe08e: 's', 0xe08f: 'Λ', 0xe096: 'Σ', 0xe09d: 'α',
        0xe09e: 'ρ', 0xe09f: 'i', 0xe0a1: ',', 0xe0a3: 'η', 0xe0a4: 'θ',
        0xe0a7: 'λ', 0xe0a8: '±', 0xe0a9: 'p', 0xe0aa: ',', 0xe0ac: 'π',
        0xe0ae: 'σ', 0xe0af: 'τ', 0xe0b1: 'β', 0xe0b2: 'l', 0xe0b3: ')',
        0xe0ba: 'λ', 0xe0bc: 'y', 0xe0c1: ',', 0xe0c8: '°',
        // 이탤릭 소문자 변수·공백
        0xe0e5: 'x', 0xe0e6: ' ', 0xe0e7: ' ', 0xe0e8: 'a', 0xe0e9: 'e',
        0xe0ea: 'σ', 0xe0eb: 'g', 0xe0ec: 'd', 0xe0ed: 'i', 0xe0ee: 'n',
        0xe0ef: 'k', 0xe0f0: 'l', 0xe0f1: 'm', 0xe0f2: 'n', 0xe0f3: '·',
        0xe0f4: 'm', 0xe0f5: 'h', 0xe0f6: 'r', 0xe0f7: 's', 0xe0f8: 't',
        0xe0f9: 'u', 0xe0fa: '·', 0xe0fb: 'E', 0xe0fc: ' ', 0xe0fd: ' ',
        // 높은 괄호·분수선 조각
        0xe100: '(', 0xe101: ' ', 0xe102: ' ', 0xe103: '/', 0xe104: ' ',
        0xe105: ')',
    },
    // NCS 물류관리 모듈 (LM0204030101/0102) — 중력거점법·예측수식 잔재 실측:
    //   수요량 V_i·운송비 R_i·좌표 (X,Y) — "수요량이 V_i, 운송비용이 R_i로"·"각을 (X,Y)라고" 문맥
    //   이동평균 F_t·가중치 w·수요 e — "F_t=Σe_i/n"·"F=w_1e_t+⋯" 문맥
    '물류서비스 및 거점운영': {
        0xe003: 'e', 0xe00a: 'k', 0xe00c: 'x', 0xe011: 'R',
        0xe017: 'X', 0xe018: 'Y', 0xe04e: '(', 0xe054: '/',
        0xe0e7: ' ', 0xe0e8: 'i', 0xe0ea: 'f', 0xe0ec: 'd',
        0xe0ee: 'n', 0xe0f0: 'l', 0xe0f3: '·', 0xe0f6: 'r',
        0xe0f8: 't', 0xe0fb: 'w',
    },
    // NCS 해상운송관리 (LM0204030105) — B/L 양식 필드 원형 번호 + '·' (경영·회계·사무)
    '해상운송관리': {
        0xf028a: '☐', 0xf0293: '⑬', 0xf0294: '⑭', 0xf0295: '⑮',
        0xf0296: '⑯', 0xf0297: '⑰', 0xf0298: '⑱', 0xf0299: '⑲',
        0xf029a: '⑳',
    },
    // NCS 상품매입 (LM0204030402) — EOQ 수식: Q=√(2·D·C_p/C_h), T=1/N
    '상품매입': {
        0xe003: 'p', 0xe007: 'h', 0xe00d: 'N', 0xe010: 'Q', 0xe0f4: 'h',
    },
    // NCS 고객지원 (LM0201030205) — '·' (공감·경청)
    '고객지원': {
        0xf09e: '·',
    },
    // NCS 임금관리 (LM0202020108) — 상관계수·회귀분석 수식 잔재 실측:
    //   Σ(X−X̄)(Y−Ȳ) → e017=X·e018=Y, r_{XY} → e0ad=r, Ŷ → e063, 결정계수 r² → e011,
    //   인건비/종업원수 → e054='/', 파이(π) → e0ac, 상여총액=( → e096, '0.15개월' → e03c='5'
    '임금관리': {
        0xe011: 'r', 0xe017: 'X', 0xe018: 'Y', 0xe03c: '5',
        0xe054: '/', 0xe063: 'Ŷ', 0xe096: '(', 0xe09e: '+',
        0xe0ac: 'π', 0xe0ad: 'r', 0xe00d: '÷',
    },
    // NCS 감정평가 방법 적용 (LM1002040106) — 수익환원법 수식 잔재 실측:
    //   수익가액 V=I/R → e00d=I·e00e=R·e008='/', DCF Σ a/(1+r)ⁿ → e011=a·e0f8='/'·e0f6=r
    '감정평가 방법 적용': {
        0xe008: '/', 0xe00d: 'I', 0xe00e: 'R', 0xe011: 'a',
        0xe0f6: 'r', 0xe0f8: '/',
    },
    // NCS 감정평가서 검수 (LM1002040109) — 감가율 변수 r (잔존가격/r=1−감가누계/재조달원가)
    '감정평가서 검수': { 0xe00d: 'r' },
    // NCS 보험금 사정 (LM0302030105) — 원화 계산 '55.5' 숫자 잔재
    '보험금 사정': { 0xe03c: '5' },
    // NCS 합의금 산출 후 지급 (LM0302030316) — 날짜 '1975.07.10' → '9'
    '합의금 산출 후 지급': { 0xe03c: '9' },
    // NCS 단체협약이행 (LM0202020205) — 평균임금 '100만원/10일' → '1'
    '단체협약이행': { 0xe03c: '1' },
    // NCS 차량 손해액 산정 (LM0302030212) — 뉴턴 운동방정식 a=dv/dt → e016/e088=d·e0fa=v·e0f8=t
    '차량 손해액 산정': {
        0xe016: 'd', 0xe088: 'd', 0xe0f8: 't', 0xe0fa: 'v',
    },
    // NCS 조직문화관리 (LM0202020111) — AHP 쌍대비교행렬 수식 잔재 실측:
    //   행렬 괄호 ⎡⎤⎣⎦⎥ → e100–e105, 고유벡터 w → e0fb, 고유치 λ·λ_max → e04f·e0a7,
    //   합계 Σ → e068·e001, 인건비/종업원수형 '/' → e054
    '조직문화관리': {
        0xe001: 'Σ', 0xe04f: 'λ', 0xe054: '/', 0xe068: 'Σ',
        0xe0a7: 'λ', 0xe0ee: ':', 0xe0fb: 'w',
        0xe100: '⎡', 0xe101: '1', 0xe102: '⎤',
        0xe103: '⎣', 0xe104: '⎦', 0xe105: '⎥',
    },
    // KPX 전력거래사 학습가이드 제3과목 — 전력 수식 잔재 실측 (문맥 해독):
    //   순시값 v(t)·i(t)·p(t) → e0fa=v·e0b4=p·e0f8=t, 수전단 전압 V_r → e0f6,
    //   무효전력 Q → e010, 위상각 δ·효율 η → e0a0·e0a3·e007, 위상차 θ → e008·e0a4,
    //   어드미턴스 행렬 Y·모선 k → e018·e043·e0f4·e05b, 비용함수 계수 → e0e7·e0e8·e011,
    //   핵분열 U-235·B·n → e014·e001·e0ee, 연소 O₂ → e00e, 수차출력 P=9.8ηηQH → e03c,
    //   회전속도 N_s → e00d, 이도 D=wS²/8H → e003·e0fb, B/C 비율 '/' → e054, ∆V → e004
    '전력거래사 학습가이드': {
        0xe001: 'B', 0xe003: 'D', 0xe004: 'V', 0xe006: '·', 0xe007: 'η',
        0xe008: 'θ', 0xe00d: 's', 0xe00e: 'O', 0xe010: 'Q', 0xe011: 'v',
        0xe014: 'U', 0xe018: 'Y', 0xe03c: '9', 0xe043: 'k', 0xe054: '/',
        0xe05b: 'k', 0xe0a0: 'δ', 0xe0a3: 'η', 0xe0a4: 'θ', 0xe0b4: 'p',
        0xe0e7: 'c', 0xe0e8: 'a', 0xe0ea: 'x', 0xe0ee: 'n', 0xe0f4: 'k',
        0xe0f6: 'r', 0xe0f8: 't', 0xe0fa: 'v', 0xe0fb: 'D',
    },
    // MIT 6.061 강의노트 — 벡터·행렬 괄호 잔재 (<w>_r 전력벡터 · 행렬 꼭지점)
    'MIT 6.061': {
        0xf8ee: '⟨', 0xf8f9: '⟩', 0xf8f0: '⎡', 0xf8fb: '⎦',
    },
};

const PUA_RE = /[\u{e000}-\u{f8ff}\u{f0000}-\u{ffffd}]/gu;

function fileGlyphMap(f) {
    for (const [key, map] of Object.entries(FILE_GLYPH_MAP))
        if (f.includes(key)) return map;
    return null;
}

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else if (e.name.endsWith('.md')) yield p;
    }
}

function main() {
    console.log(`ref_md PUA 글리프 정제${CHECK ? ' (--check 보고만)' : ''}`);
    let files = 0, changed = 0, total = 0;
    const unmapped = new Map();

    for (const t of getExamTargets(ROOT)) {
        const refMd = path.join(ROOT, t.contentRoot, '참조자료', 'ref_md');
        if (!fs.existsSync(refMd)) continue;
        for (const f of walk(refMd)) {
            files++;
            const src = fs.readFileSync(f, 'utf8');
            const fmap = fileGlyphMap(f);
            let count = 0;
            const out = src.replace(PUA_RE, ch => {
                const cp = ch.codePointAt(0);
                if (fmap && cp in fmap) { count++; return fmap[cp]; }
                if (cp in GLYPH_MAP) { count++; return GLYPH_MAP[cp]; }
                unmapped.set(cp, (unmapped.get(cp) || 0) + 1);
                return ch;
            });
            if (count) {
                changed++;
                total += count;
                const rel = path.relative(ROOT, f);
                console.log(`  ${CHECK ? '○' : '✓'} ${rel} — ${count}글리프`);
                if (!CHECK) fs.writeFileSync(f, out, 'utf8');
            }
        }
    }

    console.log(`\n대상 ${files}파일 — ${CHECK ? '치환 예정' : '치환'} ${changed}파일 / ${total}글리프`);
    if (unmapped.size) {
        console.log('미매핑 PUA 잔존:');
        for (const [cp, n] of [...unmapped].sort((a, b) => b[1] - a[1]))
            console.log(`  U+${cp.toString(16)} ×${n}`);
    }
}

main();
