// Formula OS — 광고 문구 점검 엔진 (FO-36)
// @spec FO-36
// 화장품법 제13조(의약품 오인·기능성 오인·허위·과대 표시·광고 금지)에 근거한
// 보수적 금지 표현 사전. 확실한 위험 표현만 적재한다 — 애매한 표현까지 경고하면
// 검토 도구의 신뢰가 무너진다. 판정은 참고용이며 최종 판단은 광고 심의 기준과
// 관할 지방식약청 안내를 따른다.

/* =======================================================
   금지 표현 사전 — {term, category, note, suggestion}
   term은 부분 문자열 매칭 (조사·어미 변형 포착용).
   ======================================================= */
export const AD_CATEGORIES = {
  medicine: { id: 'medicine', label: '의약품 오인', desc: '질병 치료·예방 효능 표현 — 화장품은 의약품처럼 표시·광고할 수 없음' },
  overclaim: { id: 'overclaim', label: '과대·허위 표현', desc: '절대적·검증 불가 효능 표현' },
  functional: { id: 'functional', label: '기능성 범위 주의', desc: '기능성화장품 심사(보고) 제품만 쓸 수 있는 표현 — 일반 화장품에 사용 금지' },
  endorsement: { id: 'endorsement', label: '전문가 추천 오인', desc: '의사·약사·의료기관 추천·공인 암시 — 시행규칙 별표5 2.다 금지' },
  origin: { id: 'origin', label: '제조국 오인', desc: '국내·외 제조 제품의 출처를 오인하게 하는 표현 — 시행규칙 별표5 2.라 금지' },
  tieup: { id: 'tieup', label: '기술제휴 허위', desc: '외국 기술제휴·공동연구의 허위 표현 — 시행규칙 별표5 2.마 금지' },
  vulgar: { id: 'vulgar', label: '저속·혐오 표현', desc: '저속하거나 혐오감을 주는 표현 — 시행규칙 별표5 2.자 금지' },
  endangered: { id: 'endangered', label: '멸종위기종 함유', desc: '국제적 멸종위기종 가공품 함유 표현·암시 — 시행규칙 별표5 2.차 금지' },
  slander: { id: 'slander', label: '타 제품 비방', desc: '사실 유무와 무관하게 다른 제품을 비방·비방 의심 표현 — 시행규칙 별표5 2.카 금지' },
};

export const AD_BANNED_TERMS = [
  // 의약품 오인 — 질병·생리 작용 효능
  { term: '치료', category: 'medicine', suggestion: '개선·완화·케어' },
  { term: '치유', category: 'medicine', suggestion: '회복·케어' },
  { term: '완치', category: 'medicine', suggestion: '표현 삭제' },
  { term: '소염', category: 'medicine', suggestion: '진정·케어' },
  { term: '항염', category: 'medicine', suggestion: '진정·케어' },
  { term: '항균', category: 'medicine', suggestion: '세정·청결 — 인체 항균 표현은 의약외품 영역' },
  { term: '살균', category: 'medicine', suggestion: '세정·청결' },
  { term: '소독', category: 'medicine', suggestion: '세정·청결' },
  { term: '면역', category: 'medicine', suggestion: '표현 삭제 — 면역 관련은 의약·건기식 영역' },
  { term: '통증', category: 'medicine', suggestion: '표현 삭제' },
  { term: '염증 완화', category: 'medicine', suggestion: '진정·케어' },
  { term: '아토피', category: 'medicine', suggestion: '질병명 언급 금지 — 민감성 피부용 표현으로' },
  { term: '습진', category: 'medicine', suggestion: '질병명 언급 금지' },
  { term: '여드름 치료', category: 'medicine', suggestion: '트러블 케어 — 여드름성 피부 완화는 기능성(여드름성 피부 완화 화장품) 심사 필요' },
  { term: '탈모 치료', category: 'medicine', suggestion: '탈모 증상 완화는 기능성 심사 필요' },
  { term: '흉터 제거', category: 'medicine', suggestion: '표현 삭제' },
  { term: '세포 재생', category: 'medicine', suggestion: '피부 장벽 케어' },
  { term: '피부 재생', category: 'medicine', suggestion: '피부 장벽 케어' },
  { term: '재생 효과', category: 'medicine', suggestion: '표현 삭제' },
  { term: '기미 제거', category: 'medicine', suggestion: '미백(기능성) 범위 표현으로' },
  { term: '잡티 제거', category: 'medicine', suggestion: '미백(기능성) 범위 표현으로' },
  { term: '혈액 순환', category: 'medicine', suggestion: '표현 삭제 — 생리 기능 작용 표현' },
  { term: '해독', category: 'medicine', suggestion: '표현 삭제' },
  { term: '디톡스', category: 'medicine', suggestion: '표현 삭제' },
  { term: '녹내장', category: 'medicine', suggestion: '질병명 언급 금지' },
  { term: '항암', category: 'medicine', suggestion: '질병명 언급 금지' },

  // 과대·허위 — 절대적·검증 불가 표현
  { term: '부작용 없', category: 'overclaim', suggestion: '안전성은 개인차 — 절대 표현 삭제' },
  { term: '무자극', category: 'overclaim', suggestion: '민감성 피부용·저자극 테스트 완료(근거 있는 경우)' },
  { term: '100% 안전', category: 'overclaim', suggestion: '절대 표현 삭제' },
  { term: '100% 효과', category: 'overclaim', suggestion: '절대 표현 삭제' },
  { term: '완벽한 효과', category: 'overclaim', suggestion: '구체적 효능 범위로' },
  { term: '즉효', category: 'overclaim', suggestion: '표현 삭제' },
  { term: '즉각적 효과', category: 'overclaim', suggestion: '표현 삭제' },
  { term: '의학적 효과', category: 'overclaim', suggestion: '표현 삭제' },
  { term: '의사 처방', category: 'overclaim', suggestion: '표현 삭제' },
  { term: '병원용', category: 'overclaim', suggestion: '표현 삭제 — 의료기관 전용 오인' },
  { term: '처방전', category: 'overclaim', suggestion: '표현 삭제' },
  { term: '기적', category: 'overclaim', suggestion: '표현 삭제' },
  { term: '세계 최초', category: 'overclaim', suggestion: '근거 있는 경우에만 — 검증 불가 시 삭제' },
  { term: '영구적', category: 'overclaim', suggestion: '표현 삭제' },
  { term: '반영구', category: 'overclaim', suggestion: '표현 삭제' },
  // 시행규칙 별표5 2.바 — 배타성을 띤 절대적 표현 금지
  { term: '최고', category: 'overclaim', suggestion: '절대 표현 — 비교 기준·근거 명시 없으면 삭제 (별표5 2.바)' },
  { term: '최상', category: 'overclaim', suggestion: '절대 표현 — 비교 기준·근거 명시 없으면 삭제 (별표5 2.바)' },
  { term: '1위', category: 'overclaim', suggestion: '절대 표현 — 객관적 근거·비교 기준 명시 필요' },
  { term: '무해', category: 'overclaim', suggestion: '안전성은 개인차 — 절대 표현 삭제' },

  // 전문가 추천 오인 — 시행규칙 별표5 2.다 (의사·약사·의료기관 추천·지정 표현 금지)
  { term: '의사 추천', category: 'endorsement', suggestion: '표현 삭제 — 의료 전문가 추천 표현 금지' },
  { term: '피부과 추천', category: 'endorsement', suggestion: '표현 삭제 — 의료기관 추천 암시 금지' },
  { term: '피부과 전문의', category: 'endorsement', suggestion: '표현 삭제 — 전문가 추천 암시 금지' },
  { term: '약사 추천', category: 'endorsement', suggestion: '표현 삭제 — 의료 전문가 추천 표현 금지' },
  { term: '전문가 추천', category: 'endorsement', suggestion: '표현 삭제 — 전문가 추천 표현 금지' },
  { term: '병원 추천', category: 'endorsement', suggestion: '표현 삭제 — 의료기관 추천 암시 금지' },
  { term: '피부과 테스트', category: 'endorsement', suggestion: '실제 인체적용시험 결과의 정확한 인용 범위 내에서만 사용 가능' },
  { term: '임상시험', category: 'endorsement', suggestion: '공인된 인체적용시험 문헌 인용만 가능 — 문헌명·발표일 명시 필요' },
  { term: '임상 실험', category: 'endorsement', suggestion: '공인된 인체적용시험 문헌 인용만 가능 — 문헌명·발표일 명시 필요' },

  // 기능성 범위 — 일반 화장품에 사용 시 위반
  { term: '미백', category: 'functional', suggestion: '미백 기능성 심사 제품만 표기 가능' },
  { term: '주름 개선', category: 'functional', suggestion: '주름개선 기능성 심사 제품만 표기 가능' },
  { term: '주름개선', category: 'functional', suggestion: '주름개선 기능성 심사 제품만 표기 가능' },
  { term: '자외선 차단', category: 'functional', suggestion: '자외선차단 기능성 심사 제품만 표기 가능' },
  { term: '자외선차단', category: 'functional', suggestion: '자외선차단 기능성 심사 제품만 표기 가능' },
  { term: 'SPF', category: 'functional', suggestion: '자외선차단 기능성 심사 제품만 표기 가능' },
  { term: 'PA+', category: 'functional', suggestion: '자외선차단 기능성 심사 제품만 표기 가능' },
  { term: '탈모 증상 완화', category: 'functional', suggestion: '탈모 증상 완화 기능성 심사 제품만 표기 가능' },
  { term: '튼살', category: 'functional', suggestion: '튼살 관련 표현은 기능성 심사 대상' },

  // 제조국 오인 (별표5 2.라) — 실제 제조국과 다른 인상을 주는 표현, 오인 여부 검토 필요
  { term: '수입 완제품', category: 'origin', suggestion: '실제 제조국·수입 여부를 정확히 명시' },
  { term: '직수입 완제품', category: 'origin', suggestion: '실제 제조국·수입 여부를 정확히 명시' },
  { term: '해외 직수입', category: 'origin', suggestion: '실제 수입 사실에 근거한 표현만 허용 — 국내 제조 시 금지' },
  { term: 'Made in France', category: 'origin', suggestion: '실제 제조국이 맞는 경우에만 사용 — 원산지와 제조국 구분 명시' },

  // 외국 기술제휴 허위 (별표5 2.마) — 실증 자료 없는 제휴·공동개발 암시
  { term: '외국 기술제휴', category: 'tieup', suggestion: '실제 제휴 계약·실증 자료가 있는 경우에만 구체 내역 명시' },
  { term: '해외 연구소 공동개발', category: 'tieup', suggestion: '공동개발 실적·증빙이 있을 때만 사실 범위 내 기재' },
  { term: '해외 독점 기술제휴', category: 'tieup', suggestion: '독점 계약 실증 서류 확인 후 사실에 부합하는 범위로 기재' },
  { term: '해외 유명 연구진 독점 제휴', category: 'tieup', suggestion: '계약서 등 실증 자료에 기반한 제휴 관계만 명시' },

  // 저속·혐오 표현 (별표5 2.자) — 신체·피부 관련 저속어
  { term: '개기름', category: 'vulgar', suggestion: '번들거림' },
  { term: '모낭충', category: 'vulgar', suggestion: '모공 속 노폐물' },
  { term: '피지 폭발', category: 'vulgar', suggestion: '과다 피지 분비' },
  { term: '닭살', category: 'vulgar', suggestion: '오돌토돌한 피부' },
  { term: '뱀살', category: 'vulgar', suggestion: '건조하고 거친 피부' },
  { term: '묵은 때', category: 'vulgar', suggestion: '불필요한 각질' },
  { term: '썩은 피부', category: 'vulgar', suggestion: '칙칙한 피부' },
  { term: '고름', category: 'vulgar', suggestion: '피부 고민 부위' },

  // 멸종위기종 함유 표현 (별표5 2.차) — CITES 가공품 함유 암시
  { term: '사향노루', category: 'endangered', suggestion: '식물성·합성 머스크 향료' },
  { term: '천연 사향', category: 'endangered', suggestion: '화이트 머스크 또는 머스크향' },
  { term: '웅담', category: 'endangered', suggestion: '식물성 진정 추출물' },
  { term: '곰 쓸개', category: 'endangered', suggestion: '피부 진정 특화 성분' },
  { term: '호랑이 뼈', category: 'endangered', suggestion: '표현 삭제' },
  { term: '호랑이 기름', category: 'endangered', suggestion: '식물성 보습 오일' },
  { term: '서각', category: 'endangered', suggestion: '식물성 영양 성분' },
  { term: '코뿔소 뿔', category: 'endangered', suggestion: '케라틴 대체 단백질 성분' },
  { term: '천산갑', category: 'endangered', suggestion: '피부 보호 펩타이드 복합체' },
  { term: '바다거북 오일', category: 'endangered', suggestion: '식물성 스쿠알란·식물성 오일' },

  // 타 제품 비방 (별표5 2.카) — 경쟁 제품 깎아내리기·음해성 표현
  { term: '타사 제품 유해', category: 'slander', suggestion: '자사 안전 기준만 서술' },
  { term: '타사 대비 안전', category: 'slander', suggestion: '자사 기준 안전성 테스트 완료' },
  { term: '타사 제품 부작용', category: 'slander', suggestion: '피부 저자극 테스트 완료' },
  { term: '시중 제품의 위험성', category: 'slander', suggestion: '안심 포뮬러 개발' },
  { term: '화학 덩어리', category: 'slander', suggestion: '자연 유래 성분 배합' },
  { term: '타사는 흉내만', category: 'slander', suggestion: '자사만의 독자적 공법' },
  { term: '기존 제품 효과 없음', category: 'slander', suggestion: '만족도 높은 사용감' },
  { term: '타사 제품 쓰지 마세요', category: 'slander', suggestion: '본 제품 권장 문구로 대체' },
];

/**
 * 문구에서 금지 표현 검색 — 위치·분류·수정 가이드 반환.
 * @param {string} text - 점검할 광고·제품 설명 문구
 * @returns {Array<{index:number, length:number, term:string, category:string, label:string, suggestion:string}>}
 *   index 오름차순, 하이라이트 렌더용. 중첩 매칭은 앞쪽(긴) 항목 우선.
 */
export function lintAdCopy(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const hits = [];
  for (const rule of AD_BANNED_TERMS) {
    let from = 0;
    for (;;) {
      const idx = text.indexOf(rule.term, from);
      if (idx < 0) break;
      hits.push({
        index: idx, length: rule.term.length, term: rule.term,
        category: rule.category, label: AD_CATEGORIES[rule.category].label,
        suggestion: rule.suggestion,
      });
      from = idx + rule.term.length;
    }
  }
  // 위치순 정렬 + 중첩 제거 — 같은 구간에 짧은 표현과 긴 표현이 겹치면 먼저 잡힌 것 유지
  hits.sort((a, b) => a.index - b.index || b.length - a.length);
  const out = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.index < lastEnd) continue;
    out.push(h);
    lastEnd = h.index + h.length;
  }
  return out;
}

/** 카테고리별 건수 집계 — {categoryId: count} */
export function summarizeLint(hits) {
  const out = {};
  for (const h of hits) out[h.category] = (out[h.category] || 0) + 1;
  return out;
}
