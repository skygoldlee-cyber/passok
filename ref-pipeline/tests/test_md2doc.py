"""md2doc.py 순수 변환 함수 단위 테스트.

대상: 네트워크/GUI 없이 검증 가능한 전처리·후처리·에셋 선택 함수들.
실행: python -m pytest ref-pipeline/tests/ -v
"""
import base64
import hashlib
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import md2doc  # noqa: E402


# ---------------------------------------------------------------------------
# _auto_fence_ascii_diagrams
# ---------------------------------------------------------------------------

class TestAutoFenceAsciiDiagrams:
    def test_wraps_multiline_box_diagram(self):
        md = "본문\n\n┌──┐\n│A │\n└──┘\n\n다음\n"
        out = md2doc._auto_fence_ascii_diagrams(md)
        assert "```text\n┌──┐\n│A │\n└──┘\n```" in out

    def test_single_box_line_not_wrapped(self):
        md = "문장 안 │ 파이프 하나\n다른 문장\n"
        out = md2doc._auto_fence_ascii_diagrams(md)
        assert "```text" not in out

    def test_existing_fence_untouched(self):
        md = "```python\nx = '┌'\ny = '┐'\n```\n"
        out = md2doc._auto_fence_ascii_diagrams(md)
        assert out == md

    def test_no_diagram_passthrough(self):
        md = "# 제목\n\n일반 문단입니다.\n"
        assert md2doc._auto_fence_ascii_diagrams(md) == md


# ---------------------------------------------------------------------------
# _tag_fenced_diagram_blocks_as_text
# ---------------------------------------------------------------------------

class TestTagFencedDiagramBlocks:
    def test_langless_box_fence_tagged_text(self):
        md = "```\n┌─┐\n│ │\n└─┘\n```\n"
        out = md2doc._tag_fenced_diagram_blocks_as_text(md)
        assert out.startswith("```text\n")

    def test_langless_plain_fence_unchanged(self):
        md = "```\nplain code\n```\n"
        assert md2doc._tag_fenced_diagram_blocks_as_text(md) == md

    def test_lang_fence_unchanged(self):
        md = "```python\nprint('┌')\n```\n"
        assert md2doc._tag_fenced_diagram_blocks_as_text(md) == md

    def test_preserves_indent(self):
        md = "  ```\n┌─┐\n└─┘\n  ```\n"
        out = md2doc._tag_fenced_diagram_blocks_as_text(md)
        assert out.splitlines()[0] == "  ```text"


# ---------------------------------------------------------------------------
# _normalize_diagram_codeblocks
# ---------------------------------------------------------------------------

class TestNormalizeDiagramCodeblocks:
    def test_tab_nbsp_fullwidth_normalized_in_text_fence(self):
        md = "```text\n┌─\t┐\n│ │\n└─　┘\n```\n"
        out = md2doc._normalize_diagram_codeblocks(md)
        assert "\t" not in out
        assert " " not in out
        assert "　" not in out

    def test_lang_fence_without_box_chars_unchanged(self):
        md = "```python\nx\t= 1 \n```\n"
        assert md2doc._normalize_diagram_codeblocks(md) == md

    def test_lang_fence_with_box_chars_normalized(self):
        # 언어가 지정돼 있어도 박스 문자가 있으면 다이어그램으로 간주해 정규화
        md = "```console\n┌─\t┐\n```\n"
        out = md2doc._normalize_diagram_codeblocks(md)
        assert "\t" not in out

    def test_outside_fence_unchanged(self):
        md = "탭\t유지 유지\n"
        assert md2doc._normalize_diagram_codeblocks(md) == md


# ---------------------------------------------------------------------------
# _inline_mermaid_fences
# ---------------------------------------------------------------------------

class TestInlineMermaidFences:
    def test_basic_block_becomes_div(self):
        md = "```mermaid\nflowchart LR\n    A-->B\n```\n"
        out = md2doc._inline_mermaid_fences(md)
        assert '<div class="mermaid">' in out
        assert "flowchart LR" in out
        assert "```mermaid" not in out

    def test_html_chars_escaped(self):
        md = "```mermaid\nflowchart LR\n    A[a<b]-->B\n```\n"
        out = md2doc._inline_mermaid_fences(md)
        assert "&lt;" in out
        assert "a<b]" not in out

    def test_unterminated_forest_passthrough(self):
        md = "```mermaid\nflowchart LR\n    A-->B\n"
        out = md2doc._inline_mermaid_fences(md)
        assert "```mermaid" in out
        assert '<div class="mermaid">' not in out

    def test_unterminated_fence_returns_raw_lines(self):
        # 미종결 펜스는 sanitize 없이 원본 라인을 그대로 돌려줘야 한다 —
        # 'flowchart' 같은 입력이 따옴표 삽입 등으로 변형되면 안 된다.
        md = '```mermaid\nflowchart LR\n    A[원본 "따옴표" 레이블]-->B\n'
        out = md2doc._inline_mermaid_fences(md)
        assert 'A[원본 "따옴표" 레이블]-->B' in out

    def test_other_fence_unchanged(self):
        md = "```python\nprint(1)\n```\n"
        assert md2doc._inline_mermaid_fences(md) == md

    def test_unquoted_label_gets_quoted(self):
        md = "```mermaid\nflowchart LR\n    A[라벨 텍스트]-->B\n```\n"
        out = md2doc._inline_mermaid_fences(md)
        assert 'A["라벨 텍스트"]' in out

    def test_case_insensitive_fence(self):
        md = "```MERMAID\nflowchart LR\n    A-->B\n```\n"
        out = md2doc._inline_mermaid_fences(md)
        assert '<div class="mermaid">' in out


# ---------------------------------------------------------------------------
# _apply_smart_pagination
# ---------------------------------------------------------------------------

class TestApplySmartPagination:
    def test_heading_glued_to_next_block(self):
        body = "<h2>제목</h2><p>짧은 단락</p>"
        out = md2doc._apply_smart_pagination(body)
        assert '<div class="keep"><h2>제목</h2><p>짧은 단락</p></div>' in out

    def test_long_pre_marked(self):
        pre = "<pre>" + "\n".join(f"line{i}" for i in range(md2doc._LONG_PRE_LINES + 5)) + "</pre>"
        out = md2doc._apply_smart_pagination(pre)
        assert 'class="long-pre"' in out

    def test_short_pre_unchanged(self):
        body = "<pre>short\ncode</pre>"
        out = md2doc._apply_smart_pagination(body)
        assert 'class="long-pre"' not in out

    def test_long_table_chunked_with_thead(self):
        rows = "".join(
            f"<tr><td>{'x' * 60}</td></tr>" for _ in range(200)
        )
        body = f"<table><thead><tr><th>H</th></tr></thead><tbody>{rows}</tbody></table>"
        out = md2doc._apply_smart_pagination(body)
        assert out.count("<table>") > 1
        assert out.count("<thead>") == out.count("<table>")

    def test_new_page_h2_flag(self):
        out = md2doc._apply_smart_pagination("<h2>t</h2>", new_page_h2=True)
        assert '<h2 class="new-page"' in out


# ---------------------------------------------------------------------------
# _ensure_mermaid_js — 로컬 우선 + SRI 검증
# ---------------------------------------------------------------------------

_FAKE_JS = "/* mermaid */" + "x" * 250_000  # _MERMAID_MIN_BYTES(200KB) 초과


@pytest.fixture(autouse=True)
def _reset_mermaid_memory():
    md2doc._mermaid_js_or_raise.cache_clear()
    yield
    md2doc._mermaid_js_or_raise.cache_clear()


class TestEnsureMermaidJs:
    def test_vendor_file_preferred_no_network(self, tmp_path, monkeypatch):
        vendor = tmp_path / "vendor" / "mermaid"
        vendor.mkdir(parents=True)
        (vendor / "mermaid.min.js").write_text(_FAKE_JS, encoding="utf-8")
        monkeypatch.setattr(
            md2doc, "_REPO_VENDOR_MERMAID", vendor / "mermaid.min.js"
        )

        def _boom(url, timeout=30):
            raise AssertionError("network must not be used")

        monkeypatch.setattr(md2doc, "_download_text", _boom)
        assert md2doc._ensure_mermaid_js() == _FAKE_JS

    def test_tiny_vendor_falls_back_to_cdn(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            md2doc, "_REPO_VENDOR_MERMAID", tmp_path / "missing.js"
        )
        monkeypatch.setattr(md2doc, "_download_text", lambda url, timeout=30: _FAKE_JS)
        monkeypatch.setattr(
            md2doc, "MERMAID_SRI_HASHES", {u: None for u in md2doc.MERMAID_CDN_URLS}
        )
        assert md2doc._ensure_mermaid_js() == _FAKE_JS

    def test_sri_match_accepted(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            md2doc, "_REPO_VENDOR_MERMAID", tmp_path / "missing.js"
        )
        expected = base64.b64encode(
            hashlib.sha384(_FAKE_JS.encode("utf-8")).digest()
        ).decode("ascii")
        monkeypatch.setattr(
            md2doc, "MERMAID_SRI_HASHES", {u: expected for u in md2doc.MERMAID_CDN_URLS}
        )
        monkeypatch.setattr(md2doc, "_download_text", lambda url, timeout=30: _FAKE_JS)
        assert md2doc._ensure_mermaid_js() == _FAKE_JS

    def test_sri_mismatch_skips_to_next_cdn(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            md2doc, "_REPO_VENDOR_MERMAID", tmp_path / "missing.js"
        )
        good_hash = base64.b64encode(
            hashlib.sha384(_FAKE_JS.encode("utf-8")).digest()
        ).decode("ascii")
        urls = md2doc.MERMAID_CDN_URLS
        monkeypatch.setattr(
            md2doc, "MERMAID_SRI_HASHES", {u: good_hash for u in urls}
        )
        bad = _FAKE_JS + "tampered"
        payloads = {urls[0]: bad, urls[1]: _FAKE_JS, urls[2]: _FAKE_JS}
        monkeypatch.setattr(
            md2doc, "_download_text", lambda url, timeout=30: payloads.get(url)
        )
        assert md2doc._ensure_mermaid_js() == _FAKE_JS

    def test_all_sources_fail_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            md2doc, "_REPO_VENDOR_MERMAID", tmp_path / "missing.js"
        )
        monkeypatch.setattr(md2doc, "_download_text", lambda url, timeout=30: None)
        assert md2doc._ensure_mermaid_js() is None

    def test_memory_cache_reused(self, tmp_path, monkeypatch):
        calls = []
        monkeypatch.setattr(
            md2doc, "_REPO_VENDOR_MERMAID", tmp_path / "missing.js"
        )
        monkeypatch.setattr(
            md2doc, "_download_text",
            lambda url, timeout=30: calls.append(url) or _FAKE_JS,
        )
        monkeypatch.setattr(
            md2doc, "MERMAID_SRI_HASHES", {u: None for u in md2doc.MERMAID_CDN_URLS}
        )
        first = md2doc._ensure_mermaid_js()
        second = md2doc._ensure_mermaid_js()
        assert first == second == _FAKE_JS
        assert len(calls) == 1


# ---------------------------------------------------------------------------
# Mermaid SVG 디스크 캐시
# ---------------------------------------------------------------------------

@pytest.fixture()
def _cache_tmp(tmp_path, monkeypatch):
    monkeypatch.setattr(md2doc, "_mermaid_cache_dir", lambda: tmp_path / "mcache")
    return tmp_path / "mcache"


class TestMermaidCache:
    _SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>x</text></svg>'

    def test_round_trip(self, _cache_tmp):
        md2doc._mermaid_cache_write("flowchart LR\nA-->B", self._SVG)
        assert md2doc._mermaid_cache_read("flowchart LR\nA-->B") == self._SVG

    def test_miss_returns_none(self, _cache_tmp):
        assert md2doc._mermaid_cache_read("flowchart LR\nX-->Y") is None

    def test_key_is_src_sensitive(self, _cache_tmp):
        md2doc._mermaid_cache_write("src A", self._SVG)
        assert md2doc._mermaid_cache_read("src B") is None

    def test_invalid_content_not_returned(self, _cache_tmp):
        md2doc._mermaid_cache_write("src", "<html>not svg</html>")
        assert md2doc._mermaid_cache_read("src") is None

    def test_key_deterministic(self):
        a = md2doc._mermaid_cache_key("same src")
        b = md2doc._mermaid_cache_key("same src")
        assert a == b
        assert md2doc._mermaid_cache_key("other") != a

    def test_key_includes_renderer(self):
        # 같은 소스라도 렌더러(mermaid.ink / kroki 폴백)가 다르면
        # 출력 SVG가 다르므로 캐시 키를 분리해야 한다.
        a = md2doc._mermaid_cache_key("src", renderer="mermaid.ink")
        b = md2doc._mermaid_cache_key("src", renderer="kroki")
        assert a != b

    def test_renderer_entries_isolated(self, _cache_tmp):
        md2doc._mermaid_cache_write("src", self._SVG, renderer="kroki")
        assert md2doc._mermaid_cache_read("src", renderer="kroki") == self._SVG
        assert md2doc._mermaid_cache_read("src", renderer="mermaid.ink") is None


# ---------------------------------------------------------------------------
# _embed_mermaid_js
# ---------------------------------------------------------------------------

class TestEmbedMermaidJs:
    def test_replaces_cdn_tag_and_neutralizes_close(self):
        doc = (
            f'<html><head><script src="{md2doc.MERMAID_CDN_URLS[0]}"></script>'
            f"</head></html>"
        )
        js = 'var s = "</script>";'
        out = md2doc._embed_mermaid_js(doc, js)
        assert f'src="{md2doc.MERMAID_CDN_URLS[0]}"' not in out
        assert "<\\/script" in out
        assert '"</script>"' not in out

    def test_empty_inputs_passthrough(self):
        doc = "<html></html>"
        assert md2doc._embed_mermaid_js(doc, "") == doc
        assert md2doc._embed_mermaid_js("", "x") == ""


# ---------------------------------------------------------------------------
# markdown_to_tailwind_html — 네트워크 없는 통합 경로
# ---------------------------------------------------------------------------

class TestMarkdownToTailwindHtmlOffline:
    def test_basic_document(self):
        cfg = md2doc.RenderConfig(prerender_mermaid=False, embed_mermaid=False)
        out = md2doc.markdown_to_tailwind_html("# 제목\n\n본문 텍스트\n", config=cfg)
        assert "<h1" in out
        assert "본문 텍스트" in out
        assert "%%" not in out  # 플레이스홀더 잔존 없음

    def test_mermaid_div_kept_without_prerender(self):
        cfg = md2doc.RenderConfig(prerender_mermaid=False, embed_mermaid=False)
        md = "```mermaid\nflowchart LR\n    A-->B\n```\n"
        out = md2doc.markdown_to_tailwind_html(md, config=cfg)
        # 사전렌더 비활성 → 클라이언트 렌더링용 div + CDN 스크립트 태그 유지
        assert '<div class="mermaid">' in out
        assert md2doc.MERMAID_CDN_URLS[0] in out

    def test_title_escaped(self):
        cfg = md2doc.RenderConfig(prerender_mermaid=False, embed_mermaid=False)
        out = md2doc.markdown_to_tailwind_html(
            "# x\n", title='a<b>"c"', config=cfg
        )
        assert "<title>a&lt;b&gt;&quot;c&quot;</title>" in out

    def test_base_dir_embeds_local_images(self, tmp_path):
        # base_dir 지정 시 상대경로 이미지가 data URI로 임베드된다
        (tmp_path / "pic.png").write_bytes(b"pngdata")
        cfg = md2doc.RenderConfig(prerender_mermaid=False, embed_mermaid=False)
        out = md2doc.markdown_to_tailwind_html(
            "# x\n\n![alt](pic.png)\n", config=cfg, base_dir=tmp_path
        )
        assert "data:image/png;base64," in out
        assert 'src="pic.png"' not in out

    def test_no_base_dir_keeps_relative_src(self):
        # base_dir 미지정 시 기존 동작 유지 (상대 src 그대로)
        cfg = md2doc.RenderConfig(prerender_mermaid=False, embed_mermaid=False)
        out = md2doc.markdown_to_tailwind_html(
            "# x\n\n![alt](pic.png)\n", config=cfg
        )
        assert 'src="pic.png"' in out


# ---------------------------------------------------------------------------
# _embed_local_images — base_dir 밖 경로 탈출 차단
# ---------------------------------------------------------------------------

class TestEmbedLocalImages:
    def test_sibling_image_embedded(self, tmp_path):
        base = tmp_path / "docs"
        base.mkdir()
        (base / "pic.png").write_bytes(b"pngdata")
        body = '<p><img src="pic.png" alt="x"></p>'
        out = md2doc._embed_local_images(body, base)
        assert "data:image/png;base64," in out

    def test_parent_traversal_not_embedded(self, tmp_path):
        # base_dir 밖 파일은 임베드되지 않아야 한다 (임의 로컬 파일 유출 방지)
        base = tmp_path / "docs"
        base.mkdir()
        (tmp_path / "outside.png").write_bytes(b"secret")
        body = '<p><img src="../outside.png" alt="x"></p>'
        out = md2doc._embed_local_images(body, base)
        assert "base64" not in out

    def test_remote_and_data_uri_untouched(self, tmp_path):
        body = (
            '<img src="https://x/y.png">'
            '<img src="data:image/png;base64,AAAA">'
        )
        assert md2doc._embed_local_images(body, tmp_path) == body


# ---------------------------------------------------------------------------
# _sanitize_svg — 렌더러 응답의 실행 가능 요소 제거
# ---------------------------------------------------------------------------

class TestSanitizeSvg:
    def test_script_and_handlers_removed(self):
        svg = '<svg><script>alert(1)</script><a onclick="x()">t</a></svg>'
        out = md2doc._sanitize_svg(svg)
        assert "<script" not in out
        assert "onclick" not in out

    def test_javascript_href_neutralized(self):
        svg = '<svg><a href="javascript:alert(1)">t</a></svg>'
        out = md2doc._sanitize_svg(svg)
        assert "javascript:" not in out

    def test_plain_svg_untouched(self):
        svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>ok</text></svg>'
        assert md2doc._sanitize_svg(svg) == svg


# ---------------------------------------------------------------------------
# 목차 링크 교정 — _linkify_inline_toc · _repair_dead_fragment_links
# ---------------------------------------------------------------------------

class TestTocLinkRepair:
    _MAP = {"첫 번째 섹션": "_3", "두 번째 섹션": "_4"}

    def test_dead_fragment_rewritten_by_text_match(self):
        body = '<ul><li><a href="#첫-번째-섹션">첫 번째 섹션</a></li></ul><h2 id="_3">첫 번째 섹션</h2>'
        out = md2doc._repair_dead_fragment_links(body, self._MAP)
        assert '<a href="#_3">첫 번째 섹션</a>' in out

    def test_live_fragment_untouched(self):
        body = '<a href="#_3">아무 텍스트</a><h2 id="_3">첫 번째 섹션</h2>'
        out = md2doc._repair_dead_fragment_links(body, self._MAP)
        assert '<a href="#_3">아무 텍스트</a>' in out

    def test_unmatched_dead_link_kept(self):
        # 텍스트가 어떤 헤딩과도 매칭되지 않으면 건드리지 않는다
        body = '<a href="#없는-슬러그">관련 없는 글</a><h2 id="_3">첫 번째 섹션</h2>'
        out = md2doc._repair_dead_fragment_links(body, self._MAP)
        assert 'href="#없는-슬러그"' in out

    def test_inline_toc_github_slug_corrected(self):
        body = '<h2>목차</h2><ul><li><a href="#첫-번째-섹션">첫 번째 섹션</a></li></ul>'
        out = md2doc._linkify_inline_toc(body, self._MAP)
        assert '<a href="#_3">첫 번째 섹션</a>' in out

    def test_inline_toc_bullet_linkified(self):
        body = '<h2>목차</h2><p>• 첫 번째 섹션\n• 두 번째 섹션</p>'
        out = md2doc._linkify_inline_toc(body, self._MAP)
        assert '<a href="#_3">첫 번째 섹션</a>' in out
        assert '<a href="#_4">두 번째 섹션</a>' in out

    def test_toc_heading_levels_and_keywords(self):
        # h1·'차례'도 목차 헤딩으로 인식한다
        for heading in ('<h1>차례</h1>', '<h3>목차</h3>'):
            body = f'{heading}<ul><li><a href="#x">첫 번째 섹션</a></li></ul>'
            out = md2doc._linkify_inline_toc(body, self._MAP)
            assert '<a href="#_3">첫 번째 섹션</a>' in out, heading


class TestTocLinksEndToEnd:
    _MD = (
        "# 문서\n\n## 목차\n\n"
        "- [첫 번째 섹션](#첫-번째-섹션)\n\n"
        "## 첫 번째 섹션\n\n본문\n"
    )

    def test_standalone_html_toc_links_bare_and_valid(self):
        # 사이드바 TOC는 label 없는 순수 <a>여야 하고 href가 실제 id를 가리켜야 함
        cfg = md2doc.RenderConfig(prerender_mermaid=False, embed_mermaid=False)
        out = md2doc.markdown_to_tailwind_html(self._MD, config=cfg)
        assert "<label" not in out[out.index("<nav id=\"toc\""):out.index("</nav>")]
        # 본문 목차의 GitHub 슬러그가 실제 헤딩 id로 교정됐는지 확인
        assert 'href="#첫-번째-섹션"' not in out
        heading_ids = set(md2doc.re.findall(r'<h[1-4][^>]*id="([^"]+)"', out))
        frag_targets = set(md2doc.re.findall(r'<a href="#([^"]+)"', out))
        broken = frag_targets - heading_ids - {"tocOpen", "_", "mainContent"}
        assert not broken, f"dead fragment links: {broken}"

    def test_pdf_path_repairs_toc_links(self):
        # PDF용 본문에서도 목차 링크가 실제 헤딩 id를 가리켜야 내부 GoTo가 동작한다
        body = md2doc.md_to_html_body(self._MD, render_mermaid=False)
        assert 'href="#첫-번째-섹션"' not in body
        heading_ids = set(md2doc.re.findall(r'<h[1-4][^>]*id="([^"]+)"', body))
        frag_targets = set(md2doc.re.findall(r'<a href="#([^"]+)"', body))
        assert frag_targets <= heading_ids


# ---------------------------------------------------------------------------
# _find_heading_id — 부분 매칭 오교정 차단
# ---------------------------------------------------------------------------

class TestFindHeadingId:
    _MAP = {
        "첫 번째 섹션": "_3",
        "두 번째 섹션": "_4",
        "세부 사항 A": "_5",
        "세부 사항 B": "_6",
    }

    def test_exact_match(self):
        assert md2doc._find_heading_id("첫 번째 섹션", self._MAP) == "_3"

    def test_whitespace_normalized_match(self):
        # 링크 텍스트와 헤딩이 공백만 다르면 매칭된다
        assert md2doc._find_heading_id("첫번째섹션", self._MAP) == "_3"

    def test_unique_partial_match(self):
        assert md2doc._find_heading_id("첫 번째", self._MAP) == "_3"

    def test_short_text_no_partial(self):
        # 4자 미만 텍스트는 부분 매칭을 하지 않는다 (짧은 단어 오매칭 방지)
        assert md2doc._find_heading_id("섹션", self._MAP) is None

    def test_ambiguous_partial_returns_none(self):
        # 후보가 둘 이상이면 어느 하나에 잘못 연결하지 않고 None을 반환 —
        # 죽은 링크를 유지하는 편이 오교정보다 안전하다
        assert md2doc._find_heading_id("세부 사항", self._MAP) is None

    def test_empty_returns_none(self):
        assert md2doc._find_heading_id("", self._MAP) is None


# ---------------------------------------------------------------------------
# _linkify_inline_toc — 인라인 태그를 포함한 목차 헤딩 인식
# ---------------------------------------------------------------------------

class TestTocHeadingInlineTags:
    _MAP = {"첫 번째 섹션": "_3"}

    def test_heading_with_inline_tag_recognized(self):
        body = '<h2><em>목차</em></h2><ul><li><a href="#x">첫 번째 섹션</a></li></ul>'
        out = md2doc._linkify_inline_toc(body, self._MAP)
        assert '<a href="#_3">첫 번째 섹션</a>' in out

    def test_permalink_markup_heading_recognized(self):
        # toc permalink 마크업이 헤딩 안에 있어도 키워드 판정이 동작한다
        body = (
            '<h2 id="_toc">목차<a class="toclink" href="#_toc">&para;</a></h2>'
            '<ul><li><a href="#x">첫 번째 섹션</a></li></ul>'
        )
        out = md2doc._linkify_inline_toc(body, self._MAP)
        assert '<a href="#_3">첫 번째 섹션</a>' in out

    def test_heading_without_keyword_untouched(self):
        body = '<h2>소개</h2><ul><li><a href="#x">첫 번째 섹션</a></li></ul>'
        out = md2doc._linkify_inline_toc(body, self._MAP)
        assert 'href="#x"' in out


# ---------------------------------------------------------------------------
# allow_network — 오프라인 모드와 mermaid.ink 회로 차단
# ---------------------------------------------------------------------------

class _SyncExecutor:
    """ThreadPoolExecutor 대체용 — 제출 즉시 동기 실행하는 Future를 반환한다."""

    def __init__(self, max_workers=1):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def submit(self, fn, *args):
        from concurrent.futures import Future
        f = Future()
        try:
            f.set_result(fn(*args))
        except Exception as e:
            f.set_exception(e)
        return f


class TestOfflinePrerender:
    _DIVS = (
        '<div class="mermaid">flowchart LR\nuniq-A--&gt;B</div>'
        '<div class="mermaid">flowchart LR\nuniq-C--&gt;D</div>'
    )

    def test_offline_no_network_and_div_kept(self, _cache_tmp, monkeypatch):
        def _boom(*a, **k):
            raise AssertionError("network must not be used")

        monkeypatch.setattr(md2doc.urllib.request, "urlopen", _boom)
        out = md2doc._prerender_mermaid_to_svg(self._DIVS, allow_network=False)
        assert out.count('<div class="mermaid">') == 2
        assert "mermaid-img" not in out

    def test_offline_uses_cache(self, _cache_tmp):
        md2doc._mermaid_cache_write(
            "flowchart LR\nuniq-A-->B",
            '<svg xmlns="http://www.w3.org/2000/svg"><text>x</text></svg>',
        )
        out = md2doc._prerender_mermaid_to_svg(
            '<div class="mermaid">flowchart LR\nuniq-A--&gt;B</div>',
            allow_network=False,
        )
        assert "mermaid-img" in out

    def test_circuit_breaker_skips_ink_after_first_failure(
        self, _cache_tmp, monkeypatch
    ):
        calls = {"ink": 0, "kroki": 0}

        def fake_urlopen(req, timeout=30):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            calls["ink" if "mermaid.ink" in url else "kroki"] += 1
            raise OSError("renderer down")

        monkeypatch.setattr(md2doc.urllib.request, "urlopen", fake_urlopen)
        monkeypatch.setattr(md2doc.time, "sleep", lambda s: None)
        # 워커 경합으로 판정이 흔들리지 않도록 동기 실행기로 대체한다
        monkeypatch.setattr(md2doc, "ThreadPoolExecutor", _SyncExecutor)
        md2doc._prerender_mermaid_to_svg(self._DIVS)
        # 첫 다이어그램만 ink 4회 재시도 — 이후 다이어그램은 회로 차단으로 kroki 직행
        assert calls["ink"] == 4
        assert calls["kroki"] == 4


class TestEnsureMermaidJsOffline:
    def test_offline_skips_network(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            md2doc, "_REPO_VENDOR_MERMAID", tmp_path / "missing.js"
        )

        def _boom(url, timeout=30):
            raise AssertionError("network must not be used")

        monkeypatch.setattr(md2doc, "_download_text", _boom)
        assert md2doc._ensure_mermaid_js(allow_network=False) is None

    def test_offline_uses_vendor(self, tmp_path, monkeypatch):
        vendor = tmp_path / "mermaid.min.js"
        vendor.write_text(_FAKE_JS, encoding="utf-8")
        monkeypatch.setattr(md2doc, "_REPO_VENDOR_MERMAID", vendor)
        assert md2doc._ensure_mermaid_js(allow_network=False) == _FAKE_JS


# ---------------------------------------------------------------------------
# html_to_pdf / _find_browser
# ---------------------------------------------------------------------------

class TestHtmlToPdf:
    def test_invokes_browser_print(self, tmp_path, monkeypatch):
        html_path = tmp_path / "doc.html"
        html_path.write_text("<html></html>", encoding="utf-8")
        pdf_path = tmp_path / "doc.pdf"
        captured = {}

        class _Result:
            returncode = 0
            stdout = ""
            stderr = ""

        def fake_run(cmd, **kw):
            captured["cmd"] = cmd
            captured["kw"] = kw
            pdf_path.write_bytes(b"%PDF")
            return _Result()

        monkeypatch.setattr(md2doc.subprocess, "run", fake_run)
        md2doc.html_to_pdf(html_path, pdf_path, "fakebrowser")
        assert captured["cmd"][0] == "fakebrowser"
        assert any(a.startswith("--print-to-pdf=") for a in captured["cmd"])
        assert captured["kw"]["timeout"] == 120

    def test_failure_raises(self, tmp_path, monkeypatch):
        html_path = tmp_path / "doc.html"
        html_path.write_text("<html></html>", encoding="utf-8")

        class _Result:
            returncode = 1
            stdout = ""
            stderr = "boom"

        monkeypatch.setattr(md2doc.subprocess, "run", lambda *a, **k: _Result())
        with pytest.raises(RuntimeError):
            md2doc.html_to_pdf(html_path, tmp_path / "out.pdf", "fakebrowser")


class TestFindBrowser:
    def test_env_var_preferred(self, tmp_path, monkeypatch):
        exe = tmp_path / "mybrowser.exe"
        exe.write_text("x")
        monkeypatch.setenv("MD2DOC_BROWSER", str(exe))
        assert md2doc._find_browser() == str(exe)

    def test_which_fallback(self, monkeypatch):
        monkeypatch.delenv("MD2DOC_BROWSER", raising=False)
        monkeypatch.setattr(md2doc.Path, "is_file", lambda self: False)
        monkeypatch.setattr(
            md2doc.shutil, "which",
            lambda n: "/usr/bin/chromium" if n == "chromium" else None,
        )
        assert md2doc._find_browser() == "/usr/bin/chromium"


# ---------------------------------------------------------------------------
# %%BUILD%% 스탬프 — 콘텐츠 해시 기반 재현성
# ---------------------------------------------------------------------------

class TestBuildStamp:
    def _convert(self, md):
        cfg = md2doc.RenderConfig(prerender_mermaid=False, embed_mermaid=False)
        return md2doc.markdown_to_tailwind_html(md, config=cfg)

    def test_deterministic_for_same_input(self, monkeypatch):
        monkeypatch.delenv("SOURCE_DATE_EPOCH", raising=False)
        # 시각 의존 제거 — 동일 입력은 바이트 단위로 동일한 출력을 만든다
        assert self._convert("# 제목\n") == self._convert("# 제목\n")

    def test_differs_for_changed_input(self, monkeypatch):
        monkeypatch.delenv("SOURCE_DATE_EPOCH", raising=False)
        a = self._convert("# 제목\n")
        b = self._convert("# 다른 제목\n")
        stamp = md2doc.re.compile(r"b[0-9a-f]{8}")
        assert stamp.search(a).group(0) != stamp.search(b).group(0)

    def test_source_date_epoch_override(self, monkeypatch):
        monkeypatch.setenv("SOURCE_DATE_EPOCH", "1700000000")
        assert "b1700000000" in self._convert("# 제목\n")


# ---------------------------------------------------------------------------
# _build_markdown — 공통 변환기 팩토리
# ---------------------------------------------------------------------------

class TestBuildMarkdown:
    def test_extensions_available(self):
        md = md2doc._build_markdown()
        out = md.convert("| a | b |\n|---|---|\n| 1 | 2 |\n")
        assert "<table>" in out
        out = md.convert("```python\nx = 1\n```")
        assert "codehilite" in out or "highlight" in out


# ---------------------------------------------------------------------------
# DOCX 출력 — _html_body_to_docx / convert_markdown_to_docx
# ---------------------------------------------------------------------------

class TestDocxOutput:
    """python-docx 필요 — 미설치 시 skip."""

    @pytest.fixture(autouse=True)
    def _need_docx(self):
        pytest.importorskip("docx")

    def _doc(self, md: str, tmp_path: Path):
        in_path = tmp_path / "in.md"
        in_path.write_text(md, encoding="utf-8")
        body = md2doc.md_to_html_body(
            md, render_mermaid=False, allow_network=False
        )
        return md2doc._html_body_to_docx(
            body, in_path.parent, "t", new_page_h2=False,
            allow_network=False,
        )

    def test_headings_paragraphs_runs(self, tmp_path):
        d = self._doc("# 제목\n\n본문 **굵게** 그리고 `코드`.\n", tmp_path)
        texts = [p.text for p in d.paragraphs]
        assert "제목" in texts
        para = next(p for p in d.paragraphs if "본문" in p.text)
        assert any(r.font.bold for r in para.runs if r.text == "굵게")
        assert any(r.font.name == "Consolas" for r in para.runs if "코드" in r.text)

    def test_table_structure(self, tmp_path):
        d = self._doc(
            "| A | B |\n|---|---|\n| 1 | x |\n| 2 | y |\n", tmp_path
        )
        assert len(d.tables) == 1
        t = d.tables[0]
        assert len(t.rows) == 3 and len(t.columns) == 2
        assert t.cell(0, 0).text == "A"
        assert t.cell(2, 1).text == "y"

    def test_list_markers(self, tmp_path):
        d = self._doc("- 가\n- 나\n", tmp_path)
        marks = [p.text for p in d.paragraphs if p.text.startswith("• ")]
        assert marks == ["• 가", "• 나"]

    def test_ordered_list_numbers(self, tmp_path):
        d = self._doc("1. 첫\n2. 둘\n", tmp_path)
        texts = [p.text for p in d.paragraphs]
        assert "1. 첫" in texts and "2. 둘" in texts

    def test_blockquote_is_table(self, tmp_path):
        d = self._doc("> 인용문\n", tmp_path)
        assert len(d.tables) == 1
        assert "인용문" in d.tables[0].cell(0, 0).text

    def test_keep_wrapper_blocks_stay_separate(self, tmp_path):
        # 스마트 페이지네이션의 .keep div 안 헤딩+목록이 한 단락으로 합쳐지면 안 됨
        d = self._doc("## 절\n\n- 항목 하나\n- 항목 둘\n", tmp_path)
        texts = [p.text for p in d.paragraphs]
        assert "절" in texts
        assert "• 항목 하나" in texts and "• 항목 둘" in texts

    def test_convert_file_writes_docx(self, tmp_path):
        in_path = tmp_path / "doc.md"
        in_path.write_text("# 제목\n\n본문\n", encoding="utf-8")
        out = md2doc.convert_markdown_to_docx(in_path, allow_network=False)
        assert out.suffix == ".docx" and out.exists()

    def test_missing_python_docx_errors(self, tmp_path, monkeypatch):
        monkeypatch.setattr(md2doc, "_docx", None)
        in_path = tmp_path / "doc.md"
        in_path.write_text("# t\n", encoding="utf-8")
        with pytest.raises(RuntimeError, match="python-docx"):
            md2doc.convert_markdown_to_docx(in_path, allow_network=False)

    def test_adjacent_tables_get_separator(self, tmp_path):
        # OOXML에서 단락 없이 인접한 <w:tbl>은 Word가 한 표로 병합 — 빈 단락을 끼운다
        d = self._doc(
            "| A | B |\n|---|---|\n| 1 | x |\n\n| C | D |\n|---|---|\n| 2 | y |\n",
            tmp_path,
        )
        tags = [c.tag.split("}")[1] for c in d.element.body.iterchildren()]
        assert "p" in tags[tags.index("tbl"):]

    def test_fence_marker_paragraphs_skipped(self, tmp_path):
        d = self._doc("본문\n\n:::sign\n서명란\n:::end\n", tmp_path)
        texts = [p.text for p in d.paragraphs]
        assert not any(t.startswith(":::") for t in texts)
        assert "서명란" in texts

    def test_table_columns_fit_content(self, tmp_path):
        # 라벨 열이 내용보다 과도하게 넓지 않아야 한다
        d = self._doc(
            "| A | 내용열이 아주 깁니다 여기에 긴 내용을 넣어요 계속 |\n"
            "|---|---|\n| 1 | x |\n",
            tmp_path,
        )
        t = d.tables[0]
        w0, w1 = t.columns[0].width, t.columns[1].width
        assert w0 and w1 and w0 < w1  # 짧은 라벨 열이 내용열보다 좁다

    def test_two_col_tables_share_label_width(self, tmp_path):
        # 인접 2열 표는 라벨 열 폭을 공유 — 경계가 계단처럼 어긋나지 않는다
        d = self._doc(
            "| A | x |\n|---|---|\n| 1 | y |\n\n"
            "| 훨씬긴라벨열 | x |\n|---|---|\n| 2 | y |\n",
            tmp_path,
        )
        assert len(d.tables) == 2
        w0 = d.tables[0].columns[0].width
        w1 = d.tables[1].columns[0].width
        assert w0 == w1

    def test_table_cell_alignment(self, tmp_path):
        # 셀은 세로 중앙; 헤더·2열 표 라벨 열은 가로 중앙 (docx-utils _cell 규약)
        from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        d = self._doc(
            "| 라벨 | 내용 |\n|---|---|\n| 일시 | 2026-11-15 주간 |\n",
            tmp_path,
        )
        t = d.tables[0]
        for row in t.rows:
            for c in row.cells:
                assert c.vertical_alignment == WD_CELL_VERTICAL_ALIGNMENT.CENTER
        # 헤더 행 — 두 셀 모두 가로 중앙
        for c in t.rows[0].cells:
            assert all(p.alignment == WD_ALIGN_PARAGRAPH.CENTER for p in c.paragraphs)
        # 본문 — 라벨 열은 중앙, 내용 열은 좌측(기본)
        body = t.rows[1].cells
        assert all(p.alignment == WD_ALIGN_PARAGRAPH.CENTER for p in body[0].paragraphs)
        assert not any(p.alignment == WD_ALIGN_PARAGRAPH.CENTER for p in body[1].paragraphs)
