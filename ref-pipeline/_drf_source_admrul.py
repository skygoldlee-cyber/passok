# -*- coding: utf-8 -*-
"""행정규칙(고시·지침) 소싱 — DRF 첨부 PDF 다운로드 → pdf2md --no-segment → ref_md 승격.

사용: python ref-pipeline/_drf_source_admrul.py "<검색어>" --subject 3 --exam conssafe
  --list : 검색 결과만 표시
"""
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _exam_root import exam_root, utf8_stdio  # noqa: E402
import fetch_revision as fr  # noqa: E402

utf8_stdio()
import os
from dotenv import load_dotenv
load_dotenv()
OC = os.environ.get("LAW_OC_KEY")
SEARCH = "https://www.law.go.kr/DRF/lawSearch.do"
EXAM_DIR = exam_root(next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--exam'), None))


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def search(query):
    url = SEARCH + "?" + urllib.parse.urlencode(
        {"OC": OC, "target": "admrul", "type": "XML", "query": query, "display": "50"})
    root = ET.fromstring(_get(url).encode("utf-8") if isinstance(_get(url), str) else _get(url))
    out = []
    for it in root.findall(".//admrul"):
        def t(*tags):
            for x in tags:
                e = it.find(x)
                if e is not None and (e.text or "").strip():
                    return e.text.strip()
            return ""
        out.append({"name": t("행정규칙명"), "serial": t("행정규칙일련번호", "ID"),
                    "num": t("발령번호", "공포번호"), "ef": t("시행일자"),
                    "kind": t("행정규칙구분", "소관부처", "발령기관")})
    out = [h for h in out if query.replace(" ", "") in h["name"].replace(" ", "")]
    out.sort(key=lambda d: d["ef"], reverse=True)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = {a: sys.argv[i + 1] for i, a in enumerate(sys.argv) if a.startswith("--") and i + 1 < len(sys.argv)}
    query = args[0]
    subject = opts.get("--subject", "3")
    hits = search(query)
    if not hits:
        print("검색 0건:", query)
        return
    for h in hits[:5]:
        print(f"  {h['name']} | {h['kind']} | 제{h['num']}호 | 시행 {h['ef']} | {h['serial']}")
    if "--list" in sys.argv:
        return
    h = hits[0]
    detail = fr.admrul_detail(h["serial"])
    att = detail.get("첨부파일") or {}
    names = att.get("첨부파일명") or []
    links = att.get("첨부파일링크") or []
    if isinstance(names, str):
        names, links = [names], [links] if isinstance(links, str) else links
    idx = fr.pick_pdf_attachment(names)
    if idx is None:
        print("첨부 PDF 없음:", names)
        return
    link = links[idx]
    url = link if link.startswith("http") else "https://www.law.go.kr" + link
    data = fr.download(url)
    if not data.startswith(b"%PDF"):
        print("PDF 아님:", data[:40])
        return
    kind = h["kind"] or "고시"
    base = f"{h['name']}({kind})(제{h['num']}호)({h['ef']})"
    stage = Path("tmp/ref_source_pdf")
    stage.mkdir(parents=True, exist_ok=True)
    pdf = stage / f"{base}.pdf"
    pdf.write_bytes(data)
    print(f"PDF 수신 {len(data):,}B → {pdf}")
    # pdf2md 변환 — 시각적 줄 그대로 (#L 인용 의존)
    outdir = Path("tmp/ref_source_md")
    r = subprocess.run(
        [sys.executable, "ref-pipeline/pdf2md.py", "--cli", "--no-segment",
         "--no-images", "-o", str(outdir), str(pdf)],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    print((r.stdout or "")[-800:])
    if r.returncode != 0:
        print("STDERR:", (r.stderr or "")[-500:])
        return
    md = outdir / base / f"{base}.md"
    if not md.exists():
        cands = list(outdir.rglob("*.md"))
        md = cands[0] if cands else None
    if not md or not md.exists():
        print("변환 산출물 없음")
        return
    dest = EXAM_DIR / "참조자료" / "ref_md" / f"과목{subject}" / base / f"{base}.md"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(md.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"→ {dest} ({dest.stat().st_size:,}B)")


if __name__ == "__main__":
    main()
