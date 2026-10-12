#!/usr/bin/env python3
"""build_embeddings.py — 콘텐츠 문장 임베딩 사전 계산 (DOC-DSN-18 PoC)

빌드타임에만 실행되는 파이프라인: 드릴·시험 JS 번들에서 진술(sid)·문항(qid)을 수집해
문장 임베딩을 계산하고, int8 대칭 양자화 벡터 번들·이웃 인덱스·품질 리포트를 산출한다.
앱에는 모델이 배포되지 않는다 — 산출물(벡터)만 정적 자산이 된다.

사용법:
    python ref-pipeline/embeddings/build_embeddings.py [--exam cosmetic] [--out out/]
        [--model intfloat/multilingual-e5-small] [--limit N] [--no-write]

출력(out/ 기본):
    manifest.json            모델·차원·양자화·항목 수·sourceHash
    vectors_*.js             window.EMB_VEC_* 번들 (설계 §5.1 형식)
    neighbors.json           항목별 top-K 이웃 (설계 §5.2)
    eval_report.txt          품질 리포트 (유사 진술 샘플·혼동 후보·유사 문항·중복)
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


def collect_items(data_root, exam_id="cosmetic"):
    """드릴·시험 번들에서 임베딩 대상 항목 수집 — key: stmt:<sid> / q:<qid>."""
    root = Path(data_root)
    items = []
    by_key = {}

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
        subject = int(re.search(r"subject(\d+)", ox.name).group(1))
        _, arr = load_js_bundle(ox)
        for q in arr:
            if q.get("sid"):
                add(f"stmt:{q['sid']}", q.get("statement", ""), "stmt", subject,
                    extra={"context": clean_text(q.get("context", "")), "truth": q.get("truth")})
    for cb in sorted(drills.glob("combo_*.js")):
        if "index" in cb.name:
            continue
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
        _, data = load_js_bundle(f)
        subj_m = re.search(r"subject(\d+)", str(data.get("id") or f.name))
        subject = int(subj_m.group(1)) if subj_m else 0
        for q in data.get("questions", []):
            ans_text = answer_text(q.get("answer", ""), q.get("options") or [])
            add(f"q:{q['id']}", f"{q.get('question', '')} {ans_text}",
                "question", subject)
    return items


def topk_neighbors(sim, keys, k):
    """N×N 유사도 행렬에서 자기 자신을 제외한 top-K 이웃."""
    n = sim.shape[0]
    sim = sim.copy()
    np.fill_diagonal(sim, -2.0)
    k = min(k, n - 1)
    idx = np.argpartition(-sim, k - 1, axis=1)[:, :k]
    adj = {}
    for i in range(n):
        order = idx[i][np.argsort(-sim[i, idx[i]])]
        adj[keys[i]] = [[keys[j], round(float(sim[i, j]), 4)] for j in order]
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
    ap.add_argument("--out", default=str(Path(__file__).parent / "out"))
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--limit", type=int, default=0, help="항목 수 제한 (스모크용)")
    ap.add_argument("--no-write", action="store_true", help="계산만 수행, 산출물 미작성")
    a = ap.parse_args(argv)

    data_root = Path(a.data_root) if a.data_root else REPO_ROOT / "data" / "exams" / a.exam
    items = collect_items(data_root, a.exam)
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
    adj = topk_neighbors(sim_q, keys, TOP_K)

    meta = {"model": a.model, "revision": revision, "dim": dim, "quant": "int8",
            "topK": TOP_K, "sourceHash": source_hash(items), "items": len(items),
            "quantMeanCosErr": round(qerr, 6)}

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
        out = Path(a.out)
        out.mkdir(parents=True, exist_ok=True)
        meta_out = dict(meta)
        meta_out["files"] = []
        total_bytes = 0
        for kind in ("stmt", "question"):
            sub = [i for i, it in enumerate(items) if it["kind"] == kind]
            if not sub:
                continue
            name = f"vectors_{kind}.js"
            emit_vector_bundle(out / name, f"EMB_VEC_{kind}", meta,
                               [keys[i] for i in sub], q[sub], scales[sub])
            sz = (out / name).stat().st_size
            total_bytes += sz
            meta_out["files"].append({"file": name, "items": len(sub), "bytes": sz})
        (out / "manifest.json").write_text(json.dumps(meta_out, ensure_ascii=False, indent=1), "utf-8")
        (out / "neighbors.json").write_text(json.dumps(
            {"dim": dim, "k": TOP_K, "adj": adj}, ensure_ascii=False), "utf-8")
        write_report(out / "eval_report.txt", report)
        nb = (out / "neighbors.json").stat().st_size
        print(f"      산출: {out} - 벡터 {total_bytes/1024:.0f}KB + 이웃 {nb/1024:.0f}KB + manifest/report")
    return meta


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
