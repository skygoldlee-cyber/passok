// src/exams/carework/care-ai.js
// @spec CO-08 — BYOK AI 보조 작성 (가명처리·전송 미리보기·사용자 검토 필수)
import { showToast, showConfirm, runWithLoading } from '../../ui-utils.js';
import { proFeatureNotice } from '../../pro/pro-upgrade.js';
import { getAiKey, getAiProvider, callProviderLLM } from '../../written/written-grading.js';

const NAME_RE = /([가-힣]{2,4})(님|씨|어르신)?/g;
const PHONE_RE = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g;

/** L2 전송용 가명처리 — 대상자명→코드, 연락처·호실 제거, 구조화 필드만 유지 */
export function pseudonymize(payload) {
    const out = JSON.parse(JSON.stringify(payload || {}));
    if ('client' in out) out.client = '대상자A';
    if ('clients' in out) out.clients = '[대상자 목록]';
    if ('from' in out) out.from = '인계자';
    if ('to' in out) out.to = '인수자';
    delete out.room; delete out.phone; delete out.guardian;
    for (const k of ['note', 'status', 'caution', 'memo', 'summary', 'tasks']) {
        if (typeof out[k] === 'string' && out[k]) {
            out[k] = out[k].replace(PHONE_RE, '[연락처]').replace(NAME_RE, (m) => m.length <= 4 && /[가-힣]/.test(m) ? '[인명]' : m);
        }
    }
    return out;
}

export function buildDraftPrompt(payload, kind = 'log') {
    const p = pseudonymize(payload);
    const lines = Object.entries(p).filter(([, v]) => v !== null && v !== '' && v !== undefined)
        .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
    const doc = kind === 'ho' ? '인수인계서' : '요양일지';
    return {
        system: `너는 한국 장기요양 기록 작성 보조다. 전달된 코드화 데이터로 간결한 ${doc} 초안을 작성하라. 사실 외 추측·의료 판단 문구 금지, 입력에 없는 정보 생성 금지.`,
        prompt: `다음 구조화 데이터로 ${doc} 초안을 작성해줘.\n\n${lines}\n\n형식: 내용 요약 2~3문장 + 특이사항 1문장. 초안임을 명시.`,
    };
}

const _read = id => /** @type {HTMLInputElement|null} */ (document.getElementById(id))?.value || '';
const _obs = n => /** @type {HTMLInputElement|null} */ (document.querySelector(`input[name="obs-${n}"]:checked`))?.value || '';
const _payload = kind => kind === 'ho'
    ? { clients: _read('ho-clients'), date: _read('ho-date'), shift: _read('ho-shift'),
        status: _read('ho-status'), tasks: _read('ho-tasks'), caution: _read('ho-caution') }
    : { client: _read('log-client'), date: _read('log-date'),
        service: _read('log-service'), start: _read('log-start'), end: _read('log-end'),
        obs: { meal: _obs('meal'), sleep: _obs('sleep'), void: _obs('void') },
        note: _read('log-note') };

/** AI 초안 — data-arg="log|ho" 소스 폼 → 가명처리 → 전송 미리보기 확인 → 호출 → 결과창 삽입
 * @param {HTMLElement} [btn]
 */
export async function careAiDraft(btn) {
    const kind = /** @type {HTMLElement|null} */ (btn)?.dataset?.arg === 'ho' ? 'ho' : 'log';
    proFeatureNotice('care_ai_draft', 'AI 초안');
    const key = getAiKey();
    if (!key) { showToast('설정에서 AI 키를 먼저 등록하세요.', 'error'); return; }
    const { system, prompt } = buildDraftPrompt(_payload(kind), kind);
    const ok = await showConfirm(`아래 내용이 AI에 전송됩니다(가명처리됨).\n\n${prompt.slice(0, 400)}\n\n전송할까요?`, 'AI 초안 전송 확인');
    if (!ok) return;
    // @spec UX-FB-11 — 장시간 AI 호출: 지연 스피너 + 취소 버튼 + 타임아웃 + 연타 방지
    try {
        const res = await runWithLoading(
            (signal) => callProviderLLM(system, prompt, { key, provider: getAiProvider(), signal }),
            { message: 'AI 초안 생성 중…', cancellable: true, timeoutMs: 30000, triggerEl: btn || null }
        );
        const text = res?.text || '';
        if (!text) { showToast(res?.error || '응답이 없습니다.', 'error'); return; }
        const pre = document.querySelector(kind === 'ho' ? '#ho-preview pre' : '#log-preview pre');
        if (pre) pre.textContent = `[AI 초안 — 검토 후 사용]\n\n${text}`;
        showToast('초안 생성 — 검토 후 사용하세요.');
    } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') showToast('AI 초안 생성이 취소되었습니다.', 'warning');
        else showToast('AI 호출 실패 — 키·네트워크를 확인하세요.', 'error');
    }
}
