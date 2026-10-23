#!/usr/bin/env python3
"""build_embeddings.py — 콘텐츠 문장 임베딩 사전 계산 (DOC-DSN-18 PoC)

⚠️ 레퍼런스 구현으로 보존 — 운영 생성 도구는 Node 포팅본 tools/build/build_embeddings.js
   (`npm run build:embeddings`). ONNX fp32 인코딩이 본 구현의 PyTorch 산출물과 int8
   양자화 후 완전 일치함이 tools/check/check_emb_parity.js로 검증됨. Python 의존 없이
   재생성 가능하므로 이 스크립트는 수치 대조용 레퍼런스로만 유지한다.

빌드타임에만 실행되는 파이프라인: 드릴·시험 JS 번들에서 진술(sid)·문항(qid)을 수집해
문장 임베딩을 계산하고, int8 대칭 양자화 벡터 번들·이웃 인덱스·품질 리포트를 산출한다.
앱에는 모델이 배포되지 않는다 — 산출물(벡터)만 정적 자산이 된다.

사용법:
    python ref-pipeline/embeddings/build_embeddings.py [--exam cosmetic]
        [--out {dataRoot}/embeddings] [--model intfloat/multilingual-e5-small]
        [--limit N] [--no-write]

출력(--out 미지정 시 {dataRoot}/embeddings/, 커밋 대상 정적 자산):
    manifest.js              var EMB_MANIFEST — 모델·차원·files·inputs(원본 sha1)
    neighbors.js             var EMB_NEIGHBORS — adj(이웃)·texts·sameText (설계 §5.2)
    vectors_stmt_subjectN.js var EMB_VEC_stmt_subjectN — 진술 int8 벡터 (과목별 분할)
    vectors_question.js      var EMB_VEC_question — 문항 int8 벡터
    eval_report.txt          품질 리포트 — 항상 ref-pipeline/embeddings/out/ (gitignore)
                             ※ .md 미사용 — 문서 ID 게이트(check:docids) 스캔 제외용
"""
import argparse
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_MODEL = "intfloat/multilingual-e5-small"
E5_DOC_PREFIX = "passage: "   # e5 계열은 저장 문서에 passage:, 질의에 query: 접두사 요구
TOP_K = 8                     # 이웃 인덱스 항목당 이웃 수 (설계 §5.2)
CONFUSION_SIM = 0.85          # 혼동 후보 임계 (cid 상이 + 의미 근접)
NEARDUP_SIM = 0.95            # 사실상 동일 진술(중복 감사 신호)
SAMPLE_SEEDS = 16             # 리포트용 시드 표본 수
SAMPLE_QUESTIONS = 12         # 유사 문항 표본 수
MIN_NEIGHBOR_LEN = 12         # 이웃 후보 최소 정규화 길이 — "표시 방법" 류 단문 노이즈 억제
NEIGHBOR_POOL = 64            # 이웃 후보 풀 (중복·단문 필터 후 topK 충족 여유분)

JS_VAR_RE = re.compile(r"(?:var|window\.)\s*([A-Za-z_][\w]*)\s*=\s*")
CIRCLED_DIGITS = {chr(0x245F + i): i for i in range(1, 21)}  # ①=1 … ⑳=20


def answer_text(ans, options):
    """정답 마커(③·'3'·텍스트)를 선지 텍스트로 해석한다."""
    s = str(ans).strip()
    if s in CIRCLED_DIGITS:
        idx = CIRCLED_DIGITS[s] - 1
    else:
        num = re.sub(r"\D", "", s)
        idx = int(num) - 1 if num.isdigit() else -1
    return options[idx] if 0 <= idx < len(options) else s


def extract_js_payload(text):
    """`var NAME = <json>` 형태의 데이터 번들에서 (global이름, json 본문)을 추출한다."""
    m = JS_VAR_RE.search(text)
    if not m:
        raise ValueError("var NAME = 패턴을 찾지 못함")
    return m.group(1), text[m.end():].strip().rstrip(";")


def load_js_bundle(path):
    """데이터 번들 JS를 읽어 (global이름, 파싱된 객체)로 반환한다.
    수작업 번들(비엄격 JS 객체 리터럴)은 JSON 파싱 실패 시 node eval로 폴백한다."""
    p = Path(path)
    name, payload = extract_js_payload(p.read_text(encoding="utf-8"))
    try:
        return name, json.loads(payload)
    except json.JSONDecodeError:
        import subprocess
        js = ("global.window={};eval(require('fs').readFileSync(process.argv[1],'utf8'));"
              "const n=process.argv[2];"
              "const v=(typeof window[n]!=='undefined')?window[n]:globalThis[n];"
              "console.log(JSON.stringify(v))")
        out = subprocess.check_output(["node", "-e", js, str(p), name])
        return name, json.loads(out.decode("utf-8"))


def clean_text(t):
    """임베딩 입력 최소 정리 — 의미 신호(조사·어미)는 보존하고 공백·마크다운 기호만 제거한다."""
    t = re.sub(r"[`*_>#|\[\]{}]", " ", str(t))
    return re.sub(r"\s+", " ", t).strip()


def quantize_int8(mat):
    """벡터별 대칭 int8 양자화 — b = round(v / max|v| * 127). (bytes, scales) 반환."""
    scales = np.abs(mat).max(axis=1)
    scales[scales == 0] = 1.0
    q = np.round(mat / scales[:, None] * 127).astype(np.int8)
    return q, scales


def dequantize_int8(q, scales):
    """int8 → float32 복원."""
    return q.astype(np.float32) * np.asarray(scales, dtype=np.float32)[:, None]


def normalize_rows(mat):
    n = np.linalg.norm(mat, axis=1, keepdims=True)
    n[n == 0] = 1.0
    return mat / n


def cosine_matrix(mat):
    """정규화 행렬의 전쌍방 코사인 유사도 (N×N float32)."""
    return mat @ mat.T


def source_hash(items):
    """입력 텍스트 집합의 결정적 해시 — 신선도 게이트 비교 기준 (설계 §7.2)."""
    h = hashlib.sha256()
    for it in items:
        h.update(it["key"].encode("utf-8"))
        h.update(b"\x00")
        h.update(it["text"].encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()[:16]


def file_sha1(path):
    """입력 번들의 개행 정규화 해시 — manifest.inputs 기록용 (check_emb_freshness.js 비교 대상).
    작업트리 개행(CRLF/LF)에 해시가 종속되면 Windows↔Linux 간 오탐이 발생하므로 \r\n을 통일한다."""
    return hashlib.sha1(
        Path(path).read_bytes().decode("utf-8").replace("\r\n", "\n").encode("utf-8")
    ).hexdigest()


def collect_items(data_root, exam_id="cosmetic"):
    """드릴·시험 번들에서 임베딩 대상 항목 수집 — key: stmt:<sid> / q:<qid>.
    반환: (items, inputs) — inputs는 소비한 번들의 {repo상대경로: sha1}."""
    root = Path(data_root)
    items = []
    inputs = {}
    by_key = {}

    def consume(path):
        inputs[str(Path(path).resolve().relative_to(REPO_ROOT)).replace("\\", "/")] = \
            file_sha1(path)

    def add(key, text, kind, subject, cid=None, extra=None):
        text = clean_text(text)
        if not text:
            return
        if key in by_key:          # sid 중복 — 첫 등장 유지, cid는 보강
            if cid and not by_key[key].get("cid"):
                by_key[key]["cid"] = cid
            return
        it = {"key": key, "text": text, "kind": kind, "subject": subject, "cid": cid}
        if extra:
            it.update(extra)
        by_key[key] = it
        items.append(it)

    drills = root / "drills"
    for ox in sorted(drills.glob("ox_*.js")):
        consume(ox)
        subject = int(re.search(r"subject(\d+)", ox.name).group(1))
        _, arr = load_js_bundle(ox)
        for q in arr:
            if q.get("sid"):
                add(f"stmt:{q['sid']}", q.get("statement", ""), "stmt", subject,
                    extra={"context": clean_text(q.get("context", "")), "truth": q.get("truth")})
    for cb in sorted(drills.glob("combo_*.js")):
        if "index" in cb.name:
            continue
        consume(cb)
        _, arr = load_js_bundle(cb)
        if isinstance(arr, dict):               # combo_pilot: {"questions": [...]}
            arr = arr.get("questions", [])
        for q in arr:
            subject = q.get("subject")
            for st in q.get("statements", []):
                if st.get("sid"):
                    add(f"stmt:{st['sid']}", st.get("text", ""), "stmt", subject,
                        cid=st.get("conceptId"), extra={"truth": st.get("truth")})

    for f in sorted((root / "exams").glob("*.js")):
        consume(f)
        _, data = load_js_bundle(f)
        subj_m = re.search(r"subject(\d+)", str(data.get("id") or f.name))
        subject = int(subj_m.group(1)) if subj_m else 0
        for q in data.get("questions", []):
            ans_text = answer_text(q.get("answer", ""), q.get("options") or [])
            add(f"q:{q['id']}", f"{q.get('question', '')} {ans_text}",
                "question", subject)
    return items, inputs


def text_norm_key(t):
    """동일 텍스트 판별용 정규화 키 — 공백 제거·소문자."""
    return re.sub(r"\s+", "", str(t)).lower()


def same_text_map(items):
    """정규화 텍스트가 동일한 항목끼리 묶은 교차 맵 — key → [동일 텍스트 다른 key].
    같은 진술이 과목·유형별로 다른 sid를 갖는 경우 UI가 "동일 진술"로 별도 표시한다."""
    groups = {}
    for it in items:
        groups.setdefault(text_norm_key(it["text"]), []).append(it["key"])
    out = {}
    for g in groups.values():
        if len(g) > 1:
            for k in g:
                out[k] = [x for x in g if x != k]
    return out


def topk_neighbors(sim, keys, k, texts=None, min_len=0):
    """N×N 유사도 행렬에서 자기 자신을 제외한 top-K 이웃.
    texts/min_len 지정 시: 동일 정규화 텍스트 중복 제외(첫 등장만),
    정규화 길이 min_len 미만의 짧은 일반구 후보 제외."""
    n = sim.shape[0]
    sim = sim.copy()
    np.fill_diagonal(sim, -2.0)
    k = min(k, n - 1)
    norms = [text_norm_key(t) for t in texts] if texts else None
    pool = min(n - 1, max(k * 4, NEIGHBOR_POOL)) if texts else k
    idx = np.argpartition(-sim, pool - 1, axis=1)[:, :pool]
    adj = {}
    for i in range(n):
        order = idx[i][np.argsort(-sim[i, idx[i]])]
        picked = []
        for j in order:
            if norms is not None:
                if norms[j] == norms[i] or len(norms[j]) < min_len:
                    continue
            picked.append([keys[j], round(float(sim[i, j]), 4)])
            if len(picked) >= k:
                break
        adj[keys[i]] = picked
    return adj


def emit_vector_bundle(path, global_name, meta, keys, q, scales):
    """설계 §5.1 형식의 window.EMB_VEC_* 번들 출력."""
    payload = {
        "model": meta["model"], "revision": meta["revision"], "dim": int(q.shape[1]),
        "quant": "int8", "ids": keys,
        "scales": [round(float(s), 6) for s in scales],
        "vectors": base64.b64encode(q.tobytes()).decode("ascii"),
    }
    Path(path).write_text(
        f"// 자동 생성된 임베딩 벡터 번들입니다. 수정하지 마십시오. (ref-pipeline/embeddings/build_embeddings.py)\n"
        f"var {global_name} = {json.dumps(payload, ensure_ascii=False)};\n",
        encoding="utf-8")


def write_report(path, report):
    Path(path).write_text("\n".join(report), encoding="utf-8")


def run(argv=None):
    ap = argparse.ArgumentParser(description="콘텐츠 임베딩 사전 계산 (DOC-DSN-18)")
    ap.add_argument("--exam", default="cosmetic")
    ap.add_argument("--data-root", default=None, help="기본 data/exams/<exam>")
    ap.add_argument("--out", default=None, help="기본 {dataRoot}/embeddings")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--limit", type=int, default=0, help="항목 수 제한 (스모크용)")
    ap.add_argument("--no-write", action="store_true", help="계산만 수행, 산출물 미작성")
    a = ap.parse_args(argv)

    data_root = Path(a.data_root) if a.data_root else REPO_ROOT / "data" / "exams" / a.exam
    items, inputs = collect_items(data_root, a.exam)
    if a.limit:
        items = items[:a.limit]
    print(f"[1/4] 항목 수집: {len(items)} (stmt {sum(i['kind']=='stmt' for i in items)}, "
          f"question {sum(i['kind']=='question' for i in items)})")

    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(a.model, device="cpu")
    texts = [E5_DOC_PREFIX + it["text"] for it in items]
    print(f"[2/4] 임베딩 계산: {a.model} (CPU) ...")
    emb = model.encode(texts, batch_size=64, show_progress_bar=True,
                       convert_to_numpy=True, normalize_embeddings=True).astype(np.float32)
    dim = emb.shape[1]
    revision = getattr(getattr(model, "_model_config", None), "_name_or_path", a.model) or a.model

    print("[3/4] 양자화·유사도 행렬 계산 ...")
    q, scales = quantize_int8(emb)
    deq = normalize_rows(dequantize_int8(q, scales))
    sim_q = cosine_matrix(deq)          # 복원 벡터 기준 (런타임과 동일 경로)
    sim_o = cosine_matrix(emb)
    qerr = float(np.abs(sim_q - sim_o).mean())

    keys = [it["key"] for it in items]
    texts = [it["text"] for it in items]
    adj = topk_neighbors(sim_q, keys, TOP_K,
                         texts=texts, min_len=MIN_NEIGHBOR_LEN)

    meta = {"model": a.model, "revision": revision, "dim": dim, "quant": "int8",
            "topK": TOP_K, "minNeighborLen": MIN_NEIGHBOR_LEN,
            "sourceHash": source_hash(items), "items": len(items),
            "exam": a.exam, "quantMeanCosErr": round(qerr, 6),
            "inputs": inputs}

    # ---- 품질 리포트 ----
    rng = np.random.default_rng(20261012)
    report = ["# 임베딩 PoC 품질 리포트", "",
              f"- 모델: `{a.model}` ({dim}d, int8 대칭 양자화)",
              f"- 항목: {len(items)}개 · sourceHash `{meta['sourceHash']}`",
              f"- 양자화 왕복 평균 코사인 오차: {qerr:.5f}", ""]

    stmt_idx = [i for i, it in enumerate(items) if it["kind"] == "stmt"]
    q_idx = [i for i, it in enumerate(items) if it["kind"] == "question"]

    # 혼동 후보: cos ≥ 임계 & cid 상이 (둘 다 cid 보유 시)
    conf, dup = [], []
    cid_of = {it["key"]: it.get("cid") for it in items}
    for i in stmt_idx:
        for j in adj[keys[i]]:
            k2, s = j[0], j[1]
            if keys[i] >= k2:
                continue
            c1, c2 = cid_of.get(keys[i]), cid_of.get(k2)
            if s >= NEARDUP_SIM:
                dup.append((keys[i], k2, s))
            elif s >= CONFUSION_SIM and c1 and c2 and c1 != c2:
                conf.append((keys[i], k2, s, c1, c2))
    report += ["## 1. 혼동 후보 (유사도 ≥ %.2f, cid 상이) — %d쌍" % (CONFUSION_SIM, len(conf)), ""]
    by = {it["key"]: it for it in items}
    for a1, b1, s, c1, c2 in sorted(conf, key=lambda x: -x[2])[:40]:
        report.append(f"- `{s:.3f}` [{c1}↔{c2}] {by[a1]['text'][:60]}  ⟷  {by[b1]['text'][:60]}")
    report += ["", "## 2. 사실상 중복 후보 (유사도 ≥ %.2f) — %d쌍" % (NEARDUP_SIM, len(dup)), ""]
    for a1, b1, s in sorted(dup, key=lambda x: -x[2])[:20]:
        report.append(f"- `{s:.3f}` {by[a1]['text'][:60]}  ⟷  {by[b1]['text'][:60]}")

    report += ["", "## 3. 유사 진술 표본 (시드 top-8)", ""]
    for i in rng.choice(stmt_idx, min(SAMPLE_SEEDS, len(stmt_idx)), replace=False):
        it = items[i]
        report.append(f"### `{it['key']}` (과목{it['subject']}) {it['text'][:70]}")
        for k2, s in adj[it["key"]]:
            n = by[k2]
            report.append(f"  - `{s:.3f}` (과목{n['subject']}) {n['text'][:70]}")
        report.append("")

    report += ["## 4. 유사 문항 표본 (시드 top-5)", ""]
    for i in rng.choice(q_idx, min(SAMPLE_QUESTIONS, len(q_idx)), replace=False):
        it = items[i]
        near = [x for x in adj[it["key"]] if by[x[0]]["kind"] == "question"][:5]
        report.append(f"### `{it['key']}` {it['text'][:70]}")
        for k2, s in near:
            report.append(f"  - `{s:.3f}` {by[k2]['text'][:70]}")
        report.append("")

    print(f"[4/4] 리포트: 혼동 후보 {len(conf)}쌍 · 중복 {len(dup)}쌍 · 양자화 오차 {qerr:.5f}")

    if not a.no_write:
        out = Path(a.out) if a.out else data_root / "embeddings"
        out.mkdir(parents=True, exist_ok=True)
        meta_out = dict(meta)
        meta_out["files"] = []
        total_bytes = 0

        # 진술 벡터는 과목별 분할 (SEM-01 — 드릴 과목 로딩 패턴과 동일하게 지연 로드)
        for subject in sorted({it["subject"] for it in items if it["kind"] == "stmt"}):
            sub = [i for i, it in enumerate(items)
                   if it["kind"] == "stmt" and it["subject"] == subject]
            name = f"vectors_stmt_subject{subject}.js"
            emit_vector_bundle(out / name, f"EMB_VEC_stmt_subject{subject}", meta,
                               [keys[i] for i in sub], q[sub], scales[sub])
            sz = (out / name).stat().st_size
            total_bytes += sz
            meta_out["files"].append({"file": name, "kind": "stmt",
                                      "subject": subject, "items": len(sub), "bytes": sz})
        sub = [i for i, it in enumerate(items) if it["kind"] == "question"]
        if sub:
            name = "vectors_question.js"
            emit_vector_bundle(out / name, "EMB_VEC_question", meta,
                               [keys[i] for i in sub], q[sub], scales[sub])
            sz = (out / name).stat().st_size
            total_bytes += sz
            meta_out["files"].append({"file": name, "kind": "question",
                                      "items": len(sub), "bytes": sz})

        neighbors = {"dim": dim, "k": TOP_K, "adj": adj,
                     "texts": {it["key"]: it["text"] for it in items},
                     "sameText": same_text_map(items)}
        (out / "neighbors.js").write_text(
            "// 자동 생성된 임베딩 이웃 인덱스입니다. 수정하지 마십시오. (ref-pipeline/embeddings/build_embeddings.py)\n"
            f"var EMB_NEIGHBORS = {json.dumps(neighbors, ensure_ascii=False)};\n",
            encoding="utf-8")
        nb = (out / "neighbors.js").stat().st_size
        meta_out["files"].append({"file": "neighbors.js", "kind": "neighbors", "bytes": nb})
        (out / "manifest.js").write_text(
            "// 자동 생성된 임베딩 매니페스트입니다. 수정하지 마십시오. (ref-pipeline/embeddings/build_embeddings.py)\n"
            f"var EMB_MANIFEST = {json.dumps(meta_out, ensure_ascii=False)};\n",
            encoding="utf-8")

        # 품질 리포트는 배포 자산이 아니라 로컬 스크래치에만 남긴다
        report_dir = Path(__file__).parent / "out"
        report_dir.mkdir(parents=True, exist_ok=True)
        write_report(report_dir / "eval_report.txt", report)
        print(f"      산출: {out} - 벡터 {total_bytes/1024:.0f}KB + 이웃 {nb/1024:.0f}KB + manifest "
              f"(리포트: {report_dir / 'eval_report.txt'})")
    return meta


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
