// src/law-links.js — 참조 문서 → law.go.kr 원문(최신 통합본) 링크 매퍼
// @spec RR-17
// ================================================================
// ⚠️ 이 파일은 content/lawdb.json + {contentRoot}/references.json(lawRefs)에서
// 빌드 시 자동 생성됩니다. 직접 수정하지 마시고 lawdb.json을 수정 후
// npm run build:pdf-registry 실행.
// ================================================================
// 한글주소 규약: 공백·특수문자 제거 명칭 — 법령은 /법령/, 고시·규정·기준은 /행정규칙/
// 파일명에 (발령기관)(제XXXX-N호)(시행일) 꼬리가 붙으므로 접두 매칭으로 판별.
// 매칭은 위에서 아래로 — 시험별 lawRefs 순서가 곧 우선순위 (구체적인 것을 먼저).
// [멀티시험] 시험별 매핑은 _EXAM_LAW_URLS[examId] — 활성 시험을 해석한다.

import { getActiveExamId } from './exam-context.js';

const _EXAM_LAW_URLS = {
    "cosmetic": [
    ["화장품법시행령", "https://www.law.go.kr/법령/화장품법시행령"],
    ["화장품법시행규칙", "https://www.law.go.kr/법령/화장품법시행규칙"],
    ["시행규칙_별표", "https://www.law.go.kr/법령/화장품법시행규칙"],
    ["화장품법(법률)", "https://www.law.go.kr/법령/화장품법"],
    ["화장품법", "https://www.law.go.kr/법령/화장품법"],
    ["개인정보", "https://www.law.go.kr/법령/개인정보보호법"],
    ["기능성화장품심사", "https://www.law.go.kr/행정규칙/기능성화장품심사에관한규정"],
    ["기능성화장품기준", "https://www.law.go.kr/행정규칙/기능성화장품기준및시험방법"],
    ["KFCC", "https://www.law.go.kr/행정규칙/기능성화장품기준및시험방법"],
    ["주의사항", "https://www.law.go.kr/행정규칙/화장품사용할때의주의사항및알레르기유발성분표시에관한규정"],
    ["알레르기", "https://www.law.go.kr/행정규칙/화장품사용할때의주의사항및알레르기유발성분표시에관한규정"],
    ["색소", "https://www.law.go.kr/행정규칙/화장품의색소종류및기준"],
    ["colorants_ingredients", "https://www.law.go.kr/행정규칙/화장품의색소종류및기준"],
    ["안전기준", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["banned_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["restricted_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["우수화장품", "https://www.law.go.kr/행정규칙/우수화장품제조및품질관리기준"],
    ["CGMP", "https://www.law.go.kr/행정규칙/우수화장품제조및품질관리기준"],
    ["맞춤형화장품조제관리사자격시험", "https://www.law.go.kr/행정규칙/맞춤형화장품조제관리사자격시험운영에관한규정"],
    ["자격시험운영에관한규정", "https://www.law.go.kr/행정규칙/맞춤형화장품조제관리사자격시험운영에관한규정"],
    ["판매업자의준수사항", "https://www.law.go.kr/행정규칙/맞춤형화장품판매업자의준수사항에관한규정"],
    ["준수사항에관한규정", "https://www.law.go.kr/행정규칙/맞춤형화장품판매업자의준수사항에관한규정"]
    ],
    "skincare": [
    ["공중위생관리법(법률)", "https://www.law.go.kr/법령/공중위생관리법"],
    ["공중위생관리법", "https://www.law.go.kr/법령/공중위생관리법"],
    ["공중위생관리법 시행령(대통령령)", "https://www.law.go.kr/법령/공중위생관리법 시행령"],
    ["공중위생관리법 시행령", "https://www.law.go.kr/법령/공중위생관리법 시행령"],
    ["공중위생관리법 시행규칙(부령)", "https://www.law.go.kr/법령/공중위생관리법 시행규칙"],
    ["공중위생관리법 시행규칙", "https://www.law.go.kr/법령/공중위생관리법 시행규칙"],
    ["화장품법(법률)", "https://www.law.go.kr/법령/화장품법"],
    ["화장품법", "https://www.law.go.kr/법령/화장품법"],
    ["안전기준", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["banned_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["restricted_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["이용·미용기구별 소독기준 및 방법", "https://www.law.go.kr/행정규칙/이용·미용기구별 소독기준 및 방법"],
    ["소독기준 및 방법", "https://www.law.go.kr/행정규칙/이용·미용기구별 소독기준 및 방법"]
    ],
    "hairdresser": [
    ["공중위생관리법(법률)", "https://www.law.go.kr/법령/공중위생관리법"],
    ["공중위생관리법", "https://www.law.go.kr/법령/공중위생관리법"],
    ["공중위생관리법 시행령(대통령령)", "https://www.law.go.kr/법령/공중위생관리법 시행령"],
    ["공중위생관리법 시행령", "https://www.law.go.kr/법령/공중위생관리법 시행령"],
    ["공중위생관리법 시행규칙(부령)", "https://www.law.go.kr/법령/공중위생관리법 시행규칙"],
    ["공중위생관리법 시행규칙", "https://www.law.go.kr/법령/공중위생관리법 시행규칙"],
    ["이용·미용기구별 소독기준 및 방법", "https://www.law.go.kr/행정규칙/이용·미용기구별 소독기준 및 방법"],
    ["소독기준 및 방법", "https://www.law.go.kr/행정규칙/이용·미용기구별 소독기준 및 방법"],
    ["화장품법(법률)", "https://www.law.go.kr/법령/화장품법"],
    ["화장품법", "https://www.law.go.kr/법령/화장품법"],
    ["안전기준", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["banned_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["restricted_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"]
    ],
    "insadj": [
    ["상법(법률)", "https://www.law.go.kr/법령/상법"],
    ["상법", "https://www.law.go.kr/법령/상법"],
    ["보험업법(법률)", "https://www.law.go.kr/법령/보험업법"],
    ["보험업법", "https://www.law.go.kr/법령/보험업법"],
    ["보험업법시행령", "https://www.law.go.kr/법령/보험업법시행령"],
    ["보험업법시행규칙", "https://www.law.go.kr/법령/보험업법시행규칙"],
    ["보험업감독규정", "https://www.law.go.kr/행정규칙/보험업감독규정"],
    ["보험업감독업무시행세칙", "https://www.law.go.kr/행정규칙/보험업감독업무시행세칙"],
    ["자동차손해배상보장법", "https://www.law.go.kr/법령/자동차손해배상보장법"],
    ["자동차손해배상 보장법", "https://www.law.go.kr/법령/자동차손해배상보장법"],
    ["자동차손해배상보장법시행령", "https://www.law.go.kr/법령/자동차손해배상보장법시행령"],
    ["자동차손해배상보장법시행규칙", "https://www.law.go.kr/법령/자동차손해배상보장법시행규칙"],
    ["산업재해보상보험법", "https://www.law.go.kr/법령/산업재해보상보험법"],
    ["산업재해보상보험법시행령", "https://www.law.go.kr/법령/산업재해보상보험법시행령"],
    ["산업재해보상보험법시행규칙", "https://www.law.go.kr/법령/산업재해보상보험법시행규칙"],
    ["화재로인한재해보상과보험가입에관한법률", "https://www.law.go.kr/법령/화재로인한재해보상과보험가입에관한법률"],
    ["화재로인한재해보상과보험가입에관한법률시행령", "https://www.law.go.kr/법령/화재로인한재해보상과보험가입에관한법률시행령"],
    ["자동차관리법", "https://www.law.go.kr/법령/자동차관리법"],
    ["민법", "https://www.law.go.kr/법령/민법"],
    ["근로기준법", "https://www.law.go.kr/법령/근로기준법"],
    ["교통사고처리특례법", "https://www.law.go.kr/법령/교통사고처리특례법"],
    ["교통사고처리 특례법", "https://www.law.go.kr/법령/교통사고처리특례법"],
    ["자동차보험진료수가", "https://www.law.go.kr/행정규칙/자동차보험진료수가에관한기준"]
    ],
    "lossadj": [
    ["농어업재해보험법시행령", "https://www.law.go.kr/법령/농어업재해보험법시행령"],
    ["농어업재해보험법 시행령", "https://www.law.go.kr/법령/농어업재해보험법시행령"],
    ["농어업재해보험법(법률)", "https://www.law.go.kr/법령/농어업재해보험법"],
    ["농어업재해보험법", "https://www.law.go.kr/법령/농어업재해보험법"],
    ["농업재해보험손해평가요령", "https://www.law.go.kr/행정규칙/농업재해보험손해평가요령"],
    ["손해평가요령", "https://www.law.go.kr/행정규칙/농업재해보험손해평가요령"],
    ["상법(법률)", "https://www.law.go.kr/법령/상법"],
    ["상법", "https://www.law.go.kr/법령/상법"]
    ],
    "admagent": [
    ["민법", "https://www.law.go.kr/법령/민법"]
    ],
    "appraisal": [

    ],
    "broker": [

    ],
    "labor": [
    ["화장품법시행령", "https://www.law.go.kr/법령/화장품법시행령"],
    ["화장품법시행규칙", "https://www.law.go.kr/법령/화장품법시행규칙"],
    ["시행규칙_별표", "https://www.law.go.kr/법령/화장품법시행규칙"],
    ["화장품법(법률)", "https://www.law.go.kr/법령/화장품법"],
    ["화장품법", "https://www.law.go.kr/법령/화장품법"],
    ["개인정보", "https://www.law.go.kr/법령/개인정보보호법"],
    ["기능성화장품심사", "https://www.law.go.kr/행정규칙/기능성화장품심사에관한규정"],
    ["기능성화장품기준", "https://www.law.go.kr/행정규칙/기능성화장품기준및시험방법"],
    ["KFCC", "https://www.law.go.kr/행정규칙/기능성화장품기준및시험방법"],
    ["주의사항", "https://www.law.go.kr/행정규칙/화장품사용할때의주의사항및알레르기유발성분표시에관한규정"],
    ["알레르기", "https://www.law.go.kr/행정규칙/화장품사용할때의주의사항및알레르기유발성분표시에관한규정"],
    ["색소", "https://www.law.go.kr/행정규칙/화장품의색소종류및기준"],
    ["colorants_ingredients", "https://www.law.go.kr/행정규칙/화장품의색소종류및기준"],
    ["안전기준", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["banned_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["restricted_ingredients", "https://www.law.go.kr/행정규칙/화장품안전기준등에관한규정"],
    ["우수화장품", "https://www.law.go.kr/행정규칙/우수화장품제조및품질관리기준"],
    ["CGMP", "https://www.law.go.kr/행정규칙/우수화장품제조및품질관리기준"],
    ["맞춤형화장품조제관리사자격시험", "https://www.law.go.kr/행정규칙/맞춤형화장품조제관리사자격시험운영에관한규정"],
    ["자격시험운영에관한규정", "https://www.law.go.kr/행정규칙/맞춤형화장품조제관리사자격시험운영에관한규정"],
    ["판매업자의준수사항", "https://www.law.go.kr/행정규칙/맞춤형화장품판매업자의준수사항에관한규정"],
    ["준수사항에관한규정", "https://www.law.go.kr/행정규칙/맞춤형화장품판매업자의준수사항에관한규정"],
    ["농어업재해보험법(법률)", "https://www.law.go.kr/법령/농어업재해보험법"],
    ["농어업재해보험법", "https://www.law.go.kr/법령/농어업재해보험법"],
    ["농어업재해보험법시행령", "https://www.law.go.kr/법령/농어업재해보험법시행령"],
    ["농어업재해보험법 시행령", "https://www.law.go.kr/법령/농어업재해보험법시행령"],
    ["농업재해보험손해평가요령", "https://www.law.go.kr/행정규칙/농업재해보험손해평가요령"],
    ["손해평가요령", "https://www.law.go.kr/행정규칙/농업재해보험손해평가요령"],
    ["상법(법률)", "https://www.law.go.kr/법령/상법"],
    ["상법", "https://www.law.go.kr/법령/상법"],
    ["보험업법(법률)", "https://www.law.go.kr/법령/보험업법"],
    ["보험업법", "https://www.law.go.kr/법령/보험업법"],
    ["보험업법시행령", "https://www.law.go.kr/법령/보험업법시행령"],
    ["보험업법시행규칙", "https://www.law.go.kr/법령/보험업법시행규칙"],
    ["자동차손해배상보장법", "https://www.law.go.kr/법령/자동차손해배상보장법"],
    ["자동차손해배상 보장법", "https://www.law.go.kr/법령/자동차손해배상보장법"],
    ["자동차손해배상보장법시행령", "https://www.law.go.kr/법령/자동차손해배상보장법시행령"],
    ["산업재해보상보험법", "https://www.law.go.kr/법령/산업재해보상보험법"],
    ["산업재해보상보험법시행령", "https://www.law.go.kr/법령/산업재해보상보험법시행령"],
    ["화재로인한재해보상과보험가입에관한법률", "https://www.law.go.kr/법령/화재로인한재해보상과보험가입에관한법률"],
    ["자동차보험진료수가", "https://www.law.go.kr/행정규칙/자동차보험진료수가에관한기준"],
    ["보험업감독규정", "https://www.law.go.kr/행정규칙/보험업감독규정"],
    ["보험업감독업무시행세칙", "https://www.law.go.kr/행정규칙/보험업감독업무시행세칙"],
    ["자동차손해배상보장법시행규칙", "https://www.law.go.kr/법령/자동차손해배상보장법시행규칙"],
    ["산업재해보상보험법시행규칙", "https://www.law.go.kr/법령/산업재해보상보험법시행규칙"],
    ["화재로인한재해보상과보험가입에관한법률시행령", "https://www.law.go.kr/법령/화재로인한재해보상과보험가입에관한법률시행령"],
    ["자동차관리법", "https://www.law.go.kr/법령/자동차관리법"],
    ["민법", "https://www.law.go.kr/법령/민법"],
    ["근로기준법", "https://www.law.go.kr/법령/근로기준법"],
    ["교통사고처리특례법", "https://www.law.go.kr/법령/교통사고처리특례법"],
    ["교통사고처리 특례법", "https://www.law.go.kr/법령/교통사고처리특례법"],
    ["공중위생관리법(법률)", "https://www.law.go.kr/법령/공중위생관리법"],
    ["공중위생관리법", "https://www.law.go.kr/법령/공중위생관리법"],
    ["공중위생관리법 시행령(대통령령)", "https://www.law.go.kr/법령/공중위생관리법 시행령"],
    ["공중위생관리법 시행령", "https://www.law.go.kr/법령/공중위생관리법 시행령"],
    ["공중위생관리법 시행규칙(부령)", "https://www.law.go.kr/법령/공중위생관리법 시행규칙"],
    ["공중위생관리법 시행규칙", "https://www.law.go.kr/법령/공중위생관리법 시행규칙"],
    ["이용·미용기구별 소독기준 및 방법", "https://www.law.go.kr/행정규칙/이용·미용기구별 소독기준 및 방법"],
    ["소독기준 및 방법", "https://www.law.go.kr/행정규칙/이용·미용기구별 소독기준 및 방법"],
    ["공인노무사법시행령", "https://www.law.go.kr/법령/공인노무사법시행령"],
    ["공인노무사법", "https://www.law.go.kr/법령/공인노무사법"],
    ["감정평가및감정평가사에관한법률시행령", "https://www.law.go.kr/법령/감정평가및감정평가사에관한법률시행령"],
    ["감정평가사법시행령", "https://www.law.go.kr/법령/감정평가및감정평가사에관한법률시행령"],
    ["공인중개사법시행령", "https://www.law.go.kr/법령/공인중개사법시행령"],
    ["노인복지법", "https://www.law.go.kr/법령/노인복지법"],
    ["노인복지법시행령", "https://www.law.go.kr/법령/노인복지법시행령"],
    ["노인복지법시행규칙", "https://www.law.go.kr/법령/노인복지법시행규칙"],
    ["노인장기요양보험법", "https://www.law.go.kr/법령/노인장기요양보험법"],
    ["노인장기요양보험법시행령", "https://www.law.go.kr/법령/노인장기요양보험법시행령"]
    ],
    "indsafe": [
    ["산업재해보상보험법", "https://www.law.go.kr/법령/산업재해보상보험법"]
    ],
    "indsafeind": [

    ],
    "iteng": [

    ],
    "itindeng": [

    ],
    "eleceng": [

    ],
    "elecindeng": [

    ],
    "compapp1": [

    ],
    "compapp2": [

    ],
    "distmgr2": [

    ],
    "distmgr3": [

    ],
    "carework": [
    ["노인복지법", "https://www.law.go.kr/법령/노인복지법"],
    ["노인복지법시행령", "https://www.law.go.kr/법령/노인복지법시행령"],
    ["노인복지법시행규칙", "https://www.law.go.kr/법령/노인복지법시행규칙"],
    ["노인장기요양보험법", "https://www.law.go.kr/법령/노인장기요양보험법"],
    ["노인장기요양보험법시행령", "https://www.law.go.kr/법령/노인장기요양보험법시행령"]
    ]
};

// 활성 시험의 매칭 테이블 (미등록 시험은 빈 테이블 — 다른 시험 문서로 폴백하지 않음)
function activeLawUrls() {
  const id = getActiveExamId();
  return _EXAM_LAW_URLS[id] || [];
}

// 전 시험 매칭 합집합 (URL 기준 중복 제거 — 같은 문서의 matchKey는 첫 것만 유지, 순서 보존)
// keep-export — tools/check/check_law_urls.js가 한글주소 유효성을 전수 검증한다 (src/ 외부 소비자라 check:imports 미집계)
export const LAW_DOC_URLS = [...new Map(
  Object.values(_EXAM_LAW_URLS).flat().map(p => [p[1], p])
).values()];

/**
 * 참조자료 문서명/파일명 → law.go.kr 원문 URL (없으면 null — 순수 함수)
 * @param {string} name 예: '화장품 안전기준 등에 관한 규정(식품의약품안전처고시)(제2026-19호)(20260318).pdf'
 * @returns {string|null}
 */
export function lawUrlFor(name) {
  if (!name) return null;
  // 표시명('시행규칙 별표7 …')과 파일명('시행규칙_별표7_….pdf') 모두 대응 — 공백·괄호·언더스코어 제거
  const key = String(name).replace(/[\s()_]/g, '').replace(/\.(pdf|md|html?)$/i, '');
  for (const [pat, url] of activeLawUrls()) {
    if (key.includes(pat.replace(/[\s()_]/g, ''))) return url;
  }
  return null;
}
