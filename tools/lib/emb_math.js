/**
 * emb_math.js — 임베딩 파이프라인 공유 수치·번들 헬퍼
 * @spec none (도구 인프라 — build_embeddings.js·check_emb_parity.js 공용)
 *
 * ref-pipeline/embeddings/build_embeddings.py 의 결정적 함수와 1:1 대응하는
 * 순수 함수 모음. Node 포팅본(tools/build/build_embeddings.js)과 파리티
 * 검증기(tools/check/check_emb_parity.js)가 같은 수치 경로를 공유한다.
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');

// HF Hub 모델 핀 — revision 미지정 요청은 main 최신을 따라가므로 커밋 SHA로
// 고정한다 (재생성 재현성·공급망 방어). 갱신: huggingface.co/api/models/<id> 의 sha.
const EMB_MODEL = 'Xenova/multilingual-e5-small';
const EMB_MODEL_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78'; // main @2025-07-22
const EMB_MODEL_LOGICAL = 'intfloat/multilingual-e5-small'; // 매니페스트 기록용 원본 모델명

/** 동일 텍스트 판별용 정규화 키 — 공백 제거·소문자 (Python text_norm_key) */
function textNormKey(t) { return String(t).replace(/\s+/g, '').toLowerCase(); }

/** 벡터별 대칭 int8 양자화 — b = round(v / max|v| * 127) (Python quantize_int8) */
function quantizeInt8(mat, n, dim) {
    const scales = new Float32Array(n);
    const q = new Int8Array(n * dim);
    for (let i = 0; i < n; i++) {
        let mx = 0;
        for (let d = 0; d < dim; d++) mx = Math.max(mx, Math.abs(mat[i * dim + d]));
        scales[i] = mx === 0 ? 1 : mx;
        for (let d = 0; d < dim; d++) q[i * dim + d] = Math.round(mat[i * dim + d] / scales[i] * 127);
    }
    return { q, scales };
}

/** int8 → 복원(×scale) → L2 정규화 (Python dequantize_int8 + normalize_rows) */
function dequantizeNorm(q, scales, n, dim) {
    const out = new Float32Array(n * dim);
    for (let i = 0; i < n; i++) {
        let norm = 0;
        for (let d = 0; d < dim; d++) {
            const v = q[i * dim + d] * scales[i];
            out[i * dim + d] = v;
            norm += v * v;
        }
        norm = Math.sqrt(norm) || 1;
        for (let d = 0; d < dim; d++) out[i * dim + d] /= norm;
    }
    return out;
}

/** 행렬 내 두 행 벡터의 내적 (정규화 입력이면 코사인) */
function dotVec(a, ia, b, ib, dim) {
    let s = 0;
    for (let d = 0; d < dim; d++) s += a[ia * dim + d] * b[ib * dim + d];
    return s;
}

/**
 * 입력 번들의 개행 정규화 해시 — manifest.inputs 기록용 (Python file_sha1)
 * 작업트리 개행(CRLF/LF)에 해시가 종속되면 Windows↔Linux 간 오탐이 발생하므로 \r\n을 통일.
 * check_emb_freshness.js의 sha1()과 동일 규칙이어야 한다.
 */
function fileSha1(p) {
    return crypto.createHash('sha1')
        .update(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
}

/** `var NAME = <json>` 형식의 데이터 번들 로딩 (Python load_js_bundle) */
function loadVarBundle(file) {
    const text = fs.readFileSync(file, 'utf8');
    const m = /(?:var|window\.)\s*([A-Za-z_][\w]*)\s*=\s*/.exec(text);
    if (!m) throw new Error(`${file}: var NAME = 패턴 없음`);
    const payload = text.slice(m.index + m[0].length).trim().replace(/;$/, '');
    let data;
    try {
        data = JSON.parse(payload);
    } catch {
        // 수작업 번들(비엄격 JS 객체 리터럴) 폴백 — Python의 node eval 폴백에 대응
        data = (new Function(`return (${payload});`))();
    }
    return { name: m[1], data };
}

module.exports = {
    textNormKey, quantizeInt8, dequantizeNorm, dotVec, fileSha1, loadVarBundle,
    EMB_MODEL, EMB_MODEL_REVISION, EMB_MODEL_LOGICAL,
};
