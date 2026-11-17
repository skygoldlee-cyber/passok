#!/usr/bin/env python3
# ref-pipeline/textbook_pdf.py — 교재 전용 인쇄 PDF (표지·목차·러닝헤드·쪽수)
# @spec DR-10
#
# Chrome --print-to-pdf는 @page 마진박스·counter(page)·목차 outline을 지원하지 않으므로
# 2패스 + PyMuPDF 후처리로 구현한다:
#   1패스: 표지+목차(쪽수 공란)+본문 HTML → PDF → h2 크기 스팬(13~17pt)으로 절별 물리 쪽 추출
#   2패스: 목차에 쪽수 채워 재조립 → PDF → 표지·목차(전면) 제외 각 쪽에 러닝헤드(좌:서명/우:장명)
#          와 중앙 쪽수 "- N -"를 스탬프. 인쇄 쪽수 = 물리 쪽 - 전면 쪽수 (본문 1쪽부터)
#
# 실행: python ref-pipeline/textbook_pdf.py --in <staged.md> --out <out.pdf>
#       [--title "..."] [--subtitle "..."] [--keep-html] [--browser <path>] [--font <ttf>]
from __future__ import annotations

import argparse
import datetime
import html
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import md2doc  # noqa: E402 — md_to_html_body·html_to_pdf·_find_browser 재사용

try:
    import pymupdf as fitz  # PyMuPDF ≥1.26 — requirements.txt의 pymupdf
except ImportError:  # pragma: no cover — 구버전은 fitz 명칭
    try:
        import fitz
    except ImportError:
        fitz = None

TEMPLATE = (Path(__file__).resolve().parent / "template" / "print-textbook.html").read_text(encoding="utf-8")

# 본문 h2 폰트 대역(pt) — 템플릿 h2=15pt, h1=20pt·h3=12.5pt와 분리되는 구간
_H2_SIZE_MIN, _H2_SIZE_MAX = 13.0, 17.0
_H2_RE = re.compile(r'<h2 id="([^"]+)">(.*?)</h2>', re.S)
_TAG_RE = re.compile(r"<[^>]+>")


def _entries(body: str) -> list[dict]:
    """body HTML의 h2 → 목차 항목 [{id,text,kind}] (kind: ch|sec|plain)."""
    out = []
    for m in _H2_RE.finditer(body):
        text = html.unescape(_TAG_RE.sub("", m.group(2))).strip()
        kind = "ch" if re.match(r"(?:📚\s*)?Chapter\b", text) else ("sec" if re.match(r"\d+\.", text) else "plain")
        out.append({"id": m.group(1), "text": text, "kind": kind})
    return out


def _cover_html(title: str, subtitle: str) -> str:
    date = datetime.date.today().strftime("%Y-%m-%d")
    esc = html.escape
    return f"""<div class="tb-cover">
  <div class="brand">PassOK</div>
  <div class="subtitle">{esc(subtitle)}</div>
  <div class="title">{esc(title)}</div>
  <div class="badge">절별 개념 문항 QR 링크 포함 — 카메라 스캔으로 앱 출제</div>
  <div class="date">발행일 {date}</div>
</div>"""


def _toc_html(entries: list[dict], pages: dict[str, int] | None = None) -> str:
    """목차 HTML — pages는 id→인쇄 쪽수(2패스에서 주입, 1패스는 공란)."""
    rows = []
    for e in entries:
        n = str(pages[e["id"]]) if pages and e["id"] in pages else ""
        rows.append(
            f'<div class="e {e["kind"]}"><a href="#{e["id"]}">'
            f'<span class="t">{html.escape(e["text"])}</span>'
            f'<span class="dots"></span><span class="n">{n}</span></a></div>'
        )
    return '<div class="tb-toc"><div class="tt">목 차</div>' + "".join(rows) + "</div>"


def _assemble(title: str, subtitle: str, body: str, pages: dict | None) -> str:
    return (TEMPLATE.replace("%%TITLE%%", html.escape(title))
                    .replace("%%COVER%%", _cover_html(title, subtitle))
                    .replace("%%TOC%%", _toc_html(_entries(body), pages))
                    .replace("%%BODY%%", body))


def _h2_spans(pdf: "fitz.Document") -> list[tuple[int, str]]:
    """h2 크기 스팬(페이지, 텍스트)을 문서 순서대로 — 목차(9.5~11.5pt)·표지(30pt)와 분리."""
    hits = []
    for pno in range(len(pdf)):
        for block in pdf[pno].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                text = "".join(s["text"] for s in line.get("spans", []) if _H2_SIZE_MIN <= s["size"] <= _H2_SIZE_MAX).strip()
                if text:
                    hits.append((pno + 1, text))
    return hits


def _chapter_at(chapters: list[tuple[int, str]], printed: int) -> str:
    cur = ""
    for start, name in chapters:
        if printed >= start:
            cur = name
    return cur


def _find_font() -> str | None:
    """한글 스탬프 폰트 — TEXTBOOK_PDF_FONT > malgun.ttf > Noto Sans CJK 경로."""
    import os
    cands = [os.environ.get("TEXTBOOK_PDF_FONT", ""),
             r"C:\Windows\Fonts\malgun.ttf",
             "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
             "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.otf",
             "/System/Library/Fonts/AppleSDGothicNeo.ttc"]
    for c in cands:
        if c and Path(c).is_file():
            return c
    return None


def _plain(text: str) -> str:
    """스탬프용 문자열 — malgun 등에 없는 BMP 밖 글자(이모지 등) 제거."""
    return "".join(c for c in text if ord(c) <= 0xFFFF).strip()


def _stamp(pdf_path: Path, title: str, front_pages: int, chapters: list[tuple[int, str]], font: str | None) -> None:
    """전면(표지·목차) 제외 각 쪽에 러닝헤드(좌 서명·우 장명) + 중앙 쪽수 스탬프."""
    if not font:
        print("[textbook-pdf] 한글 폰트 없음 — 러닝헤드·쪽수 스탬프 생략", file=sys.stderr)
        return
    doc = fitz.open(pdf_path)
    mm = 72 / 25.4
    short = _plain(title.split("(")[0])
    chapters = [(p, _plain(t)) for p, t in chapters]
    for pno in range(front_pages, len(doc)):
        page = doc[pno]
        w, h = page.rect.width, page.rect.height
        printed = pno + 1 - front_pages
        chapter = _chapter_at(chapters, printed)
        page.draw_line((16 * mm, 14 * mm), (w - 16 * mm, 14 * mm), color=(0.6, 0.65, 0.7), width=0.5)
        page.insert_textbox(fitz.Rect(16 * mm, 7 * mm, w / 2, 13.5 * mm), short,
                            fontname="tb", fontfile=font, fontsize=8, color=(0.35, 0.4, 0.45), align=0)
        page.insert_textbox(fitz.Rect(w / 2, 7 * mm, w - 16 * mm, 13.5 * mm), chapter,
                            fontname="tb", fontfile=font, fontsize=8, color=(0.35, 0.4, 0.45), align=2)
        page.insert_textbox(fitz.Rect(0, h - 14 * mm, w, h - 8 * mm), f"- {printed} -",
                            fontname="tb", fontfile=font, fontsize=8, color=(0.35, 0.4, 0.45), align=1)
    doc.save(str(pdf_path), incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
    doc.close()


def build(in_path: Path, out_pdf: Path, title: str, subtitle: str,
          keep_html: bool = False, browser: str | None = None, font: str | None = None) -> Path:
    if fitz is None:
        raise RuntimeError("PyMuPDF 필요: pip install pymupdf")
    browser = browser or md2doc._find_browser()
    if not browser:
        raise RuntimeError("Chrome/Edge를 찾지 못했습니다.")

    body = md2doc.md_to_html_body(in_path.read_text(encoding="utf-8-sig"))
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    font = font or _find_font()

    with tempfile.TemporaryDirectory(prefix="tb-pdf-") as td:
        tmp = Path(td)
        # 1패스 — 쪽수 공란 목차로 레이아웃 확정 (2패스는 숫자만 채우므로 쪽수 동일)
        html1 = tmp / "pass1.html"
        html1.write_text(_assemble(title, subtitle, body, None), encoding="utf-8")
        md2doc.html_to_pdf(html1, tmp / "pass1.pdf", browser)

        hits = _h2_spans(fitz.open(tmp / "pass1.pdf"))
        entries = _entries(body)
        if len(hits) < len(entries):
            print(f"[textbook-pdf] 경고: h2 추출 {len(hits)}건 < 목차 {len(entries)}건 — 순서 매칭으로 진행", file=sys.stderr)
        page_by_id = {e["id"]: hits[i][0] for i, e in enumerate(entries) if i < len(hits)}
        front = (hits[0][0] - 1) if hits else 1  # 첫 h2가 있는 쪽 - 1 = 표지+목차 쪽수
        printed_pages = {i: p - front for i, p in page_by_id.items()}
        chapters = [(p - front, e["text"]) for e in entries if e["kind"] == "ch"
                    for p in [page_by_id.get(e["id"])] if p]

        # 2패스 — 쪽수 채운 목차로 최종 조립
        html2 = tmp / "pass2.html"
        html2.write_text(_assemble(title, subtitle, body, printed_pages), encoding="utf-8")
        md2doc.html_to_pdf(html2, out_pdf, browser)
        if keep_html:
            out_pdf.with_suffix(".print.html").write_text(html2.read_text(encoding="utf-8"), encoding="utf-8")

    _stamp(out_pdf, title, front, chapters, font)
    return out_pdf


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", required=True)
    ap.add_argument("--out", dest="out_path", required=True)
    ap.add_argument("--title", default=None)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--keep-html", action="store_true")
    ap.add_argument("--browser", default=None)
    ap.add_argument("--font", default=None)
    a = ap.parse_args()
    in_path = Path(a.in_path)
    title = a.title or in_path.stem
    build(in_path, Path(a.out_path), title, a.subtitle, a.keep_html, a.browser, a.font)
    print(Path(a.out_path).resolve())


if __name__ == "__main__":
    main()
