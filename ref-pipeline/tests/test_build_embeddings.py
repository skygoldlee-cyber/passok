# ref-pipeline/tests/test_build_embeddings.py — 임베딩 파이프라인 순수 함수 테스트
# 모델 미사용 (torch/sentence-transformers 없이 실행 가능)
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "embeddings"))
import build_embeddings as be


def test_extract_js_payload():
    name, payload = be.extract_js_payload('// 주석\nvar OX_DRILLS_subject1 = [1,2];\n')
    assert name == "OX_DRILLS_subject1"
    assert json.loads(payload) == [1, 2]


def test_clean_text_preserves_meaning():
    assert be.clean_text("  `표시광고` [허위](링크)   여부 ") == "표시광고 허위 (링크) 여부"


def test_quantize_roundtrip_cosine():
    rng = np.random.default_rng(0)
    v = be.normalize_rows(rng.standard_normal((50, 384)).astype(np.float32))
    q, scales = be.quantize_int8(v)
    deq = be.normalize_rows(be.dequantize_int8(q, scales))
    cos = (v * deq).sum(axis=1)
    assert q.dtype == np.int8 and q.shape == v.shape
    assert cos.min() > 0.99          # int8 대칭 양자화 왕복 오차 < 1%


def test_topk_neighbors_excludes_self_and_sorted():
    sim = np.array([[1.0, 0.9, 0.1], [0.9, 1.0, 0.2], [0.1, 0.2, 1.0]], dtype=np.float32)
    adj = be.topk_neighbors(sim, ["a", "b", "c"], k=2)
    assert [x[0] for x in adj["a"]] == ["b", "c"]
    assert adj["a"][0][1] > adj["a"][1][1]
    assert all(x[0] != "a" for x in adj["a"])


def test_source_hash_deterministic_and_sensitive():
    items = [{"key": "a", "text": "x"}, {"key": "b", "text": "y"}]
    h1 = be.source_hash(items)
    assert h1 == be.source_hash([dict(i) for i in items])
    items[0]["text"] = "x2"
    assert be.source_hash(items) != h1


def test_answer_text():
    assert be.answer_text("③", ["a", "b", "c"]) == "c"
    assert be.answer_text("2", ["a", "b"]) == "b"
    assert be.answer_text("정답 없음", ["a"]) == "정답 없음"
    assert be.answer_text("⑨", ["a", "b"]) == "⑨"   # 범위 밖이면 원문 유지


def test_collect_items(tmp_path):
    root = tmp_path
    (root / "drills").mkdir()
    (root / "exams").mkdir()
    (root / "drills" / "ox_subject1.js").write_text(
        'var OX_DRILLS_subject1 = [{"sid":"s1","statement":"진술A","context":"맥락","truth":true}];',
        encoding="utf-8")
    (root / "drills" / "combo_subject1.js").write_text(
        'var COMBO_DRILLS_subject1 = [{"subject":1,"statements":['
        '{"sid":"s1","text":"진술A","conceptId":"§1.1","truth":true},'
        '{"sid":"s2","text":"진술B","conceptId":"§1.2","truth":false}]}];',
        encoding="utf-8")
    (root / "exams" / "subject1.x.js").write_text(
        'var EXAM_DATA_subject1 = {"subject":1,"questions":[{"id":"subject1_q1",'
        '"question":"질문?","options":["갑","을"],"answer":"②","explanation":""}]};',
        encoding="utf-8")
    items, inputs = be.collect_items(root)
    by = {i["key"]: i for i in items}
    assert set(by) == {"stmt:s1", "stmt:s2", "q:subject1_q1"}
    assert by["stmt:s1"]["cid"] == "§1.1"          # combo가 cid 보강
    assert by["q:subject1_q1"]["text"] == "질문? 을"  # 정답 텍스트 병합
    assert len(inputs) == 3                        # 소비 번들 3개 sha1 기록
    assert all(len(v) == 40 for v in inputs.values())


def test_topk_neighbors_dedupes_same_text():
    # a,b,c는 동일 정규화 텍스트 — 이웃에서 서로 제외되고 d만 남아야 한다
    sim = np.array([[1.0, 0.99, 0.98, 0.5],
                    [0.99, 1.0, 0.97, 0.4],
                    [0.98, 0.97, 1.0, 0.3],
                    [0.5, 0.4, 0.3, 1.0]], dtype=np.float32)
    texts = ["동일 진술", "동일진술", "동일  진술", "전혀 다른 진술"]
    adj = be.topk_neighbors(sim, ["a", "b", "c", "d"], k=3, texts=texts)
    assert [x[0] for x in adj["a"]] == ["d"]
    assert [x[0] for x in adj["d"]][0] == "a"   # d 관점: 동일 텍스트 중 첫 등장만


def test_topk_neighbors_filters_short_texts():
    sim = np.array([[1.0, 0.9, 0.5], [0.9, 1.0, 0.5], [0.5, 0.5, 1.0]],
                   dtype=np.float32)
    texts = ["충분히 긴 진술 텍스트입니다", "짧음", "또 다른 긴 진술 텍스트"]
    adj = be.topk_neighbors(sim, ["a", "b", "c"], k=2, texts=texts, min_len=8)
    assert [x[0] for x in adj["a"]] == ["c"]   # "짧음"은 후보에서 제외


def test_same_text_map():
    items = [{"key": "s1", "text": "동일 진술"},
             {"key": "s2", "text": "동일진술"},
             {"key": "s3", "text": "다른 진술"}]
    m = be.same_text_map(items)
    assert sorted(m["s1"]) == ["s2"] and m["s2"] == ["s1"]
    assert "s3" not in m
