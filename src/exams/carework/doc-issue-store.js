// src/exams/carework/doc-issue-store.js — carework 문서 발행 대장 (문서 추적성)
// @spec CO-22 — 공용 팩토리(src/content/doc-issues.js)를 carework 키·기관명·유형 접두어로 결합.
// localStorage `carework_doc_issues` — 내보내기(다운로드·공유·인쇄) 성공 시마다 문서번호별
// 발행 기록을 쌓는다. 실패한 발행은 기록하지 않는다 — 호출부(care-share)에서 성공 후 호출.
import { createDocIssueStore } from '../../content/doc-issues.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { getOrgName } from './facility.js';

const _issues = createDocIssueStore({ key: STORAGE_KEYS.CARE_DOC_ISSUES, org: getOrgName });

// 문서 유형 접두어 — data-arg 제목에서 유형 추론 (docStamp의 접두어 인자)
/** @type {Array<[RegExp, string]>} */
const _PREFIX = [
    [/요양일지/, 'LOG'], [/인수인계/, 'HND'], [/사고|낙상/, 'INC'], [/면회|방문/, 'VST'],
    [/평가|체크|점검/, 'CHK'], [/근무|로스터/, 'RST'], [/명부|수급자|대상자/, 'CLT'],
    [/계산|부담금|비용/, 'CST'], [/양식|서식|폼/, 'FRM'],
];
/** @param {string} title @returns {string} 문서 유형 접두어 (미매칭 'DOC') */
export const docPrefix = title => {
    for (const [re, p] of _PREFIX) if (re.test(String(title))) return p;
    return 'DOC';
};

export const listDocIssues = _issues.list;
export const findDocIssue = _issues.findDocIssue;
export const nextDocRev = _issues.nextDocRev;
export const recordDocIssue = _issues.recordDocIssue;
