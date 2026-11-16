"""textbook_pdf.py 단위 테스트 — 목차·표지 조립, h2 페이지 추출, 스탬프.

@spec DR-10 — 교재 전용 인쇄 템플릿(표지·목차·러닝헤드·쪽수)
Chrome 없이 PyMuPDF로 생성한 합성 PDF로 페이지 추출·스탬프를 검증한다.
실행: python -m pytest ref-pipeline/tests/test_textbook_pdf.py -v
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import textbook_pdf as tp  # noqa: E402

fitz = pytest.importorskip("fitz")


BODY = (
    '<h2 id="intro">출제기준 챕터 구성</h2><p>본문</p>'
    '<h2 id="ch1">📚 Chapter 01. 개론</h2><p>본문</p>'
    '<h2 id="s11">1. 첫째 절</h2><p>본문</p>'
    '<h2 id="ch2">📚 Chapter 02. 심화</h2><p>본문</p>'
)


class TestEntries:
    def test_extracts_h2_with_kind(self):
        entries = tp._entries(BODY)
        assert [(e["id"], e["kind"]) for e in entries] == [
            ("intro", "plain"), ("ch1", "ch"), ("s11", "sec"), ("ch2", "ch"),
        ]
        assert entries[0]["text"] == "출제기준 챕터 구성"
        assert entries[1]["text"] == "📚 Chapter 01. 개론"

    def test_unnumbered_h2_is_plain_not_sec(self):
        entries = tp._entries('<h2 id="a">부록 — 참고</h2>')
        assert entries[0]["kind"] == "plain"


class TestTocHtml:
    def test_links_and_kinds(self):
        entries = tp._entries(BODY)
        toc = tp._toc_html(entries)
        assert 'href="#ch1"' in toc
        assert 'class="e ch"' in toc and 'class="e sec"' in toc

    def test_page_numbers_filled_in_pass2(self):
        entries = tp._entries(BODY)
        toc = tp._toc_html(entries, {"ch1": 3})
        assert 'href="#ch1"><span class="t">📚 Chapter 01. 개론</span><span class="dots"></span><span class="n">3</span>' in toc
        # 미해석 항목은 공란 유지
        assert '<span class="n"></span>' in toc


class TestCoverHtml:
    def test_cover_fields(self):
        c = tp._cover_html("1과목 요양보호론 (필기)", "요양보호사 자격시험")
        assert "1과목 요양보호론 (필기)" in c
        assert "요양보호사 자격시험" in c
        assert "PassOK" in c
        assert "page-break-after: always" not in c  # 스타일은 템플릿 소관 — 마크업만 확인
        assert 'class="tb-cover"' in c


def _make_pdf(path: Path, pages: list[list[tuple[str, float]]]) -> None:
    """합성 PDF — 각 쪽에 (텍스트, 폰트크기) 스팬을 심는다."""
    doc = fitz.open()
    for spans in pages:
        page = doc.new_page()
        y = 50
        for text, size in spans:
            page.insert_text((50, y), text, fontsize=size)
            y += 30
    doc.save(str(path))
    doc.close()


class TestH2Spans:
    def test_h2_size_band_only(self, tmp_path):
        # 합성 PDF는 기본 폰트라 한글 불가 — 크기 대역 필터는 ASCII로 검증
        pdf = tmp_path / "t.pdf"
        _make_pdf(pdf, [
            [("Cover Title", 30)],
            [("TOC", 18), ("Chapter 01. Intro", 9.5)],   # 목차 쪽 — 소점수 항목 무시
            [("Preface Section", 15), ("body", 10.5)],
            [("Chapter 01. Intro", 15), ("body", 10.5), ("h3 head", 12.5)],
        ])
        hits = tp._h2_spans(fitz.open(pdf))
        assert hits == [(3, "Preface Section"), (4, "Chapter 01. Intro")]


class TestChapterAt:
    def test_boundaries(self):
        chs = [(3, "Chapter 01. A"), (10, "Chapter 02. B")]
        assert tp._chapter_at(chs, 1) == ""
        assert tp._chapter_at(chs, 3) == "Chapter 01. A"
        assert tp._chapter_at(chs, 9) == "Chapter 01. A"
        assert tp._chapter_at(chs, 10) == "Chapter 02. B"


class TestStamp:
    def test_stamps_body_pages_only(self, tmp_path):
        font = tp._find_font()
        if not font:
            pytest.skip("한글 폰트 없음")
        pdf = tmp_path / "t.pdf"
        _make_pdf(pdf, [[("표지", 30)], [("목차", 18)], [("본문1", 10.5)], [("본문2", 10.5)]])
        tp._stamp(pdf, "1과목 요양보호론 (필기)", 1, [(1, "Chapter 01. 개론")], font)
        doc = fitz.open(pdf)
        assert "본문" not in doc[0].get_text() or "- 1 -" not in doc[0].get_text()
        assert "- 1 -" not in doc[0].get_text()
        assert "요양보호론" in doc[2].get_text() and "- 2 -" in doc[2].get_text()  # front=1 → 쪽2가 인쇄 2쪽
        assert "Chapter 01. 개론" in doc[3].get_text()
        doc.close()

    def test_no_font_is_noop(self, tmp_path, capsys):
        pdf = tmp_path / "t.pdf"
        _make_pdf(pdf, [[("본문", 10.5)]])
        tp._stamp(pdf, "제목", 0, [], None)
        assert "스탬프 생략" in capsys.readouterr().err
