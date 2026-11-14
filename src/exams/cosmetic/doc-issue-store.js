// src/exams/cosmetic/doc-issue-store.js — Formula OS 문서 발행 대장 (문서 추적성)
// @spec CO-22 — 공용 팩토리(src/content/doc-issues.js)를 cosmetic 키로 결합.
// localStorage `formula_doc_issues` — 증적 문서(FO-70 스탬프 보유 출력물) 인쇄 발행 시마다
// 문서번호별 발행 기록을 쌓는다. cosmetic은 사업장명 키가 없어 org는 공란 — 점검자 성명은
// FORMULA_INSPECTOR_NAME(FO-69)이 별도 관리한다.
// 실패한 발행은 기록하지 않는다 — 호출부(formula-print printHtml)에서 인쇄 트리거 시 기록.
import { createDocIssueStore } from '../../content/doc-issues.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';

const _issues = createDocIssueStore({ key: STORAGE_KEYS.FORMULA_DOC_ISSUES });

export const listDocIssues = _issues.list;
export const findDocIssue = _issues.findDocIssue;
export const nextDocRev = _issues.nextDocRev;
export const recordDocIssue = _issues.recordDocIssue;
