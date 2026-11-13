// @spec DA-16
/**
 * unpack.js — pk1 인코딩 번들 값 런타임 디코드 (브라우저 공용)
 * tools/lib/content_pack.js의 Node 측과 동일 규격 — 평문은 통과.
 */
const PK_KEY = 'passok-pk1-5f3a';
const PREFIX = 'pk1:';

/**
 * pk1 인코딩 값 디코드 — 평문은 그대로 통과.
 * @param {*} v
 * @returns {*}
 */
export function pkDecode(v) {
    if (typeof v !== 'string' || !v.startsWith(PREFIX)) return v;
    const bin = atob(v.slice(PREFIX.length));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ PK_KEY.charCodeAt(i % PK_KEY.length);
    return new TextDecoder().decode(bytes);
}

/**
 * 파일 맵의 모든 값을 pkDecode한다.
 * @param {Object.<string, *>} files
 * @returns {Object.<string, *>}
 */
export function pkDecodeFiles(files) {
    /** @type {Object.<string, *>} */
    const out = {};
    for (const k of Object.keys(files)) out[k] = pkDecode(files[k]);
    return out;
}
