# -*- coding: utf-8 -*-
"""DRF 문서 소싱 — 검색(현행본 식별) + lawService 렌더 → ref_md 형식 md 생성.

사용: python ref-pipeline/_drf_source.py "<문서명>" [--target law|admrul]
출력: <문서명(구분)(번호)(시행일)> 형식의 파일명 + 본문 md (stdout 경로 표시)
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from drf_render import render_law  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
OC = os.environ.get("LAW_OC_KEY") or os.environ.get("LAW_OC")
SEARCH = "https://www.law.go.kr/DRF/lawSearch.do"
SVC = "https://www.law.go.kr/DRF/lawService.do"


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def search(query, target):
    url = SEARCH + "?" + urllib.parse.urlencode(
        {"OC": OC, "target": target, "type": "XML", "query": query, "display": "50"})
    root = ET.fromstring(_get(url))
    tag = ".//law" if target == "law" else ".//admrul"
    out = []
    for it in root.findall(tag):
        def t(*tags):
            for x in tags:
                e = it.find(x)
                if e is not None and (e.text or "").strip():
                    return e.text.strip()
            return ""
        name = t("법령명한글", "행정규칙명", "법령명")
        if query.replace(" ", "") not in name.replace(" ", ""):
            continue
        out.append({
            "name": name,
            "serial": t("법령일련번호", "행정규칙일련번호", "법령ID"),
            "num": t("공포번호", "발령번호"),
            "ef": t("시행일자"),
            "kind": t("법령구분명", "자치법규구분", "행정규칙구분"),
        })
    out.sort(key=lambda d: d["ef"], reverse=True)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    query = args[0]
    target = "admrul" if "--admrul" in sys.argv else "law"
    hits = search(query, target)
    if not hits:
        print("검색 0건 — 명칭 확인:", query)
        return
    for h in hits[:5]:
        print(f"  {h['name']} | {h['kind']} | 제{h['num']}호 | 시행 {h['ef']} | serial {h['serial']}")
    if "--list" in sys.argv:
        return
    h = hits[0]
    url = SVC + "?" + urllib.parse.urlencode(
        {"OC": OC, "target": target, "type": "XML", ("MST" if target == "law" else "ID"): h["serial"]})
    xml = _get(url)
    body = render_law(h["name"], xml)
    num = h["num"].zfill(5) if h["num"].isdigit() and target == "law" else h["num"]
    fname = f"{h['name']}({h['kind']})(제{num}호)({h['ef']}).md"
    out = Path("tmp/ref_source") / fname
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body, encoding="utf-8")
    print(f"→ {out} ({len(body):,}자)")


if __name__ == "__main__":
    main()
