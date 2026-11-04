// src/exams/carework/care-ai.js
// @spec CO-08 — BYOK AI 보조 작성 (가명처리·전송 미리보기·사용자 검토 필수)
import { showToast, showConfirm } from '../../ui-utils.js';
import { getAiKey, getAiProvider, callProviderLLM } from '../../written/written-grading.js';

const NAME_RE = /([가-힣]{2,4})(님|씨|어르신)?/g;
const PHONE_RE = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g;

/** L2 전송용 가명처리 — 대상자명→코드, 연락처·호실 제거, 구조화 필드만 유지 */
export function pseudonymize(payload) {
    const out = JSON.parse(JSON.stringify(payload || {}));
    out.client = '대상자A';
    delete out.room; delete out.phone; delete out.guardian;
    for (const k of ['note', 'status', 'caution', 'memo', 'summary']) {
        if (typeof out[k] === 'string' && out[k]) {
            out[k] = out[k].replace(PHONE_RE, '[연락처]').replace(NAME_RE, (m) => m.length <= 4 && /[가-힣]/.test(m) ? '[인명]' : m);
        }
    }
    return out;
}

export function buildDraftPrompt(payload) {
    const p = pseudonymize(payload);
    const lines = Object.entries(p).filter(([, v]) => v !== null && v !== '' && v !== undefined)
        .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
    return {
        system: '너는 한국 장기요양 기록 작성 보조다. 전달된 코드화 관찰 데이터로 간결한 요양일지 초안을 작성하라. 사실 외 추측·의료 판단 문구 금지, 입력에 없는 정보 생성 금지.',
        prompt: `다음 구조화 관찰 데이터로 요양일지 초안을 작성해줘.\n\n${lines}\n\n형식: 서비스 수행 내용 요약 2~3문장 + 특이사항 1문장. 초안임을 명시.`,
    };
}

/** AI 초안 — 폼 데이터 → 가명처리 → 전송 미리보기 확인 → 호출 → 결과를 결과창에 삽입 */
export async function careAiDraft() {
    const key = getAiKey();
    if (!key) { showToast('설정에서 AI 키를 먼저 등록하세요.', 'error'); return; }
    const read = id => /** @type {HTMLInputElement|null} */ (document.getElementById(id))?.value || '';
    const obs = n => /** @type {HTMLInputElement|null} */ (document.querySelector(`input[name="obs-${n}"]:checked`))?.value || '';
    const payload = {
        client: read('log-client'), date: read('log-date'),
        service: read('log-service'), start: read('log-start'), end: read('log-end'),
        obs: { meal: obs('meal'), sleep: obs('sleep'), void: obs('void') },
        note: read('log-note'),
    };
    const { system, prompt } = buildDraftPrompt(payload);
    const ok = await showConfirm(`아래 내용이 AI에 전송됩니다(가명처리됨).\n\n${prompt.slice(0, 400)}\n\n전송할까요?`, 'AI 초안 전송 확인');
    if (!ok) return;
    showToast('AI 초안 생성 중…');
    try {
        const res = await callProviderLLM(system, prompt, { key, provider: getAiProvider() });
        const text = res?.text || '';
        if (!text) { showToast('응답이 없습니다.', 'error'); return; }
        const pre = document.querySelector('#log-preview pre');
        if (pre) pre.textContent = `[AI 초안 — 검토 후 사용]\n\n${text}`;
        showToast('초안 생성 — 검토 후 사용하세요.');
    } catch { showToast('AI 호출 실패 — 키·네트워크를 확인하세요.', 'error'); }
}
