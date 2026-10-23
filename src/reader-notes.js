// src/reader-notes.js — 교재 리더 섹션 메모 (하이라이트·주석)
// @spec TR-30
// ------------------------------------------------------------
// 섹션 단위 메모를 콘텐츠 기반 북마크 키(`bookmarkKeyOf` — subj|chapterKey|title)
// 에 매달아 저장한다. ID-05 규약상 위치 좌표(라인·인덱스)는 영속 키로 쓰지 않는다.
// 시험별 격리: scopedKey로 `<examId>:reader_notes`에 저장 — 시험 전환 시 분리.
// 본문 구간 드래그 하이라이트는 의도적으로 지원하지 않는다 — 판본 갱신 시
// 위치 드리프트가 불가피하기 때문에 섹션 단위 메모·하이라이트로 수렴한다.
// ------------------------------------------------------------
import { safeGetItem, safeSetItem } from './state.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { localDateTime } from './utils.js';

/** 메모 맵 조회 — {bookmarkKey: {note, subject, title, updated}} */
export function getReaderNotes() {
    try {
        const d = JSON.parse(safeGetItem(STORAGE_KEYS.READER_NOTES) || '{}');
        return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
    } catch { return {}; }
}

/** 키 → 메모 문자열 (없으면 '') */
export function getReaderNote(key) {
    const n = getReaderNotes()[key];
    return (n && typeof n.note === 'string') ? n.note : '';
}

export function readerNoteCount() {
    return Object.keys(getReaderNotes()).length;
}

/**
 * 메모 저장 — 빈 문자열은 삭제로 해석한다.
 * @param {string} key bookmarkKeyOf() 형태 콘텐츠 키
 * @param {string} note 메모 본문
 * @param {{subject?:string, title?:string}} [meta] 팔레트 검색·이동용 맥락
 */
export function setReaderNote(key, note, meta = {}) {
    if (!key) return false;
    const map = getReaderNotes();
    const text = (note || '').trim();
    if (!text) {
        if (!(key in map)) return false;
        delete map[key];
    } else {
        map[key] = {
            note: text,
            subject: meta.subject || (map[key] && map[key].subject) || '',
            title: meta.title || (map[key] && map[key].title) || '',
            updated: localDateTime(),
        };
    }
    safeSetItem(STORAGE_KEYS.READER_NOTES, JSON.stringify(map));
    return true;
}

export function deleteReaderNote(key) {
    return setReaderNote(key, '');
}
