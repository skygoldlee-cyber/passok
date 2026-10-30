#!/usr/bin/env node
/**
 * build_embeddings.js — 콘텐츠 문장 임베딩 사전 계산 (DOC-DSN-18 PoC)
 * @spec SEM-01 (임베딩 자산 번들 생성 — manifest·neighbors·vectors)
 *
 * ref-pipeline/embeddings/build_embeddings.py 의 Node 포팅 — 동일 모델의
 * ONNX export(Xenova/multilingual-e5-small, fp32)를 @huggingface/transformers로
 * 인코딩한다. fp32 출력은 Python(PyTorch) 산출물과 int8 양자화 후 완전 일치
 * (tools/check/check_emb_parity.js 검증 — 벡터 cos 1.00000 · 이웃 일치 95.7%).
 * Python+sentence-transformers 없이 Node만으로 임베딩 번들을 재생성할 수 있다.
 *
 * 빌드타임에만 실행되는 파이프라인: 드릴·시험 JS 번들에서 진술(sid)·문항(qid)을 수집해
 * 문장 임베딩을 계산하고, int8 대칭 양자화 벡터 번들·이웃 인덱스·품질 리포트를 산출한다.
 * 앱에는 모델이 배포되지 않는다 — 산출물(벡터)만 정적 자산이 된다.
 *
 * 사용법:
 *   node tools/build/build_embeddings.js [--exam <id>|all(기본: features.semantic 전체)]
 *       [--out {dataRoot}/embeddings] [--model <onnx-repo>] [--revision <sha>]
 *       [--limit N] [--no-write] [--batch 64]
 *       (모델·리비전 기본값은 tools/lib/emb_math.js의 EMB_MODEL 핀 —
 *        revision 미지정 요청은 HF main 최신을 따라가므로 커밋 SHA로 고정)
 *
 * 출력(--out 미지정 시 {dataRoot}/embeddings/, 커밋 대상 정적 자산):
 *   manifest.js              var EMB_MANIFEST — 모델·차원·files·inputs(원본 sha1)
 *   neighbors.js             var EMB_NEIGHBORS — adj(이웃)·texts·sameText (설계 §5.2)
 *   vectors_stmt_subjectN.js var EMB_VEC_stmt_subjectN — 진술 int8 벡터 (과목별 분할)
 *   vectors_question.js      var EMB_VEC_question — 문항 int8 벡터
 *   eval_report.txt          품질 리포트 — ref-pipeline/embeddings/out/ (gitignore)
 *                            ※ .md 미사용 — 문서 ID 게이트(check:docids) 스캔 제외용
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT } = require('../lib/env.js');
const { getExamTargets } = require('./exam_targets.js');
const {
    textNormKey, quantizeInt8, dequantizeNorm, dotVec, fileSha1, loadVarBundle,
    EMB_MODEL, EMB_MODEL_REVISION, EMB_MODEL_LOGICAL,
} = require('../lib/emb_math.js');

const E5_DOC_PREFIX = 'passage: ';   // e5 계열은 저장 문서에 passage:, 질의에 query: 접두사 요구
const TOP_K = 8;                     // 이웃 인덱스 항목당 이웃 수 (설계 §5.2)
const CONFUSION_SIM = 0.85;          // 혼동 후보 임계 (cid 상이 + 의미 근접)
const NEARDUP_SIM = 0.95;            // 사실상 동일 진술(중복 감사 신호)
const SAMPLE_SEEDS = 16;             // 리포트용 시드 표본 수
const SAMPLE_QUESTIONS = 12;         // 유사 문항 표본 수
const MIN_NEIGHBOR_LEN = 12;         // 이웃 후보 최소 정규화 길이 — "표시 방법" 류 단문 노이즈 억제
const NEIGHBOR_POOL = 64;            // 이웃 후보 풀 (중복·단문 필터 후 topK 충족 여유분)
const ERR_SAMPLE_STRIDE = 8;         // quantMeanCosErr 표본 스트라이드 (전쌍방 O(N²) 절감 — 진단 지표)
const REPORT_DIR = path.join(ROOT, 'ref-pipeline', 'embeddings', 'out');
const GENERATED_BY = 'tools/build/build_embeddings.js';

const CIRCLED_DIGITS = (() => {
    const m = {};
    for (let i = 1; i <= 20; i++) m[String.fromCodePoint(0x245f + i)] = i; // ①=1 … ⑳=20
    return m;
})();

/** 정답 마커(③·'3'·텍스트)를 선지 텍스트로 해석한다 (Python answer_text) */
function answerText(ans, options) {
    const s = String(ans).trim();
    let idx;
    if (s in CIRCLED_DIGITS) idx = CIRCLED_DIGITS[s] - 1;
    else {
        const num = s.replace(/\D/g, '');
        idx = /^\d+$/.test(num) ? parseInt(num, 10) - 1 : -1;
    }
    return idx >= 0 && idx < options.length ? options[idx] : s;
}

/** 임베딩 입력 최소 정리 — 의미 신호(조사·어미)는 보존하고 공백·마크다운 기호만 제거 (Python clean_text) */
function cleanText(t) {
    return String(t).replace(/[`*_>#|[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 입력 텍스트 집합의 결정적 해시 — 신선도 게이트 비교 기준 (Python source_hash, 설계 §7.2) */
function sourceHash(items) {
    const h = crypto.createHash('sha256');
    for (const it of items) {
        h.update(it.key, 'utf8');
        h.update('\x00');
        h.update(it.text, 'utf8');
        h.update('\x00');
    }
    return h.digest('hex').slice(0, 16);
}

/**
 * 드릴·시험 번들에서 임베딩 대상 항목 수집 — key: stmt:<sid> / q:<qid> (Python collect_items).
 * 입력 파일 집합 규칙은 tools/check/check_emb_freshness.js의 expectedInputs와 동일해야 한다.
 * @returns {{items: object[], inputs: Object.<string,string>}} inputs는 소비한 번들의 {repo상대경로: sha1}
 */
function collectItems(dataRootAbs) {
    const items = [];
    const inputs = {};
    const byKey = new Map();
    const rel = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');
    const consume = (p) => { inputs[rel(p)] = fileSha1(p); };
    const add = (key, text, kind, subject, cid = null, extra = null) => {
        const t = cleanText(text);
        if (!t) return;
        if (byKey.has(key)) {                    // sid 중복 — 첫 등장 유지, cid는 보강
            if (cid && !byKey.get(key).cid) byKey.get(key).cid = cid;
            return;
        }
        const it = { key, text: t, kind, subject, cid };
        if (extra) Object.assign(it, extra);
        byKey.set(key, it);
        items.push(it);
    };

    const drills = path.join(dataRootAbs, 'drills');
    if (fs.existsSync(drills)) {
        for (const f of fs.readdirSync(drills).sort()) {
            if (!/^ox_.*\.js$/.test(f)) continue;
            const p = path.join(drills, f);
            consume(p);
            const subject = parseInt(f.match(/subject(\d+)/)[1], 10);
            for (const q of loadVarBundle(p).data) {
                if (q.sid) {
                    add(`stmt:${q.sid}`, q.statement || '', 'stmt', subject, null,
                        { context: cleanText(q.context || ''), truth: q.truth });
                }
            }
        }
        for (const f of fs.readdirSync(drills).sort()) {
            if (!/^combo_.*\.js$/.test(f) || f.includes('index')) continue;
            const p = path.join(drills, f);
            consume(p);
            let arr = loadVarBundle(p).data;
            if (!Array.isArray(arr)) arr = arr.questions || [];   // combo_pilot: {"questions": [...]}
            for (const q of arr) {
                for (const st of q.statements || []) {
                    if (st.sid) {
                        add(`stmt:${st.sid}`, st.text || '', 'stmt', q.subject,
                            st.conceptId || null, { truth: st.truth });
                    }
                }
            }
        }
    }

    const exams = path.join(dataRootAbs, 'exams');
    if (fs.existsSync(exams)) {
        for (const f of fs.readdirSync(exams).sort().filter((x) => x.endsWith('.js'))) {
            const p = path.join(exams, f);
            consume(p);
            const data = loadVarBundle(p).data;
            const m = /subject(\d+)/.exec(String(data.id || f));
            const subject = m ? parseInt(m[1], 10) : 0;
            for (const q of data.questions || []) {
                const ans = answerText(q.answer ?? '', q.options || []);
                add(`q:${q.id}`, `${q.question || ''} ${ans}`, 'question', subject);
            }
        }
    }
    return { items, inputs };
}

/** 정규화 텍스트가 동일한 항목끼리 묶은 교차 맵 — key → [동일 텍스트 다른 key] (Python same_text_map) */
function sameTextMap(items) {
    const groups = new Map();
    for (const it of items) {
        const k = textNormKey(it.text);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(it.key);
    }
    const out = {};
    for (const g of groups.values()) {
        if (g.length > 1) for (const k of g) out[k] = g.filter((x) => x !== k);
    }
    return out;
}

/**
 * 전항목 top-K 이웃 + 양자화 왕복 코사인 오차 (Python topk_neighbors + |sim_q-sim_o| 평균).
 * N×N 행렬을 메모리에 만들지 않고 행 단위로 계산한다. 인코딩 행렬은
 * emb(원본 정규화)·deq(양자화 복원 정규화) 두 개 — 이웃 산출은 런타임과 동일한 deq 기준.
 * quantMeanCosErr는 ERR_SAMPLE_STRIDE 간격 표본의 근사치다 (진단 지표 — 게이트 미사용).
 * @returns {{adj: Object.<string,[string,number][]>, qerr: number}}
 */
function buildAdjacency(deq, emb, items, norms, dim, k) {
    const n = items.length;
    const keys = items.map((it) => it.key);
    const adj = {};
    const pool = Math.min(n - 1, Math.max(k * 4, NEIGHBOR_POOL));
    // rank·n + j 패킹 — Float64Array 정렬 1회로 (sim desc, index asc) argsort 재현.
    // rank는 (2-sim)·1e9 반올림 정수 — float32 유사도는 간격 ≥6e-8이라 순위 보존.
    const sortKey = new Float64Array(n);
    let errSum = 0, errN = 0;
    for (let i = 0; i < n; i++) {
        const sampleErr = (i % ERR_SAMPLE_STRIDE) === 0;
        for (let j = 0; j < n; j++) {
            const sq = dotVec(deq, i, deq, j, dim);
            if (sampleErr) { errSum += Math.abs(sq - dotVec(emb, i, emb, j, dim)); errN++; }
            sortKey[j] = j === i ? Infinity : Math.round((2 - sq) * 1e9) * n + j;
        }
        sortKey.sort();
        const picked = [];
        for (let t = 0; t < pool; t++) {
            if (!Number.isFinite(sortKey[t])) break;
            const j = sortKey[t] % n;
            if (norms[j] === norms[i] || norms[j].length < MIN_NEIGHBOR_LEN) continue;
            const sq = 2 - Math.floor(sortKey[t] / n) / 1e9;
            picked.push([keys[j], Math.round(sq * 1e4) / 1e4]);
            if (picked.length >= k) break;
        }
        adj[keys[i]] = picked;
        if (i % 2000 === 0) process.stdout.write(`\r  이웃 인덱스 ${i}/${n}`);
    }
    process.stdout.write(`\r  이웃 인덱스 ${n}/${n}\n`);
    return { adj, qerr: errN ? errSum / errN : 0 };
}

/** 설계 §5.1 형식의 var EMB_VEC_* 번들 출력 (Python emit_vector_bundle) */
function emitVectorBundle(file, globalName, meta, rowIdx, allKeys, q, scales, dim) {
    const qSub = new Int8Array(rowIdx.length * dim);
    const scSub = new Float64Array(rowIdx.length);
    rowIdx.forEach((r, t) => {
        qSub.set(q.subarray(r * dim, (r + 1) * dim), t * dim);
        scSub[t] = scales[r];
    });
    const payload = {
        model: meta.model, revision: meta.revision, dim, quant: 'int8',
        ids: rowIdx.map((r) => allKeys[r]),
        scales: [...scSub].map((s) => Math.round(s * 1e6) / 1e6),
        vectors: Buffer.from(qSub.buffer, qSub.byteOffset, qSub.byteLength).toString('base64'),
    };
    fs.writeFileSync(file,
        `// 자동 생성된 임베딩 벡터 번들입니다. 수정하지 마십시오. (${GENERATED_BY})\n` +
        `var ${globalName} = ${JSON.stringify(payload)};\n`, 'utf8');
}

/** 품질 리포트 (Python §품질 리포트 4절 — 혼동·중복·진술표본·문항표본) */
function buildReport(items, keys, adj, meta, dim) {
    const by = new Map(items.map((it) => [it.key, it]));
    const report = ['# 임베딩 PoC 품질 리포트', '',
        `- 모델: \`${meta.revision}\` (${dim}d, int8 대칭 양자화, ONNX fp32 인코딩)`,
        `- 항목: ${items.length}개 · sourceHash \`${meta.sourceHash}\``,
        `- 양자화 왕복 평균 코사인 오차(표본): ${meta.quantMeanCosErr.toFixed(5)}`, ''];

    const stmtIdx = [], qIdx = [];
    items.forEach((it, i) => (it.kind === 'stmt' ? stmtIdx : qIdx).push(i));
    const conf = [], dup = [];
    for (const i of stmtIdx) {
        for (const [k2, s] of adj[keys[i]]) {
            if (keys[i] >= k2) continue;
            const c1 = by.get(keys[i]).cid, c2 = by.get(k2).cid;
            if (s >= NEARDUP_SIM) dup.push([keys[i], k2, s]);
            else if (s >= CONFUSION_SIM && c1 && c2 && c1 !== c2) conf.push([keys[i], k2, s, c1, c2]);
        }
    }
    report.push(`## 1. 혼동 후보 (유사도 ≥ ${CONFUSION_SIM}, cid 상이) — ${conf.length}쌍`, '');
    for (const [a1, b1, s, c1, c2] of conf.sort((x, y) => y[2] - x[2]).slice(0, 40)) {
        report.push(`- \`${s.toFixed(3)}\` [${c1}↔${c2}] ${by.get(a1).text.slice(0, 60)}  ⟷  ${by.get(b1).text.slice(0, 60)}`);
    }
    report.push('', `## 2. 사실상 중복 후보 (유사도 ≥ ${NEARDUP_SIM}) — ${dup.length}쌍`, '');
    for (const [a1, b1, s] of dup.sort((x, y) => y[2] - x[2]).slice(0, 20)) {
        report.push(`- \`${s.toFixed(3)}\` ${by.get(a1).text.slice(0, 60)}  ⟷  ${by.get(b1).text.slice(0, 60)}`);
    }

    // 결정적 표본 — Python rng.choice(n, replace=False) 대응 (시드 고정 셔플)
    let seed = 20261012 >>> 0;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
    const shuffled = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    report.push('', '## 3. 유사 진술 표본 (시드 top-8)', '');
    for (const i of shuffled(stmtIdx).slice(0, Math.min(SAMPLE_SEEDS, stmtIdx.length))) {
        const it = items[i];
        report.push(`### \`${it.key}\` (과목${it.subject}) ${it.text.slice(0, 70)}`);
        for (const [k2, s] of adj[it.key]) {
            const n2 = by.get(k2);
            report.push(`  - \`${s.toFixed(3)}\` (과목${n2.subject}) ${n2.text.slice(0, 70)}`);
        }
        report.push('');
    }
    report.push('## 4. 유사 문항 표본 (시드 top-5)', '');
    for (const i of shuffled(qIdx).slice(0, Math.min(SAMPLE_QUESTIONS, qIdx.length))) {
        const it = items[i];
        const near = adj[it.key].filter(([k2]) => by.get(k2).kind === 'question').slice(0, 5);
        report.push(`### \`${it.key}\` ${it.text.slice(0, 70)}`);
        for (const [k2, s] of near) report.push(`  - \`${s.toFixed(3)}\` ${by.get(k2).text.slice(0, 70)}`);
        report.push('');
    }
    return { report, confCount: conf.length, dupCount: dup.length };
}

function parseArgs(argv) {
    const a = {
        exam: 'all', model: EMB_MODEL, revision: EMB_MODEL_REVISION,
        modelName: EMB_MODEL_LOGICAL,
        out: null, dataRoot: null, limit: 0, batch: 64, write: true,
    };
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i].replace(/^--/, '');
        if (k === 'no-write') { a.write = false; continue; }
        if (!(k in a) || a[k] === null && argv[i + 1] === undefined) {
            console.error(`알 수 없는 인자: ${argv[i]}`); process.exit(2);
        }
        a[k] = /^\d+$/.test(argv[i + 1]) ? parseInt(argv[i + 1], 10) : argv[i + 1];
        i++;
    }
    return a;
}

async function buildExam(target, a, embedder) {
    const dataRootAbs = a.dataRoot ? path.resolve(ROOT, a.dataRoot) : path.join(ROOT, target.dataRoot);
    const { items, inputs } = collectItems(dataRootAbs);
    const capped = a.limit ? items.slice(0, a.limit) : items;
    const nStmt = capped.filter((i) => i.kind === 'stmt').length;
    console.log(`[1/4] 항목 수집: ${capped.length} (stmt ${nStmt}, question ${capped.length - nStmt})`);

    const { mat: emb, dim } = await embedder(capped.map((it) => it.text));

    console.log('[3/4] 양자화·이웃 인덱스 계산 ...');
    const { q, scales } = quantizeInt8(emb, capped.length, dim);
    const deq = dequantizeNorm(q, scales, capped.length, dim);
    const norms = capped.map((it) => textNormKey(it.text));
    const keys = capped.map((it) => it.key);
    const { adj, qerr } = buildAdjacency(deq, emb, capped, norms, dim, TOP_K);

    const meta = {
        model: a.modelName, revision: `${a.model}@${a.revision}`, dim, quant: 'int8',
        topK: TOP_K, minNeighborLen: MIN_NEIGHBOR_LEN,
        sourceHash: sourceHash(capped), items: capped.length,
        exam: target.id, quantMeanCosErr: Math.round(qerr * 1e6) / 1e6,
        inputs,
    };
    const { report, confCount, dupCount } = buildReport(capped, keys, adj, meta, dim);
    console.log(`[4/4] 리포트: 혼동 후보 ${confCount}쌍 · 중복 ${dupCount}쌍 · 양자화 오차 ${qerr.toFixed(5)}`);

    if (!a.write) return meta;
    const out = a.out ? path.resolve(ROOT, a.out) : path.join(dataRootAbs, 'embeddings');
    fs.mkdirSync(out, { recursive: true });
    const metaOut = { ...meta, files: [] };
    let totalBytes = 0;

    // 진술 벡터는 과목별 분할 (SEM-01 — 드릴 과목 로딩 패턴과 동일하게 지연 로드)
    const stmtSubjects = [...new Set(capped.filter((i) => i.kind === 'stmt').map((i) => i.subject))].sort((x, y) => x - y);
    for (const subject of stmtSubjects) {
        const idx = capped.map((it, i) => (it.kind === 'stmt' && it.subject === subject ? i : -1)).filter((i) => i >= 0);
        const name = `vectors_stmt_subject${subject}.js`;
        emitVectorBundle(path.join(out, name), `EMB_VEC_stmt_subject${subject}`, meta,
            idx, keys, q, scales, dim);
        const sz = fs.statSync(path.join(out, name)).size;
        totalBytes += sz;
        metaOut.files.push({ file: name, kind: 'stmt', subject, items: idx.length, bytes: sz });
    }
    const qIdx = capped.map((it, i) => (it.kind === 'question' ? i : -1)).filter((i) => i >= 0);
    if (qIdx.length) {
        const name = 'vectors_question.js';
        emitVectorBundle(path.join(out, name), 'EMB_VEC_question', meta, qIdx, keys, q, scales, dim);
        const sz = fs.statSync(path.join(out, name)).size;
        totalBytes += sz;
        metaOut.files.push({ file: name, kind: 'question', items: qIdx.length, bytes: sz });
    }

    const neighbors = {
        dim, k: TOP_K, adj,
        texts: Object.fromEntries(capped.map((it) => [it.key, it.text])),
        sameText: sameTextMap(capped),
    };
    fs.writeFileSync(path.join(out, 'neighbors.js'),
        `// 자동 생성된 임베딩 이웃 인덱스입니다. 수정하지 마십시오. (${GENERATED_BY})\n` +
        `var EMB_NEIGHBORS = ${JSON.stringify(neighbors)};\n`, 'utf8');
    const nb = fs.statSync(path.join(out, 'neighbors.js')).size;
    metaOut.files.push({ file: 'neighbors.js', kind: 'neighbors', bytes: nb });
    fs.writeFileSync(path.join(out, 'manifest.js'),
        `// 자동 생성된 임베딩 매니페스트입니다. 수정하지 마십시오. (${GENERATED_BY})\n` +
        `var EMB_MANIFEST = ${JSON.stringify(metaOut)};\n`, 'utf8');

    // 품질 리포트는 배포 자산이 아니라 로컬 스크래치에만 남긴다
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, `eval_report_${target.id}.txt`),
        report.join('\n'), 'utf8');
    console.log(`      산출: ${path.relative(ROOT, out)} - 벡터 ${(totalBytes / 1024).toFixed(0)}KB + 이웃 ${(nb / 1024).toFixed(0)}KB + manifest`);
    return meta;
}

async function main(argv = process.argv.slice(2)) {
    const a = parseArgs(argv);
    const targets = getExamTargets(ROOT)
        .filter((t) => t.features && t.features.semantic)
        .filter((t) => a.exam === 'all' || t.id === a.exam);
    if (!targets.length) {
        console.error(`features.semantic 대상 시험 없음${a.exam !== 'all' ? ` (exam=${a.exam})` : ''}`);
        return 2;
    }

    // 모델은 시험 순회 전 1회 로드 (수백 MB — 반복 로드 방지)
    const { pipeline } = require('@huggingface/transformers');
    const extractor = await pipeline('feature-extraction', a.model, { dtype: 'fp32', revision: a.revision });
    const embedder = async (texts) => {
        const probe = await extractor([E5_DOC_PREFIX + 'probe'], { pooling: 'mean', normalize: true });
        const dim = probe.dims[1];
        const out = new Float32Array(texts.length * dim);
        for (let s = 0; s < texts.length; s += a.batch) {
            const chunk = texts.slice(s, s + a.batch).map((t) => E5_DOC_PREFIX + t);
            const t = await extractor(chunk, { pooling: 'mean', normalize: true });
            out.set(t.data, s * dim);
            process.stdout.write(`\r  ONNX 인코딩 ${Math.min(s + a.batch, texts.length)}/${texts.length}`);
        }
        process.stdout.write('\n');
        return { mat: out, dim };
    };
    console.log(`[2/4] ONNX 임베딩: ${a.model} (fp32, batch ${a.batch}) — 대상 ${targets.map((t) => t.id).join(',')}`);

    for (const t of targets) await buildExam(t, a, embedder);
    return 0;
}

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build_embeddings.js');
if (isDirectRun) main().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(2); });

module.exports = {
    answerText, cleanText, sourceHash, collectItems, sameTextMap,
    buildAdjacency, buildReport, parseArgs, main,
    TOP_K, MIN_NEIGHBOR_LEN, NEIGHBOR_POOL,
};
