// src/exams/cosmetic/views/formula-weigh.js — 계량 모드 오버레이 (formula.js에서 분리)
// @spec FO-28
//
// 원료별 투입량 대형 순회 표시 — 장갑 낀 손가락으로 한 원료씩 칭량하며 진행.
// 저장 없이 계산기 상태(calc)만 읽는다.

import { showToast } from '../../../ui-utils.js';
import { getEl, calc, readCalcInputs } from './formula-core.js';

let _weighList = [];
let _weighIdx = 0;

function weighItems() {
  const { targetVolume, unit } = readCalcInputs();
  return calc.rows.filter(r => r.name).map(r => ({
    name: r.name,
    phase: r.phase || '',
    amount: targetVolume != null && r.concentration != null
      ? Math.round(targetVolume * r.concentration) / 100
      : null,
    unit,
  }));
}

function renderWeigh() {
  const it = _weighList[_weighIdx];
  if (!it) { formulaWeighClose(); return; }
  // 항목 전환 — 오버레이/카드가 자체 스크롤 컨테이너라 이전 스크롤이 잔류하면 상단이 잘림
  const ov = getEl('formula-weigh-overlay');
  if (ov) ov.scrollTop = 0;
  const card = ov && ov.querySelector('.f-weigh-card');
  if (card) card.scrollTop = 0;
  const posEl = getEl('formula-weigh-pos');
  const phaseEl = getEl('formula-weigh-phase');
  const nameEl = getEl('formula-weigh-name');
  const amtEl = getEl('formula-weigh-amount');
  if (posEl) posEl.textContent = `${_weighIdx + 1} / ${_weighList.length}`;
  if (phaseEl) phaseEl.textContent = it.phase;
  if (nameEl) nameEl.textContent = it.name;
  if (amtEl) {
    const ok = it.amount != null;
    amtEl.textContent = ok ? `${it.amount.toFixed(2)}${it.unit}` : '배합률·총량을 먼저 입력하세요';
    amtEl.classList.toggle('is-null', !ok);
  }
}

export function formulaWeighOpen() {
  _weighList = weighItems();
  if (!_weighList.length) { showToast('원료명이 입력된 행이 없습니다.', 'info'); return; }
  _weighIdx = 0;
  const ov = getEl('formula-weigh-overlay');
  if (ov) ov.classList.remove('is-hidden');
  renderWeigh();
}

export function formulaWeighNext() {
  if (_weighIdx < _weighList.length - 1) { _weighIdx++; renderWeigh(); return; }
  formulaWeighClose();
}

export function formulaWeighPrev() {
  if (_weighIdx > 0) { _weighIdx--; renderWeigh(); }
}

export function formulaWeighClose() {
  const ov = getEl('formula-weigh-overlay');
  if (ov) ov.classList.add('is-hidden');
}
