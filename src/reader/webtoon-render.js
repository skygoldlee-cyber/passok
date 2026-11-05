// src/reader/webtoon-render.js — 웹툰 버블 렌더 공용 모듈
// @spec none — 이야기형 story:start 블록 → 씬/대사 파싱·말풍선 렌더 (exam 무관 공용)
// chars 설정은 시험 측에서 주입 — 미주입 시 이니셜 배지 폴백.
import { esc } from '../core/sanitize.js';

/** 화자 키 → 표시 설정. side: 'left'|'right', img: 아바타 URL(없으면 이니셜 배지) */
export const DEFAULT_CHARS = {
    miyoung: { name: '학습자', side: 'right' },
    mentor: { name: '선임·해설자', side: 'left' },
    elder: { name: '어르신', side: 'left' },
};

// 마크업·장식 정제 — ### 헤딩, **굵기**, > 인용, - 리스트 접두어, 📖/📘/┈ 장식 줄 제거
/** @param {string} l */
function _clean(l) {
    return l.replace(/^#{1,4}\s+/, '').replace(/^[-*]\s+/, '').replace(/^>\s+/, '')
        .replace(/\*\*/g, '').replace(/^\s*[📖📘]\s*/, '').trim();
}
/** 장식·섹션 마커 줄 (┈ 구분선·이야기/본문 라벨) 여부 */
/** @param {string} l */
function _isDecor(l) {
    return /┈{2,}/.test(l) || /^\s*[📖📘]\s*[┈·\s]*$/u.test(l);
}
/** 화자명 단독 줄 → 화자 키 (대사 직전의 이름 라벨) */
/** @type {Array<[RegExp, string]>} */
const SPEAKER_NAMES = [
    [/박은정|^선임|선생님/, 'mentor'],
    [/미영/, 'miyoung'],
    [/어르신|최복순|한정수|어머니|아버지|할아버지|할머니/, 'elder'],
];
/** @param {string} l @returns {string|null} */
function _speakerOf(l) {
    if (l.length > 12) return null; // 이름만 있는 짧은 줄만
    for (const [re, who] of SPEAKER_NAMES) if (re.test(l)) return who;
    return null;
}

/**
 * story:start~end 블록을 씬 단위로 파싱 — 대사("...")는 line, 나머지는 scene
 * ### 헤딩은 title 비트, 화자명 단독 줄은 다음 비트의 화자 지정(speaker)으로 파싱
 * @param {string} md
 * @returns {Array<{ beats: Array<{ t: 'line'|'scene'|'title'|'speaker', text: string, who?: string }>, title: string, chapter: number|null }>}
 */
export function parseStorySlots(md) {
    /** @type {ReturnType<typeof parseStorySlots>} */
    const out = [];
    let chapter = null;
    // 챕터 헤딩과 story 블록을 파일 순서대로 순회해 씬의 소속 챕터를 추적
    const re = /##\s*📚?\s*Chapter\s+(\d+)|<!--\s*story:start\s*-->/g;
    let m;
    while ((m = re.exec(md))) {
        if (m[1]) { chapter = parseInt(m[1], 10); continue; }
        const end = md.indexOf('<!-- story:end -->', m.index);
        if (end === -1) break;
        const body = md.slice(m.index + m[0].length, end);
        /** @type {Array<{ t: 'line'|'scene'|'title'|'speaker', text: string, who?: string }>} */
        const beats = [];
        for (const raw of body.split('\n')) {
            const l0 = raw.trim();
            if (!l0 || l0.startsWith('<!--') || _isDecor(l0)) continue;
            const isHead = /^#{1,4}\s/.test(l0);
            const l = _clean(l0);
            if (!l) continue;
            if (isHead) { beats.push({ t: 'title', text: l }); continue; }
            const sp = !/^["“]/.test(l0) ? _speakerOf(l) : null;
            if (sp) { beats.push({ t: 'speaker', text: l, who: sp }); continue; }
            const q = l.match(/^["“](.+)["”]$/);
            beats.push(q ? { t: 'line', text: q[1] } : { t: 'scene', text: l });
        }
        const titleBeat = beats.find(b => b.t === 'title') || beats[0];
        if (beats.length) out.push({ beats, title: titleBeat.text.slice(0, 20), chapter });
        re.lastIndex = end;
    }
    return out;
}

/**
 * 화자 추정 — '선임님' 호출=학습자(우), '미영/교육생' 언급=선임(좌),
 * 어르신 호칭=어르신, 무표지는 직전 화자와 교대
 * @param {string} text @param {string|null} prev
 */
export function whoSays(text, prev) {
    if (/선임님/.test(text)) return 'miyoung';
    if (/미영|교육생/.test(text)) return 'mentor';
    if (/어르신|어머니|아버지|할아버지|할머니/.test(text) && /[요야네임][.!?]?$/.test(text)) return 'elder';
    return prev === 'mentor' ? 'miyoung' : 'mentor';
}

/**
 * 씬 하나를 말풍선 HTML로 렌더
 * @param {{ beats: Array<{ t: string, text: string, who?: string }> }} slot
 * @param {Record<string, { name: string, side: string, img?: string }>} [chars]
 */
export function renderSlotHtml(slot, chars = DEFAULT_CHARS) {
    let prev = null, pending = null;
    return slot.beats.map(b => {
        if (b.t === 'title') return `<div class="wb-scene wb-scene-title">${esc(b.text)}</div>`;
        if (b.t === 'speaker') { pending = b.who || whoSays(b.text, prev); return ''; }
        if (b.t === 'scene') {
            // 화자명 줄 다음의 비따옴표 대사 — speaker 비트로 지정된 화자로 버블 렌더
            if (pending) { b = { t: 'line', text: b.text }; }
            else return `<div class="wb-scene">${esc(b.text)}</div>`;
        }
        const who = pending || whoSays(b.text, prev);
        prev = who;
        pending = null;
        const c = chars[who] || chars.mentor || DEFAULT_CHARS.mentor;
        const av = c.img
            ? `<img class="wb-avatar" src="${esc(c.img)}" alt="${esc(c.name)}">`
            : `<span class="wb-avatar wb-avatar-initial">${esc(c.name.slice(0, 1))}</span>`;
        const bubble = `<div class="wb-bubble wb-bubble-${who}"><div class="wb-name">${esc(c.name)}</div>${esc(b.text)}</div>`;
        return `<div class="wb-row wb-${c.side}">${c.side === 'left' ? av + bubble : bubble + av}</div>`;
    }).filter(Boolean).join('');
}
