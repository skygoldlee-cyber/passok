// src/exams/carework/views/care-forms.js — 보고서·서식 모음 뷰 (링크 디렉터리 + 문서 발행 이력·검증)
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { refreshOrgName } from '../facility.js';
import { markFunnel } from '../care-funnel.js';
import { listDocIssues, findDocIssue } from '../doc-issue-store.js';
import { qrDataUrl } from '../../../content/qr.js';
import { esc } from '../../../core/sanitize.js';

const _KIND_LABEL = { docx: 'Word', pdf: 'PDF', xlsx: 'Excel', share: '공유', print: '인쇄' };
const _kinds = (/** @type {*} */ it) => (it.kinds || []).map((/** @type {string} */ k) => _KIND_LABEL[/** @type {keyof typeof _KIND_LABEL} */ (k)] || k).join(' · ');

const _row = (/** @type {*} */ it) => `<tr><td>${esc(it.docNo)}</td><td>${esc(it.tool || '')}</td><td>${esc(String(it.issuedAt || it.createdAt || '').replace('T', ' '))}</td><td>${it.rev || 1}회</td><td>${esc(_kinds(it))}</td></tr>`;

/** 최근 발행 목록 — docNo 클릭 시 조회 입력에 채움 (재조회 단축) */
const _renderList = () => {
    const box = document.getElementById('docissue-list');
    if (!box) return;
    const items = listDocIssues().slice(0, 15);
    box.innerHTML = items.length
        ? `<h4 class="view-subtitle docissue-h">최근 발행 ${items.length > 15 ? '(15건)' : `${items.length}건`}</h4>
           <table class="care-form-table"><thead><tr><th>문서번호</th><th>문서</th><th>최근 발행</th><th>횟수</th><th>형식</th></tr></thead><tbody>${items.map(_row).join('')}</tbody></table>`
        : '<p class="care-log-hint docissue-empty">아직 발행된 문서가 없습니다 — 문서를 내보내면(Word·PDF·인쇄·공유) 문서번호와 함께 기록됩니다.</p>';
    box.querySelectorAll('tbody td:first-child').forEach(td => {
        const el = /** @type {HTMLElement} */ (td);
        el.style.cursor = 'pointer'; el.title = '클릭하면 조회';
        td.addEventListener('click', () => {
            const q = /** @type {HTMLInputElement|null} */ (document.getElementById('docissue-q'));
            if (q) { q.value = td.textContent || ''; _lookup(q.value); }
        });
    });
};

/** 문서번호 대조 — 대장에 있으면 발행 정보+QR 표시, 없으면 미발행 경고 */
const _lookup = (/** @type {string} */ raw) => {
    const box = document.getElementById('docissue-result');
    if (!box) return;
    const q = raw.trim();
    if (!q) { box.innerHTML = ''; return; }
    const it = findDocIssue(q);
    if (!it) {
        box.innerHTML = `<p class="care-log-hint docissue-warn">발행 기록이 없는 번호입니다 — 번호를 다시 확인하거나, 다른 기기에서 발행된 문서일 수 있습니다.</p>`;
        return;
    }
    const qr = qrDataUrl(it.docNo);
    box.innerHTML = `<div class="docissue-card">
        <div><strong>${esc(it.docNo)}</strong></div>
        <div class="docissue-meta">${esc(it.tool || '')} · ${esc(it.org || '')} — 발행 ${esc(it.rev || 1)}회 · 최근 ${esc(String(it.issuedAt || '').replace('T', ' '))} · ${esc(_kinds(it))}</div>
        ${(it.files || []).length ? `<ul class="docissue-files">${it.files.slice(-5).map((/** @type {string} */ f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        <div class="docissue-hash">내용 해시 ${esc(it.hash || '—')} — 재생성 문서의 번호 뒤 6자리와 대조해 내용 변경 여부를 확인할 수 있습니다.</div>
        ${qr ? `<img src="${esc(qr)}" alt="문서번호 QR" width="72" height="72" class="docissue-qr">` : ''}
    </div>`;
};

export function initCareFormsView() {
    markFunnel('tool:care-forms'); void refreshOrgName();
    _renderList();
    document.getElementById('docissue-q')?.addEventListener('input', (/** @type {Event} */ e) => _lookup(/** @type {HTMLInputElement} */ (e.target).value));
}
