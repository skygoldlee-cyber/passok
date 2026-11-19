#!/usr/bin/env node
/**
 * slot_insert.js — 교재 슬롯 본문 삽입 유틸 (AI 제작 도구용)
 * @spec none — tmp/merge_draft.js 등 콘텐츠 편입 스크립트 공용
 *
 * `<!-- 작성: 본문 -->` 슬롯에 본문을 삽입한다.
 *
 * 주의 — String#replace 치환 문자열 함정:
 *   replace(re, "$1" + insert) 처럼 치환 인자를 문자열로 쓰면
 *   insert 안의 `$1`·`$15`·`$&`·`$`` 등이 캡처 그룹/특수 패턴으로
 *   해석되어 수식이 깨진다(2026-11 fireelec 과목2 수식 대량 훼손 사고).
 *   반드시 함수 치환자를 써서 insert를 리터럴로 다뤄야 한다.
 */

'use strict';

/**
 * 교재 문서에서 `### <slotTitle>` 슬롯에 본문을 삽입한다.
 * - 슬롯에 `<!-- 작성: 본문 -->` 플레이스홀더가 있으면 그 자리에 삽입
 * - 이미 채워진 슬롯이면 해당 슬롯이 속한 챕터 말미(다음 `### N.` 또는 `## ` 직전)에 추가
 * @param {string} doc 교재 마크다운 전문
 * @param {string} slotTitle 슬롯 제목(`### ` 뒤의 텍스트, 예: "1. 직류회로")
 * @param {string} insert 삽입할 본문
 * @returns {string} 삽입 결과 문서
 * @throws {Error} 슬롯 헤딩이 없으면 예외
 */
function insertBodyIntoSlot(doc, slotTitle, insert) {
    const esc = slotTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slotRe = new RegExp(`(### ${esc}\\n\\n)<!-- 작성: 본문 -->`);
    if (slotRe.test(doc)) {
        // 함수 치환자 필수 — insert 내 $ 패턴을 리터럴로 보존
        return doc.replace(slotRe, (_m, g1) => g1 + insert);
    }
    const hm = new RegExp(`### ${esc}\\n`).exec(doc);
    if (!hm) throw new Error(`슬롯 헤딩 없음: ${slotTitle}`);
    const nxt = doc.slice(hm.index).search(/\n(### \d+\.|## )/);
    const cut = nxt === -1 ? doc.length : hm.index + nxt;
    return doc.slice(0, cut).replace(/\n+$/, '') + `\n\n${insert}\n` + doc.slice(cut);
}

module.exports = { insertBodyIntoSlot };
