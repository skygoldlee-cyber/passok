// views/reader-progress.js — 리더 세션 상태 + 읽기 위치·진척 영속화
// @spec TR-12,SC-15,TR-28
// textbook-reader.js에서 분리. textbookReaderState는 리더의 세션 상태
// (선택 과목·챕터·이야기형 모드)로, 진척 추적이 같은 상태를 참조하므로
// 이 모듈에 함께 둔다 — reader-toolbar가 진척만 필요로 할 때 뷰 모듈을
// 역참조하지 않도록 하는 의도적 배치 (순환 import 해소).
import { safeGetItem, safeSetItem } from '../../state.js';
import { STORAGE_KEYS } from '../../storage-keys.js';
import { getDDay, getTextbookReadProgress, recordStudyActivity } from '../../study/study-tracker.js';
import { showAlert } from '../../ui-utils.js';

export const textbookReaderState = {
    selectedSubject: '',
    selectedChapter: '',
    storyMode: false
};

// 1. 교재 읽기 이어하기 — localStorage 영속화
const READER_POSITION_KEY = STORAGE_KEYS.READER_LAST_POSITION;
let _scrollSaveTimer = null;

export function saveReaderPosition() {
    try {
        const container = document.getElementById('textbook-reader-container');
        const scrollTop = container ? Math.round(container.scrollTop) : 0;
        const pos = {
            subject: textbookReaderState.selectedSubject || '',
            chapter: textbookReaderState.selectedChapter || '',
            scrollTop: scrollTop,
            storyMode: textbookReaderState.storyMode || false,
            ts: Date.now()
        };
        safeSetItem(READER_POSITION_KEY, JSON.stringify(pos));
        _markReadChunk(container, pos.subject); // 스크롤 정착 위치의 청크도 커버리지에 반영
    } catch (e) { /* noop */ }
}

// SC-15 과목별 일독 진척 — 문서를 100등분한 청크의 "방문 커버리지"를 과목별로 영속화.
// 최대 스크롤 위치가 아닌 실제 체류 청크 집합이므로 목차·이어보기 점프가 진척을 부풀리지 않는다.
// 표준형·이야기형은 동일 커버리지로 모드와 무관하게 과목 키 하나에 합산한다.
const READ_CHUNKS = 100;

function _seedChunks(legacyFrac) {
    const n = Math.floor((typeof legacyFrac === 'number' ? legacyFrac : 0) * READ_CHUNKS);
    const out = [];
    for (let i = 0; i < n; i++) out.push(i);
    return out;
}

function _markReadChunk(container, subject) {
    if (!subject || !container) return;
    const denom = container.scrollHeight - container.clientHeight;
    if (denom <= 0) return;
    const frac = Math.min(1, Math.max(0, container.scrollTop / denom));
    const idx = Math.min(READ_CHUNKS - 1, Math.floor(frac * READ_CHUNKS));
    let map = {};
    try { map = JSON.parse(safeGetItem(STORAGE_KEYS.READER_PROGRESS) || '{}'); } catch (e) { map = {}; }
    const rec = (map[subject] && typeof map[subject] === 'object') ? map[subject] : {};
    const chunks = Array.isArray(rec.chunks) ? rec.chunks.slice() : _seedChunks(rec.frac);
    if (!chunks.includes(idx)) chunks.push(idx);
    chunks.sort((a, b) => a - b);
    // frac 필드는 커버리지 비율 — 기존 스키마(getTextbookReadProgress가 v.frac 소비)와 호환 유지
    map[subject] = { chunks, frac: Math.min(1, chunks.length / READ_CHUNKS), ts: Date.now() };
    safeSetItem(STORAGE_KEYS.READER_PROGRESS, JSON.stringify(map));
    _checkReadThroughDone();
}

// TR-28 일독 완료 통지 — 전 과목 청크 커버리지가 100%에 도달하는 순간 1회 모달로 통지.
// 완료 판정은 SC-15 집계(getTextbookReadProgress.overall===1)와 동일 기준이므로
// 통독 차감이 소멸하는 시점과 정확히 일치한다. read_through_done 플래그로 재통지 억제 —
// 플래그는 BACKUP_KEYS·RESET_KEYS에 등록돼 백업 복원·진도 초기화와 수명을 같이 한다.
function _checkReadThroughDone() {
    if (safeGetItem(STORAGE_KEYS.READ_THROUGH_DONE)) return;
    const prog = getTextbookReadProgress();
    if (!prog.started || prog.overall < 1) return;
    safeSetItem(STORAGE_KEYS.READ_THROUGH_DONE, String(Date.now()));
    const msg = getDDay() !== null
        ? '교재 1회독을 완료했습니다. 통독 예약이 해제되어 남은 기간이 카드·퀴즈 학습일로 전환됩니다.'
        : '교재 1회독을 완료했습니다. 이제 카드·퀴즈 학습을 본격화하세요.';
    try { showAlert(msg, '교재 일독 완료'); } catch (e) { /* noop */ }
}

// SC-15 읽기 시간 기록 — 하트비트 기반 체류 누적. 스크롤 없이 정독하는 시간도 잡히고,
// 뷰 이탈·탭 숨김 동안은 누적되지 않는다(이탈 중 시간이 readMin으로 오계상되지 않음).
const READ_TICK_MS = 15000;
let _readAccumMs = 0;
let _readTimer = null;

function _readerViewActive() {
    const v = document.getElementById('textbook-reader-view');
    return !!(v && v.classList.contains('active'))
        && (typeof document === 'undefined' || document.visibilityState === 'visible');
}

function _readTick() {
    if (!_readerViewActive()) { _readAccumMs = 0; return; }
    _readAccumMs += READ_TICK_MS;
    _markReadChunk(
        document.getElementById('textbook-reader-container'),
        textbookReaderState.selectedSubject
    );
    if (_readAccumMs >= 60000) {
        const min = Math.floor(_readAccumMs / 60000);
        _readAccumMs -= min * 60000;
        recordStudyActivity({ readMin: min });
    }
}

/** 읽기 하트비트 시작 — 리더 뷰 렌더 시 1회 호출(멱등). 뷰 비활성 동안 틱은 자동 no-op. */
export function startReadingSession() {
    if (_readTimer || typeof setInterval !== 'function') return;
    _readTimer = setInterval(_readTick, READ_TICK_MS);
}

/** 읽기 하트비트 중지 + 미플러시 누적분 리셋 — 뷰 이탈/테스트 격리용. */
export function stopReadingSession() {
    if (_readTimer) { clearInterval(_readTimer); _readTimer = null; }
    _readAccumMs = 0;
}

export function loadReaderPosition() {
    try {
        const raw = safeGetItem(READER_POSITION_KEY);
        if (!raw) return null;
        const pos = JSON.parse(raw);
        // 30일 이상 지난 위치는 무시
        if (pos.ts && (Date.now() - pos.ts > 30 * 24 * 60 * 60 * 1000)) return null;
        return pos;
    } catch (e) { return null; }
}

// 스크롤 위치 저장 (디바운스: 1초 후 저장)
export function scheduleSaveReaderPosition() {
    if (_scrollSaveTimer) clearTimeout(_scrollSaveTimer);
    _scrollSaveTimer = setTimeout(saveReaderPosition, 1000);
}
