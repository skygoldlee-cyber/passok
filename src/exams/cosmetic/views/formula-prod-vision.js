// src/exams/cosmetic/views/formula-prod-vision.js — 기성품 사진 인식 뷰 (FO-41~43·46·54·55)
// @spec FO-41,FO-42,FO-43,FO-46,FO-54,FO-55
//
// LLM 초안 → 칩 검토 → 기존 저장 경로. 폼 공유 상태(prodForm·renderInciChips)는
// formula-prod-state.js에서 가져와 이 모듈→products 역참조를 피한다.

import { esc } from '../../../sanitize.js';
import { showToast } from '../../../ui-utils.js';
import { getEl, getIndex } from './formula.js';
import { suspectOcrSubstitutions } from '../formula-check.js';
import { prodForm, renderInciChips } from './formula-prod-state.js';
import {
  getVisionKey, saveVisionKey, clearVisionKey, maskVisionKey,
  getVisionModel, saveVisionModel, validateVisionKey,
  fileToBase64Jpeg, extractProductFromImages,
  getVisionHiRes, saveVisionHiRes,
} from '../product-vision.js';

/** 사진 인입 상태 — 슬롯별 전처리 결과(base64)·썸네일 data URL */
const vision = /** @type {{front: {data:string, mimeType:string}|null, back: {data:string, mimeType:string}|null, abort: AbortController|null}} */ ({ front: null, back: null, abort: null });

/** 슬롯 썸네일·버튼 상태 갱신 */
function renderPhotoSlot(slot) {
  const img = vision[slot];
  const thumb = getEl(`prod-photo-${slot}-thumb`);
  if (thumb) {
    thumb.innerHTML = img
      ? `<img src="data:${img.mimeType};base64,${img.data}" alt="${slot === 'front' ? '정면' : '후면'} 사진 미리보기">`
      : '';
  }
  const clearBtn = getEl(`prod-photo-${slot}-clear`);
  if (clearBtn) clearBtn.classList.toggle('is-hidden', !img);
  const readBtn = getEl('prod-vision-read');
  if (readBtn) readBtn.disabled = !vision.back;
}

function visionStatus(text, isError) {
  const s = getEl('prod-vision-status');
  if (!s) return;
  s.textContent = text || '';
  s.classList.toggle('is-error', !!isError);
}

/** 키 상태 표시 — 설정됨(마스킹) / 미설정. 모델 입력란도 현재값으로 갱신 (FO-46) */
function renderVisionKeyState() {
  const stateEl = getEl('prod-key-state');
  const key = getVisionKey();
  if (stateEl) stateEl.textContent = key ? `(설정됨 ${maskVisionKey(key)})` : '(미설정)';
  const modelInput = getEl('prod-gemini-model');
  if (modelInput && !modelInput.value) modelInput.value = getVisionModel();
}

export function productVisionToggle() {
  const panel = getEl('prod-photo-panel');
  if (!panel) return;
  const open = panel.classList.toggle('is-hidden');
  const btn = document.querySelector('[data-click="productVisionToggle"]');
  if (btn) btn.setAttribute('aria-expanded', String(!open));
  renderVisionKeyState();
  const hires = /** @type {HTMLInputElement|null} */ (getEl('prod-vision-hires'));
  if (hires) hires.checked = getVisionHiRes();
  // 키 미설정이면 키 블록 자동 펼침 — 첫 사용 안내
  const keyBlock = /** @type {HTMLDetailsElement|null} */ (document.getElementById('prod-key-block'));
  if (keyBlock && !getVisionKey()) keyBlock.open = true;
}

/** 고해상도 모드 토글 — 설정값 저장, 이미 올린 사진은 다음 촬영부터 적용 (FO-54) */
export function productVisionHiRes() {
  const cb = /** @type {HTMLInputElement|null} */ (getEl('prod-vision-hires'));
  if (!cb) return;
  saveVisionHiRes(cb.checked);
  visionStatus(cb.checked
    ? '고해상도 모드 — 다음 촬영부터 장변 2048px로 읽습니다 (전송량·비용 증가).'
    : '기본 해상도로 돌아갔습니다 (장변 1024px).');
}

/** 슬롯별 file input 론치 — change는 1회 바인딩 */
export function productPhotoPick(slot) {
  if (slot !== 'front' && slot !== 'back') return;
  const input = getEl(`prod-photo-${slot}`);
  if (!input) return;
  if (!input.dataset.bound) {
    input.dataset.bound = '1';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      visionStatus('사진을 준비하고 있습니다…');
      const r = await fileToBase64Jpeg(file);
      if (!r.ok) { visionStatus(r.error, true); return; }
      vision[slot] = r;
      visionStatus('');
      renderPhotoSlot(slot);
    });
  }
  input.click();
}

export function productPhotoRemove(slot) {
  if (slot !== 'front' && slot !== 'back') return;
  vision[slot] = null;
  const input = getEl(`prod-photo-${slot}`);
  if (input) input.value = '';
  renderPhotoSlot(slot);
}

/** AI로 전성분 읽기 — 추출 결과는 폼 프리필(검토 초안)일 뿐 직접 저장 아님 */
export async function productVisionRead() {
  if (!vision.back || !vision.back.data) {
    visionStatus('전성분이 보이는 후면 사진을 먼저 올려주세요.', true);
    return;
  }
  if (!getVisionKey()) {
    visionStatus('Gemini API 키를 먼저 설정하세요.', true);
    const keyBlock = /** @type {HTMLDetailsElement|null} */ (document.getElementById('prod-key-block'));
    if (keyBlock) keyBlock.open = true;
    return;
  }
  const readBtn = getEl('prod-vision-read');
  const cancelBtn = getEl('prod-vision-cancel');
  vision.abort = new AbortController();
  if (readBtn) readBtn.disabled = true;
  if (cancelBtn) cancelBtn.classList.remove('is-hidden');
  visionStatus('사진에서 전성분을 읽는 중입니다…');
  const images = [vision.back];
  if (vision.front) images.push(vision.front); // 후면 우선 — 정면은 이름·브랜드 보조
  const r = await extractProductFromImages(images, { signal: vision.abort.signal });
  vision.abort = null;
  if (readBtn) readBtn.disabled = false;
  if (cancelBtn) cancelBtn.classList.add('is-hidden');
  if (!r.ok) {
    visionStatus(r.error, true);
    if (r.code === 'key') {
      const keyBlock = /** @type {HTMLDetailsElement|null} */ (document.getElementById('prod-key-block'));
      if (keyBlock) keyBlock.open = true;
    }
    return;
  }
  // 프리필 — 사용자 검토 후 기존 productSave 경로로 저장
  if (r.name) getEl('prod-name').value = r.name;
  if (r.brand) getEl('prod-brand').value = r.brand;
  // 제형 추출 (FO-46) — '·' 별칭 단위 정확 일치로 선택 ('크림'→'선크림' 오매칭 방지, 미매칭 시 유지)
  if (r.category) {
    const catEl = getEl('prod-category');
    const want = r.category.replace(/[·\s]+/g, '').toLowerCase();
    if (catEl && want) catEl.querySelectorAll('input[name="prod-cat"]').forEach(inp => {
      const v = /** @type {HTMLInputElement} */ (inp).value;
      const aliases = v.split(/[·\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
      /** @type {HTMLInputElement} */ (inp).checked = aliases.some(a => a === want)
        || v.replace(/[·\s]+/g, '').toLowerCase() === want;
    });
  }
  const ingredients = r.ingredients || [];
  prodForm.ingredients = ingredients;
  prodForm.dropped = 0;
  const ta = getEl('prod-inci-input');
  if (ta) ta.value = ingredients.join(', ');
  renderInciChips();
  // 원본 썸네일 대조용 참조 — 검토 중 라벨과 칩을 시각 비교
  const ref = getEl('prod-photo-ref');
  if (ref) {
    ref.innerHTML = ['back', 'front']
      .filter(s => vision[s])
      .map(s => `<img src="data:${vision[s].mimeType};base64,${vision[s].data}" alt="참조용 원본 사진 — ${s === 'back' ? '후면 전성분' : '정면'}">`)
      .join('');
  }
  // OCR 치환 의심 (FO-55) — 미등록 칩 중 사전 표준명·속칭과 1~2자 차이는 대조 제안 표시
  const suspects = suspectOcrSubstitutions(ingredients, getIndex());
  const susEl = getEl('prod-vision-suspect');
  if (susEl) {
    susEl.classList.toggle('is-hidden', !suspects.length);
    susEl.innerHTML = suspects.length
      ? `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> <strong>인식 의심 ${suspects.length}종</strong> — ${suspects.map(s => `'${esc(s.input)}' → 사전의 '${esc(s.suggestion)}'과(와) 유사`).join(' · ')}. 원본 사진과 대조해 확인하세요.`
      : '';
  }
  visionStatus(`인식 초안 ${ingredients.length}종 — 원본 라벨과 대조 후 저장하세요.${suspects.length ? ` 인식 의심 ${suspects.length}종이 표시됩니다.` : ''}`);
}

export function productVisionCancel() {
  if (vision.abort) vision.abort.abort();
}

export function productVisionKeySave() {
  const input = getEl('prod-gemini-key');
  const ok = saveVisionKey(input ? input.value : '');
  if (!ok) { showToast('API 키를 입력하세요.', 'error'); return; }
  if (input) input.value = '';
  renderVisionKeyState();
  const keyBlock = /** @type {HTMLDetailsElement|null} */ (document.getElementById('prod-key-block'));
  if (keyBlock) keyBlock.open = false;
  showToast('API 키를 이 기기에 저장했습니다.', 'success');
}

export function productVisionKeyClear() {
  clearVisionKey();
  renderVisionKeyState();
  showToast('API 키를 삭제했습니다.', 'info');
}

/** 저장된 API 키 유효성 확인 (FO-46) — 추출 전 키·모델 문제 구분 */
export async function productVisionKeyTest() {
  if (!getVisionKey()) { visionStatus('Gemini API 키를 먼저 저장하세요.', true); return; }
  visionStatus('키를 확인하는 중입니다…');
  const r = await validateVisionKey();
  visionStatus(r.ok ? `키 확인 완료 — 모델 ${r.model} 사용 가능.` : r.error, !r.ok);
}

/** 모델명 저장 (FO-46) — 비우면 기본값(gemini-2.0-flash)으로 복귀 */
export function productVisionModelSave() {
  const input = getEl('prod-gemini-model');
  const m = saveVisionModel(input ? input.value : '');
  if (!m) { showToast('모델명을 확인하세요 — 영문·숫자·.-_ 만 사용할 수 있습니다.', 'error'); return; }
  if (input) input.value = m;
  showToast(m === 'gemini-2.0-flash' ? '기본 모델로 되돌렸습니다.' : `모델을 ${m}(으)로 설정했습니다.`, 'success');
}

/** 폼 진입 시 사진 인입 상태 초기화 — 편집 건 간 인식 결과 오염 방지 */
export function resetVisionState() {
  vision.front = null;
  vision.back = null;
  if (vision.abort) { vision.abort.abort(); vision.abort = null; }
  const ref = getEl('prod-photo-ref');
  if (ref) ref.innerHTML = '';
  ['front', 'back'].forEach(s => {
    const input = getEl(`prod-photo-${s}`);
    if (input) input.value = '';
    renderPhotoSlot(s);
  });
  visionStatus('');
  const susEl = getEl('prod-vision-suspect');
  if (susEl) { susEl.classList.add('is-hidden'); susEl.innerHTML = ''; }
  const panel = getEl('prod-photo-panel');
  if (panel) panel.classList.add('is-hidden');
}
