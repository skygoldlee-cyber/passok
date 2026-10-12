// src/exams/cosmetic/views/formula-hub.js — Formula OS 허브(메뉴)·점검 리마인더·고대비 (formula.js에서 분리)
// @spec FO-31,FO-33,FO-62,FO-65

import { esc } from '../../../sanitize.js';
import { lawUrlFor } from '../../../law-links.js';
import { showToast } from '../../../ui-utils.js';
import { switchView } from '../../../views/navigation.js';
import { getItem, getJSON, setJSON } from '../../../storage.js';
import { STORAGE_KEYS } from '../../../storage-keys.js';
import { getFormulaUsage } from '../formula-store.js';
import { getBizType, setBizType, BIZ_TYPES, BIZ_GUIDE } from '../biz-profile.js';
import { getEl, showPanel } from './formula-core.js';

/* =======================================================
   허브 / 서브뷰 전환
   ======================================================= */

/**
 * 사업 유형 프로파일 적용 (FO-33) — 유형 선택 칩 렌더 + 허브 카드 가시 게이트.
 * 카드의 data-biz="custom mfg" 목록에 현재 유형이 없으면 숨긴다.
 */
function applyBizProfile() {
  const biz = getBizType();
  const bar = document.getElementById('formula-biz-bar');
  if (bar) {
    bar.innerHTML = `<span class="formula-biz-label"><i class="fa-solid fa-briefcase" aria-hidden="true"></i> 사업 유형</span>` +
      Object.values(BIZ_TYPES).map(t =>
        `<button type="button" class="formula-biz-chip${t.id === biz ? ' is-active' : ''}" data-click="formulaSetBizType" data-arg="${esc(t.id)}" title="${esc(t.desc)}" aria-pressed="${t.id === biz}">${esc(t.label)}</button>`
      ).join('');
  }
  document.querySelectorAll('#formula-menu-panel [data-biz]').forEach(card => {
    const allow = (/** @type {HTMLElement} */(card).dataset.biz || '').split(/\s+/);
    card.classList.toggle('is-hidden', !allow.includes(biz));
  });
  // 유형별 배지·설명·그룹 제목 오버라이드 — data-badge-<biz>는 비순번 배지,
  // data-desc-<biz>·data-cardtitle-<biz>는 카드 설명·제목, 그룹 제목은 data-title-<biz>·data-icon-<biz>.
  // 원본은 첫 적용 시 dataset에 백업해 유형 왕복 시 복원한다.
  document.querySelectorAll('#formula-menu-panel .trainer-menu-card').forEach(card => {
    const badge = /** @type {HTMLElement|null} */(card.querySelector('.trainer-step-badge'));
    if (badge) {
      if (badge.dataset.origText === undefined) {
        badge.dataset.origText = badge.textContent || '';
        badge.dataset.origCont = badge.classList.contains('is-continuous') ? '1' : '';
      }
      const badgeOverride = card.getAttribute(`data-badge-${biz}`);
      badge.classList.toggle('is-continuous', !!badgeOverride || badge.dataset.origCont === '1');
      if (badgeOverride || badge.dataset.origCont === '1') badge.textContent = badgeOverride || badge.dataset.origText;
    }
    const desc = /** @type {HTMLElement|null} */(card.querySelector('p'));
    if (desc) {
      if (desc.dataset.origHtml === undefined) desc.dataset.origHtml = desc.innerHTML;
      desc.innerHTML = card.getAttribute(`data-desc-${biz}`) || desc.dataset.origHtml;
    }
    const title = /** @type {HTMLElement|null} */(card.querySelector('h4'));
    if (title) {
      if (title.dataset.origText === undefined) title.dataset.origText = title.textContent || '';
      title.textContent = card.getAttribute(`data-cardtitle-${biz}`) || title.dataset.origText;
    }
  });
  document.querySelectorAll('#formula-menu-panel [data-title-text]').forEach(el => {
    const span = /** @type {HTMLElement} */(el);
    const host = /** @type {HTMLElement} */(span.parentElement);
    if (span.dataset.origText === undefined) span.dataset.origText = span.textContent || '';
    span.textContent = host.getAttribute(`data-title-${biz}`) || span.dataset.origText;
    const icon = host.querySelector('i');
    if (icon) {
      if (icon.dataset.origClass === undefined) icon.dataset.origClass = icon.className;
      icon.className = host.getAttribute(`data-icon-${biz}`) || icon.dataset.origClass;
    }
  });
  // 단계 배지 재번호 — 숨겨진 카드로 번호가 건너뛰지 않게, 노출 카드 기준 1부터.
  // '상시'·'제10조' 등 is-continuous 배지는 순번이 아니므로 유지한다.
  let step = 1;
  document.querySelectorAll('#formula-menu-panel .trainer-menu-card:not(.is-hidden)').forEach(card => {
    const badge = card.querySelector('.trainer-step-badge:not(.is-continuous)');
    if (badge) badge.textContent = String(step++);
  });
  const guide = document.getElementById('formula-biz-guide');
  if (guide) guide.textContent = BIZ_GUIDE[biz] || BIZ_GUIDE.custom;
}

/* =======================================================
   점검 주기 리마인더 (FO-62) — 마지막 체크리스트 저장 후 30일
   경과 시 법규 준수 카드에 재점검 배지를 표시한다.
   미시작(저장 자체 없음) 상태는 리마인드하지 않는다 —
   '미실시'는 보고서의 '기록 없음' 표기가 이미 증적 역할을 한다.
   ======================================================= */

const COMPLIANCE_STALE_DAYS = 30;
const BACKUP_STALE_DAYS = 30;   // FO-65 — 증적 백업 주기

// FO-65 — 백업 대상이 되는 증적 자산 키. 하나라도 데이터가 있어야 '백업할 것이 있다'로 본다.
const EVIDENCE_KEYS = [
  STORAGE_KEYS.FORMULA_ITEMS, STORAGE_KEYS.BATCH_ITEMS, STORAGE_KEYS.CUSTOMER_ITEMS,
  STORAGE_KEYS.MATERIAL_ITEMS, STORAGE_KEYS.ADVERSE_ITEMS, STORAGE_KEYS.FORMULA_AUDIT_LOG,
];

function complianceSetKey(biz) {
  return {
    custom: STORAGE_KEYS.COMPLIANCE_CHECKS,
    mfg: STORAGE_KEYS.COMPLIANCE_CHECKS_MFG,
    sales: STORAGE_KEYS.COMPLIANCE_CHECKS_SALES,
  }[biz] || STORAGE_KEYS.COMPLIANCE_CHECKS;
}

function renderComplianceReminder() {
  const card = document.querySelector('#formula-menu-panel [data-click="openCompliancePanel"]');
  if (!card) return;
  const prev = card.querySelector('.comp-reminder-badge');
  if (prev) prev.remove();
  const saved = getJSON(complianceSetKey(getBizType()));
  const updatedAt = saved && saved.updatedAt ? new Date(saved.updatedAt).getTime() : 0;
  if (!updatedAt || Number.isNaN(updatedAt)) return;
  const days = Math.floor((Date.now() - updatedAt) / 86400000);
  if (days < COMPLIANCE_STALE_DAYS) return;
  const badge = document.createElement('span');
  badge.className = 'f-check f-check-warn comp-reminder-badge';
  badge.textContent = `재점검 권장 — 마지막 점검 ${days}일 전`;
  const desc = card.querySelector('p');
  if (desc) desc.appendChild(document.createElement('br'));
  (desc || card).appendChild(badge);
}

/**
 * FO-65 — 증적 백업 리마인더. 증적 데이터(포뮬러·배치·고객·원료·이상사례·출력 이력)가
 * 있고 마지막 백업이 30일 경과했거나 한 번도 없으면 종합 보고서 카드에 배지 표시.
 * 백업보내기(exportData)가 LAST_BACKUP_AT을 스탬프한다.
 */
function renderBackupReminder() {
  const card = document.querySelector('#formula-menu-panel [data-click="auditPrintReport"]');
  if (!card) return;
  const prev = card.querySelector('.backup-reminder-badge');
  if (prev) prev.remove();
  // 백업할 증적이 없으면 알리지 않는다
  const hasEvidence = EVIDENCE_KEYS.some(k => {
    const v = getJSON(k);
    return Array.isArray(v) ? v.length > 0 : (v && typeof v === 'object' && Object.keys(v).length > 0);
  });
  if (!hasEvidence) return;
  const last = getItem(STORAGE_KEYS.LAST_BACKUP_AT);
  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : Infinity;
  if (days < BACKUP_STALE_DAYS) return;
  const badge = document.createElement('span');
  badge.className = 'f-check f-check-warn backup-reminder-badge';
  badge.textContent = last
    ? `증적 백업 권장 — 마지막 백업 ${days}일 전`
    : '증적 백업 권장 — 백업 이력 없음 (대시보드 백업보내기)';
  const desc = card.querySelector('p');
  if (desc) desc.appendChild(document.createElement('br'));
  (desc || card).appendChild(badge);
}

/** 사업 유형 변경 — 허브 재렌더 + 서브패널이면 메뉴로 복귀 (FO-33) */
export function formulaSetBizType(type) {
  if (!setBizType(type)) return;
  const t = BIZ_TYPES[getBizType()] || BIZ_TYPES.custom;
  showToast(`사업 유형을 "${t.label}"(으)로 변경했습니다. 체크리스트·메뉴가 유형별 기준으로 바뀝니다.`, 'success');
  initFormulaView();
}

export function initFormulaView() {
  showPanel('formula-menu-panel');
  applyFormulaContrast();
  applyBizProfile();
  renderComplianceReminder();
  renderBackupReminder();
  const usage = getFormulaUsage();
  const badge = getEl('formula-usage-badge');
  if (badge) badge.textContent = `저장 ${usage.count}/${usage.limit}`;
  // data-law 정적 링크를 lawdb 생성 테이블로 수화 — URL SSOT는 law-links.js.
  // 매칭 실패 시 마크업의 정적 href(최신 통합본 주소)가 그대로 동작한다.
  document.querySelectorAll('#formula-view a[data-law]').forEach(a => {
    const key = /** @type {HTMLElement} */(a).dataset.law;
    const url = key ? lawUrlFor(key) : '';
    if (url) /** @type {HTMLAnchorElement} */(a).href = url;
  });
}

export function exitFormulaSubView() {
  initFormulaView();
}

export function openIngredientDict() {
  switchView('dictionary-view', { scrollTop: true });
}

/* =======================================================
   고대비 모드 (FO-31) — 조명 반사·습한 화면 대응 (#formula-view 스코프)
   ======================================================= */
function applyFormulaContrast() {
  const view = document.getElementById('formula-view');
  const btn = getEl('formula-contrast-btn');
  const on = getJSON(STORAGE_KEYS.FORMULA_HIGH_CONTRAST) === true;
  if (view) view.classList.toggle('formula-hc', on);
  if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
}

export function formulaToggleContrast() {
  const on = !(getJSON(STORAGE_KEYS.FORMULA_HIGH_CONTRAST) === true);
  setJSON(STORAGE_KEYS.FORMULA_HIGH_CONTRAST, on);
  applyFormulaContrast();
  showToast(on ? '고대비 모드를 켰습니다.' : '고대비 모드를 껐습니다.', 'info');
}
