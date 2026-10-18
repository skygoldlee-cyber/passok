#!/usr/bin/env node
/**
 * similarity.js — 임베딩 벡터·이웃 인덱스 로드 + 유사도 계산
 * @spec AI-07
 *
 * - SEM-05 산출물({dataRoot}/embeddings/)의 int8 양자화 벡터를 디코딩
 *   (src/semantic-index.js decodeVectorBundle과 동일 스펙 — b*scale/127 근사로
 *    코사인 유사도에는 스칼라 상수가 상쇄되므로 q*scale로 충분)
 * - 신규 초안 텍스트는 임베딩이 없으므로 문자 n-gram 어휘 유사도 폴백 제공
 */

'use strict';

const fs = require('fs');

/** `var NAME = {...}` 형식의 JS 번들을 로드한다. window 참조 번들 대비 스텁 제공. */
function loadJsBundle(absPath) {
    const src = fs.readFileSync(absPath, 'utf-8');
    const m = src.match(/var\s+([A-Za-z_][\w]*)\s*=/);
    if (!m) throw new Error(`번들 전역 변수를 찾을 수 없음: ${absPath}`);
    return new Function('window', `${src};return ${m[1]};`)({});
}

/** int8 양자화 벡터 번들 → {ids, vectors: Float32Array[]} */
function decodeVectorBundle(bundle) {
    const raw = Buffer.from(bundle.vectors, 'base64');
    const q = new Int8Array(raw.buffer, raw.byteOffset, raw.length);
    const vectors = bundle.ids.map((_, r) => {
        const v = new Float32Array(bundle.dim);
        for (let c = 0; c < bundle.dim; c++) v[c] = q[r * bundle.dim + c] * bundle.scales[r];
        return v;
    });
    return { ids: bundle.ids, vectors };
}

function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** 문자 bigram 집합 (한국어 텍스트의 어휘 유사도 폴백) */
function bigrams(text) {
    const t = String(text).replace(/\s+/g, '');
    const s = new Set();
    for (let i = 0; i < t.length - 1; i++) s.add(t.slice(i, i + 2));
    return s;
}

/** Jaccard 유사도 0~1 */
function lexSim(a, b) {
    const A = bigrams(a), B = bigrams(b);
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    return inter / (A.size + B.size - inter);
}

/**
 * 텍스트 ↔ 기존 문항 임베딩 유사도 상위 K.
 * 임베딩 대상 텍스트의 벡터가 있으면 코사인, 없으면 어휘 유사도 폴백.
 */
function topMatches(bundle, queryVec, texts, k = 8) {
    const scored = [];
    if (queryVec) {
        bundle.vectors.forEach((v, i) => scored.push({ id: bundle.ids[i], score: cosine(queryVec, v) }));
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
}

module.exports = { loadJsBundle, decodeVectorBundle, cosine, lexSim, bigrams, topMatches };
