// src/content/qr.js — 최소 QR 인코더 (외부 라이브러리 없음, ISO/IEC 18004)
// @spec CO-22 — 문서번호 QR 공용 인코더. 바이트 모드·오류정정 레벨 M·버전 1~7 자동 선택 (짧은 검증 문자열용).
// qrMatrix는 순수 매트릭스, qrPng/qrDataUrl은 자체 PNG 인코더(1비트·무압축 deflate)라
// 캔버스 없이 Node·브라우저 동일 동작 — 동일 입력은 동일 바이트(결정적).

// — GF(256) 산술 (primitive poly 0x11d) —
const _EXP = new Uint8Array(512), _LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) { _EXP[i] = x; _LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) _EXP[i] = _EXP[i - 255] || 0;
})();
const _gmul = (/** @type {number} */ a, /** @type {number} */ b) => (a && b ? _EXP[(_LOG[a] || 0) + (_LOG[b] || 0)] || 0 : 0);
/** 생성 다항식 (x-a^0)(x-a^1)…(x-a^{n-1}) — 계수 배열(최고차 1) */
const _gpoly = (/** @type {number} */ n) => {
    /** @type {number[]} */ let g = [1];
    for (let i = 0; i < n; i++) {
        /** @type {number[]} */ const ng = new Array(g.length + 1).fill(0);
        for (let j = 0; j < g.length; j++) { ng[j] = (ng[j] || 0) ^ (g[j] || 0); ng[j + 1] = (ng[j + 1] || 0) ^ _gmul(g[j] || 0, _EXP[i] || 0); }
        g = ng;
    }
    return g;
};
/** Reed-Solomon 오류정정 부호 n바이트 */
const _rsEC = (/** @type {number[]} */ data, /** @type {number} */ n) => {
    const g = _gpoly(n);
    /** @type {number[]} */ const res = new Array(n).fill(0);
    for (const d of data) {
        const f = d ^ (res.shift() || 0);
        res.push(0);
        if (f) for (let i = 0; i < n; i++) res[i] = (res[i] || 0) ^ _gmul(g[i + 1] || 0, f);
    }
    return res;
};

// — 버전 표 (오류정정 M): 전체 코드워드·블록당 EC·데이터 블록 크기 —
// v1~v7 모두 동일 크기 블록이라 인터리빙이 단순하다 (그룹 분할 없음)
/** @type {Array<?{cw:number,ec:number,blocks:number[]}>} */
const _VER = [null,
    { cw: 26, ec: 10, blocks: [16] },
    { cw: 44, ec: 16, blocks: [28] },
    { cw: 70, ec: 26, blocks: [44] },
    { cw: 100, ec: 18, blocks: [32, 32] },
    { cw: 134, ec: 24, blocks: [43, 43] },
    { cw: 172, ec: 16, blocks: [27, 27, 27, 27] },
    { cw: 196, ec: 18, blocks: [31, 31, 31, 31] },
];
// 정렬 패턴 중심 좌표 (버전별)
/** @type {Array<?number[]>} */
const _ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38]];
// 포맷 정보 15비트 (레벨 M, 마스크 0~7)
const _FMT = ['101010000010010', '101000100100101', '101111001111100', '101101101001011',
    '100010111111001', '100000101001110', '100111010010111', '100101110100100'];
// 버전 정보 18비트 (v7만 — v1~v6는 버전 정보 블록 없음)
/** @type {Array<?string>} */
const _VINFO = [null, null, null, null, null, null, null, '000111110010010100'];

// — 비트 스트림 —
const _Bits = () => {
    /** @type {number[]} */ const bits = [];
    return {
        put: (/** @type {number} */ v, /** @type {number} */ n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); },
        byte: () => { /** @type {number[]} */ const b = []; for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | (bits[i + j] || 0); b.push(v); } return b; },
        get length() { return bits.length; },
    };
};

/** 데이터 코드워드 조립 — 바이트 모드 + 종단자 + 패딩 @returns {?number[]} */
const _dataCW = (/** @type {string} */ text, /** @type {{blocks:number[]}} */ ver) => {
    const bytes = [...new TextEncoder().encode(text)];
    const total = ver.blocks.reduce((a, b) => a + b, 0);
    if (bytes.length > total - 2) return null; // 모드+카운트+최소 종단자 공간 부족
    const s = _Bits();
    s.put(0b0100, 4);           // 바이트 모드
    s.put(bytes.length, 8);     // 카운트 (v1~9)
    for (const b of bytes) s.put(b, 8);
    for (let i = 0; i < 4 && s.length < total * 8; i++) s.put(0, 1); // 종단자
    while (s.length % 8) s.put(0, 1);
    const data = s.byte();
    for (let i = 0; data.length < total; i++) data.push(i % 2 ? 0x11 : 0xEC); // 패딩 바이트 교대
    return data;
};

/** 블록 분할 + EC 계산 + 인터리빙 → 최종 코드워드 */
const _codewords = (/** @type {number[]} */ data, /** @type {{ec:number,blocks:number[]}} */ ver) => {
    /** @type {number[][]} */ const blocks = [], /** @type {number[][]} */ ecs = [];
    let off = 0;
    for (const n of ver.blocks) {
        const blk = data.slice(off, off + n);
        blocks.push(blk); ecs.push(_rsEC(blk, ver.ec)); off += n;
    }
    /** @type {number[]} */ const out = [];
    for (let i = 0; i < Math.max(...ver.blocks); i++) for (const b of blocks) if (i < b.length) out.push(b[i] || 0);
    for (let i = 0; i < ver.ec; i++) for (const e of ecs) out.push(e[i] || 0);
    return out;
};

// — 매트릭스 —
/** @type {Array<(r:number,c:number)=>boolean>} */
const _MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r, _c) => r % 2 === 0,
    (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];
/** 파인더 모듈 값 — 중심(3,3) 기준 링 거리: 외곽 링(3)·중심(≤1)은 1, 내부 링(2)·분리자(4)는 0 */
/** @param {number} r @param {number} c */
const _finderVal = (r, c) => {
    const edge = Math.max(Math.abs(r - 3), Math.abs(c - 3));
    return edge === 3 || edge <= 1 ? 1 : 0;
};

const _finder = (/** @type {number[][]} */ m, /** @type {number[][]} */ res, /** @type {number} */ x, /** @type {number} */ y) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
        const rr = y + r, cc = x + c, mr = m[rr], rs = res[rr];
        if (!mr || !rs || cc < 0 || cc >= m.length) continue;
        rs[cc] = 1;
        mr[cc] = _finderVal(r, c);
    }
};
const _align = (/** @type {number[][]} */ m, /** @type {number[][]} */ res, /** @type {number} */ cx, /** @type {number} */ cy) => {
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
        const mr = m[cy + r], rs = res[cy + r];
        if (!mr || !rs) continue;
        rs[cx + c] = 1;
        mr[cx + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0;
    }
};

/** N1 — 같은 색 5+ 연속: 3+(길이-5) */
/** @param {number[][]} m */
const _penN1 = m => {
    const n = m.length; let pen = 0;
    const run = (/** @type {number[]} */ seq) => {
        let cur = -1, len = 0;
        for (const v of seq) { if (v === cur) len++; else { if (len >= 5) pen += 3 + len - 5; cur = v; len = 1; } }
        if (len >= 5) pen += 3 + len - 5;
    };
    for (let r = 0; r < n; r++) run(m[r] || []);
    for (let c = 0; c < n; c++) run(m.map(r => r[c] || 0));
    return pen;
};

/** N2 — 2×2 동색 블록 개당 +3 */
/** @param {number[][]} m */
const _penN2 = m => {
    const n = m.length; let pen = 0;
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
        const a = (m[r] || [])[c];
        if (a === (m[r] || [])[c + 1] && a === (m[r + 1] || [])[c] && a === (m[r + 1] || [])[c + 1]) pen += 3;
    }
    return pen;
};

/** N3 — 파인더 유사 패턴(□■■■□■ + 전후 밝은 4) 개당 +40 */
/** @param {number[][]} m */
const _penN3 = m => {
    const n = m.length; let pen = 0;
    const like = (/** @type {number[]} */ seq) => {
        const s = seq.join('');
        for (const p of ['00001011101', '10111010000']) { let i = -1; while ((i = s.indexOf(p, i + 1)) >= 0) pen += 40; }
    };
    for (let r = 0; r < n; r++) like(m[r] || []);
    for (let c = 0; c < n; c++) like(m.map(r => r[c] || 0));
    return pen;
};

/** 마스크 적용 매트릭스 → 페널티 점수 (낮을수록 좋음, ISO 규칙 N1~N4) */
const _penalty = (/** @type {number[][]} */ m) => {
    const n = m.length, dark = m.flat().filter(Boolean).length;
    // N4 — 어두운 비율 50% 이탈 5%당 +10
    return _penN1(m) + _penN2(m) + _penN3(m) + Math.floor(Math.abs(dark / (n * n) - 0.5) * 20) * 10;
};

/** 버전 선택 — 수용 가능한 최소 버전 (EC M, v1~v7) */
/** @param {number} bytes */
const _pickVer = bytes => {
    for (let i = 1; i <= 7; i++) { const tv = _VER[i]; if (tv && bytes <= tv.blocks.reduce((a, b) => a + b, 0) - 2) return { v: i, ver: tv }; }
    return null;
};

/** 모듈 설정 + 예약 표시 */
/** @param {number[][]} m @param {number[][]} res @param {number} r @param {number} c @param {number} val @param {number} [rs] */
const _set = (m, res, r, c, val, rs = 0) => {
    const mr = m[r]; if (mr) mr[c] = val;
    if (rs) { const rr = res[r]; if (rr) rr[c] = 1; }
};

/** 현재 값 유지 + 예약 표시 — 포맷 자리에 이미 찍힌 기능 패턴 모듈을 그대로 두고 예약만 */
/** @param {number[][]} m @param {number[][]} res @param {number} r @param {number} c */
const _keep = (m, res, r, c) => _set(m, res, r, c, (m[r] || [])[c] || 0, 1);

/** 포맷 정보 예약 영역 — (n-8,8) 고정 어두운 모듈 + 파인더 주변 포맷 자리는 데이터 배치 제외 */
/** @param {number[][]} m @param {number[][]} res @param {number} n */
const _fmtReserve = (m, res, n) => {
    _set(m, res, n - 8, 8, 1, 1);
    for (let i = 0; i <= 8; i++) if (i !== 6) { _keep(m, res, 8, i); _keep(m, res, i, 8); } // 좌상 포맷 영역
    for (let i = 0; i < 8; i++) _keep(m, res, 8, n - 1 - i);   // 우상 포맷 영역 (행8·열 n-8~n-1)
    for (let i = 0; i < 7; i++) _keep(m, res, n - 1 - i, 8);   // 좌하 포맷 영역 (열8·행 n-7~n-1)
};

/** 포맷 영역·버전 정보 예약 — 파인더 주변 포맷 자리 + v7 버전 정보 블록 */
/** @param {number[][]} m @param {number[][]} res @param {number} n @param {number} v */
const _layoutReserve = (m, res, n, v) => {
    _fmtReserve(m, res, n);
    const vinfo = _VINFO[v];
    if (!vinfo) return;
    // 버전 정보 (v7) — 우상·좌하 6×3, 비트 i는 _VINFO 문자열의 17-i (MSB 선두 문자열이라 역순)
    for (let i = 0; i < 18; i++) {
        const b = +vinfo.charAt(17 - i), r = Math.floor(i / 3), c = i % 3;
        _set(m, res, r, n - 11 + c, b, 1); _set(m, res, n - 11 + c, r, b, 1);
    }
};

/** 파인더 인접 위치 — 정렬 패턴 배치에서 제외되는 세 모서리 영역 */
/** @param {number} cx @param {number} cy @param {number} n */
const _nearFinder = (cx, cy, n) => (cx <= 8 && cy <= 8) || (cx >= n - 9 && cy <= 8) || (cx <= 8 && cy >= n - 9);

/** 정렬 패턴 배치 — 파인더와 겹치는 위치 제외 */
/** @param {number[][]} m @param {number[][]} res @param {number} n @param {number} v */
const _layoutAlign = (m, res, n, v) => {
    for (const cy of _ALIGN[v] || []) for (const cx of _ALIGN[v] || []) {
        if (!_nearFinder(cx, cy, n) && !(res[cy] || [])[cx]) _align(m, res, cx, cy);
    }
};

/** 기능 패턴 배치 — 파인더+분리자·정렬 패턴(파인더 겹침 제외)·타이밍 */
/** @param {number[][]} m @param {number[][]} res @param {number} n @param {number} v */
const _layoutFunc = (m, res, n, v) => {
    _finder(m, res, 0, 0); _finder(m, res, n - 7, 0); _finder(m, res, 0, n - 7);
    _layoutAlign(m, res, n, v);
    for (let i = 8; i < n - 8; i++) { _set(m, res, 6, i, i % 2 === 0 ? 1 : 0, 1); _set(m, res, i, 6, i % 2 === 0 ? 1 : 0, 1); }
    _layoutReserve(m, res, n, v);
};

/** 데이터 배치 — 우하단부터 2열 지그재그, 6열(타이밍) 건너뜀 */
/** @param {number[][]} m @param {number[][]} res @param {number[]} cws @param {number} n */
const _place = (m, res, cws, n) => {
    const dataBits = cws.flatMap(b => Array.from({ length: 8 }, (_, i) => (b >> (7 - i)) & 1));
    let di = 0, dir = -1, r = n - 1;
    const fill = (/** @type {number} */ rr, /** @type {number} */ cc) => {
        if (!(res[rr] || [])[cc]) _set(m, res, rr, cc, di < dataBits.length ? dataBits[di++] || 0 : 0);
    };
    for (let c = n - 1; c > 0; c -= 2) {
        if (c === 6) c--;
        for (; r >= 0 && r < n; r += dir) { fill(r, c); fill(r, c - 1); }
        dir = -dir; r += dir;
    }
};

/** 마스크 k 적용 사본 — 비예약 모듈만 반전 */
/** @param {number[][]} m @param {number[][]} res @param {number} n @param {number} k */
const _masked = (m, res, n, k) => {
    const mm = m.map(row => row.slice()), mk = _MASKS[k];
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) {
        const mrow = mm[rr];
        if (mk && !(res[rr] || [])[cc] && mk(rr, cc) && mrow) mrow[cc] = (mrow[cc] || 0) ^ 1;
    }
    return mm;
};

/** 최적 마스크 선정 — 8 후보에 페널티 점수 최소 선택 */
/** @param {number[][]} m @param {number[][]} res @param {number} n */
const _bestMask = (m, res, n) => {
    /** @type {?number[][]} */ let best = null;
    let bestMask = 0, bestPen = Infinity;
    for (let k = 0; k < 8; k++) {
        if (!_MASKS[k]) continue;
        const mm = _masked(m, res, n, k), p = _penalty(mm);
        if (p < bestPen) { bestPen = p; best = mm; bestMask = k; }
    }
    return best ? { m: best, mask: bestMask } : null;
};

/** 포맷 정보 사본 1 (좌상 파인더 주변): (8,0..5)=f14..f9 · (8,7)=f8 · (8,8)=f7 · (7,8)=f6 · (5..0,8)=f5..f0 */
/** @param {number[][]} fm @param {(i:number)=>number} b */
const _fmtCopy1 = (fm, b) => {
    for (let i = 0; i <= 5; i++) { const row = fm[8]; if (row) row[i] = b(i); }
    const row = fm[8]; if (row) { row[7] = b(6); row[8] = b(7); }
    const r7 = fm[7]; if (r7) r7[8] = b(8);
    for (let i = 0; i <= 5; i++) { const row2 = fm[5 - i]; if (row2) row2[8] = b(9 + i); }
};

/** 포맷 정보 사본 2 (우상·좌하): (n-1..n-7, 8)=f14..f8 · (8, n-8..n-1)=f7..f0 */
/** @param {number[][]} fm @param {number} n @param {(i:number)=>number} b */
const _fmtCopy2 = (fm, n, b) => {
    for (let i = 0; i <= 6; i++) { const row = fm[n - 1 - i]; if (row) row[8] = b(i); }
    for (let i = 0; i <= 7; i++) { const row = fm[8]; if (row) row[n - 8 + i] = b(7 + i); }
};

/**
 * 문자열 → QR 매트릭스 — {size, at(x,y):boolean} | null (수용 초과 시)
 * @param {string} text
 */
export const qrMatrix = (/** @type {string} */ text) => {
    const pick = _pickVer(new TextEncoder().encode(String(text || '')).length);
    if (!pick) return null;
    const { v, ver } = pick;
    const data = _dataCW(String(text), ver);
    if (!data) return null;
    const n = 17 + 4 * v;
    /** @type {number[][]} */ const m = Array.from({ length: n }, () => new Array(n).fill(0)); // 모듈 값
    /** @type {number[][]} */ const res = m.map(r => r.map(() => 0));                          // 기능 패턴 예약
    _layoutFunc(m, res, n, v);
    _place(m, res, _codewords(data, ver), n);
    const best = _bestMask(m, res, n);
    if (!best) return null;
    // 포맷 정보 — _FMT 문자열은 f14..f0 (MSB 선두): b(i) = f[i] → 비트(14-i)
    const f = _FMT[best.mask] || '', b = (/** @type {number} */ i) => +f.charAt(i);
    const fm = best.m;
    _fmtCopy1(fm, b); _fmtCopy2(fm, n, b);
    return { size: n, at: (/** @type {number} */ x, /** @type {number} */ y) => { const row = fm[y]; return !!(row && row[x]); }, version: v, mask: best.mask };
};

// — 최소 PNG 인코더 (1비트 흑백, 무압축 deflate) — 캔버스 없이 결정적 PNG.
// 브라우저·Node 양쪽 동작, 동일 입력은 동일 바이트 → 스냅샷 테스트·Node 문서 생성 가능
const _CRC32 = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
})();
const _crc32 = (/** @type {Uint8Array} */ buf) => { let c = 0xFFFFFFFF; for (const b of buf) c = ((_CRC32[(c ^ b) & 255] || 0) ^ (c >>> 8)) >>> 0; return (c ^ 0xFFFFFFFF) >>> 0; };
const _adler32 = (/** @type {Uint8Array} */ buf) => { let a = 1, b = 0; for (const x of buf) { a = (a + x) % 65521; b = (b + a) % 65521; } return ((b << 16) | a) >>> 0; };
const _concat = (/** @type {Uint8Array[]} */ parts) => { const n = parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
const _chunk = (/** @type {string} */ type, /** @type {Uint8Array} */ data) => {
    const h = new Uint8Array(12 + data.length), dv = new DataView(h.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) h[4 + i] = type.charCodeAt(i);
    h.set(data, 8);
    dv.setUint32(8 + data.length, _crc32(h.slice(4, 8 + data.length)));
    return h;
};
/** @param {number} w @param {(x:number,y:number)=>number} white - 1이면 흰 픽셀 */
const _png = (w, white) => {
    const rowBytes = Math.ceil(w / 8), raw = new Uint8Array(w * (1 + rowBytes));
    for (let y = 0; y < w; y++) {
        const o = y * (1 + rowBytes); // raw[o]=0 — 필터 바이트 (None)
        for (let x = 0; x < w; x++) if (white(x, y)) raw[o + 1 + (x >> 3)] = (raw[o + 1 + (x >> 3)] || 0) | (0x80 >> (x & 7));
    }
    // zlib 스트림 — 저장(stored) 블록 분할 (65535바이트 상한) + adler32
    const parts = [new Uint8Array([0x78, 0x01])];
    for (let pos = 0; pos < raw.length;) {
        const len = Math.min(65535, raw.length - pos), last = pos + len >= raw.length;
        const bh = new Uint8Array(5), bd = new DataView(bh.buffer);
        bh[0] = last ? 1 : 0; bd.setUint16(1, len, true); bd.setUint16(3, ~len & 0xffff, true);
        parts.push(bh, raw.slice(pos, pos + len)); pos += len;
    }
    const adl = new Uint8Array(4); new DataView(adl.buffer).setUint32(0, _adler32(raw));
    const ihdr = new Uint8Array(13), d2 = new DataView(ihdr.buffer);
    d2.setUint32(0, w); d2.setUint32(4, w); ihdr[8] = 1; // 정사각·비트깊이 1·그레이스케일(타입0)
    return _concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        _chunk('IHDR', ihdr), _chunk('IDAT', _concat([...parts, adl])), _chunk('IEND', new Uint8Array(0))]);
};

/** QR → PNG 바이트 — {data:Uint8Array,w,h} | null (수용 초과 시). 캔버스 불필요 — Node에서도 동작 */
export const qrPng = (/** @type {string} */ text, /** @type {number} */ target = 150) => {
    const q = qrMatrix(text);
    if (!q) return null;
    const quiet = 4, total = q.size + quiet * 2;
    const scale = Math.max(1, Math.ceil(target / total));
    const data = _png(total * scale, (x, y) => {
        const mx = Math.floor(x / scale) - quiet, my = Math.floor(y / scale) - quiet;
        return mx < 0 || my < 0 || mx >= q.size || my >= q.size ? 1 : (q.at(mx, my) ? 0 : 1);
    });
    return { data, w: total * scale, h: total * scale };
};

/** QR → data URL — 미리보기·이력 뷰 <img>용 (수용 초과 시 '') */
export const qrDataUrl = (/** @type {string} */ text, /** @type {number} */ target = 150) => {
    const p = qrPng(text, target);
    if (!p) return '';
    let bin = '';
    for (let i = 0; i < p.data.length; i += 0x8000) bin += String.fromCharCode(...p.data.slice(i, i + 0x8000));
    return `data:image/png;base64,${btoa(bin)}`;
};
