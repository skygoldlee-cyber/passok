// src/exams/cosmetic/views/formula-batch.js — Formula OS 조제 기록(배치) 뷰 (Phase A)
// @spec FO-16,FO-58,FO-61
//
// 목록 패널(formula-batch-panel) + 상세(formula-batch-detail-panel) +
// 저장(batchSave). 폼 로직(formula-batch-form-panel)은 formula-batch-form.js로
// 분리 — 이 파일은 폼의 draft/readBatchForm·스냅샷 헬퍼를 가져와 저장 경로를 갖고,
// 폼 핸들러를 재수출한다 (registry·테스트는 이 경로로 조회 — formula.js와 동일 패턴).
//
// 배치는 회차 기록: 생성 시 처방의 검증 결과·전성분·제형을 스냅샷으로 저장해
// 처방이 수정·삭제돼도 당시 기록이 보존된다 (batch-store.js 주석 참조).

import { esc } from '../../../sanitize.js';
import { showToast, showConfirm } from '../../../ui-utils.js';
import { showStoreError } from '../../../pro/pro-upgrade.js';
import { showPanel, formulaSubNav, getEl } from './formula.js';
import { getFormula } from '../formula-store.js';
import {
  listBatches, getBatch, getBatchUsage,
  createBatch, updateBatch, deleteBatch,
  QC_FIELDS, HYGIENE_FIELDS,
} from '../batch-store.js';
import { deductStock, daysUntilExpiry } from '../material-ledger.js';
import {
  buildBatchRecordHtml, buildLabelHtml, buildGuideHtml, buildSalesRecordHtml,
  printHtml, batchQcSummary,
} from './formula-print.js';
import {
  draft, readBatchForm, currentAllergyConflicts, buildCheckSnapshot,
} from './formula-batch-form.js';
import { toCsv, downloadCsv } from '../../../content/csv-utils.js';
import { todayKey } from '../../../utils.js';

// 분리 모듈 재수출 — data-click 핸들러 조회 경로 유지 (practice-registry)
export {
  batchNew, batchEdit, batchFormulaChanged, batchCustChanged, suggestExpiryDays,
} from './formula-batch-form.js';

/* =======================================================
   배치 목록 — 필터 · CSV보내기
   ======================================================= */

// 목록 필터 상태 — 패널을 벗어나도 유지 (세션 내)
const listFilter = { formula: '', customer: '', qc: '', delivered: '' };

/** 필터 조건에 맞는 배치만 반환 — CSV보내기도 이 결과를 사용 */
function applyListFilter(batches) {
  return batches.filter(b => {
    if (listFilter.formula && b.formulaName !== listFilter.formula) return false;
    if (listFilter.customer
      && !(b.customerName || '').toLowerCase().includes(listFilter.customer.toLowerCase())) {
      return false;
    }
    if (listFilter.qc) {
      const s = batchQcSummary(b);
      const hasBad = s.bad.length > 0;
      const unchecked = s.unchecked === QC_FIELDS.length;
      if (listFilter.qc === 'bad' && !hasBad) return false;
      if (listFilter.qc === 'ok' && (hasBad || unchecked)) return false;
      if (listFilter.qc === 'unchecked' && !unchecked) return false;
    }
    if (listFilter.delivered === 'yes' && !b.deliveredAt) return false;
    if (listFilter.delivered === 'no' && b.deliveredAt) return false;
    return true;
  });
}

/** 필터 바 렌더 — 처방 옵션은 실제 배치에 있는 처방명으로 구성 */
function renderFilterBar(batches) {
  const bar = getEl('batch-filter-bar');
  if (!bar) return;
  const names = [...new Set(batches.map(b => b.formulaName).filter(Boolean))].sort();
  const opt = (v, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v || '전체')}</option>`;
  const optionsHtml = names.map(n => opt(n, listFilter.formula)).join('');
  bar.innerHTML = `
    <select id="batch-filter-formula" class="form-select batch-filter-sel" aria-label="처방 필터">
      <option value="">전체 처방</option>
      ${optionsHtml}
    </select>
    <input type="search" id="batch-filter-customer" class="form-input batch-filter-input"
      placeholder="고객명 검색" value="${esc(listFilter.customer)}" aria-label="고객명 검색">
    <select id="batch-filter-qc" class="form-select batch-filter-sel" aria-label="QC 상태 필터">
      <option value="">QC 전체</option>
      <option value="bad"${listFilter.qc === 'bad' ? ' selected' : ''}>QC 이상</option>
      <option value="ok"${listFilter.qc === 'ok' ? ' selected' : ''}>QC 정상</option>
      <option value="unchecked"${listFilter.qc === 'unchecked' ? ' selected' : ''}>QC 미기록</option>
    </select>
    <select id="batch-filter-delivered" class="form-select batch-filter-sel" aria-label="인도 여부 필터">
      <option value="">인도 전체</option>
      <option value="yes"${listFilter.delivered === 'yes' ? ' selected' : ''}>인도 완료</option>
      <option value="no"${listFilter.delivered === 'no' ? ' selected' : ''}>미인도</option>
    </select>
    <button class="btn btn-secondary btn-sm" data-click="batchExportCsv" title="필터된 목록을 CSV로 저장">
      <i class="fa-solid fa-file-csv" aria-hidden="true"></i> CSV
    </button>
    <button class="btn btn-secondary btn-sm" data-click="batchPrintSales" title="인도 완료 건을 판매내역서로 인쇄 (FO-58)">
      <i class="fa-solid fa-receipt" aria-hidden="true"></i> 판매내역서
    </button>`;
  const bind = (id, key, evt) => {
    const el = getEl(id);
    if (el) el.addEventListener(evt, () => { listFilter[key] = el.value.trim(); openBatchPanel(); });
  };
  bind('batch-filter-formula', 'formula', 'change');
  bind('batch-filter-qc', 'qc', 'change');
  bind('batch-filter-delivered', 'delivered', 'change');
  const custEl = getEl('batch-filter-customer');
  if (custEl) custEl.addEventListener('input', () => { listFilter.customer = custEl.value.trim(); renderBatchList(); });
}

export function openBatchPanel() {
  showPanel('formula-batch-panel');
  const subnav = getEl('formula-batch-subnav');
  if (subnav) subnav.innerHTML = formulaSubNav('batch');
  const batches = listBatches();
  renderFilterBar(batches);
  renderBatchList(batches);
}

/** 목록 본문만 다시 그림 — 필터 입력 중 필터 바 재생성(포커스 손실)을 피하기 위함 */
function renderBatchList(batches) {
  const list = getEl('batch-list');
  if (!list) return;
  const all = batches || listBatches();

  const usage = getBatchUsage();
  const usageEl = getEl('batch-list-usage');
  const filtered = applyListFilter(all);
  if (usageEl) {
    usageEl.textContent = filtered.length === all.length
      ? `기록 ${usage.count}/${usage.limit}`
      : `기록 ${filtered.length}/${all.length} (총 ${usage.limit} 한도)`;
  }

  if (!all.length) {
    list.innerHTML = `
      <div class="formula-empty">
        <i class="fa-solid fa-clipboard-list" aria-hidden="true"></i>
        <h4>조제 기록이 없습니다</h4>
        <p>My 포뮬러 카드의 [조제 기록] 버튼으로 첫 회차를 기록해 보세요.</p>
        <button class="btn btn-primary" data-click="openFormulaList"><i class="fa-solid fa-book" aria-hidden="true"></i> My 포뮬러 열기</button>
      </div>`;
    return;
  }
  if (!filtered.length) {
    list.innerHTML = `
      <div class="formula-empty">
        <i class="fa-solid fa-filter" aria-hidden="true"></i>
        <h4>필터 조건에 맞는 기록이 없습니다</h4>
        <p>필터를 바꾸거나 초기화해 보세요.</p>
        <button class="btn btn-secondary" data-click="batchFilterReset" title="모든 필터 조건을 초기화"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> 필터 초기화</button>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(b => {
    const s = batchQcSummary(b);
    const qcHtml = s.bad.length
      ? `<span class="f-check f-check-banned">QC 이상: ${esc(s.bad.join('·'))}</span>`
      : (s.unchecked === QC_FIELDS.length
          ? '<span class="f-check f-check-unknown">QC 미기록</span>'
          : `<span class="f-check f-check-ok">QC 정상 ${QC_FIELDS.length - s.bad.length - s.unchecked}/${QC_FIELDS.length}</span>`);
    const hygHtml = `<span class="f-check ${s.hygDone === s.hygTotal ? 'f-check-ok' : 'f-check-warn'}">위생 ${s.hygDone}/${s.hygTotal}</span>`;
    const expiryHtml = b.expiryAt ? expiryBadge(b.expiryAt) : '';
    // 인도일 — 판매내역서 근거 (미기록 시 회색 배지)
    const delivHtml = b.deliveredAt
      ? `<span class="f-check f-check-ok">인도 ${esc(b.deliveredAt)}</span>`
      : '<span class="f-check f-check-unknown">미인도</span>';
    // QC 이상인데 조치 미기록이면 경고 배지
    const dispHtml = s.bad.length
      ? (b.disposition
          ? `<span class="f-check f-check-warn">조치: ${esc(b.disposition)}</span>`
          : '<span class="f-check f-check-banned">조치 미기록</span>')
      : (b.disposition ? `<span class="f-check f-check-unknown">조치: ${esc(b.disposition)}</span>` : '');
    return `
      <div class="formula-card">
        <div class="formula-card-head">
          <h4 class="formula-card-name">${esc(b.batchNo)} — ${esc(b.formulaName)}</h4>
          <span class="formula-card-meta">조제 ${esc((b.madeAt || '').replace('T', ' '))} · ${b.targetVolume != null ? `${esc(b.targetVolume)}${esc(b.unit || 'g')}` : '총량 미지정'}${b.customerName ? ` · ${esc(b.customerName)}` : ''}</span>
        </div>
        <div class="formula-card-checks">${qcHtml}${hygHtml}${expiryHtml}${delivHtml}${dispHtml}</div>
        <div class="formula-card-actions">
          <button class="btn btn-primary btn-sm" data-click="batchOpen" data-arg="${esc(b.id)}" title="조제 기록 상세 보기"><i class="fa-solid fa-eye" aria-hidden="true"></i> 상세</button>
          <button class="btn btn-secondary btn-sm" data-click="batchPrintLabel" data-arg="${esc(b.id)}" title="제품 라벨 인쇄"><i class="fa-solid fa-tag" aria-hidden="true"></i> 라벨</button>
          <button class="btn btn-secondary btn-sm" data-click="batchPrintGuide" data-arg="${esc(b.id)}" title="사용 안내문 인쇄"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> 안내문</button>
        </div>
      </div>`;
  }).join('');
}

function expiryBadge(expiryAt) {
  const days = daysUntilExpiry({ expiryAt });
  if (days == null) return '';
  if (days < 0) return `<span class="f-check f-check-banned">사용기한 경과 D+${Math.abs(days)}</span>`;
  if (days <= 30) return `<span class="f-check f-check-warn">기한 D-${days}</span>`;
  return `<span class="f-check f-check-unknown">기한 ${esc(expiryAt)}</span>`;
}

export function batchFilterReset() {
  listFilter.formula = '';
  listFilter.customer = '';
  listFilter.qc = '';
  listFilter.delivered = '';
  openBatchPanel();
}

/* ---- CSV보내기 — 현재 필터가 적용된 목록 기준 ---- */

const BATCH_CSV_HEADERS = [
  '배치번호', '처방', '고객', '조제일시', '제조량', '단위', '제형',
  'QC이상', 'QC미확인', '위생', '실측pH', '사용기한', '인도일', '조치',
  '사용LOT', '원료DB버전', '메모',
];

function batchToCsvRow(b) {
  const s = batchQcSummary(b);
  return [
    b.batchNo || '',
    b.formulaName || '',
    b.customerName || '',
    (b.madeAt || '').replace('T', ' '),
    b.targetVolume != null ? b.targetVolume : '',
    b.unit || '',
    b.formulation || '',
    s.bad.join(';'),
    s.unchecked,
    `${s.hygDone}/${s.hygTotal}`,
    b.phMeasured != null ? b.phMeasured : '',
    b.expiryAt || '',
    b.deliveredAt || '',
    b.disposition || '',
    (b.materialLots || []).map(l => `${l.name}:${l.lot || '-'}`.trim()).join('; '),
    (b.checkSnapshot && b.checkSnapshot.dbVersion) || '',
    b.notes || '',
  ];
}

export function batchExportCsv() {
  const rows = applyListFilter(listBatches());
  if (!rows.length) { showToast('보낼 조제 기록이 없습니다.', 'warning'); return; }
  downloadCsv(
    toCsv([...BATCH_CSV_HEADERS], rows, batchToCsvRow),
    `batches_${todayKey()}.csv`
  );
  showToast(`조제 기록 ${rows.length}건을 CSV로 저장했습니다.`, 'success');
}

/* =======================================================
   저장 — 폼 상태·스냅샷 헬퍼는 formula-batch-form.js
   ======================================================= */

export async function batchSave() {
  const data = readBatchForm();

  // 알레르기 교차검증 — 신규·보정 모두 저장 전 확인 (기록이므로 차단이 아닌 확인)
  const conflicts = currentAllergyConflicts();
  if (conflicts.length) {
    const ok = await showConfirm(
      `고객 알레르기 이력 원료가 처방에 포함되어 있습니다:\n${conflicts.join(', ')}\n\n그래도 이 조제 기록을 저장할까요?`,
      '알레르기 원료 확인'
    );
    if (!ok) return;
  }

  if (draft.editingId) {
    // 보정 — QC·위생·기한·고객·메모·실측 pH만 갱신
    const r = updateBatch(draft.editingId, {
      customerId: data.customerId, customerName: data.customerName,
      targetVolume: data.targetVolume, unit: data.unit,
      qc: data.qc, phMeasured: data.phMeasured, hygiene: data.hygiene,
      expiryAt: data.expiryAt, deliveredAt: data.deliveredAt,
      disposition: data.disposition, materialLots: data.materialLots,
      notes: data.notes,
    });
    if (!r.ok) { showToast(r.error || '저장에 실패했습니다.', 'error'); return; }
    showToast(`${r.batch.batchNo} 기록이 보정되었습니다.`, 'success');
    batchOpen(r.batch.id);
    return;
  }

  const formula = data.formulaId ? getFormula(data.formulaId) : null;
  if (!formula) { showToast('조제한 처방을 선택하세요.', 'error'); return; }
  const r = createBatch({
    ...data,
    formulaName: formula.name,
    formulation: (formula.customer && formula.customer.formulation) || '',
    fullIngredients: formula.fullIngredients || [],
    checkSnapshot: buildCheckSnapshot(formula),
  });
  if (!r.ok) { showStoreError(r, '조제 기록', showToast); return; }

  // 재고 자동 차감 (FO-61) — 신규 배치에만 적용, 보정 모드는 감사 정합을 위해 미차감.
  // 선택된 사용 LOT의 처방 소요량(총량 × 배합비)을 장부 잔량에서 차감한다.
  const lots = /** @type {{name:string, materialId:string, lot:string}[]} */ (
    Array.isArray(data.materialLots) ? data.materialLots.filter(Boolean) : []);
  if (lots.length && data.targetVolume != null && !Number.isNaN(data.targetVolume)) {
    const vol = data.targetVolume;
    const usage = lots.map(lot => {
      const ing = (formula.ingredients || []).find(i => (i && i.name || '').trim() === lot.name);
      return {
        materialId: lot.materialId, name: lot.name,
        amount: ing && ing.concentration != null
          ? Math.round(vol * ing.concentration) / 100 : 0,
      };
    });
    const res = deductStock(usage);
    if (!res.ok) showToast('재고 차감 저장에 실패했습니다 — 원료 장부를 확인하세요.', 'error');
    if (res.shortages.length) {
      showToast(`재고 부족: ${res.shortages.map(s => `${s.name} 잔량 ${s.had}`).join(' · ')} — 발주가 필요합니다.`, 'error');
    } else if (res.deducted.length) {
      showToast(`재고 차감: ${res.deducted.map(d => `${d.name} −${d.amount} (잔량 ${d.remain})`).join(' · ')}`, 'info');
    }
  }

  showToast(`${r.batch.batchNo} 조제 기록이 저장되었습니다.`, 'success');
  batchOpen(r.batch.id);
}

/* =======================================================
   배치 상세 · 삭제 · 인쇄
   ======================================================= */

export function batchOpen(id) {
  const b = getBatch(id);
  if (!b) { showToast('조제 기록을 찾을 수 없습니다.', 'error'); return; }
  showPanel('formula-batch-detail-panel');
  const subnav = getEl('batch-detail-subnav');
  if (subnav) subnav.innerHTML = formulaSubNav('batch');
  const box = getEl('batch-detail');
  if (!box) return;

  const qcRowsHtml = QC_FIELDS.map(f => {
    const v = b.qc && b.qc[f.key];
    const cls = v === '이상' ? 'f-check-banned' : (v === '정상' ? 'f-check-ok' : 'f-check-unknown');
    return `<div class="batch-qc-row"><span class="batch-qc-label">${esc(f.label)}</span><span class="f-check ${cls}">${esc(v || '미기록')}</span></div>`;
  }).join('');
  const hygHtml = HYGIENE_FIELDS.map(f => {
    const done = !!(b.hygiene && b.hygiene[f.key]);
    return `<span class="f-check ${done ? 'f-check-ok' : 'f-check-unknown'}">${done ? '✓' : '—'} ${esc(f.label)}</span>`;
  }).join(' ');
  const snap = b.checkSnapshot;
  const snapHtml = snap
    ? `<div class="formula-card-meta">규정 검증 스냅샷${snap.dbVersion ? ` (원료 DB v${esc(snap.dbVersion)})` : ''} — 정상 ${snap.ok}${snap.warn ? ` · 초과 ${snap.warn}` : ''}${snap.banned ? ` · 금지 ${snap.banned}` : ''}${snap.unknown ? ` · 확인 ${snap.unknown}` : ''}${snap.stabWarn ? ` · 안정성 경고 ${snap.stabWarn}` : ''}</div>`
    : '';

  box.innerHTML = `
    <div class="formula-card">
      <div class="formula-card-head">
        <h4 class="formula-card-name">${esc(b.batchNo)} — ${esc(b.formulaName)}</h4>
        <span class="formula-card-meta">조제 ${esc((b.madeAt || '').replace('T', ' '))} · ${b.targetVolume != null ? `${esc(b.targetVolume)}${esc(b.unit || 'g')}` : '총량 미지정'}${b.formulation ? ` · 제형 ${esc(b.formulation)}` : ''}</span>
      </div>
      <div class="formula-card-customer"><i class="fa-solid fa-user" aria-hidden="true"></i> ${esc(b.customerName || '고객 미기록')} · 권장 사용기한 ${esc(b.expiryAt || '미기록')}${b.deliveredAt ? ` · 인도일 ${esc(b.deliveredAt)}` : ' · 미인도'}</div>
      <div class="batch-qc-grid">${qcRowsHtml}</div>
      ${b.phMeasured != null ? `<div class="formula-card-meta">실측 pH: ${esc(String(b.phMeasured))}</div>` : ''}
      ${b.disposition ? `<div class="formula-card-meta">QC 이상 조치: ${esc(b.disposition)}</div>` : ''}
      ${b.materialLots && b.materialLots.length ? `<div class="formula-card-meta">사용 LOT: ${esc(b.materialLots.map(l => (l.name + ' ' + (l.lot || '')).trim()).join(' · '))}</div>` : ''}
      <div class="formula-card-checks">${hygHtml}</div>
      ${b.fullIngredients && b.fullIngredients.length ? `<div class="formula-card-inci"><i class="fa-solid fa-list-ol" aria-hidden="true"></i> ${esc(b.fullIngredients.join(', '))}</div>` : ''}
      ${snapHtml}
      ${b.notes ? `<div class="formula-card-meta">메모: ${esc(b.notes)}</div>` : ''}
      <div class="formula-card-actions">
        <button class="btn btn-secondary btn-sm" data-click="batchPrintRecord" data-arg="${esc(b.id)}" title="조제 기록지 인쇄"><i class="fa-solid fa-print" aria-hidden="true"></i> 기록지</button>
        <button class="btn btn-secondary btn-sm" data-click="batchPrintLabel" data-arg="${esc(b.id)}" title="제품 라벨 인쇄"><i class="fa-solid fa-tag" aria-hidden="true"></i> 라벨</button>
        <button class="btn btn-secondary btn-sm" data-click="batchPrintGuide" data-arg="${esc(b.id)}" title="고객용 사용 안내문 인쇄"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> 안내문</button>
        <button class="btn btn-secondary btn-sm" data-click="batchEdit" data-arg="${esc(b.id)}" title="QC·위생·기한·메모 보정"><i class="fa-solid fa-pen" aria-hidden="true"></i> 보정</button>
        <button class="btn btn-secondary btn-sm f-danger" data-click="batchDelete" data-arg="${esc(b.id)}" title="조제 기록 삭제 (복구 불가)"><i class="fa-solid fa-trash" aria-hidden="true"></i> 삭제</button>
      </div>
    </div>`;
}

export async function batchDelete(id) {
  const b = getBatch(id);
  if (!b) return;
  const ok = await showConfirm(`${b.batchNo} 조제 기록을 삭제할까요? 기록은 되돌릴 수 없습니다.`, '조제 기록 삭제');
  if (!ok) return;
  const r = deleteBatch(id);
  if (!r.ok) { showToast(r.error || '삭제에 실패했습니다.', 'error'); return; }
  showToast('조제 기록이 삭제되었습니다.', 'success');
  openBatchPanel();
}

function printBatch(id, builder, _emptyMsg) {
  const b = getBatch(id);
  if (!b) { showToast('조제 기록을 찾을 수 없습니다.', 'error'); return; }
  printHtml(builder(b));
}

export function batchPrintRecord(id) { printBatch(id, buildBatchRecordHtml); }
export function batchPrintLabel(id) { printBatch(id, buildLabelHtml); }
export function batchPrintGuide(id) { printBatch(id, buildGuideHtml); }

/**
 * 판매내역서 인쇄 (FO-58) — 인도일(deliveredAt)이 기록된 배치만 포함.
 * 맞춤형화장품 판매내역 기록·보존 증적. deliveredAt 내림차순 정렬.
 */
export function batchPrintSales() {
  const delivered = listBatches()
    .filter(b => b.deliveredAt)
    .sort((a, b) => String(b.deliveredAt).localeCompare(String(a.deliveredAt)));
  printHtml(buildSalesRecordHtml(delivered));
}
