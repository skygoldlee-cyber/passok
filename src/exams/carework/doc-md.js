// src/exams/carework/doc-md.js — 내보내기 문서 마크다운 초안 빌더 바인딩 (CO-13)
// @spec CO-13,DA-24 — 생성 문서는 MD를 표준 초안으로 삼아 docx·xlsx·html을 파생한다.
//   빌더 구현은 공용 팩토리(src/content/doc-md.js)에 단일 정본 — 이 모듈은 carework의
//   기관명·서명 설정 공급자(facility.js)를 결합해 기존 호출 계약을 유지한다.
import { createDocMd } from '../../content/doc-md.js';
import { getOrgName, getDocSign } from './facility.js';

const _docMd = createDocMd({ org: getOrgName, sign: getDocSign, images: () => { const s = getDocSign(); return s.signImage ? { author: s.signImage } : {}; } });

export const docMdHead = _docMd.docMdHead;
export const docMdSign = _docMd.docMdSign;
export const mdTable = _docMd.mdTable;
export const csvToMdTable = _docMd.csvToMdTable;
export const mdToHtml = _docMd.mdToHtml;
export const pinDocSignBottom = _docMd.pinDocSignBottom;
