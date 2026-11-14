// tests/unit/content/qr.test.js
// @spec none — 최소 QR 인코더 검증: 구조 불변조건 + 독립 디코더 라운드트립.
// 디코더는 인코더와 별개 구현(BCH 브루트포스·지그재그 재구성·RS 신드롬 평가)이라
// 인코더 자체 버그를 걸러낸다 — 같은 코드를 재사용하면 자기증명이 된다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrMatrix, qrPng, qrDataUrl } from '../../../src/content/qr.js';

// — 독립 디코더 (인코더와 상수만 공유, 알고리즘은 별개) —

const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{
    let x = 1;
    for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const gmul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
// 포맷 정보 BCH(15,5) — 생성다항식 0b10100110111, 마스크 패턴 0b101010000010010
const fmtCode = d5 => {
    let rem = d5 << 10;
    for (let i = 14; i >= 10; i--) if (rem & (1 << i)) rem ^= 0b10100110111 << (i - 10);
    return ((d5 << 10) | rem) ^ 0b101010000010010;
};
const hamming = (a, b) => { let n = 0; for (let v = a ^ b; v; v >>>= 1) n += v & 1; return n; };
const VER = [null, { ec: 10, blocks: [16] }, { ec: 16, blocks: [28] }, { ec: 26, blocks: [44] },
    { ec: 18, blocks: [32, 32] }, { ec: 24, blocks: [43, 43] }, { ec: 16, blocks: [27, 27, 27, 27] }, { ec: 18, blocks: [31, 31, 31, 31] }];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38]];
const MASKS = [
    (r, c) => (r + c) % 2 === 0, (r, _c) => r % 2 === 0, (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** 매트릭스 → 디코드 텍스트 — 포맷 BCH·마스크 해제·인터리빙 해제·RS 신드롬·바이트 모드 파싱 */
const decode = q => {
    const n = q.size, v = (n - 17) / 4;
    const at = (x, y) => (q.at(x, y) ? 1 : 0);
    // 포맷 사본1 (좌상): (0..5,8)=f14..f9 · (7,8)=f8 · (8,8)=f7 · (8,7)=f6 · (8,5..0)=f5..f0
    const fb = [0, 1, 2, 3, 4, 5].map(i => at(i, 8)).concat([at(7, 8), at(8, 8), at(8, 7)], [5, 4, 3, 2, 1, 0].map(i => at(8, i)));
    const fv = fb.reduce((a, b) => (a << 1) | b, 0);
    let d5 = -1;
    for (let d = 0; d < 32; d++) if (hamming(fmtCode(d), fv) <= 3) { d5 = d; break; }
    assert.ok(d5 >= 0, '포맷 정보 BCH 디코드 실패 — 배치 위치 오류');
    assert.equal(d5 >> 3, 0, 'EC 레벨이 M(00)이 아님');
    const mask = d5 & 7;
    // 기능 패턴 예약 — 스펙 위치 (인코더 res와 독립 재구성)
    const res = Array.from({ length: n }, () => new Array(n).fill(0));
    const mark = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) res[y][x] = 1; };
    // 파인더+분리자+포맷 영역 — TL은 9×9, TR은 분리 열 1+파인더 7 = 8폭×9행(포맷 행8 포함),
    // BL은 9폭(포맷 열8 포함)×8행(분리 행+파인더 7) — 한 칸이라 넓게 잡으면 데이터 셀을 삼켜 디코드 실패
    mark(0, 0, 8, 8); mark(n - 8, 0, n - 1, 8); mark(0, n - 8, 8, n - 1);
    for (let i = 0; i < n; i++) { res[6][i] = 1; res[i][6] = 1; }          // 타이밍
    for (const cy of ALIGN[v]) for (const cx of ALIGN[v]) {               // 정렬 패턴 (파인더 겹침 제외 — 인코더와 동일 규칙)
        if ((cx <= 8 && cy <= 8) || (cx >= n - 9 && cy <= 8) || (cx <= 8 && cy >= n - 9)) continue;
        mark(cx - 2, cy - 2, cx + 2, cy + 2);
    }
    res[n - 8][8] = 1;                                                   // 어두운 모듈
    if (v >= 7) { mark(n - 11, 0, n - 9, 5); mark(0, n - 11, 5, n - 9); }  // 버전 정보
    // 지그재그 추출 + 마스크 해제
    const data = [];
    let r = n - 1, dir = -1;
    for (let c = n - 1; c > 0; c -= 2) {
        if (c === 6) c--;
        for (; r >= 0 && r < n; r += dir) {
            for (const cc of [c, c - 1]) {
                if (res[r][cc]) continue;
                data.push(at(cc, r) ^ (MASKS[mask](r, cc) ? 1 : 0));
            }
        }
        dir = -dir; r += dir;
    }
    const cw = [];
    for (let i = 0; i + 8 <= data.length; i += 8) {
        let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | data[i + j];
        cw.push(b);
    }
    // 인터리빙 해제 — 동일 크기 블록
    const ver = VER[v], nB = ver.blocks.length, blen = ver.blocks[0];
    const dBlocks = Array.from({ length: nB }, () => []), eBlocks = Array.from({ length: nB }, () => []);
    let p = 0;
    for (let i = 0; i < blen; i++) for (let b = 0; b < nB; b++) dBlocks[b].push(cw[p++]);
    for (let i = 0; i < ver.ec; i++) for (let b = 0; b < nB; b++) eBlocks[b].push(cw[p++]);
    // RS 신드롬 — 수신 코드워드가 생성근 α^0..α^(ec-1)에서 0이어야 유효
    for (let b = 0; b < nB; b++) {
        const block = [...dBlocks[b], ...eBlocks[b]];
        for (let i = 0; i < ver.ec; i++) {
            let s = 0;
            for (const c of block) s = gmul(s, EXP[i]) ^ c;
            assert.equal(s, 0, `블록${b} RS 신드롬 α^${i} ≠ 0 — 오류정정 부호 불일치`);
        }
    }
    // 바이트 모드 파싱 — 모드(0100) + 카운트(8) + 데이터
    const dbits = dBlocks.flat().flatMap(b => Array.from({ length: 8 }, (_, i) => (b >> (7 - i)) & 1));
    assert.equal(dbits.slice(0, 4).join(''), '0100', '모드 인디케이터가 바이트 모드가 아님');
    const cnt = dbits.slice(4, 12).reduce((a, x) => (a << 1) | x, 0);
    const bytes = [];
    for (let i = 0; i < cnt; i++) bytes.push(dbits.slice(12 + i * 8, 20 + i * 8).reduce((a, x) => (a << 1) | x, 0));
    return new TextDecoder().decode(new Uint8Array(bytes));
};

// — 구조 불변조건 —

test('버전 자동 선택 — 크기 = 17+4v', () => {
    assert.equal(qrMatrix('A').size, 21);                    // v1
    assert.equal(qrMatrix('LOG-20261114-a3f2c1').size, 25);  // v2 (문서번호 실제 사례)
    assert.equal(qrMatrix('x'.repeat(60)).size, 33);         // v4
    assert.equal(qrMatrix('x'.repeat(200)), null);           // 수용 초과
});

test('파인더·타이밍·어두운 모듈 — 기능 패턴 정위치', () => {
    const q = qrMatrix('HELLO');
    const at = q.at;
    // 파인더 7×7 — 외곽 링 어두움·내부 링 밝음·중심 3×3 어두움 (3개 코너 공통 구조)
    assert.ok(at(0, 0) && at(6, 0) && at(0, 6) && at(6, 6) && at(3, 3), '좌상 파인더 형상 이상');
    assert.ok(!at(1, 1) && !at(5, 5), '파인더 내부 링이 어두움');
    assert.ok(at(q.size - 1, 0) && at(0, q.size - 1), '우상·좌하 파인더 부재');
    assert.ok(!at(7, 0) && !at(0, 7), '분리자가 어두움');
    // 타이밍 — 6행·6열 교대 패턴
    assert.ok(at(8, 6) && !at(9, 6) && at(10, 6), '6행 타이밍 비교대');
    assert.ok(at(6, 8) && !at(6, 9), '6열 타이밍 비교대');
    assert.ok(at(8, q.size - 8), '어두운 모듈 (n-8,8) 미설정');
});

test('정렬 패턴 — v2는 (18,18) 1개, 파인더 겹침 위치는 미생성', () => {
    const q = qrMatrix('x'.repeat(20)); // v2 25×25
    // (18,18) 정렬 패턴 중심 — 5×5 형상: 외곽 어두움·링 밝음·중심 어두움
    assert.ok(q.at(18, 18) && q.at(16, 16) && q.at(20, 20), '정렬 패턴 부재');
    assert.ok(!q.at(17, 17), '정렬 패턴 내부 링이 어두움');
});

// — 라운드트립 (독립 디코더) —

for (const s of ['A', 'HELLO WORLD', 'LOG-20261114-a3f2c1', 'INC-20261113-b7e4d2',
    '문서번호 UTF-8 인코딩 확인', 'x'.repeat(100)]) {
    test(`디코드 라운드트립 — "${s.slice(0, 20)}${s.length > 20 ? '…' : ''}"`, () => {
        const q = qrMatrix(s);
        assert.ok(q, '인코딩 실패');
        assert.equal(decode(q), s);
    });
}

test('PNG 출력 — 시그니처·정사각·결정적 (캔버스 없이 Node에서도 동작)', () => {
    const p = qrPng('LOG-20261114-a3f2c1');
    assert.ok(p, 'PNG 생성 실패');
    assert.deepEqual([...p.data.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'PNG 시그니처 불일치');
    assert.equal(p.w, p.h, '정사각 아님');
    assert.ok(p.w >= 100, '스캔 가능 크기 미달');
    assert.deepEqual(qrPng('LOG-20261114-a3f2c1').data, p.data, '동일 입력이 다른 PNG 생성 — 결정적이어야 함');
});

test('data URL — PNG base64 인코딩 (이미지 태그 삽입용)', () => {
    const url = qrDataUrl('LOG-20261114-a3f2c1');
    assert.ok(url.startsWith('data:image/png;base64,'), 'data URL 형식 아님');
    const bin = atob(url.split(',')[1]);
    assert.equal(bin.charCodeAt(1), 80, 'PNG 바이트 시그니처 불일치');
    assert.equal(qrDataUrl('x'.repeat(300)), '', '수용 초과 시 빈 문자열 기대');
    assert.equal(qrPng('x'.repeat(300)), null, '수용 초과 시 null 기대');
});
