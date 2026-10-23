#!/usr/bin/env node
/**
 * check_emb_parity.js — ONNX(transformers.js) vs PyTorch(sentence-transformers) 임베딩 파리티 검증
 * @spec none (P2 이식 판단용 검증 실험 — check 단계 미등록)
 *
 * 목적: ref-pipeline/embeddings/build_embeddings.py(Python·torch)를
 * @huggingface/transformers(ONNX·Node)로 이식해도 되는지 판단하는 데이터를 만든다.
 * 커밋된 {dataRoot}/embeddings/ 번들이 골든 레퍼런스 — Python 재실행 불필요.
 *
 * 측정 (Python 산출물은 int8 양자화 후 저장 — 비교도 동일 경로에서):
 *   A. 벡터 파리티 — JS 임베딩(int8 양자화→복원→정규화) vs 저장된 PY int8 벡터의
 *      항목별 코사인 유사도 (≥0.995 기대)
 *   B. 이웃 파리티 — 표본 키의 JS top-8(동일 텍스트·단문 필터 동일 적용)과
 *      커밋된 adj의 집합 중첩률 (Jaccard ≥0.9 기대) — 앱이 실제로 보여주는 면
 *
 * 판정 기준(고정): 벡터 평균 cos ≥0.995, 표본 평균 Jaccard ≥0.90, 완전일치 비율 ≥0.7
 *   → 통과 시 ONNX 이식 채택 근거, 미달 시 이식 보류.
 *
 * 사용법:
 *   node tools/check/check_emb_parity.js [--exam <id>] [--dtype fp32|q8]
 *        [--model <onnx-repo>] [--revision <sha>] [--sample 400] [--batch 64]
 *        (모델·리비전 기본값은 tools/lib/emb_math.js의 EMB_MODEL 핀)
 * ※ 기본 dtype은 fp32 — 측정 결과 q8은 모델 양자화 노이즈로 이웃 파리티 미달
 *   (Jaccard 0.72 vs 0.99), 운영 포팅본(build_embeddings.js)도 fp32 고정.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT } = require('../lib/env');
const { getExamTargets } = require('../build/exam_targets');
const {
    textNormKey, quantizeInt8, dequantizeNorm, dotVec, loadVarBundle,
    EMB_MODEL, EMB_MODEL_REVISION,
} = require('../lib/emb_math');

const E5_DOC_PREFIX = 'passage: ';
const TOP_K = 8;
const MIN_NEIGHBOR_LEN = 12;
const NEIGHBOR_POOL = 64;

// ── 판정 임계 (docstring 기준과 정합) ──────────────────────────────
const THRESH = { vecCos: 0.995, jaccard: 0.90, exactRatio: 0.70 };

// ── Python 포팅 — build_embeddings.py의 결정적 함수 (tools/lib/emb_math.js 공유) ──

/** topk_neighbors와 동일 규칙: 자기 제외·동일 정규화 텍스트 제외·min_len 미만 제외 후 top-K */
function topkForQuery(i, simRow, keys, norms, k) {
    const n = simRow.length;
    const order = [];
    for (let j = 0; j < n; j++) if (j !== i) order.push(j);
    order.sort((a, b) => simRow[b] - simRow[a]);
    const picked = [];
    for (const j of order.slice(0, Math.max(k * 4, NEIGHBOR_POOL))) {
        if (norms[j] === norms[i] || norms[j].length < MIN_NEIGHBOR_LEN) continue;
        picked.push([keys[j], Math.round(simRow[j] * 1e4) / 1e4]);
        if (picked.length >= k) break;
    }
    return picked;
}

function loadEmbeddings(embDir) {
    const neighbors = loadVarBundle(path.join(embDir, 'neighbors.js')).data;
    const pyVec = new Map(); // key → {vec: Float32Array}
    for (const f of fs.readdirSync(embDir).filter((x) => x.startsWith('vectors_') && x.endsWith('.js'))) {
        const b = loadVarBundle(path.join(embDir, f)).data;
        const q = new Int8Array(Buffer.from(b.vectors, 'base64'));
        const deq = dequantizeNorm(q, Float32Array.from(b.scales), b.ids.length, b.dim);
        for (let i = 0; i < b.ids.length; i++) pyVec.set(b.ids[i], { off: i, mat: deq, dim: b.dim });
    }
    return { neighbors, pyVec };
}

// ── 임베딩 (ONNX) ───────────────────────────────────────────────────
async function embedAll(texts, { model, revision, dtype, batch }) {
    const { pipeline } = require('@huggingface/transformers');
    const extractor = await pipeline('feature-extraction', model, { dtype, revision });
    const dim = (await extractor([E5_DOC_PREFIX + 'dimension probe'], { pooling: 'mean', normalize: true })).dims[1];
    const out = new Float32Array(texts.length * dim);
    for (let s = 0; s < texts.length; s += batch) {
        const chunk = texts.slice(s, s + batch).map((t) => E5_DOC_PREFIX + t);
        const t = await extractor(chunk, { pooling: 'mean', normalize: true });
        out.set(t.data, s * dim);
        process.stdout.write(`\r  ONNX 인코딩 ${Math.min(s + batch, texts.length)}/${texts.length}`);
    }
    process.stdout.write('\n');
    return { mat: out, dim };
}

/** 시드 LCG — Python np.random.default_rng(20261012)와 무관하게 표본만 재현되면 됨 */
function makeRng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
}

function parseArgs(argv) {
    const a = { exam: null, dtype: 'fp32', model: EMB_MODEL, revision: EMB_MODEL_REVISION, sample: 400, batch: 64 };
    for (let i = 0; i < argv.length; i += 2) {
        const k = argv[i].replace(/^--/, '');
        if (k in a) a[k] = /^\d+$/.test(argv[i + 1]) ? parseInt(argv[i + 1], 10) : argv[i + 1];
        else { console.error(`알 수 없는 인자: ${argv[i]}`); process.exit(2); }
    }
    return a;
}

/** --exam 미지정 시 기본 시험(default:true, 없으면 첫 semantic 대상) 해석 */
function resolveExamTarget(examId) {
    const targets = getExamTargets(ROOT).filter((t) => t.features && t.features.semantic);
    if (examId) return targets.find((t) => t.id === examId) || null;
    return targets.find((t) => t.isDefault) || targets[0] || null;
}

async function main(argv = process.argv.slice(2)) {
    const a = parseArgs(argv);
    const target = resolveExamTarget(a.exam);
    if (!target) {
        console.error(`features.semantic 대상 시험 없음${a.exam ? ` (exam=${a.exam})` : ''}`);
        return 2;
    }
    const embDir = path.join(ROOT, target.dataRoot, 'embeddings');
    if (!fs.existsSync(embDir)) {
        console.error(`❌ ${path.relative(ROOT, embDir)} 없음 — 먼저 npm run build:embeddings 실행`);
        return 2;
    }

    console.log(`[1/4] 골든 레퍼런스 로드: ${path.relative(ROOT, embDir)}`);
    const { neighbors, pyVec } = loadEmbeddings(embDir);
    const keys = Object.keys(neighbors.texts);
    const texts = keys.map((k) => neighbors.texts[k]);
    const norms = texts.map(textNormKey);
    console.log(`  항목 ${keys.length} · 저장 이웃 k=${neighbors.k} · PY 벡터 ${pyVec.size} (${a.dtype} ONNX 비교 대상)`);

    console.log(`[2/4] ONNX 임베딩: ${a.model}@${a.revision.slice(0, 12)} (${a.dtype}, batch ${a.batch})`);
    const { mat, dim } = await embedAll(texts, a);
    const { q, scales } = quantizeInt8(mat, texts.length, dim);
    const jsVec = dequantizeNorm(q, scales, texts.length, dim);

    console.log('[3/4] 벡터 파리티 — 항목별 JS↔PY 복원벡터 코사인');
    let vecSum = 0, vecMin = 1, vecN = 0;
    const sims = [];
    for (let i = 0; i < keys.length; i++) {
        const p = pyVec.get(keys[i]);
        if (!p) continue;
        const cos = dotVec(jsVec, i, p.mat, p.off, dim);
        sims.push([cos, keys[i]]);
        vecSum += cos; vecMin = Math.min(vecMin, cos); vecN++;
    }
    const vecMean = vecSum / vecN;
    sims.sort((x, y) => x[0] - y[0]);
    console.log(`  평균 cos ${vecMean.toFixed(5)} · 최소 ${vecMin.toFixed(5)} (기준 ≥${THRESH.vecCos})`);
    console.log(`  최하위 5: ${sims.slice(0, 5).map(([c, k]) => `${k}=${c.toFixed(4)}`).join(' ')}`);

    console.log(`[4/4] 이웃 파리티 — 표본 ${a.sample}키 top-${TOP_K} 집합 중첩`);
    const rng = makeRng(20261023);
    const idxPool = keys.map((_, i) => i);
    for (let i = idxPool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idxPool[i], idxPool[j]] = [idxPool[j], idxPool[i]]; }
    const sampleIdx = idxPool.slice(0, Math.min(a.sample, keys.length));
    // 표본 키의 유사도 행만 계산 — 전체 N×N 대신 sample×N (행 벡터 유사도)
    let jacSum = 0, exact = 0, compared = 0;
    const worst = [];
    for (const i of sampleIdx) {
        const golden = neighbors.adj[keys[i]];
        if (!golden || !golden.length) continue;
        const simRow = new Float32Array(keys.length);
        for (let j = 0; j < keys.length; j++) simRow[j] = dotVec(jsVec, i, jsVec, j, dim);
        const jsTop = topkForQuery(i, simRow, keys, norms, TOP_K);
        const gSet = new Set(golden.map((x) => x[0]));
        const jSet = new Set(jsTop.map((x) => x[0]));
        const inter = [...gSet].filter((x) => jSet.has(x)).length;
        const jac = inter / (gSet.size + jSet.size - inter);
        jacSum += jac; compared++;
        if (jac === 1 && jsTop.length === golden.length) exact++;
        worst.push([jac, keys[i], golden.map((x) => x[0]), jsTop.map((x) => x[0])]);
    }
    const jacMean = jacSum / compared;
    const exactRatio = exact / compared;
    worst.sort((x, y) => x[0] - y[0]);
    console.log(`  평균 Jaccard ${jacMean.toFixed(4)} (기준 ≥${THRESH.jaccard}) · 완전일치 ${exact}/${compared} (${(exactRatio * 100).toFixed(1)}%, 기준 ≥${THRESH.exactRatio * 100}%)`);
    for (const [jac, k, g, j] of worst.slice(0, 5)) {
        console.log(`  최하위 ${k} J=${jac.toFixed(2)} — 골든만: ${g.filter((x) => !j.includes(x)).slice(0, 3).join(',') || '∅'}`);
    }

    const pass = vecMean >= THRESH.vecCos && jacMean >= THRESH.jaccard && exactRatio >= THRESH.exactRatio;
    console.log(`\n${pass ? '✅ 파리티 통과' : '❌ 파리티 미달'} — 벡터 ${vecMean.toFixed(5)}/${THRESH.vecCos} · Jaccard ${jacMean.toFixed(4)}/${THRESH.jaccard} · 일치 ${(exactRatio * 100).toFixed(1)}%/${THRESH.exactRatio * 100}%`);
    console.log(pass
        ? '   → ONNX(transformers.js) 이식 가능 판단 근거 확보. Node 포팅 진행 가능.'
        : '   → 이식 보류 권고. dtype=fp32 재측정으로 양자화 원인 분리 권장 (--dtype fp32).');
    return pass ? 0 : 1;
}

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check_emb_parity.js');
if (isDirectRun) main().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(2); });

module.exports = { textNormKey, quantizeInt8, dequantizeNorm, dotVec, topkForQuery, loadVarBundle, main, THRESH };
