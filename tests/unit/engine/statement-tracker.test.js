// @spec DR-03~05
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    recordStatementJudgments, getStatementStat, getWeakStatements, getDueStatementSids,
    getAllStatementStats, getAnomalousStatements
} from '../../../src/study/statement-tracker.js';
import { gradeAnswer } from '../../../src/content/questions.js';
import { STORAGE_KEYS } from '../../../src/storage-keys.js';
import { scopedKey } from '../../../src/exam-context.js';

// --- localStorage 모킹 (state.test.js와 동일 패턴) ---

function createMockStorage() {
    const store = {};
    return {
        getItem(key) { return key in store ? store[key] : null; },
        setItem(key, value) { store[key] = String(value); },
        removeItem(key) { delete store[key]; },
        clear() { for (const k of Object.keys(store)) delete store[k]; },
        _store: store
    };
}

let mockStorage;
let originalLocalStorage;

beforeEach(() => {
    mockStorage = createMockStorage();
    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
        value: mockStorage, writable: true, configurable: true
    });
});

afterEach(() => {
    if (originalLocalStorage !== undefined) {
        Object.defineProperty(global, 'localStorage', {
            value: originalLocalStorage, writable: true, configurable: true
        });
    } else {
        delete global.localStorage;
    }
});

const comboQ = {
    id: 'cb-t1', subject: 4, type: 'combo', points: 5,
    stem: '옳은 것을 모두 고른 것은?',
    statements: [
        { id: 'ㄱ', sid: 'st-t-1', text: '참1', truth: true },
        { id: 'ㄴ', sid: 'st-t-2', text: '참2', truth: true },
        { id: 'ㄷ', sid: 'st-t-3', text: '거짓', truth: false }
    ],
    options: [
        { id: '1', members: ['ㄱ', 'ㄴ'] },
        { id: '2', members: ['ㄱ', 'ㄴ', 'ㄷ'] }
    ]
};

test('recordStatementJudgments: 오판 진술만 오판 통계 누적', () => {
    // ㄷ(거짓 진술)을 참으로 오판 → '2' 선택 (오답)
    const res = gradeAnswer(comboQ, { optionId: '2' });
    const n = recordStatementJudgments(res.perStatement);
    assert.equal(n, 3);
    assert.deepEqual(getStatementStat('st-t-1'), { j: 1, w: 0, lw: null, t: '참1', truth: true, cid: null, last: true, streak: 1 });
    assert.equal(getStatementStat('st-t-3').last, false); // 오판 진술의 최근 판정 = 오답
    assert.equal(getStatementStat('st-t-3').streak, 0);   // 오판 시 연속 정답 초기화
    assert.equal(getStatementStat('st-t-3').w, 1);
    assert.ok(getStatementStat('st-t-3').lw);
});

test('recordStatementJudgments: sid 없는 진술은 미기록', () => {
    const n = recordStatementJudgments([{ id: 'ㄱ', judgedCorrect: false }]);
    assert.equal(n, 0);
});

test('recordStatementJudgments: 잘못된 입력 안전 처리', () => {
    assert.equal(recordStatementJudgments(null), 0);
    assert.equal(recordStatementJudgments('x'), 0);
    assert.equal(recordStatementJudgments([]), 0);
    // judgedCorrect가 비불리언인 진술도 건너뜀 (`!== 'boolean'` 변이 가드)
    assert.equal(recordStatementJudgments([{ sid: 'a', judgedCorrect: 'yes' }]), 0);
    assert.equal(recordStatementJudgments([{ sid: 'a' }]), 0);
    // 전부 스킵되면 저장 자체를 하지 않는다 (`recorded > 0` 가드)
    assert.equal(mockStorage.getItem(scopedKey(STORAGE_KEYS.STATEMENT_STATS)), null);
});

test('recordStatementJudgments: 선택 필드 없는 진술은 기본값으로 기록', () => {
    // s.text/truth/conceptId 부재 시 기본값 유지 — 조건부 대입 변이 가드
    recordStatementJudgments([{ sid: 'bare', judgedCorrect: false }]);
    const st = getStatementStat('bare');
    assert.equal(st.t, '');
    assert.equal(st.truth, null);
    assert.equal(st.cid, null);
});

test('getWeakStatements: limit이 비수치면 전체 반환', () => {
    const statsKey = scopedKey(STORAGE_KEYS.STATEMENT_STATS);
    mockStorage.setItem(statsKey, JSON.stringify({
        a: { j: 1, w: 1, lw: 'x', t: '', truth: null, cid: null, last: false, streak: 0 },
        b: { j: 1, w: 1, lw: 'y', t: '', truth: null, cid: null, last: false, streak: 0 },
    }));
    assert.equal(getWeakStatements('2').length, 2, '`typeof limit === "number"` 가드 — 비수치 limit는 전체 반환');
});

test('getWeakStatements: 오판 많은 순 정렬', () => {
    recordStatementJudgments([
        { sid: 'a', judgedCorrect: false }, { sid: 'b', judgedCorrect: true }
    ]);
    recordStatementJudgments([
        { sid: 'a', judgedCorrect: false }, { sid: 'b', judgedCorrect: false }
    ]);
    const weak = getWeakStatements();
    assert.equal(weak[0].sid, 'a');
    assert.equal(weak[0].w, 2);
    assert.equal(weak.length, 2);
    assert.equal(getWeakStatements(1).length, 1);
});

test('getWeakStatements: 연속 정답 3회면 졸업, 재오판 시 복귀', () => {
    recordStatementJudgments([{ sid: 'a', judgedCorrect: false }]);
    assert.equal(getWeakStatements().length, 1);
    recordStatementJudgments([{ sid: 'a', judgedCorrect: true }]);
    recordStatementJudgments([{ sid: 'a', judgedCorrect: true }]);
    assert.equal(getWeakStatements().length, 1, '연속 정답 2회는 아직 취약');
    recordStatementJudgments([{ sid: 'a', judgedCorrect: true }]);
    assert.equal(getWeakStatements().length, 0, '연속 정답 3회 → 졸업');
    assert.equal(getWeakStatements(undefined, true).length, 1, '졸업 포함 조회 시 노출');
    recordStatementJudgments([{ sid: 'a', judgedCorrect: false }]);
    assert.equal(getWeakStatements().length, 1, '재오판 시 취약 목록 복귀');
});

test('getWeakStatements: 동률은 최근 오판일 우선, limit 미지정 시 전체', () => {
    const statsKey = scopedKey(STORAGE_KEYS.STATEMENT_STATS);
    // w 동률(1) — lw가 더 최근인 sid가 앞에 와야 함 (정렬 변이 가드)
    mockStorage.setItem(statsKey, JSON.stringify({
        old: { j: 1, w: 1, lw: '2020-01-01', t: '', truth: null, cid: null, last: false, streak: 0 },
        new: { j: 1, w: 1, lw: '2099-01-01', t: '', truth: null, cid: null, last: false, streak: 0 },
    }));
    const weak = getWeakStatements();
    assert.equal(weak.length, 2);
    assert.equal(weak[0].sid, 'new', '동률 시 최근 오판(lw) 우선');
    assert.equal(weak[1].sid, 'old');
});

test('getAnomalousStatements: 경계값 — j==minJ·ratio==임계도 포함', () => {
    const statsKey = scopedKey(STORAGE_KEYS.STATEMENT_STATS);
    mockStorage.setItem(statsKey, JSON.stringify({
        edge:  { j: 5, w: 4, lw: 'x', t: '', truth: null, cid: null, last: false, streak: 0 },  // j==5, ratio=0.8 정확 경계
        under: { j: 4, w: 4, lw: 'x', t: '', truth: null, cid: null, last: false, streak: 0 },  // j 부족
        lowr:  { j: 5, w: 3, lw: 'x', t: '', truth: null, cid: null, last: false, streak: 0 },  // ratio 0.6 < 0.8
        tie1:  { j: 10, w: 8, lw: 'x', t: '', truth: null, cid: null, last: false, streak: 0 }, // ratio 0.8 동률 → j 큰 쪽 우선
    }));
    const anom = getAnomalousStatements();
    assert.deepEqual(anom.map(a => a.sid), ['tie1', 'edge'], '경계 포함 + ratio 동률 시 j 내림차순');
});

test('getAllStatementStats: 저장 통계를 그대로 반환하고 손상 시 빈 객체', () => {
    const statsKey = scopedKey(STORAGE_KEYS.STATEMENT_STATS);
    mockStorage.setItem(statsKey, JSON.stringify({ a: { j: 1, w: 1 } }));
    assert.deepEqual(getAllStatementStats(), { a: { j: 1, w: 1 } });
    mockStorage.setItem(statsKey, '{corrupt');
    assert.deepEqual(getAllStatementStats(), {});
});

test('getDueStatementSids: due==오늘인 진술은 복습 대기에 포함 (<= 경계)', async () => {
    const { getDueStatementSids } = await import('../../../src/study/statement-tracker.js');
    const { todayKey } = await import('../../../src/utils.js');
    const statsKey = scopedKey(STORAGE_KEYS.STATEMENT_STATS);
    const srKey = scopedKey(STORAGE_KEYS.FC_SPACED_REPETITION);
    mockStorage.setItem(statsKey, JSON.stringify({ s1: { j: 1, w: 1 }, s2: { j: 1, w: 1 } }));
    mockStorage.setItem(srKey, JSON.stringify({
        s1: { v: 2, due: todayKey(), lastReview: todayKey() },   // 오늘 due → 포함
        s2: { v: 2, due: '2099-01-01', lastReview: todayKey() }, // 미래 → 제외
    }));
    assert.deepEqual(getDueStatementSids(), ['s1']);
});

test('getDueStatementSids: 오판 진술은 내일 복습 대기 아님(당일 기록 시 오늘 due)', () => {
    recordStatementJudgments([{ sid: 'a', judgedCorrect: false }]);
    const due = getDueStatementSids();
    // SM-2 오답 → interval 1일 → nextReview는 내일 → 오늘 due 목록엔 없음
    assert.equal(due.includes('a'), false);
});

test('getDueStatementSids: 과거 nextReview는 due로 검출', () => {
    recordStatementJudgments([{ sid: 'a', judgedCorrect: true }]);
    // 스케줄을 과거로 조작
    const raw = mockStorage.getItem(scopedKey(STORAGE_KEYS.FC_SPACED_REPETITION));
    const sch = JSON.parse(raw);
    sch['a'].due = '2000-01-01'; // v2 스키마 (구 nextReview 폴백은 구 레코드용)
    mockStorage.setItem(scopedKey(STORAGE_KEYS.FC_SPACED_REPETITION), JSON.stringify(sch));
    assert.deepEqual(getDueStatementSids(), ['a']);
});

test('recordStatementJudgments: 정답 선택은 오판 누적 없이 SM-2만 갱신', () => {
    const res = gradeAnswer(comboQ, { optionId: '1' }); // 정답
    recordStatementJudgments(res.perStatement);
    assert.equal(getWeakStatements().length, 0);
    // 스케줄은 3개 sid 모두 생성됨
    const sch = JSON.parse(mockStorage.getItem(scopedKey(STORAGE_KEYS.FC_SPACED_REPETITION)));
    assert.equal(Object.keys(sch).length, 3);
    assert.equal(sch['st-t-1'].reps, 1); // FSRS v2 스키마
});

test('getAnomalousStatements: 오판율 극단 진술만 플래그 (j≥5·w/j≥0.8)', async () => {
    const { getAnomalousStatements } = await import('../../../src/study/statement-tracker.js');
    const judge = (sid, n, wrongs) => {
        for (let i = 0; i < n; i++)
            recordStatementJudgments([{ sid, judgedCorrect: i >= wrongs }]);
    };
    judge('st-bad', 6, 6);   // 6/6 오판 → 이상 의심
    judge('st-ok', 6, 1);    // 1/6 오판 → 정상
    judge('st-few', 3, 3);   // 3/3 오판이지만 표본 부족 → 제외
    const anomalous = getAnomalousStatements();
    assert.deepEqual(anomalous.map(a => a.sid), ['st-bad']);
    assert.equal(anomalous[0].ratio, 1);
    // 임계 조정 확인
    assert.deepEqual(getAnomalousStatements(3).map(a => a.sid).sort(), ['st-bad', 'st-few']);
});
