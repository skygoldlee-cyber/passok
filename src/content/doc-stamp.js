// src/content/doc-stamp.js — 생성 문서 추적 번호 (문서 추적성 기반)
// @spec CO-22 — cosmetic FO-70 fpDocStamp와 동일 체계: `유형-발행일-내용해시6`
//   내용 해시라 동일 내용 재출력은 동일 번호 → 중복 발행 자동 탐지·변조 대조 가능.
//   시드에는 문서 본문(MD 초안 또는 평문)을 넣는다 — 문서번호 자체는 시드에 넣지 않는다(순환).
import { todayKey, fnv1aHex } from '../core/utils.js';

/**
 * 문서 번호 발급 — `PREFIX-YYYYMMDD-해시6` (예: LOG-20261114-a3f2c1)
 * @param {string} prefix - 문서 유형 접두어 (대문자 2~4자 — 시험 팩이 문서 종류별로 부여)
 * @param {*} seed - 내용 시드 (보통 MD 초안 문자열 — 직렬화 후 해시)
 * @returns {string}
 */
export const docStamp = (prefix, seed) =>
    `${String(prefix || 'DOC').toUpperCase()}-${todayKey().replace(/-/g, '')}-${fnv1aHex(JSON.stringify(seed)).slice(0, 6)}`;
