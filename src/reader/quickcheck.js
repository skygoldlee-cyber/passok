// src/reader/quickcheck.js — 챕터 퀵체크 "이해도 점검" (AI-43)
// @spec AI-43
//
// 피드백 오버레이(피드백/quickcheck.json — ai:quickcheck 초안 → 사람 리뷰 →
// 정본 편입)가 `<subj>:§N.M` 키로 제공하는 OX·단답 항목을 리더 섹션 말미에
// 렌더한다. 정본 없으면 기능 무표시. OX는 즉시 채점, 단답형은 정답 공개 후
// 자가 채점 — 오답 시 §앵커 개념 드릴로 연결한다 (DR-08).
// 설계: docs/dev/design/AI_PERSONALIZATION_DESIGN.md §3.5 (DOC-DSN-56)

import { esc } from '../core/sanitize.js';

/** @param {string} key `subj:§N.M` @returns {HTMLElement|null} */
const _qcEl = (key) => document.querySelector(`[data-qc="${CSS.escape(key)}"]`);

/** @param {HTMLElement|null} el @param {number} idx @returns {HTMLElement|null} */
const _itemEl = (el, idx) => (el ? /** @type {HTMLElement|null} */ (el.querySelector(`[data-qc-item="${idx}"]`)) : null);

/**
 * 섹션 말미 퀵체크 블록 마크업 — 항목 {q, a, type: 'ox'|'sa'}[].
 * @param {Array.<{q: string, a: string, type: string}>} items
 * @param {string} key `subj:§N.M` — data-click 핸들러 탐색 키
 * @param {string} drillCid `N.M` — 개념 드릴 딥링크 (§ 접두 없이, DR-08)
 * @returns {string}
 */
export function quickcheckHtml(items, key, drillCid) {
    const drillLink = `<p class="qc-drill" hidden><a class="reader-concept-link" href="#/trainer/concept/${esc(drillCid)}"><i class="fa-solid fa-bullseye" aria-hidden="true"></i> 이 절 문항 풀기 <span class="reader-concept-cid">§${esc(drillCid)}</span></a></p>`;
    const rows = items.map((it, i) => {
        const q = `<p class="qc-q">${esc(it.q)}</p>`;
        if (it.type === 'ox') {
            return `<div class="qc-item" data-qc-item="${i}" data-qc-a="${it.a === 'O' ? 'O' : 'X'}">${q}
                <div class="qc-actions">
                    <button class="btn btn-secondary btn-sm" data-click="answerQuickCheck" data-args='${esc(JSON.stringify([key, i, 'O']))}'>O</button>
                    <button class="btn btn-secondary btn-sm" data-click="answerQuickCheck" data-args='${esc(JSON.stringify([key, i, 'X']))}'>X</button>
                </div>
                <p class="qc-result" hidden></p>${drillLink}</div>`;
        }
        return `<div class="qc-item" data-qc-item="${i}">${q}
            <div class="qc-actions">
                <button class="btn btn-secondary btn-sm" data-click="revealQuickCheck" data-args='${esc(JSON.stringify([key, i]))}'>정답 보기</button>
            </div>
            <div class="qc-answer" hidden>
                <p class="qc-sa-answer"><strong>정답:</strong> ${esc(it.a)}</p>
                <div class="qc-actions">
                    <button class="btn btn-success btn-sm" data-click="selfGradeQuickCheck" data-args='${esc(JSON.stringify([key, i, true]))}'>맞혔어요</button>
                    <button class="btn btn-warning btn-sm" data-click="selfGradeQuickCheck" data-args='${esc(JSON.stringify([key, i, false]))}'>몰랐어요</button>
                </div>
                ${drillLink}
            </div></div>`;
    }).join('');
    return `<div class="quickcheck" data-qc="${esc(key)}">
        <button class="btn btn-secondary btn-sm qc-toggle" data-click="toggleQuickCheck" data-arg="${esc(key)}"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> 이해도 점검 ${items.length}문</button>
        <div class="qc-body" hidden>${rows}</div>
    </div>`;
}

/** 이해도 점검 펼침/접힘 (data-click) @param {string} key */
export function toggleQuickCheck(key) {
    const body = _qcEl(key)?.querySelector('.qc-body');
    if (body instanceof HTMLElement) body.hidden = !body.hidden;
}

/** OX 즉시 채점 (data-click) @param {string} key @param {number} idx @param {string} choice 'O'|'X' */
export function answerQuickCheck(key, idx, choice) {
    const item = _itemEl(_qcEl(key), idx);
    if (!item) return;
    const ok = String(choice) === String(item.dataset.qcA);
    const res = /** @type {HTMLElement|null} */ (item.querySelector('.qc-result'));
    if (res) {
        res.hidden = false;
        res.textContent = ok ? '정답입니다' : '오답입니다 — 이 절을 다시 확인해 보세요.';
        res.classList.toggle('qc-ok', ok);
        res.classList.toggle('qc-wrong', !ok);
    }
    const drill = /** @type {HTMLElement|null} */ (item.querySelector('.qc-drill'));
    if (drill) drill.hidden = ok;
    item.querySelectorAll('.qc-actions .btn').forEach(b => { (/** @type {HTMLButtonElement} */ (b)).disabled = true; });
}

/** 단답형 정답 공개 (data-click) @param {string} key @param {number} idx */
export function revealQuickCheck(key, idx) {
    const ans = _itemEl(_qcEl(key), idx)?.querySelector('.qc-answer');
    if (ans instanceof HTMLElement) ans.hidden = false;
}

/** 단답형 자가 채점 (data-click) — 오답 시 개념 드릴 표시 @param {string} key @param {number} idx @param {boolean} ok */
export function selfGradeQuickCheck(key, idx, ok) {
    const item = _itemEl(_qcEl(key), idx);
    if (!item) return;
    const drill = /** @type {HTMLElement|null} */ (item.querySelector('.qc-drill'));
    if (drill) drill.hidden = !!ok;
    item.querySelectorAll('.qc-answer .btn').forEach(b => { (/** @type {HTMLButtonElement} */ (b)).disabled = true; });
}
