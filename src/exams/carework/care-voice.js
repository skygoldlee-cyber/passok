// src/exams/carework/care-voice.js — 음성 입력 (Web Speech API)
// @spec none — 시험 전용 실무 뷰 (DA-13)
// 기록 텍스트를 말로 입력 — 시니어 타자 부담 감소. Chrome/Android·webkitSpeechRecognition 폴백.
import { showToast } from '../../ui-utils.js';

const _RECOG = () => /** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition || null;
/** @type {*} */
let _rec = null;
/** @type {string|null} */
let _targetId = null;

export function voiceAvailable() {
    return !!_RECOG();
}

/** 미지원 브라우저는 🎤 버튼을 숨긴다 — 죽은 버튼을 보여주지 않는다 (init에서 호출) */
export function voiceButtonsInit(root = document) {
    root.querySelectorAll('.care-voice-btn').forEach((/** @type {Element} */ b) => { /** @type {HTMLElement} */ (b).hidden = !voiceAvailable(); });
}

/**
 * 🎤 토글 — 인식 중이면 종료, 아니면 시작해 결과를 대상 input에 이어 붙임
 * @param {string} inputId 대상 input/textarea id
 */
export function careVoiceToggle(inputId) {
    const R = _RECOG();
    if (!R) { showToast('이 브라우저는 음성 입력을 지원하지 않습니다.', 'error'); return; }
    if (_rec) { _rec.stop(); return; }
    const el = /** @type {HTMLInputElement|null} */ (document.getElementById(inputId));
    if (!el) return;
    _targetId = inputId;
    _rec = new R();
    _rec.lang = 'ko-KR';
    _rec.interimResults = false;
    _rec.continuous = false;
    _rec.onresult = (/** @type {*} */ e) => {
        const t = [...e.results].map((/** @type {*} */ r) => r[0].transcript).join('').trim();
        if (t) el.value = (el.value ? el.value + ' ' : '') + t;
    };
    const done = () => { _rec = null; _targetId = null; _mark(inputId, false); };
    _rec.onend = done;
    _rec.onerror = (/** @type {*} */ e) => {
        done();
        if (e.error !== 'aborted' && e.error !== 'no-speech') showToast('음성 인식에 실패했습니다 — 다시 눌러 주세요.', 'error');
    };
    try { _rec.start(); _mark(inputId, true); }
    catch { _rec = null; _targetId = null; }
}

/** @param {string} inputId @param {boolean} on */
function _mark(inputId, on) {
    const btn = document.querySelector(`.care-voice-btn[data-arg="${inputId}"]`);
    if (btn) btn.classList.toggle('is-listening', on);
}

/* 뷰별 핸들러 별칭 — 지연 핸들러 이름은 전체 유니크 계약이라 뷰마다 별도 이름을 둔다 */
export const careIncidentVoiceToggle = careVoiceToggle;
export const careVisitVoiceToggle = careVoiceToggle;
