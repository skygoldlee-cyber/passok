// src/exams/carework/care-share.js
// @spec CO-13,CO-22 — 생성 문서 내보내기 메뉴 (공유·인쇄·복사·다운로드 통합 진입) + 발행 대장·문서번호 부여
// 골격은 content/doc-export.js 공용 팩토리 — 여기서는 carework 프로바이더 주입만 담당한다.
import { createDocExport } from '../../content/doc-export.js';
import { showToast } from '../../ui-utils.js';
import { proFeatureNotice, refreshProBadges } from '../../pro/pro-upgrade.js';
import { docHeadHtml, getOrgName, getDocSign, docSignImages } from './facility.js';
import { pinDocSignBottom } from './doc-md.js';
import { docPrefix, recordDocIssue, nextDocRev } from './doc-issue-store.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';

const _export = createDocExport({
    org: { headHtml: docHeadHtml, name: getOrgName, sign: getDocSign, signImages: docSignImages, pinSignBottom: pinDocSignBottom },
    issue: { prefix: docPrefix, record: recordDocIssue, nextRev: nextDocRev },
    ui: { toast: showToast, proNotice: proFeatureNotice, refreshBadges: refreshProBadges },
    auditKey: STORAGE_KEYS.CARE_SHARE_AUDIT,
    errSel: '.care-calc-err', // care-calc 뷰의 오류 마커
    headCls: 'care-doc-head', // facility.docHeadHtml 산출물의 헤더 클래스
    sheetCls: 'care-export-sheet', // care-tools.css 스타일 계약 (스크림은 care-export-scrim 파생)
});

/**
 * 생성된 문서의 내보내기 메뉴를 연다 (공유 시트·인쇄·복사·PDF·Excel).
 * data-arg="CSS선택자|제목[|mask][|생성핸들러[|보조생성기[|인쇄핸들러[|pro키]]]]"
 * — mask 플래그 시 인명·연락처를 가린 본문, 생성핸들러 지정 시 결과가 비어있으면 먼저 생성,
 * 인쇄핸들러 지정 시 뷰 전용 인쇄(자체 검증·유료 안내 포함)를 호출, pro키는 메뉴 배지·안내에 사용.
 * 수급자 정보의 외부 전송 경로이므로 외부화 액션(공유·복사·다운로드)은 감사 로그에 기록된다.
 * @param {string} arg — data-arg 값
 */
export const careShare = _export.docShare;

/** 메뉴 외부의 직접 복사·내보내기도 동일 감사 로그에 기록 (점검표·제공기록지 등 별도 문서 경로) */
export const shareAudit = _export.shareAudit;
