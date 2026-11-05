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

/**
 * story:start~end 블록을 씬 단위로 파싱 — 대사("...")는 line, 나머지는 scene
 * @param {string} md
 * @returns {Array<{ beats: Array<{ t: 'line'|'scene', text: string }>, title: string, chapter: number|null }>}
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
        const beats = /** @type {Array<{ t: 'line'|'scene', text: string }>} */ (body.split('\n').map(l => l.trim())
            .filter(l => l && !l.startsWith('<!--'))
            .map(l => {
                const q = l.match(/^["“](.+)["”]$/);
                return q ? { t: 'line', text: q[1] } : { t: 'scene', text: l };
            }));
        if (beats.length) out.push({ beats, title: beats[0].text.replace(/\*\*/g, '').slice(0, 20), chapter });
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
 * @param {{ beats: Array<{ t: string, text: string }> }} slot
 * @param {Record<string, { name: string, side: string, img?: string }>} [chars]
 */
export function renderSlotHtml(slot, chars = DEFAULT_CHARS) {
    let prev = null;
    return slot.beats.map(b => {
        if (b.t === 'scene') return `<div class="wb-scene">${esc(b.text)}</div>`;
        const who = whoSays(b.text, prev);
        prev = who;
        const c = chars[who] || chars.mentor || DEFAULT_CHARS.mentor;
        const av = c.img
            ? `<img class="wb-avatar" src="${esc(c.img)}" alt="${esc(c.name)}">`
            : `<span class="wb-avatar wb-avatar-initial">${esc(c.name.slice(0, 1))}</span>`;
        const bubble = `<div class="wb-bubble wb-bubble-${who}"><div class="wb-name">${esc(c.name)}</div>${esc(b.text)}</div>`;
        return `<div class="wb-row wb-${c.side}">${c.side === 'left' ? av + bubble : bubble + av}</div>`;
    }).join('');
}
