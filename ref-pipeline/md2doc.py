# @spec CS-01,CS-05
import markdown
from pathlib import Path
import unicodedata
import html
import re
import argparse
import base64
import functools
import glob
import os
import random
import hashlib
import json
import logging
import sys
import time
import urllib.request
import urllib.parse
import shutil
import subprocess
import tempfile
import traceback
import zlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

# Windows cp949 콘솔 대응 — 한글/유니코드 안내 메시지가 깨지지 않게 UTF-8 고정
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


# =============================================================================
# 모바일 file:// 디버깅 및 해결 이력 (2025-01)
#
# 모바일 Chrome/Safari에서 로컬 HTML 파일(file:// 또는 content://)을 열면
# 인라인 <script>가 전혀 실행되지 않는 보안 정책이 적용된다.
# 이 환경에서 작동하도록 하기 위해 아래와 같은 CSS-only/구조적 해결을 적용했다.
#
# [발견된 이슈 및 해결]
# 1. 테마 토글 버튼 미응답 (모바일)
#    - 원인: 인라인 JS 차단 + 라이트박스 오버레이(z-index:10000)가 버튼을 가림
#    - 해결: CSS-only checkbox/label 토글 + :has() 선택자, 버튼 z-index 2147483000
#
# 2. 본문 내 목차 링크 미응답 (모바일)
#    - 원인 A: 마크다운 원본의 목차가 일반 텍스트(•)로 작성되어 링크가 아님
#    - 원인 B: 일부 파일의 마크다운 링크 href가 잘못된 앵커(#-텍스트)를 가리킴
#    - 원인 C: backdrop-filter가 stacking context를 생성하여 앵커 이동을 방해
#    - 해결: _linkify_inline_toc()로 • 항목 및 <ol> 안 <a>의 href를 올바른 id로 변환
#           + 모든 backdrop-filter 제거 (CSS blur 대신 opacity 사용)
#
# 3. 모바일 TOC 드로어 미작동
#    - 원인: 인라인 JS 차단으로 drawer-hidden 클래스 토글 불가
#    - 해결: #tocOpen 마커 + :target으로 CSS-only 드로어 구현
#           열기는 <a href="#tocOpen">, 닫기는 어떤 프래그먼트 이동(목차 링크
#           포함) — :target이 마커를 벗어나면 드로어가 자동으로 닫힌다.
#           구현 이력: 초기엔 #tocSwitch checkbox + TOC 링크를
#           <label for="tocSwitch">로 감싸는 방식이었으나, label 안의 <a>
#           탭을 체크박스 활성화로만 처리해 앵커 이동이 삼켜지는 뷰어
#           (iOS Safari/WKWebView 등)에서 "목차 클릭 시 미이동" 오류가
#           발생하여 :target 방식으로 교체했다.
#    - 추가: 별도 TOC 버튼 대신 왼쪽 끝 스와이프 제스처로 오픈 (모던 패턴)
#            왼쪽 가장자리에 작은 힌트 탭(<a>)을 두어 JS 없는 환경에서도
#            탭으로 열 수 있도록 폴백 유지
#
# 4. 모바일 좌우 여백 없음
#    - 원인: Tailwind CDN 미로드 시 .px-4 등 유틸리티 미적용
#    - 해결: article에 직접 padding: 0 1rem 추가
#
# [모바일 file:// 호환성 원칙]
# - 인라인 <script>는 실행되지 않으므로, 중요 기능은 CSS-only로 구현
# - checkbox/label + :has() 선택자로 토글/드로어 등 UI 상태 관리
# - backdrop-filter는 stacking context를 생성해 앵커 이동을 방해 → 사용 금지
# - 기본 <a href="#id"> 앵커 동작은 JS 없이도 작동하므로 활용
# - Tailwind CDN은 로드되지 않을 수 있으므로, 필수 레이아웃은 CSS로 직접 보장
# =============================================================================


# UX toggles (can be overridden via CLI)
COLLAPSE_CODEBLOCK_MIN_LINES = 35

# 진단 로그 — CLI는 __main__에서 basicConfig, GUI는 progress_cb 경로 별도 유지.
# 라이브러리로 임포트될 때는 핸들러 없이 조용히 동작한다.
logger = logging.getLogger("md2doc")


class _CallbackLogHandler(logging.Handler):
    """로그 레코드를 콜백으로 전달하는 핸들러.

    GUI 모드는 logging.basicConfig를 호출하지 않으므로 이미지 누락·
    Mermaid 렌더 실패 같은 warning이 사용자에게 보이지 않는다 —
    워커 실행 동안 이 핸들러를 달아 경고를 UI로 라우팅한다.
    """

    def __init__(self, cb, level: int = logging.WARNING):
        super().__init__(level)
        self._cb = cb

    def emit(self, record: logging.LogRecord) -> None:
        try:
            self._cb(self.format(record))
        except Exception:
            pass

# ASCII/박스 드로잉 다이어그램 감지용 문자 집합 (여러 파이프라인 함수에서 공용)
BOX_CHARS = frozenset("┌┐└┘├┤┬┴┼│─═╔╗╚╝╠╣╦╩╬┃━▲▼◀▶")

# blockquote → 콜아웃 카드 분류 기본 규칙 (범용 이모지 마커만 포함).
# 프로젝트 특화 키워드(인물명·문서 태그 등)는 스크립트 옆의
# callout_rules.json 또는 --callout-rules로 주입한다.
# (CSS 클래스, 키워드 튜플) 쌍이며 위에서부터 순서대로 평가되어 첫 매칭이 적용된다.
CALLOUT_RULES_DEFAULT: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("callout-sop", ("📋",)),
    ("callout-trouble", ("🚨",)),
    ("callout-warning", ("⚠️",)),
    ("callout-form", ("📑",)),
    ("callout-character", ("💡",)),
    ("callout-exam", ("🎯", "🧠")),
)

@functools.lru_cache(maxsize=8)
def _load_callout_rules(rules_file: str | None) -> tuple[tuple[str, tuple[str, ...]], ...]:
    """규칙 파일 경로별로 캐시되는 콜아웃 규칙 로더 (내부용)."""
    candidates = [Path(rules_file)] if rules_file else [Path(__file__).with_name("callout_rules.json")]
    for cand in candidates:
        try:
            if cand.is_file():
                data = json.loads(cand.read_text(encoding="utf-8"))
                rules = tuple(
                    (str(r["class"]), tuple(str(k) for k in r["keywords"]))
                    for r in data.get("rules", [])
                    if r.get("class") and r.get("keywords")
                )
                if rules:
                    return rules
        except Exception as e:
            logger.warning("[callout_rules] failed to load %s: %s", cand, e)
    return CALLOUT_RULES_DEFAULT


def _resolve_callout_rules(rules_file: str | Path | None = None) -> tuple[tuple[str, tuple[str, ...]], ...]:
    """콜아웃 분류 규칙을 결정한다.

    우선순위: --callout-rules 명시 경로 → 스크립트 옆 callout_rules.json → 기본값.
    경로별로 lru_cache되어 변환마다 반복 로드하지 않는다.
    """
    return _load_callout_rules(str(rules_file) if rules_file else None)

# Embed the Mermaid library directly into the generated HTML by default.
# The CDN build (mermaid.min.js) is ~3.5MB; on mobile in-app browsers
# (KakaoTalk, Samsung Internet viewer, etc.) and flaky networks that large
# external script often fails to load, leaving the diagram source as raw text.
# Inlining it removes the runtime network dependency so diagrams render offline.
EMBED_MERMAID = True
MERMAID_ASSET_NAME = "mermaid.min.js"
# CDN URL은 정확한 버전으로 고정 — 같은 빌드에서 매번 동일한 라이브러리를 얻는다.
# vendor/mermaid/mermaid.min.js는 별도 빌드라 CDN 바이트와 다르므로,
# vendor가 있으면 항상 그것을 우선 사용하고 CDN은 부재 시 폴백으로만 쓴다.
MERMAID_VERSION = "11.17.2"
# Tried in order at build time; the first that returns a real file is cached.
MERMAID_CDN_URLS = (
    f"https://cdn.jsdelivr.net/npm/mermaid@{MERMAID_VERSION}/dist/mermaid.min.js",
    f"https://unpkg.com/mermaid@{MERMAID_VERSION}/dist/mermaid.min.js",
    f"https://fastly.jsdelivr.net/npm/mermaid@{MERMAID_VERSION}/dist/mermaid.min.js",
)
# ESM 빌드는 CDN 폴백의 최후 수단으로 사용 (생성 HTML 내 JS가 import)
MERMAID_ESM_URL = f"https://cdn.jsdelivr.net/npm/mermaid@{MERMAID_VERSION}/dist/mermaid.esm.min.mjs"
# The library is multi-MB; anything much smaller is an error page, not the lib.
_MERMAID_MIN_BYTES = 200_000

# 고정 버전 npm dist 빌드의 sha384(base64) — jsdelivr/unpkg/fastly.jsdelivr가
# 동일 바이트를 서빙하므로 동일 해시 적용. 버전을 올릴 때 재계산해 갱신한다.
# (계산: sha384sum vendor 또는 curl <url> | openssl dgst -sha384 -binary | base64)
_MERMAID_PINNED_SHA384 = "EOXBFmc3gx5mb+vn0vPvvGqACToJD24hhacX5Yx+8NUUQrHIle/Qi5Bg9o3zKwW2"
MERMAID_SRI_HASHES: dict[str, str | None] = {
    url: _MERMAID_PINNED_SHA384 for url in MERMAID_CDN_URLS
}

# 저장소에 자체 호스팅된 Mermaid 빌드 — 네트워크 없이 확정 버전을 얻는 1순위 소스
_REPO_VENDOR_MERMAID = (
    Path(__file__).resolve().parent.parent / "vendor" / "mermaid" / MERMAID_ASSET_NAME
)

# In-memory cache for the Mermaid library (no disk writes).
# lru_cache에 성공 결과만 남기도록 실패는 예외로 표현한다.
class _MermaidUnavailable(LookupError):
    pass


@dataclass(frozen=True)
class RenderConfig:
    collapse_codeblock_min_lines: int = COLLAPSE_CODEBLOCK_MIN_LINES
    embed_mermaid: bool = EMBED_MERMAID
    prerender_mermaid: bool = True
    callout_rules_file: str | None = None
    # False면 외부 네트워크 요청을 일절 하지 않는다 — Mermaid 사전렌더는
    # 디스크 캐시 히트만 사용하고 미스는 클라이언트 렌더링 폴백으로 둔다.
    allow_network: bool = True


def _read_text_if_exists(path: Path) -> str | None:
    try:
        if path and path.exists() and path.is_file():
            return path.read_text(encoding="utf-8")
    except Exception:
        return None
    return None


def _download_text(url: str, timeout: int = 30) -> str | None:
    """Best-effort download of a text asset. Returns None on any failure."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
        text = data.decode("utf-8", errors="replace")
        # Guard against captive-portal / 404 HTML pages masquerading as the asset.
        if len(text.encode("utf-8")) < _MERMAID_MIN_BYTES:
            return None
        return text
    except Exception:
        return None


@functools.lru_cache(maxsize=8)
def _mermaid_js_or_raise(assets_dir: str | None, allow_network: bool) -> str:
    """Mermaid 라이브러리 소스를 반환한다. 취득 실패는 _MermaidUnavailable —
    실패 결과는 캐시하지 않아 프로세스 내에서 네트워크 복구 시 재시도된다."""
    # 저장소에 자체 호스팅된 빌드 — 네트워크 없이 확정 버전을 얻는 1순위 소스
    for local in (_REPO_VENDOR_MERMAID,
                  Path(assets_dir) / MERMAID_ASSET_NAME if assets_dir else None):
        if local is None:
            continue
        try:
            cached = _read_text_if_exists(local)
            if cached and len(cached.encode("utf-8")) >= _MERMAID_MIN_BYTES:
                return cached
        except Exception:
            pass

    if allow_network:
        for url in MERMAID_CDN_URLS:
            text = _download_text(url)
            if text:
                # SRI 검증: 알려진 해시가 있으면 검증, 없으면 크기만 검증
                expected_hash = MERMAID_SRI_HASHES.get(url)
                if expected_hash is not None:
                    actual_hash = base64.b64encode(
                        hashlib.sha384(text.encode("utf-8")).digest()
                    ).decode("ascii")
                    if actual_hash != expected_hash:
                        logger.warning("[Mermaid SRI mismatch] %s", url)
                        continue  # 해시 불일치 → 다음 CDN 시도
                return text
    raise _MermaidUnavailable("mermaid library unavailable")


def _ensure_mermaid_js(assets_dir: Path | None = None, allow_network: bool = True) -> str | None:
    """Return the Mermaid library source, using an in-memory cache.

    우선순위: 인메모리 캐시 → 저장소 vendor 파일(오프라인·버전 확정) →
    assets_dir 로컬 사본 → 고정 버전 CDN (SRI 검증).
    allow_network=False면 CDN 시도를 건너뛰고 로컬 소스만 사용한다.
    첫 성공 결과를 메모리에 캐시한다 (디스크 쓰기 없음).

    Returns None if the library cannot be obtained (offline), in which case
    the generated HTML keeps its CDN <script> tag as a fallback.
    """
    try:
        return _mermaid_js_or_raise(
            str(assets_dir) if assets_dir else None, allow_network
        )
    except _MermaidUnavailable:
        return None


def _embed_mermaid_js(doc_html: str, js_text: str) -> str:
    """Replace the Mermaid CDN <script src> tag with an inline <script> block."""
    if not doc_html or not js_text:
        return doc_html
    # Neutralize any "</script" so it cannot terminate our inline block early.
    # (In JS source, "<\/script" is equivalent to "</script" inside strings.)
    safe = re.sub(r"</script", r"<\\/script", js_text, flags=re.IGNORECASE)
    inline = "<script>\n" + safe + "\n</script>"
    return doc_html.replace(
        f'<script src="{MERMAID_CDN_URLS[0]}"></script>',
        inline,
    )


def _load_template(name: str) -> str:
    """ref-pipeline/template/ 아래의 HTML 템플릿을 읽어 반환한다.

    템플릿 부재는 빌드 실패 원인이므로 명시적 오류를 발생시킨다.
    """
    p = Path(__file__).resolve().parent / "template" / name
    if not p.is_file():
        raise FileNotFoundError(f"template not found: {p}")
    return p.read_text(encoding="utf-8")


HTML_TEMPLATE = _load_template("doc.html")


def _auto_fence_ascii_diagrams(md_text: str) -> str:
    box_chars = BOX_CHARS
    lines = md_text.splitlines()
    out: list[str] = []

    def is_diagram_line(s: str) -> bool:
        if not s.strip():
            return False
        hit = any(ch in box_chars for ch in s)
        if not hit:
            return False
        # Avoid wrapping mermaid fenced blocks or already fenced code
        return True

    i = 0
    in_fence = False
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()

        if stripped.startswith("```"):
            # NOTE: Fence detection is intentionally simple.
            # - Only supports triple-backtick fences (not ~~~)
            # - Does not attempt to handle nested/imbalanced fences inside fenced blocks
            in_fence = not in_fence
            out.append(line)
            i += 1
            continue

        if in_fence:
            out.append(line)
            i += 1
            continue

        if is_diagram_line(line):
            start = i
            j = i
            while j < len(lines):
                if is_diagram_line(lines[j]) or lines[j].strip() == "":
                    j += 1
                    continue
                break

            block = lines[start:j]
            while block and block[0].strip() == "":
                block.pop(0)
            while block and block[-1].strip() == "":
                block.pop()

            # Require at least 2 non-empty lines with box chars to avoid
            # false positives on single occurrences like "│" in prose.
            diagram_line_count = sum(1 for b in block if any(ch in box_chars for ch in b))
            if diagram_line_count >= 2:
                out.append("```text")
                out.extend(block)
                out.append("```")
            else:
                out.extend(block)
            i = j
            continue

        out.append(line)
        i += 1

    return "\n".join(out) + ("\n" if md_text.endswith("\n") else "")


def _inline_mermaid_fences(md_text: str) -> str:
    """Convert ```mermaid fences into raw HTML blocks before markdown conversion.

    This prevents codehilite/pygments from tokenizing mermaid source (which can
    destroy whitespace and make it impossible to reconstitute the original diagram).
    """

    # Keep it simple: only support triple-backtick fences.
    lines = md_text.splitlines()
    out: list[str] = []
    i = 0
    in_mermaid = False
    buf: list[str] = []

    # Replace unsafe label text inside node definitions to avoid mermaid grammar conflicts.
    # Examples we need to handle (from mermaid.md):
    #   EL[ebest_live.py\nrun_...\n(orchestrator)]
    #   tee[tee (--tee/--no-tee)]
    #   B[Unpack tick_norm depth -> raw keys (best-effort)]
    # Match at token boundaries only (avoid rewriting inside already-quoted labels).
    # FIX: 레이블이 이미 "..." 또는 '...' 로 감싸인 경우(예: ID["label"])를
    # 다시 처리하지 않도록 lookahead로 제외한다.
    # 패턴: ID[ 다음이 " 또는 ' 로 시작하면 이미 따옴표 처리 완료 → 스킵.
    node_pat_sq  = re.compile(r'(?P<prefix>^|[^A-Za-z0-9_"\'])'
                               r'(?P<id>[A-Za-z_][A-Za-z0-9_]*)'
                               r'\[(?!["\'])(?P<label>[^\]]*?)\]')
    node_pat_par = re.compile(r'(?P<prefix>^|[^A-Za-z0-9_"\'])'
                               r'(?P<id>[A-Za-z_][A-Za-z0-9_]*)'
                               r'\((?!["\'\x00\[])(?P<label>[^\)]*?)\)')
    node_pat_cur = re.compile(r'(?P<prefix>^|[^A-Za-z0-9_"\'])'
                               r'(?P<id>[A-Za-z_][A-Za-z0-9_]*)'
                               r'\{(?!["\'\x00])(?P<label>[^\}]*?)\}')

    def _sanitize_label(label: str) -> str:
        s = label
        # \n → <br/>
        s = s.replace("\\n", "<br/>")
        s = s.replace("->", "→")
        # " → ' (레이블이 ["label"] 큰따옴표로 감싸이므로 내부 " 는 ' 로)
        s = s.replace('"', "'")
        # -- → — (mermaid 링크 구문과 충돌 방지)
        s = s.replace("--", "—")
        # [ ] → 유니코드 전각 대괄호 ［ ］ (U+FF3B, U+FF3D)
        # &#91;/&#93; HTML 엔티티는 safe_src.replace("&","&amp;") 에 의해
        # &amp;#91; 로 이중인코딩되어 브라우저가 &#91; 리터럴로 표시하므로 사용 금지.
        # 유니코드 전각 대괄호는 인코딩 문제 없이 mermaid 레이블에 안전하게 표시됨.
        s = s.replace("]", "］")
        s = s.replace("[", "［")
        return s

    def sanitize_mermaid_line(line: str, diagram_type: str = '') -> str:
        # Mermaid does not reliably support "\\n" escapes inside labels; use <br/>.
        line = line.replace("\\n", "<br/>")

        _cur_diagram_type = diagram_type

        # Sanitize edge labels written as |label| (flowchart links)
        # FIX: |"label"| 형태(이미 큰따옴표로 감싸진 엣지 레이블)는 그대로 유지.
        # |label| 형태(따옴표 없는 것)만 _sanitize_label 처리.
        # 이유: _sanitize_label의 " → ' 변환이 |"label"| → |'label'| 로 만들어
        # mermaid 파서가 ' 를 구분자로 오해하여 파싱 오류 발생.
        # FIX2: |label| 문법은 flowchart/graph/stateDiagram 전용 — erDiagram의
        # 카디널리티(||--||, }o--o{ 등)가 \|...\|에 오매칭되어 -- → — 로 파괴됨.
        def _edge_label_repl(m: re.Match) -> str:
            inner = m.group(1)
            # 이미 큰따옴표로 감싸진 경우: |"label"| → 그대로 유지
            if inner.startswith('"') and inner.endswith('"'):
                return f"|{inner}|"
            # 따옴표 없는 경우만 sanitize
            sanitized = _sanitize_label(inner)
            # ( ) 는 Mermaid 렉서가 PS(stadium) 토큰으로 오해석 → 전각 괄호로 교체
            sanitized = sanitized.replace("(", "（").replace(")", "）")
            return "|" + sanitized + "|"

        if _cur_diagram_type in ('', 'flowchart', 'graph', 'stateDiagram', 'stateDiagram-v2'):
            line = re.sub(r"\|([^|]+)\|", _edge_label_repl, line)

        # quadrantChart 전용: title/x-axis/y-axis/quadrant-N 라인 처리.
        # ★ diagram_type 체크 필수 — xychart-beta 등 다른 다이어그램의
        #   x-axis/y-axis 문법은 완전히 달라 이 처리를 적용하면 파싱 오류 발생.
        _s_stripped = line.lstrip()
        _indent_qc  = line[: len(line) - len(_s_stripped)]

        if _cur_diagram_type == 'quadrantChart':
            # title: 그대로 유지 (lexer가 [^\n]* 로 읽어 한글 OK)
            if _s_stripped.startswith('title '):
                return line

            # x-axis / y-axis: 각 라벨을 따옴표로 감싸기
            # quadrantChart x-axis 문법: X_AXIS STR --> STR | X_AXIS STR
            for _kw in ('x-axis', 'y-axis'):
                if _s_stripped.startswith(_kw):
                    _rest = _s_stripped[len(_kw):].strip()
                    if '-->' in _rest:
                        _left, _right = _rest.split('-->', 1)
                        _left  = _left.strip().strip('"').strip("'")
                        _right = _right.strip().strip('"').strip("'")
                        return f'{_indent_qc}{_kw} "{_left}" --> "{_right}"'
                    else:
                        _label = _rest.strip().strip('"').strip("'")
                        return f'{_indent_qc}{_kw} "{_label}"' if _label else line

            # quadrant-N: 라벨을 따옴표로 감싸기
            _qn_m = re.match(r'(quadrant-[1-4])\s+(.*)', _s_stripped)
            if _qn_m:
                _qn   = _qn_m.group(1)
                _qlbl = _qn_m.group(2).strip().strip('"').strip("'")
                return f'{_indent_qc}{_qn} "{_qlbl}"'

        # Special-case subgraph headers: keep syntax but quote the label if it uses bracket label forms.
        s = line.lstrip()
        if s.startswith("subgraph "):
            # 이미 큰따옴표로 감싸진 레이블 subgraph ID["label"] 은 그대로 유지 (재처리 금지)
            if re.match(r'^\s*subgraph\s+[A-Za-z_][A-Za-z0-9_]*\["', line):
                return line
            # 따옴표 없는 레이블을 큰따옴표로 감싸기
            m_sq = re.match(r"^(\s*)subgraph\s+([A-Za-z_][A-Za-z0-9_]*)\[([^\"'].*)\]\s*$", line)
            if m_sq:
                indent, sid, label = m_sq.groups()
                return f'{indent}subgraph {sid}["{_sanitize_label(label)}"]'
            m_par = re.match(r"^(\s*)subgraph\s+([A-Za-z_][A-Za-z0-9_]*)\(([^\"'].*)\)\s*$", line)
            if m_par:
                indent, sid, label = m_par.groups()
                return f'{indent}subgraph {sid}["{_sanitize_label(label)}"]'
            m_cur = re.match(r"^(\s*)subgraph\s+([A-Za-z_][A-Za-z0-9_]*)\{([^\"'].*)\}\s*$", line)
            if m_cur:
                indent, sid, label = m_cur.groups()
                return f'{indent}subgraph {sid}["{_sanitize_label(label)}"]'
            return line

        def repl_sq(m: re.Match) -> str:
            prefix = m.group('prefix')
            node_id = m.group('id')
            label = _sanitize_label(m.group('label'))
            return f"{prefix}{node_id}[\"{label}\"]"

        def repl_par(m: re.Match) -> str:
            prefix = m.group('prefix')
            node_id = m.group('id')
            label = _sanitize_label(m.group('label'))
            return f"{prefix}{node_id}(\"{label}\")"

        def repl_cur(m: re.Match) -> str:
            prefix = m.group('prefix')
            node_id = m.group('id')
            label = _sanitize_label(m.group('label'))
            return f"{prefix}{node_id}{{\"{label}\"}}"

        # flowchart 노드 문법(id[label], id(label), id{label})을 쓰지 않는
        # 다이어그램 타입은 node_pat 치환을 완전히 건너뜀.
        #
        # sequenceDiagram : E->>D: text 메시지가 node_pat_par 에 오매칭됨
        # xychart-beta    : x-axis/y-axis 배열 구문 충돌
        # quadrantChart   : x-axis/y-axis/title 특수 문법
        # timeline        : 'generate()' 같은 텍스트가 generate("") 로 오변환됨
        # gantt           : 태스크 이름이 node_pat 과 우연히 매칭될 수 있음
        # mindmap         : 들여쓰기 트리 구조, 노드 문법 없음
        # sankey-beta     : CSV 형식, 노드 문법 없음
        # block-beta / packet-beta / architecture-beta : 별도 문법
        skip_node_pat = diagram_type in (
            'sequenceDiagram', 'xychart-beta', 'quadrantChart',
            'timeline', 'gantt', 'mindmap', 'sankey-beta',
            'block-beta', 'packet-beta', 'architecture-beta',
            'classDiagram',   # 메서드 시그니처 id(params)가 flowchart node_pat에 오매칭됨
        )
        if not skip_node_pat:
            # ★ BUG FIX: node_pat_par/cur 는 ["..."] 내부까지 재처리한다.
            # 예: G["분류 헤드 Linear(64→32)"] → Linear(64→32) 를 별개 노드로 오인해
            #     G["분류 헤드 Linear('64→32')"] 로 변환 → Mermaid parse failed.
            #
            # 해결: 이미 ["..."] 로 감싸진 구간을 플레이스홀더로 보호 후 node_pat 적용,
            #       이후 원래 텍스트로 복원한다.
            _ph_map: dict[str, str] = {}
            _ph_counter = [0]

            def _protect_quoted_label(m: re.Match) -> str:
                key = f"\x00PH{_ph_counter[0]}\x00"
                _ph_map[key] = m.group(0)
                _ph_counter[0] += 1
                return key

            # 따옴표 레이블 구간 보호: ["..."], ("..."), {"..."}, [("...")],
            # {{"..."}}, (("...")), >"..."], [/"..."/] 등 모든 셰이프.
            # 열림 기호 연속 + "..." + 닫힘 기호 연속을 통째로 보호해야
            # 레이블 내부의 foo() 같은 텍스트가 node_pat_par에 오매칭되지 않고
            # [("...")] 실린더 형태도 유지된다.
            # 주의: 레이블 밖의 따옴표(예: A[foo "bar" baz] 내부)는 보호하지 않아
            # _sanitize_label의 " → ' 치환이 계속 동작한다.
            protected = re.sub(
                r'[\[({>/\\]+"[^"]*?"[\])}/\\\]]*'
                r'|"[^"]*?"(?=\s*(?:-->|---|==>|==|-\.-|\.->))',
                _protect_quoted_label, line)

            protected = node_pat_sq.sub(repl_sq, protected)
            protected = node_pat_par.sub(repl_par, protected)
            protected = node_pat_cur.sub(repl_cur, protected)

            # 플레이스홀더 복원
            for key, val in _ph_map.items():
                protected = protected.replace(key, val)

            line = protected
        return line

    cur_diagram_type = ''
    while i < len(lines):
        line = lines[i]
        if not in_mermaid:
            # Accept ```mermaid with trailing spaces and any casing.
            if re.match(r"^```\s*mermaid\s*$", line.strip(), flags=re.IGNORECASE):
                in_mermaid = True
                buf = []
                raw_buf = []   # 원본 라인 보존 (fallback용)
                cur_diagram_type = ''  # 블록 시작 시 초기화
                i += 1
                continue
            out.append(line)
            i += 1
            continue

        # in mermaid fence
        if line.strip() == "```":
            _is_quadrant  = (cur_diagram_type == 'quadrantChart')

            # sanitize_mermaid_line 이 '' 를 반환한 라인 제거
            src = "\n".join(ln for ln in buf if ln != '')
            safe_src = html.escape(src, quote=False)
            # 후처리: 이미 ["label"] 로 감싸인 노드 레이블 내부의 " 를 ' 로 교체.
            # node_pat_sq lookahead 가 건너뛴 케이스 대응.
            # xychart x-axis/y-axis 배열 형태 ["a","b","c"] 는 제외.
            # 탐욕적 매칭(.*?)으로 ["...최초..."] 전체를 캡처한다.
            def _fix_inner_quotes(line: str) -> str:
                stripped = line.lstrip()
                # quadrantChart 의 x-axis/y-axis/quadrant-N/title 라인:
                # sanitize_mermaid_line 에서 따옴표 배치 완료 → 재처리 금지.
                if _is_quadrant and (
                        stripped.startswith('x-axis') or
                        stripped.startswith('y-axis') or
                        stripped.startswith('title ') or
                        re.match(r'quadrant-[1-4]\b', stripped)):
                    return line
                # xychart x-axis/y-axis: ["a","b","c"] 배열 구문 보호.
                # _fix_inner_quotes 가 배열 내부 " → ' 로 바꾸면 파싱 실패.
                if stripped.startswith('x-axis') or stripped.startswith('y-axis'):
                    return line
                # ["..."] 패턴을 탐욕적으로 찾아 내부 " → '
                # 단, --> |"label"| 엣지 레이블의 경우도 보호 필요
                result = []
                pos = 0
                while pos < len(line):
                    # [" 시작 탐색
                    open_idx = line.find('["', pos)
                    if open_idx == -1:
                        result.append(line[pos:])
                        break
                    result.append(line[pos:open_idx + 2])  # [" 포함
                    inner_start = open_idx + 2
                    # "] 종료 탐색 — 첫 번째 "] 사용 (레이블 내부 "]가 없는
                    # 일반적인 형태를 가정; find는 첫 매칭을 반환한다)
                    close_idx = line.find('"]', inner_start)
                    if close_idx == -1:
                        result.append(line[inner_start:])
                        break
                    inner = line[inner_start:close_idx]
                    # 내부 " → ' (단, HTML 엔티티 &quot; 는 보호)
                    inner = inner.replace('"', "'")
                    inner = inner.replace('<', '&lt;')
                    result.append(inner + '"]')
                    pos = close_idx + 2
                return ''.join(result)

            safe_src = '\n'.join(_fix_inner_quotes(fl) for fl in safe_src.split('\n'))
            out.append(f"<div class=\"mermaid\">{safe_src}</div>")
            in_mermaid = False
            buf = []
            i += 1
            continue

        # 첫 번째 라인(다이어그램 타입 선언)을 감지해 node_pat 스킵 여부 결정.
        # e.g. "sequenceDiagram", "xychart-beta", "quadrantChart" 등.
        stripped_line = line.strip()
        if not buf:  # 블록의 첫 번째 라인
            cur_diagram_type = stripped_line.split()[0] if stripped_line else ''
        raw_buf.append(line)
        buf.append(sanitize_mermaid_line(line, cur_diagram_type))
        i += 1

    # Unterminated fence: fall back to the ORIGINAL lines — buf에는
    # sanitize 결과가 들어 있으므로 폴백에는 raw_buf를 써야 원본이 보존된다.
    if in_mermaid:
        out.append("```mermaid")
        out.extend(raw_buf)

    return "\n".join(out) + ("\n" if md_text.endswith("\n") else "")


def _normalize_diagram_codeblocks(md_text: str) -> str:
    """Normalize whitespace/unicode inside box-drawing diagram code blocks.

    This targets cases where the MD itself looks misaligned due to tabs,
    non-breaking spaces, or full-width spaces inside the diagram.
    """

    box_chars = BOX_CHARS
    lines = md_text.splitlines()
    out: list[str] = []

    i = 0
    in_fence = False
    fence_lang = ""
    fence_has_box = False

    def normalize_line(s: str) -> str:
        s = unicodedata.normalize("NFKC", s)
        s = s.replace("\t", "    ")
        s = s.replace("\u00a0", " ")
        s = s.replace("\u3000", "  ")
        return s

    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()

        if stripped.startswith("```"):
            if not in_fence:
                in_fence = True
                fence_lang = stripped[3:].strip().lower()
                fence_has_box = False
                out.append(line)
            else:
                in_fence = False
                fence_lang = ""
                fence_has_box = False
                out.append(line)
            i += 1
            continue

        if in_fence:
            if any(ch in box_chars for ch in line):
                fence_has_box = True
            # Only normalize if this looks like a diagram fence.
            if fence_lang in ("", "text") or fence_has_box:
                out.append(normalize_line(line))
            else:
                out.append(line)
            i += 1
            continue

        out.append(line)
        i += 1

    return "\n".join(out) + ("\n" if md_text.endswith("\n") else "")


def _tag_fenced_diagram_blocks_as_text(md_text: str) -> str:
    """If a fenced code block has no language and contains box-drawing chars,
    tag it as ```text to avoid unwanted syntax highlighting and font fallback."""

    box_chars = BOX_CHARS
    lines = md_text.splitlines()
    out: list[str] = []

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()

        if stripped.startswith("```"):
            fence = stripped
            lang = fence[3:].strip()
            if lang:
                out.append(line)
                i += 1
                continue

            # No language specified: look ahead until closing fence
            j = i + 1
            has_box = False
            while j < len(lines):
                if lines[j].lstrip().startswith("```"):
                    break
                if any(ch in box_chars for ch in lines[j]):
                    has_box = True
                j += 1

            if has_box:
                # Preserve original indentation
                prefix = line[: len(line) - len(stripped)]
                out.append(prefix + "```text")
            else:
                out.append(line)

            i += 1
            continue

        out.append(line)
        i += 1

    return "\n".join(out) + ("\n" if md_text.endswith("\n") else "")


# === Mermaid 사전렌더 SVG 캐시 ===
# 다이어그램 소스(테마 포함) 해시를 키로 ref-pipeline/.mermaid_cache/에
# SVG를 저장 — 재빌드 시 네트워크 요청 없이 즉시 재사용한다.
# 렌더러 출력이 바뀌어 캐시를 무효화해야 할 때는 SALT를 올린다.
_MERMAID_CACHE_SALT = "mermaid.ink:default:ffffff:v1"


def _mermaid_cache_dir() -> Path:
    return Path(__file__).resolve().parent / ".mermaid_cache"


def _mermaid_cache_key(src: str, renderer: str = "mermaid.ink") -> str:
    # 렌더러를 키에 포함 — mermaid.ink와 kroki 폴백은 같은 소스에서
    # 다른 SVG를 생성하므로, 분리하지 않으면 먼저 성공한 렌더러의 출력이
    # 캐시에 고착되어 환경별 결과가 달라진다.
    return hashlib.sha256(
        (_MERMAID_CACHE_SALT + "\x00" + renderer + "\x00" + src).encode("utf-8")
    ).hexdigest()


def _mermaid_cache_read(src: str, renderer: str = "mermaid.ink") -> str | None:
    try:
        p = _mermaid_cache_dir() / (_mermaid_cache_key(src, renderer) + ".svg")
        if p.is_file():
            text = p.read_text(encoding="utf-8")
            if text.strip().startswith("<svg") and "</svg>" in text:
                return text
    except Exception as e:
        logger.warning("[mermaid-cache] read failed: %s", e)
    return None


def _mermaid_cache_write(src: str, svg: str, renderer: str = "mermaid.ink") -> None:
    try:
        d = _mermaid_cache_dir()
        d.mkdir(parents=True, exist_ok=True)
        (d / (_mermaid_cache_key(src, renderer) + ".svg")).write_text(svg, encoding="utf-8")
    except Exception as e:
        logger.warning("[mermaid-cache] write failed: %s", e)


def _sanitize_svg(svg: str) -> str:
    """외부 렌더러(mermaid.ink/kroki) 응답의 실행 가능 요소를 제거한다.

    신뢰 경계 주의: 이 함수는 알려진 렌더러 응답에 대한 최소 살균이며
    임의 SVG 입력에 대한 범용 새니타이저가 아니다. <script>·on* 핸들러·
    javascript:/vbscript: href를 제거한다.
    """
    svg = re.sub(r"<script[\s\S]*?</script>", "", svg, flags=re.IGNORECASE)
    svg = re.sub(r'\son\w+\s*=\s*"[^"]*"', "", svg)
    svg = re.sub(r"\son\w+\s*=\s*'[^']*'", "", svg)
    svg = re.sub(
        r'(\s(?:xlink:)?href\s*=\s*["\'])\s*(?:javascript|vbscript)\s*:[^"\']*(["\'])',
        r"\1#\2",
        svg,
        flags=re.IGNORECASE,
    )
    return svg


def _prerender_mermaid_to_svg(html_body: str, progress_cb=None, allow_network: bool = True) -> str:
    """Replace all <div class="mermaid">...</div> with inline SVG from mermaid.ink.

    Uses the mermaid.ink render API to pre-render diagrams at build time.
    Falls back to the original div (for client-side rendering) if the API fails.
    progress_cb(current, total, status) is called for each diagram if provided.

    소스 해시 디스크 캐시(.mermaid_cache/)로 재빌드 시 네트워크 요청을 생략하고,
    프로세스 내 dedupe로 동일 다이어그램 중복 렌더링도 막는다.
    allow_network=False면 캐시 조회만 하고 네트워크 요청은 하지 않는다.
    """
    pattern = re.compile(r'<div class="mermaid">([\s\S]*?)</div>', re.IGNORECASE)
    matches = list(pattern.finditer(html_body))
    total = len(matches)
    if total == 0:
        return html_body

    # 진행 표시용 라벨 (다이어그램 소스 첫 줄)
    labels = [html.unescape(m.group(1)).strip().split('\n')[0][:60] for m in matches]

    # 회로 차단 — mermaid.ink가 한 번 완전히 실패하면 나머지 다이어그램은
    # 재시도 비용 없이 바로 kroki 폴백으로 간다 (문서 단위 플래그).
    ink_down = {"v": False}

    def _fetch_svg(src: str, label: str = "") -> str | None:
        # 렌더러별 캐시 — 주 렌더러 키를 먼저 조회하고 폴백 키도 확인
        for renderer in ("mermaid.ink", "kroki"):
            svg = _mermaid_cache_read(src, renderer)
            if svg is not None:
                return svg

        if not allow_network:
            return None  # 오프라인 모드 — 캐시 미스는 클라이언트 렌더링 폴백

        svg = None
        renderer_used = None
        last_err = None

        if not ink_down["v"]:
            # 메인 웹앱(src/mermaid-utils.js)과 동일한 전략:
            # mindmap은 항상 'default' 테마로 렌더링 (밝은 파스텔 배경 + 어두운 텍스트).
            # dark 테마는 노드 배경이 어두워져 텍스트 대비가 급격히 저하됨.
            # flowchart 등 다른 타입도 동일하게 default로 렌더링하여
            # 다크 페이지 위에서 "밝은 카드"처럼 표시.
            # 모든 다이어그램을 default 테마로 렌더링
            encoded = base64.urlsafe_b64encode(src.encode("utf-8")).decode("ascii")
            url = f"https://mermaid.ink/svg/{encoded}?theme=default&bgColor=ffffff"

            for _attempt in range(4):
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        svg = resp.read().decode("utf-8", errors="replace")
                    if svg and svg.strip().startswith("<svg") and "</svg>" in svg:
                        renderer_used = "mermaid.ink"
                        break
                    svg = None
                    last_err = "empty/invalid SVG response"
                except Exception as e:
                    last_err = e
                    svg = None
                if _attempt < 3:
                    # 503 레이트리밋 대비 지터 백오프 (워커 간 요청 분산)
                    time.sleep(1.5 * (_attempt + 1) + random.random())

            if svg is None:
                ink_down["v"] = True  # 이후 다이어그램은 kroki로 직행

        if svg is None:
            # Fallback renderer: kroki.io (deflate + base64url path encoding).
            # Transparent-background SVG sits on .mermaid-img's own background.
            kdata = base64.urlsafe_b64encode(
                zlib.compress(src.encode("utf-8"), 9)
            ).decode("ascii")
            kurl = f"https://kroki.io/mermaid/svg/{kdata}"
            for _kattempt in range(2):
                try:
                    req = urllib.request.Request(kurl, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        cand = resp.read().decode("utf-8", errors="replace")
                    if cand and cand.strip().startswith("<svg") and "</svg>" in cand:
                        svg = cand
                        renderer_used = "kroki"
                        break
                except Exception as e:
                    last_err = e
                    if _kattempt == 0:
                        time.sleep(1.0)

        if svg is None:
            logger.warning("[Mermaid pre-render failed] %s: %s", label, last_err)
            return None

        # 렌더러 응답의 실행 가능 요소 제거 (XSS 방어)
        svg = _sanitize_svg(svg)
        _mermaid_cache_write(src, svg, renderer_used)
        return svg

    # 동일 소스의 중복 렌더링은 제출 단계에서 dedupe — 워커 간 check-then-set
    # 경합으로 같은 다이어그램을 두 번 렌더링하는 레이스를 원천 차단한다.
    srcs = [html.unescape(m.group(1)).strip() for m in matches]
    unique_srcs = list(dict.fromkeys(s for s in srcs if s))
    first_label = {}
    for i, s in enumerate(srcs):
        if s not in first_label:
            first_label[s] = labels[i]

    rendered: dict[str, str | None] = {}
    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_map = {
            pool.submit(_fetch_svg, s, first_label[s]): s for s in unique_srcs
        }
        done = 0
        for fut in as_completed(fut_map):
            s = fut_map[fut]
            try:
                rendered[s] = fut.result()
            except Exception:
                rendered[s] = None
            done += 1
            if progress_cb:
                try:
                    progress_cb(done, total, first_label[s])
                except Exception:
                    pass

    # SVG를 <img> 태그로 인라인 임베드하여 외부 CSS의 영향을
    # 완전히 차단. data: URI로 인라인 SVG를 사용하면 다크/라이트
    # 모드 전환과 무관하게 SVG 자체 색상이 유지됨.
    replacements: list[str] = []
    for i, m in enumerate(matches):
        svg = rendered.get(srcs[i])
        if svg:
            svg_b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
            replacements.append(
                f'<div class="mermaid-img">'
                f'<img src="data:image/svg+xml;base64,{svg_b64}"'
                f' alt="Mermaid diagram" />'
                f"</div>"
            )
        else:
            # Fallback: keep original div for client-side rendering
            replacements.append(m.group(0))

    result = []
    last_end = 0
    for idx, m in enumerate(matches):
        result.append(html_body[last_end:m.start()])
        result.append(replacements[idx])
        last_end = m.end()
    result.append(html_body[last_end:])

    if progress_cb:
        try:
            progress_cb(total, total, "done")
        except Exception:
            pass

    return "".join(result)


def _build_markdown(toc_permalink: bool = True) -> markdown.Markdown:
    """독립 HTML·인쇄 경로가 공유하는 Markdown 변환기를 생성한다.

    확장 목록은 두 경로에서 동일해야 변환 결과가 드리프트하지 않는다 —
    toc permalink만 경로별로 다르다(독립 HTML=앵커 아이콘, 인쇄=없음).
    """
    return markdown.Markdown(
        extensions=[
            "fenced_code",
            "tables",
            "toc",
            "codehilite",
            "admonition",
            "attr_list",
            "md_in_html",
        ],
        extension_configs={
            "codehilite": {
                "css_class": "highlight",
                "linenums": False,
            },
            "toc": {
                "permalink": toc_permalink,
                "toc_depth": "2-4",
            },
        },
    )


def _build_heading_map(toc_html_str: str) -> dict:
    """toc_html에서 {헤딩텍스트: id} 매핑을 추출한다."""
    mapping = {}
    if not toc_html_str:
        return mapping
    for m in re.finditer(r'<a\s+href="#([^"]+)"[^>]*>(.*?)</a>', toc_html_str, re.DOTALL):
        hid = m.group(1)
        htext = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        if htext and hid:
            mapping[htext] = hid
    return mapping


def _find_heading_id(plain_text: str, heading_map: dict) -> str | None:
    """plain_text와 매칭되는 헤딩 id를 찾는다.

    정확 매칭 → 공백 무시 매칭 → 부분 매칭 순. 부분 매칭은 링크 텍스트가
    4자 이상이고 후보가 유일할 때만 인정한다 — 애매한 매칭으로 엉뚱한
    헤딩에 연결하는 것보다 원래의 죽은 링크를 유지하는 편이 안전하다.
    """
    if not plain_text:
        return None
    for htext, hid in heading_map.items():
        if plain_text == htext:
            return hid
    norm = lambda s: re.sub(r"\s+", "", s)
    for htext, hid in heading_map.items():
        if norm(plain_text) == norm(htext):
            return hid
    if len(plain_text) < 4:
        return None
    hits = {
        hid for htext, hid in heading_map.items()
        if plain_text in htext or htext in plain_text
    }
    return hits.pop() if len(hits) == 1 else None


def _linkify_inline_toc(body_html: str, heading_map: dict) -> str:
    """본문의 목차 항목을 하이퍼링크로 변환/수정.
    1) •로 시작하는 일반 텍스트 항목 → <a href="#id">로 변환
    2) <ol>/<ul> 안의 <li><a> 항목 중 href가 잘못된 경우 → 올바른 id로 수정
       (소스 마크다운이 GitHub식 슬러그를 쓰면 python-markdown의 실제 id와
       불일치해 PDF 내부 링크가 끊긴다 — 텍스트 매칭으로 교정)
    '목차'/'차례'/'TOC'/'Table of Contents'를 포함하는 h1~h4 헤딩 아래의
    첫 번째 블록만 처리한다."""
    if not heading_map:
        return body_html

    def _linkify_p_content(p_attrs: str, content: str) -> str:
        if '•' not in content:
            return f'<p{p_attrs}>{content}</p>'
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            stripped = line.lstrip()
            if not stripped.startswith('•'):
                new_lines.append(line)
                continue
            after_bullet = stripped[1:].strip()
            plain = re.sub(r'<[^>]+>', '', after_bullet).strip()
            matched_id = _find_heading_id(plain, heading_map)
            if matched_id:
                new_line = line.replace(
                    after_bullet,
                    f'<a href="#{matched_id}">{after_bullet}</a>',
                    1,
                )
                new_lines.append(new_line)
            else:
                new_lines.append(line)
        return f'<p{p_attrs}>{chr(10).join(new_lines)}</p>'

    def _fix_list_links(tag: str, attrs: str, content: str) -> str:
        """<ol>/<ul> 안의 <li><a href="#잘못된-id"> 텍스트</a>에서
        텍스트를 헤딩과 매칭하여 올바른 id로 수정한다."""
        def _fix_a_tag(m: re.Match) -> str:
            href = m.group(1)
            text = m.group(2)
            # 텍스트에서 HTML 태그 제거
            plain = re.sub(r'<[^>]+>', '', text).strip()
            matched_id = _find_heading_id(plain, heading_map)
            if matched_id:
                return f'<a href="#{matched_id}">{text}</a>'
            return m.group(0)
        return f'<{tag}{attrs}>{re.sub(r"<a\s+href=\"#([^\"]+)\"[^>]*>([\s\S]*?)</a>", _fix_a_tag, content, flags=re.DOTALL)}</{tag}>'

    # 목차 헤딩('목차'/'차례'/'TOC'/'Table of Contents'를 포함하는 h1~h4) 직후의
    # 첫 번째 블록(<p>, <ol> 또는 <ul>)만 변환.
    # 헤딩은 전체를 캡처한 뒤 태그를 벗긴 텍스트로 판정한다 — <em>목차</em> 같은
    # 인라인 태그나 toc permalink 마크업이 섞여 있어도 인식되도록.
    toc_kw = re.compile(r'목차|차례|toc|table\s+of\s+contents', re.IGNORECASE)
    pattern = re.compile(
        r'(<h([1-4])[^>]*>[\s\S]*?</h\2>\s*)'
        r'(?:<p([^>]*)>([\s\S]*?)</p>|<(ol|ul)([^>]*)>([\s\S]*?)</\5>)',
        re.IGNORECASE | re.DOTALL,
    )

    def _toc_heading_replacer(m: re.Match) -> str:
        heading = m.group(1)
        heading_text = re.sub(r'<[^>]+>', '', heading)
        if not toc_kw.search(heading_text):
            return m.group(0)
        if m.group(3) is not None:  # <p> 블록
            return heading + _linkify_p_content(m.group(3), m.group(4))
        elif m.group(5) is not None:  # <ol>/<ul> 블록
            return heading + _fix_list_links(m.group(5), m.group(6), m.group(7))
        return m.group(0)

    return pattern.sub(_toc_heading_replacer, body_html)


def _repair_dead_fragment_links(body_html: str, heading_map: dict) -> str:
    """존재하지 않는 id를 가리키는 본문 내 프래그먼트 링크를 복구한다.

    소스 마크다운의 내부 링크가 GitHub식 슬러그(#첫-번째-섹션) 등 생성된
    헤딩 id와 다른 값을 가리키면, 독립 HTML에서는 아무 일도 안 일어나고
    PDF에서는 클릭 불능 링크가 된다. 링크 텍스트가 헤딩과 매칭되면
    실제 id로 재작성한다 — 살아 있는 링크와 매칭 실패 링크는 그대로 둔다.
    """
    if not heading_map:
        return body_html
    existing_ids = set(re.findall(r'\bid="([^"]+)"', body_html))

    def _fix(m: re.Match) -> str:
        frag = m.group(1)
        if not frag or frag in existing_ids:
            return m.group(0)
        text = m.group(2)
        plain = re.sub(r'<[^>]+>', '', text).strip()
        matched_id = _find_heading_id(plain, heading_map)
        if matched_id:
            return f'<a href="#{matched_id}">{text}</a>'
        return m.group(0)

    return re.sub(
        r'<a\s+href="#([^"]*)"[^>]*>([\s\S]*?)</a>',
        _fix,
        body_html,
        flags=re.DOTALL,
    )


def markdown_to_tailwind_html(md_text: str, title: str = "Document", config: RenderConfig | None = None, progress_cb=None, base_dir: Path | None = None) -> str:
    config = config or RenderConfig()
    md_text = _auto_fence_ascii_diagrams(md_text)
    md_text = _tag_fenced_diagram_blocks_as_text(md_text)
    md_text = _normalize_diagram_codeblocks(md_text)
    md_text = _inline_mermaid_fences(md_text)
    md = _build_markdown(toc_permalink=True)

    html_body = md.convert(md_text)
    toc_html = getattr(md, "toc", "") or ""

    # Convert ```mermaid blocks rendered by markdown/codehilite into <div class="mermaid">...</div>
    # Typical output: <pre><code class="language-mermaid">...</code></pre>
    def _mermaid_repl(m: re.Match) -> str:
        inner = m.group(1)
        src = html.unescape(inner)
        return f"<div class=\"mermaid\">{src}</div>"

    html_body = re.sub(
        r"<pre><code class=\"language-mermaid\">([\s\S]*?)</code></pre>",
        _mermaid_repl,
        html_body,
        flags=re.IGNORECASE,
    )

    # Wrap all <table> elements in a scrollable container so wide tables
    # scroll horizontally instead of pushing the page wider than the viewport.
    html_body = re.sub(
        r"(<table\b(?![^>]*class=\"table-wrap\")[^>]*>.*?</table>)",
        r'<div class="table-wrap">\1</div>',
        html_body,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # Classify blockquotes into high-contrast, beautiful callout cards
    callout_rules = _resolve_callout_rules(config.callout_rules_file)

    def _classify_blockquote(m: re.Match) -> str:
        tag_attrs = m.group(1)
        content = m.group(2)
        cls = "callout-card"
        for rule_cls, keywords in callout_rules:
            if any(kw in content for kw in keywords):
                cls += f" {rule_cls}"
                break
        return f'<blockquote class="{cls}"{tag_attrs}>{content}</blockquote>'

    html_body = re.sub(
        r'<blockquote([^>]*)>([\s\S]*?)</blockquote>',
        _classify_blockquote,
        html_body,
        flags=re.IGNORECASE,
    )

    # Pre-render Mermaid diagrams to inline SVG at build time (mobile mode).
    # This eliminates all client-side JS dependency — diagrams work on any
    # mobile browser without loading the 3.4MB mermaid.min.js library.
    # Skipped in PC mode for lighter HTML; Mermaid renders client-side via CDN.
    if config.prerender_mermaid:
        html_body = _prerender_mermaid_to_svg(
            html_body, progress_cb=progress_cb, allow_network=config.allow_network
        )

    # 본문 내 일반 텍스트 목차(• 항목)를 하이퍼링크로 변환하고,
    # 목차 블록 안 <a>의 깨진 href도 실제 헤딩 id로 교정한다.
    # 추가로 목차 블록 밖의 깨진 프래그먼트 링크도 텍스트 매칭으로 복구한다.
    heading_map = _build_heading_map(toc_html)
    html_body = _linkify_inline_toc(html_body, heading_map)
    html_body = _repair_dead_fragment_links(html_body, heading_map)

    doc_html = HTML_TEMPLATE
    # 제목에 <, >, & 등이 있어도 <title>/헤더 마크업이 깨지지 않도록 이스케이프.
    doc_html = doc_html.replace("%%TITLE%%", html.escape(title))
    # 빌드 표시: 구버전/신버전 파일 구별용 (모바일 전송 파일 혼동 방지).
    # 시각 대신 입력 해시를 쓴다 — 동일 입력 → 동일 출력(재현 가능 빌드)이면서
    # 내용이 바뀐 재빌드는 다른 스탬프를 갖는다. SOURCE_DATE_EPOCH가 있으면 우선.
    _epoch = os.environ.get("SOURCE_DATE_EPOCH", "").strip()
    build_id = _epoch if _epoch.isdigit() else hashlib.sha1(
        md_text.encode("utf-8")
    ).hexdigest()[:8]
    doc_html = doc_html.replace("%%BUILD%%", "b" + build_id)
    # TOC 링크는 순수 <a href="#id">로 둔다 — 드로어 자동 닫기는 링크를
    # <label>로 감싸는 방식이 아니라 :target 마커(#tocOpen)로 처리한다.
    # label 안의 <a> 탭은 iOS Safari·JS 차단 뷰어에서 앵커 이동이 삼켜져
    # "목차를 눌러도 이동하지 않는" 오류가 발생했다.
    doc_html = doc_html.replace("%%TOC_HTML%%", toc_html)
    # 템플릿의 JS 안 플레이스홀더는 주석으로 감싸 두어 원본도 유효한 JS가 되게
    # 한다(IDE 정적 분석 오류 방지) — 치환도 주석 포함 형태를 대상으로 한다.
    doc_html = doc_html.replace("/*%%COLLAPSE_MIN_LINES%%*/0", str(int(config.collapse_codeblock_min_lines)))
    doc_html = doc_html.replace("%%MERMAID_CDN_URL%%", MERMAID_CDN_URLS[0])
    doc_html = doc_html.replace(
        "/*%%MERMAID_CDN_URLS_JS%%*/",
        ", ".join(f"'{u}'" for u in MERMAID_CDN_URLS),
    )
    doc_html = doc_html.replace("%%MERMAID_ESM_URL%%", MERMAID_ESM_URL)

    # Embed Mermaid by default so diagrams render on mobile / in-app browsers
    # that fail to load the large CDN script. Best-effort: if the library can't
    # be fetched (offline, no cache), the CDN <script> tag stays as a fallback.
    #
    # 사전 렌더링으로 모든 다이어그램이 <img> SVG로 변환되어
    # <div class="mermaid">가 하나도 남지 않으면 클라이언트 렌더링 경로가
    # 필요 없으므로, ~3.5MB mermaid.min.js를 임베드하는 대신 스크립트 태그
    # 자체를 제거해 생성 파일 크기를 크게 줄인다.
    needs_mermaid_runtime = '<div class="mermaid"' in html_body
    if needs_mermaid_runtime and config.embed_mermaid:
        mm_js = _ensure_mermaid_js(allow_network=config.allow_network)
        if mm_js:
            doc_html = _embed_mermaid_js(doc_html, mm_js)
    elif not needs_mermaid_runtime:
        doc_html = re.sub(
            r'\s*<script src="' + re.escape(MERMAID_CDN_URLS[0]) + r'"></script>',
            '',
            doc_html,
        )

    # 상대경로 이미지를 data URI로 임베드 — 출력 HTML이 MD와 다른 위치에
    # 저장되거나 단독으로 공유돼도 이미지가 깨지지 않도록 자립형을 유지한다.
    if base_dir is not None:
        html_body = _embed_local_images(html_body, Path(base_dir))

    # Verify all template placeholders were substituted before inserting the
    # body — checking at this point also avoids false positives from literal
    # "%%FOO%%" text inside the document body itself.
    leftover = sorted(set(re.findall(r'%%[A-Z][A-Z0-9_]+%%', doc_html)) - {"%%BODY_HTML%%"})
    if leftover:
        raise RuntimeError(f"Unsubstituted template placeholders: {leftover}")

    doc_html = doc_html.replace("%%BODY_HTML%%", html_body)
    return doc_html


def convert_markdown_file(
    in_path: Path,
    out_path: Path | None = None,
    title: str | None = None,
    config: RenderConfig | None = None,
    progress_cb=None,
) -> Path:
    """단일 Markdown 파일을 standalone HTML로 변환·저장하고 출력 경로를 반환한다."""
    md_text = in_path.read_text(encoding="utf-8-sig")
    out_path = out_path or in_path.with_suffix(".html")
    out_html = markdown_to_tailwind_html(
        md_text, title=title or in_path.stem, config=config,
        progress_cb=progress_cb, base_dir=in_path.parent,
    )
    out_path.write_text(out_html, encoding="utf-8")
    return out_path


def _expand_input_paths(patterns: list[str]) -> list[Path]:
    """--in 인자들을 실제 파일 경로 목록으로 확장한다 (glob 패턴 지원)."""
    paths: list[Path] = []
    for pat in patterns:
        matched = glob.glob(pat, recursive=True) if glob.has_magic(pat) else []
        if matched:
            paths.extend(Path(m) for m in sorted(matched))
        elif Path(pat).is_file():
            paths.append(Path(pat))
        else:
            logger.warning("[skip] input not found: %s", pat)

    seen: set[str] = set()
    unique: list[Path] = []
    for p in paths:
        key = str(p.resolve())
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def run_gui(default_pdf: bool = False) -> int:
    """통합 GUI — HTML/PDF 변환을 한 창에서 처리한다.

    인자 없이 실행 시 진입한다. --pdf로 기동하면 PDF 생성이 미리 체크된
    상태로 열린다. 변환은 QObject 워커 + moveToThread로 수행해 UI가
    멈추지 않고, 취소·문서별 결과 테이블·변환 경고 로그를 지원한다
    (pdf2md GUI와 동일한 스레딩/레이아웃 패턴).
    """
    try:
        from PySide6.QtCore import (
            Qt, QThread, QObject, Signal, QUrl, QSettings,
        )
        from PySide6.QtGui import QFont, QDesktopServices
        from PySide6.QtWidgets import (
            QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
            QGridLayout, QLabel, QLineEdit, QPushButton, QCheckBox,
            QListWidget, QPlainTextEdit, QProgressBar, QFileDialog,
            QGroupBox, QTableWidget, QTableWidgetItem, QAbstractItemView,
            QHeaderView, QMessageBox, QSplitter, QStatusBar,
        )
    except ImportError as e:
        raise SystemExit(
            "PySide6 is not available. Install it (pip install PySide6) or run with --cli.\n"
            f"Details: {e}"
        )

    app = QApplication.instance() or QApplication(sys.argv)
    app.setApplicationName('md2doc')
    settings = QSettings("Transformer", "md2doc")

    class ConvertWorker(QObject):
        progress = Signal(int, int)       # (완료 수, 전체 수)
        doc_done = Signal(dict)           # 문서 1건 결과
        log = Signal(str)                 # 로그 한 줄
        finished = Signal(int, int, int)  # (생성 출력 수, 실패 문서 수, 경고 수)
        fatal = Signal(str)               # 치명 오류(스택)

        def __init__(self, paths, out_dir, opts):
            super().__init__()
            self.paths = paths
            self.out_dir = out_dir
            self.opts = opts
            self._cancel = False
            self._warnings = 0

        def cancel(self):
            self._cancel = True

        def run(self):
            try:
                self._run()
            except Exception:
                self.fatal.emit(traceback.format_exc())

        def _dest(self, in_path: Path, suffix: str) -> Path:
            return (
                self.out_dir / (in_path.stem + suffix)
                if self.out_dir else in_path.with_suffix(suffix)
            )

        def _run(self):
            o = self.opts
            generated, fail = [], 0

            # 변환 중 warning(이미지 누락·Mermaid 실패 등)을 로그 뷰로 라우팅
            def _route(m):
                self._warnings += 1
                self.log.emit(f'  ⚠️ {m}')

            handler = _CallbackLogHandler(_route)
            logger.addHandler(handler)
            try:
                total = len(self.paths)
                self.progress.emit(0, total)
                for i, in_path in enumerate(self.paths, 1):
                    if self._cancel:
                        self.log.emit('⏹ 사용자 취소 — 남은 문서 중단')
                        break
                    name = in_path.name
                    self.log.emit(f'[변환 시작] {name}')
                    result = {'doc': name, 'html': None, 'pdf': None,
                              'want_html': o['html'], 'want_pdf': o['pdf'],
                              'status': 'OK', 'paths': []}

                    def cb(cur, tot, label, name=name):
                        self.log.emit(f'  {name}: mermaid {cur}/{tot} — {label}')

                    if o['html']:
                        try:
                            md_text = in_path.read_text(encoding='utf-8-sig')
                            out_html = markdown_to_tailwind_html(
                                md_text, title=in_path.stem,
                                config=o['render_config'],
                                progress_cb=cb, base_dir=in_path.parent,
                            )
                            dest = self._dest(in_path, '.html')
                            dest.write_text(out_html, encoding='utf-8')
                            generated.append(str(dest))
                            result['html'] = str(dest)
                            result['paths'].append(str(dest))
                            self.log.emit(f'[완료] {dest}')
                        except Exception as e:
                            result['status'] = 'FAIL'
                            self.log.emit(f'[오류] {name} (HTML): {e}')

                    if o['pdf']:
                        try:
                            written = convert_markdown_to_pdf(
                                in_path, out_path=self._dest(in_path, '.pdf'),
                                keep_html=o['keep_html'],
                                render_mermaid=not o['no_mermaid'],
                                new_page_h2=o['new_page_h2'],
                                browser=o['browser'] or None,
                                allow_network=o['allow_network'],
                                progress_cb=cb,
                            )
                            generated.append(str(written))
                            result['pdf'] = str(written)
                            result['paths'].append(str(written))
                            self.log.emit(f'[완료] {written}')
                        except Exception as e:
                            result['status'] = 'FAIL'
                            self.log.emit(f'[오류] {name} (PDF): {e}')

                    if result['status'] == 'FAIL':
                        fail += 1
                    self.doc_done.emit(result)
                    self.progress.emit(i, total)
            finally:
                logger.removeHandler(handler)
            self.finished.emit(len(generated), fail, self._warnings)

    class MainWindow(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle('md2doc — MD → HTML/PDF 변환기')
            self.resize(920, 680)
            self.setAcceptDrops(True)
            self.thread = None
            self.worker = None
            self._row_paths = {}  # 결과행 → 생성 파일 경로 목록
            self._build_ui()
            self._apply_style()
            self._restore_settings()

        # --- UI 구성 ---
        def _build_ui(self):
            central = QWidget()
            root = QVBoxLayout(central)
            root.setContentsMargins(14, 14, 14, 14)
            root.setSpacing(10)

            # 입력 그룹
            in_group = QGroupBox('입력 Markdown (파일 또는 폴더, 드래그앤드롭 가능)')
            in_lay = QHBoxLayout(in_group)
            self.input_list = QListWidget()
            self.input_list.setSelectionMode(QAbstractItemView.ExtendedSelection)
            self.input_list.setMinimumHeight(96)
            in_lay.addWidget(self.input_list, 1)
            btn_col = QVBoxLayout()
            for label, slot in (('파일 추가', self.add_files),
                                ('폴더 추가', self.add_folder),
                                ('선택 제거', self.remove_selected),
                                ('비우기', self.input_list.clear)):
                b = QPushButton(label)
                b.clicked.connect(slot)
                btn_col.addWidget(b)
            btn_col.addStretch(1)
            in_lay.addLayout(btn_col)
            root.addWidget(in_group)

            # 출력 + 브라우저
            io_group = QGroupBox('출력')
            grid = QGridLayout(io_group)
            grid.addWidget(QLabel('출력 폴더'), 0, 0)
            self.out_edit = QLineEdit()
            self.out_edit.setPlaceholderText('비우면 입력 파일과 같은 폴더')
            grid.addWidget(self.out_edit, 0, 1)
            b_out = QPushButton('찾아보기')
            b_out.clicked.connect(self.pick_out)
            grid.addWidget(b_out, 0, 2)
            grid.addWidget(QLabel('브라우저 (PDF용)'), 1, 0)
            self.browser = QLineEdit()
            self.browser.setPlaceholderText(
                _find_browser() or 'chrome.exe 경로 — 자동 탐색 실패 시 지정')
            grid.addWidget(self.browser, 1, 1)
            b_br = QPushButton('찾아보기')
            b_br.clicked.connect(self.pick_browser)
            grid.addWidget(b_br, 1, 2)
            grid.setColumnStretch(1, 1)
            root.addWidget(io_group)

            # 옵션
            opt_group = QGroupBox('옵션')
            opt_lay = QVBoxLayout(opt_group)
            row1 = QHBoxLayout()
            self.chk_html = QCheckBox('HTML 생성')
            self.chk_mobile = QCheckBox('모바일용 (Mermaid SVG 사전 렌더링)')
            self.chk_mobile.setToolTip(
                '체크: Mermaid 다이어그램을 빌드 시 SVG로 사전 렌더링\n'
                '      → 모바일/in-app 브라우저에서 JS 없이도 표시, HTML도 가벼움\n'
                '      ※ 사전 렌더링 실패분은 3.5MB 라이브러리를 임베드해 폴백 보장\n'
                '해제: CDN 스크립트로 클라이언트 사이드 렌더링 (가벼운 HTML, PC 권장)')
            self.chk_pdf = QCheckBox('PDF 생성')
            for cb in (self.chk_html, self.chk_mobile, self.chk_pdf):
                row1.addWidget(cb)
            row1.addStretch(1)
            opt_lay.addLayout(row1)

            row2 = QHBoxLayout()
            self.keep_html = QCheckBox('중간 HTML 보존 (.print.html)')
            self.no_mermaid = QCheckBox('PDF: Mermaid 렌더 생략')
            self.new_page_h2 = QCheckBox('PDF: ## 섹션마다 새 페이지')
            self.offline = QCheckBox('오프라인 (캐시만 사용)')
            self.offline.setToolTip(
                '체크 시 mermaid.ink/kroki/CDN 등 외부 네트워크 요청을 하지 않고\n'
                '디스크 캐시와 저장소 vendor 파일만 사용한다.\n'
                '캐시에 없는 다이어그램은 클라이언트 렌더링 폴백으로 남는다.')
            for cb in (self.keep_html, self.no_mermaid,
                       self.new_page_h2, self.offline):
                row2.addWidget(cb)
            row2.addStretch(1)
            opt_lay.addLayout(row2)
            root.addWidget(opt_group)

            # 실행 바
            run_bar = QHBoxLayout()
            self.run_btn = QPushButton('변환 시작')
            self.run_btn.setObjectName('runBtn')
            self.run_btn.clicked.connect(self.start)
            self.cancel_btn = QPushButton('취소')
            self.cancel_btn.setEnabled(False)
            self.cancel_btn.clicked.connect(self.cancel)
            self.open_out_btn = QPushButton('출력 폴더 열기')
            self.open_out_btn.clicked.connect(self.open_out_dir)
            self.progress = QProgressBar()
            self.progress.setTextVisible(True)
            run_bar.addWidget(self.run_btn)
            run_bar.addWidget(self.cancel_btn)
            run_bar.addWidget(self.open_out_btn)
            run_bar.addWidget(self.progress, 1)
            root.addLayout(run_bar)

            # 결과 테이블 + 로그 (스플리터)
            split = QSplitter(Qt.Vertical)
            self.table = QTableWidget(0, 4)
            self.table.setHorizontalHeaderLabels(['문서', 'HTML', 'PDF', '상태'])
            self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
            self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
            self.table.horizontalHeader().setSectionResizeMode(
                0, QHeaderView.Stretch)
            for c in range(1, 4):
                self.table.horizontalHeader().setSectionResizeMode(
                    c, QHeaderView.ResizeToContents)
            self.table.doubleClicked.connect(self.open_selected)
            split.addWidget(self.table)

            self.log = QPlainTextEdit()
            self.log.setReadOnly(True)
            self.log.setFont(QFont('monospace', 10))
            self.log.setPlaceholderText('변환 로그 · 경고가 여기에 표시됩니다.')
            split.addWidget(self.log)
            split.setSizes([340, 200])
            root.addWidget(split, 1)

            self.setCentralWidget(central)
            self.setStatusBar(QStatusBar())
            self.statusBar().showMessage('준비됨')

        def _apply_style(self):
            self.setStyleSheet("""
                QWidget { font-size: 13px; }
                QGroupBox {
                    border: 1px solid #d0d3d8; border-radius: 8px;
                    margin-top: 8px; padding: 8px; font-weight: 600;
                }
                QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 4px; }
                QPushButton {
                    padding: 6px 12px; border: 1px solid #c3c7cd;
                    border-radius: 6px; background: #f5f6f8;
                }
                QPushButton:hover { background: #eceef1; }
                QPushButton:disabled { color: #9aa0a6; background: #f0f0f0; }
                QPushButton#runBtn {
                    background: #2f6feb; color: white; border: none; font-weight: 600;
                }
                QPushButton#runBtn:hover { background: #285fce; }
                QPushButton#runBtn:disabled { background: #a9c0f5; }
                QLineEdit { padding: 5px; border: 1px solid #c3c7cd; border-radius: 6px; }
                QProgressBar {
                    border: 1px solid #c3c7cd; border-radius: 6px; text-align: center;
                    height: 22px;
                }
                QProgressBar::chunk { background: #2f6feb; border-radius: 5px; }
                QPlainTextEdit, QListWidget, QTableWidget {
                    border: 1px solid #d0d3d8; border-radius: 6px;
                }
            """)

        def _restore_settings(self):
            def _saved(key: str, fallback: int) -> bool:
                try:
                    return bool(int(settings.value(key, fallback) or 0))
                except Exception:
                    return bool(fallback)

            self.chk_html.setChecked(_saved('opt_html', 1))
            self.chk_mobile.setChecked(_saved('opt_mobile', 1))
            self.chk_pdf.setChecked(_saved('opt_pdf', 1 if default_pdf else 0))
            self.keep_html.setChecked(_saved('opt_keep_html', 0))
            self.no_mermaid.setChecked(_saved('opt_no_mermaid', 0))
            self.new_page_h2.setChecked(_saved('opt_new_page_h2', 0))
            self.offline.setChecked(_saved('opt_offline', 0))
            try:
                self.browser.setText(str(settings.value('browser', '') or ''))
                self.out_edit.setText(str(settings.value('out_dir', '') or ''))
            except Exception:
                pass

        # --- 입력 조작 ---
        def add_files(self):
            files, _ = QFileDialog.getOpenFileNames(
                self, 'Markdown 선택', '', 'Markdown (*.md *.markdown)')
            self._add_paths(files)

        def add_folder(self):
            d = QFileDialog.getExistingDirectory(self, '폴더 선택')
            if d:
                self._add_paths([d])

        def _add_paths(self, paths):
            existing = {self.input_list.item(i).text()
                        for i in range(self.input_list.count())}
            for p in paths:
                if not p:
                    continue
                pp = Path(p)
                if pp.is_dir():
                    candidates = sorted(
                        f for f in pp.rglob('*')
                        if f.suffix.lower() in ('.md', '.markdown'))
                else:
                    candidates = [pp]
                for f in candidates:
                    s = str(f)
                    if s not in existing:
                        self.input_list.addItem(s)
                        existing.add(s)

        def remove_selected(self):
            for it in self.input_list.selectedItems():
                self.input_list.takeItem(self.input_list.row(it))

        def pick_out(self):
            d = QFileDialog.getExistingDirectory(self, '출력 폴더')
            if d:
                self.out_edit.setText(d)

        def pick_browser(self):
            f, _ = QFileDialog.getOpenFileName(
                self, 'Chrome/Edge 실행 파일', '', 'Executable (*.exe);;All files (*)')
            if f:
                self.browser.setText(f)

        # --- 실행/취소 ---
        def start(self):
            if self.thread is not None:
                return
            paths = [Path(self.input_list.item(i).text())
                     for i in range(self.input_list.count())]
            if not paths:
                QMessageBox.warning(
                    self, '입력 없음', '변환할 .md 파일이나 폴더를 추가하세요.')
                return
            if not (self.chk_html.isChecked() or self.chk_pdf.isChecked()):
                QMessageBox.warning(
                    self, '출력 없음', 'HTML 또는 PDF 중 하나 이상을 선택하세요.')
                return
            missing = [p.name for p in paths if not p.is_file()]
            if missing:
                QMessageBox.warning(
                    self, '파일 없음', '파일이 없습니다: ' + ', '.join(missing))
                return

            allow_network = not self.offline.isChecked()
            mobile = self.chk_mobile.isChecked()
            opts = {
                'html': self.chk_html.isChecked(),
                'pdf': self.chk_pdf.isChecked(),
                'render_config': RenderConfig(
                    # 모바일 모드에서는 사전 렌더링 실패분의 폴백으로만
                    # mermaid.js를 임베드한다 (성공 시 크기 비용 없음).
                    embed_mermaid=mobile,
                    prerender_mermaid=mobile,
                    allow_network=allow_network,
                ),
                'keep_html': self.keep_html.isChecked(),
                'no_mermaid': self.no_mermaid.isChecked(),
                'new_page_h2': self.new_page_h2.isChecked(),
                'browser': self.browser.text().strip(),
                'allow_network': allow_network,
            }
            out_text = self.out_edit.text().strip()
            out_dir = Path(out_text) if out_text else None

            self.table.setRowCount(0)
            self._row_paths.clear()
            self.log.clear()
            self.progress.setRange(0, 0)  # busy until first progress
            self.statusBar().showMessage('변환 중…')

            self.thread = QThread(self)
            self.worker = ConvertWorker(paths, out_dir, opts)
            self.worker.moveToThread(self.thread)
            self.thread.started.connect(self.worker.run)
            self.worker.progress.connect(self.on_progress)
            self.worker.doc_done.connect(self.on_doc)
            self.worker.log.connect(self.on_log)
            self.worker.finished.connect(self.on_finished)
            self.worker.fatal.connect(self.on_fatal)
            self.worker.finished.connect(self.thread.quit)
            self.worker.fatal.connect(self.thread.quit)
            self.thread.finished.connect(self._cleanup_thread)

            self.run_btn.setEnabled(False)
            self.cancel_btn.setEnabled(True)
            self.thread.start()

        def cancel(self):
            if self.worker:
                self.worker.cancel()
                self.cancel_btn.setEnabled(False)
                self.statusBar().showMessage('취소 요청 — 현재 문서 완료 후 중단')

        def _cleanup_thread(self):
            if self.thread:
                self.thread.deleteLater()
            self.thread = None
            self.worker = None

        # --- 워커 시그널 핸들러 ---
        def on_progress(self, done, total):
            if self.progress.maximum() == 0 and total:
                self.progress.setRange(0, total)
            self.progress.setValue(done)

        def on_doc(self, r):
            row = self.table.rowCount()
            self.table.insertRow(row)

            def cell(text, align=Qt.AlignLeft):
                it = QTableWidgetItem(str(text))
                it.setTextAlignment(align | Qt.AlignVCenter)
                return it

            self.table.setItem(row, 0, cell(r['doc']))
            self.table.setItem(row, 1, cell(
                '✓' if r['html'] else ('✗' if r['want_html'] else '—'),
                Qt.AlignCenter))
            self.table.setItem(row, 2, cell(
                '✓' if r['pdf'] else ('✗' if r['want_pdf'] else '—'),
                Qt.AlignCenter))
            self.table.setItem(row, 3, cell(r['status'], Qt.AlignCenter))
            self._row_paths[row] = r.get('paths') or []

        def on_log(self, line):
            self.log.appendPlainText(line)

        def on_finished(self, n_out, fail, warnings):
            self.run_btn.setEnabled(True)
            self.cancel_btn.setEnabled(False)
            if self.progress.maximum() == 0:
                self.progress.setRange(0, 1)
                self.progress.setValue(1)
            msg = f'완료 — 출력 {n_out} · 실패 {fail}'
            if warnings:
                msg += f' · 경고 {warnings}건'
            self.statusBar().showMessage(msg)
            self.log.appendPlainText('\n── ' + msg + ' ──')
            # 옵션 상태를 다음 실행에 복원한다
            try:
                settings.setValue('opt_html', int(self.chk_html.isChecked()))
                settings.setValue('opt_mobile', int(self.chk_mobile.isChecked()))
                settings.setValue('opt_pdf', int(self.chk_pdf.isChecked()))
                settings.setValue('opt_keep_html', int(self.keep_html.isChecked()))
                settings.setValue('opt_no_mermaid', int(self.no_mermaid.isChecked()))
                settings.setValue('opt_new_page_h2', int(self.new_page_h2.isChecked()))
                settings.setValue('opt_offline', int(self.offline.isChecked()))
                settings.setValue('browser', self.browser.text())
                settings.setValue('out_dir', self.out_edit.text())
            except Exception:
                pass

        def on_fatal(self, tb):
            self.run_btn.setEnabled(True)
            self.cancel_btn.setEnabled(False)
            self.statusBar().showMessage('오류로 중단됨')
            self.log.appendPlainText('\n[치명 오류]\n' + tb)

        # --- 편의 ---
        def open_selected(self):
            rows = {i.row() for i in self.table.selectedIndexes()}
            for row in rows:
                for p in self._row_paths.get(row, []):
                    if os.path.exists(p):
                        QDesktopServices.openUrl(QUrl.fromLocalFile(p))

        def open_out_dir(self):
            # 생성물이 있으면 그 폴더, 없으면 출력 폴더 필드
            target = None
            produced = [p for ps in self._row_paths.values() for p in ps]
            if produced:
                target = str(Path(produced[-1]).parent)
            elif self.out_edit.text().strip():
                target = self.out_edit.text().strip()
            if target and os.path.isdir(target):
                QDesktopServices.openUrl(QUrl.fromLocalFile(target))
            else:
                QMessageBox.information(self, '폴더 없음', '출력 폴더가 아직 없습니다.')

        def dragEnterEvent(self, e):
            if e.mimeData().hasUrls():
                e.acceptProposedAction()

        def dropEvent(self, e):
            self._add_paths([u.toLocalFile() for u in e.mimeData().urls()])

        def closeEvent(self, event):
            if self.thread is not None and self.thread.isRunning():
                if self.worker:
                    self.worker.cancel()
                self.thread.quit()
                self.thread.wait(3000)
            super().closeEvent(event)

    win = MainWindow()
    win.show()
    # Center on screen
    try:
        screen = app.primaryScreen().availableGeometry()
        win.move(
            (screen.width() - win.frameGeometry().width()) // 2,
            (screen.height() - win.frameGeometry().height()) // 2,
        )
    except Exception:
        pass
    return app.exec()


# =============================================================================
# MD → PDF 변환 (헤드리스 Chrome 인쇄) — 구 MD_to_PDF.py
# =============================================================================

# 플랫폼별 표준 브라우저 경로 → PATH 순으로 탐색
_BROWSER_CANDIDATES = {
    "win32": (
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ),
    "darwin": (
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ),
}
_BROWSER_NAMES = (
    "chrome", "chrome.exe", "msedge", "msedge.exe",
    "google-chrome", "google-chrome-stable",
    "chromium", "chromium-browser", "microsoft-edge",
)

# 인쇄 전용 스타일 — 다크 테마/드로어/플로팅 UI 없는 문서 레이아웃
PRINT_TEMPLATE = _load_template("print.html")


def _find_browser() -> str | None:
    # MD2DOC_BROWSER 환경변수로 명시 지정 가능 (가장 우선)
    env = os.environ.get("MD2DOC_BROWSER", "").strip()
    if env and Path(env).is_file():
        return env
    for cand in _BROWSER_CANDIDATES.get(sys.platform, ()):
        if Path(cand).is_file():
            return cand
    for name in _BROWSER_NAMES:
        found = shutil.which(name)
        if found:
            return found
    return None


def md_to_html_body(
    md_text: str,
    render_mermaid: bool = True,
    new_page_h2: bool = False,
    progress_cb=None,
    allow_network: bool = True,
) -> str:
    # codehilite가 토큰화하기 전에 ```mermaid 펜스를 raw HTML 블록으로 변환
    # (md2doc.py와 동일한 전처리 — 변환 후 정규식은 codehilite 마크업과 불일치)
    if render_mermaid:
        md_text = _inline_mermaid_fences(md_text)
    md = _build_markdown(toc_permalink=False)
    body = md.convert(md_text)
    # 본문 내 목차의 깨진/누락된 앵커를 실제 헤딩 id로 교정한다 —
    # Chrome print-to-PDF는 <a href="#id">를 내부 GoTo 링크로 옮기는데,
    # href가 존재하지 않는 id를 가리키면 PDF에서 클릭해도 이동하지 않는다.
    # 스마트 페이지네이션이 h2+블록을 .keep div로 감싸기 전에 실행해야
    # '목차' h2 직후 블록 패턴이 매칭된다.
    _heading_map = _build_heading_map(getattr(md, "toc", "") or "")
    body = _linkify_inline_toc(body, _heading_map)
    body = _repair_dead_fragment_links(body, _heading_map)
    if render_mermaid:
        body = _prerender_mermaid_to_svg(
            body, progress_cb=progress_cb, allow_network=allow_network
        )
    body = _apply_smart_pagination(body, new_page_h2=new_page_h2)
    return body


# 이 줄 수를 넘는 <pre>는 한 페이지에 못 들어갈 수 있어 내부 분할 허용
_LONG_PRE_LINES = 40
# 이 예상 줄 수를 넘는 <table>은 한 페이지에 못 들어갈 수 있어 조각으로 분할.
# 행 수가 아니라 셀 텍스트 길이로 높이를 추정한다 — 콘티 표처럼
# 10행이지만 행 높이가 큰 표도 한 페이지를 넘기므로 행 수만으로는 부족.
_LONG_TABLE_LINES = 38
# 분할 조각당 목표 줄 수 — A4 한 페이지 본문(~44줄)보다 작게 잡아
# 각 조각이 페이지를 넘지 않도록 한다
_TABLE_CHUNK_LINES = 30
# 헤딩에 붙일 수 있는 직후 블록의 최대 텍스트 길이 — 너무 긴 단락을
# .keep으로 묶으면 통째로 다음 페이지로 밀려 큰 여백이 생긴다
_KEEP_MAX_CHARS = 600


def _apply_smart_pagination(body: str, new_page_h2: bool = False) -> str:
    """인쇄용 지능형 페이지 나눔 후처리.

    1) h2~h4 헤딩 + 직후 블록(단락/목록/인용)을 .keep div로 묶어
       '페이지 맨 밑에 헤딩만 남는' 고립을 방지한다. 표/코드블록처럼
       길이를 알 수 없는 요소는 묶지 않는다.
    2) _LONG_PRE_LINES 초과 <pre>에 .long-pre를 붙여 내부 분할을 허용한다.
       (짧은 블록만 통째 유지 → 큰 빈 공간 방지)
    """
    # 1) 헤딩 + 직후 블록 묶기
    heading_pat = re.compile(
        r'(<h[2-4][^>]*>[\s\S]*?</h[2-4]>)'
        r'(\s*<(?:p|ul|ol|blockquote)\b[^>]*>[\s\S]*?</(?:p|ul|ol|blockquote)>)?',
        re.IGNORECASE,
    )

    def _glue_heading(m: re.Match) -> str:
        head, nxt = m.group(1), m.group(2)
        # 긴 블록은 묶지 않는다 — keep 덩어리가 커지면 페이지 하단 여백만 커짐
        if nxt and len(re.sub(r"<[^>]+>", "", nxt)) > _KEEP_MAX_CHARS:
            nxt = None
        return f'<div class="keep">{head}{nxt or ""}</div>'

    body = heading_pat.sub(_glue_heading, body)

    # 2) 긴 코드 블록 내부 분할 허용
    def _mark_long_pre(m: re.Match) -> str:
        block = m.group(0)
        if block.count("\n") > _LONG_PRE_LINES:
            return block.replace("<pre>", '<pre class="long-pre">', 1)
        return block

    body = re.sub(r"<pre>[\s\S]*?</pre>", _mark_long_pre, body)

    # 3) 긴 표는 페이지 크기의 조각으로 미리 분할한다.
    #    Chrome이 분할된 행의 연속 부분을 빈 공간으로 렌더하는 quirk가 있어
    #    CSS page-break 규칙만으로는 페이지 상단 공백이 남는다.
    #    각 조각을 _TABLE_CHUNK_LINES 이하로 잘라 page-break-inside: avoid
    #    (기본 table CSS)로 통째 유지시키면 행이 절대 중간에 잘리지 않는다.
    def _est_row_lines(tr: str) -> int:
        cells = re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", tr, re.IGNORECASE)
        ncols = max(len(cells), 1)
        # 셀당 대략적 문자 용량: 표 폭 180mm ÷ 열 수 (9.5pt 한글 ≈ 3.4mm/자,
        # 셀 패딩 고려 보수적 추정 — 과대추정 시 한 페이지를 넘는 표를
        # '짧은 표'로 오인해 avoid가 통째 밀어내기 + 큰 여백을 만든다)
        cap = max(8, int(45 / ncols))
        row_lines = 1
        for c in cells:
            # <br>·</li>·</p> 등 블록 경계를 실제 줄바꿈으로 환산
            txt = re.sub(r"(?i)<br\s*/?>|</(?:li|p|div|ul|ol)>", "\n", c)
            txt = re.sub(r"<[^>]+>", "", txt)
            cell_lines = sum(
                max(1, -(-len(seg) // cap)) for seg in txt.split("\n")
            )
            row_lines = max(row_lines, cell_lines)
        return row_lines

    def _split_long_table(m: re.Match) -> str:
        block = m.group(0)
        rows = re.findall(r"<tr[\s\S]*?</tr>", block, re.IGNORECASE)
        if sum(_est_row_lines(r) for r in rows) <= _LONG_TABLE_LINES:
            return block

        # <thead>를 각 조각에 복제해 분할된 표에도 헤더가 붙도록 한다
        thead_m = re.search(r"<thead[\s\S]*?</thead>", block, re.IGNORECASE)
        thead_html = thead_m.group(0) if thead_m else ""
        tbody = re.search(r"<tbody[\s\S]*?</tbody>", block, re.IGNORECASE)
        body_rows = (
            re.findall(r"<tr[\s\S]*?</tr>", tbody.group(0), re.IGNORECASE)
            if tbody else rows[len(re.findall(r"<tr[\s\S]*?</tr>", thead_html)):]
        )

        chunks: list[list[str]] = []
        current: list[str] = []
        current_lines = _est_row_lines(thead_html) if thead_html else 0
        for r in body_rows:
            rl = _est_row_lines(r)
            # 단일 행이 조각 한계를 넘어도 그대로 둔다 (행은 원자 단위)
            if current and current_lines + rl > _TABLE_CHUNK_LINES:
                chunks.append(current)
                current, current_lines = [], 0
            current.append(r)
            current_lines += rl
        if current:
            chunks.append(current)

        if len(chunks) <= 1:
            return block
        return "\n".join(
            "<table>" + thead_html + "<tbody>" + "".join(c) + "</tbody></table>"
            for c in chunks
        )

    body = re.sub(r"<table>[\s\S]*?</table>", _split_long_table, body)

    if new_page_h2:
        body = re.sub(r"<h2\b", '<h2 class="new-page"', body)
    return body


_IMG_MIME = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
    ".bmp": "image/bmp", ".ico": "image/x-icon",
}


def _embed_local_images(body: str, base_dir: Path) -> str:
    """<img src="상대경로">를 base64 data URI로 임베딩한다.

    출력 HTML이 임시 폴더에 생성되므로 상대경로 이미지는 반드시 깨진다.
    MD 파일 위치 기준으로 로컬 이미지를 읽어 자립형 HTML을 만든다.
    http(s)/data/file URI는 그대로 둔다. 없는 파일은 경고만 출력.
    """
    def _repl(m: re.Match) -> str:
        open_tag, src = m.group(1), m.group(2)
        if re.match(r"(?i)(?:https?:|data:|file:|//)", src):
            return m.group(0)
        # URL 디코딩 + ?query / #fragment 제거 후 실제 파일 경로 해석
        raw = urllib.parse.unquote(re.split(r"[?#]", src, 1)[0])
        img_path = (base_dir / raw).resolve()
        # base_dir 밖 경로(../ 탈출)는 임베드 금지 — 임의 로컬 파일이
        # 출력 HTML에 base64로 유출되는 것을 막는다.
        try:
            if not img_path.is_relative_to(base_dir.resolve()):
                logger.warning(
                    "[img skipped] 입력 디렉터리 밖 경로: %s (기준: %s)", src, base_dir
                )
                return m.group(0)
        except Exception:
            return m.group(0)
        mime = _IMG_MIME.get(img_path.suffix.lower())
        if mime and img_path.is_file():
            try:
                data = base64.b64encode(img_path.read_bytes()).decode("ascii")
                return f'{open_tag}data:{mime};base64,{data}"'
            except Exception as e:
                logger.warning("[img embed fail] %s: %s", img_path, e)
        else:
            logger.warning("[img not found] %s (기준: %s)", src, base_dir)
        return m.group(0)

    return re.sub(r'(<img\b[^>]*?\bsrc=")([^"]+)"', _repl, body, flags=re.IGNORECASE)


def html_to_pdf(html_path: Path, pdf_path: Path, browser: str) -> None:
    url = html_path.resolve().as_uri()
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path.resolve()}",
        url,
    ]
    result = subprocess.run(
        cmd, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=120,
    )
    if result.returncode != 0 or not pdf_path.exists():
        raise RuntimeError(
            f"브라우저 인쇄 실패: {result.stderr.strip() or result.stdout.strip()}"
        )


def convert_markdown_to_pdf(
    in_path: Path,
    out_path: Path | None = None,
    title: str | None = None,
    keep_html: bool = False,
    render_mermaid: bool = True,
    new_page_h2: bool = False,
    browser: str | None = None,
    progress_cb=None,
    allow_network: bool = True,
) -> Path:
    """단일 Markdown 파일을 PDF로 변환·저장하고 출력 경로를 반환한다."""
    browser = browser or _find_browser()
    if not browser:
        raise RuntimeError(
            "Chrome/Edge를 찾지 못했습니다. --browser로 실행 파일 경로를 지정하세요."
        )

    md_text = in_path.read_text(encoding="utf-8-sig")
    body = md_to_html_body(
        md_text,
        render_mermaid=render_mermaid,
        new_page_h2=new_page_h2,
        progress_cb=progress_cb,
        allow_network=allow_network,
    )
    # 출력 HTML은 임시 폴더에 생성되므로 상대경로 이미지를 data URI로 임베딩
    body = _embed_local_images(body, in_path.parent)
    doc = PRINT_TEMPLATE.replace("%%TITLE%%", html.escape(title or in_path.stem))
    doc = doc.replace("%%BODY%%", body)

    out_path = out_path or in_path.with_suffix(".pdf")
    if keep_html:
        html_path = in_path.with_suffix(".print.html")
        html_path.write_text(doc, encoding="utf-8")
        html_to_pdf(html_path, out_path, browser)
    else:
        # 실패·예외 시에도 임시 HTML이 남지 않도록 TemporaryDirectory 사용
        with tempfile.TemporaryDirectory(prefix="md2doc-") as tmpdir:
            html_path = Path(tmpdir) / (in_path.stem + ".print.html")
            html_path.write_text(doc, encoding="utf-8")
            html_to_pdf(html_path, out_path, browser)
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cli",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--no-embed-mermaid",
        dest="embed_mermaid",
        action="store_false",
        default=EMBED_MERMAID,
        help="Do NOT inline the Mermaid library; keep the CDN <script> tag instead.",
    )
    parser.add_argument(
        "--no-prerender-mermaid",
        dest="prerender_mermaid",
        action="store_false",
        default=True,
        help="Skip pre-rendering Mermaid to SVG; use client-side CDN rendering (lighter HTML for PC).",
    )
    parser.add_argument(
        "--in",
        dest="in_paths",
        nargs="+",
        default=None,
        help="입력 Markdown 파일(들). 여러 개 또는 glob 패턴 지원 (예: \"content/**/*.md\").",
    )
    parser.add_argument(
        "--out",
        dest="out_path",
        default=None,
        help="출력 HTML 경로. 단일 입력일 때만 사용 가능.",
    )
    parser.add_argument(
        "--title",
        dest="title",
        default=None,
        help="문서 제목. 단일 입력일 때만 사용 가능.",
    )
    parser.add_argument(
        "--collapse-min-lines",
        dest="collapse_min_lines",
        type=int,
        default=COLLAPSE_CODEBLOCK_MIN_LINES,
    )
    parser.add_argument(
        "--callout-rules",
        dest="callout_rules",
        default=None,
        help="콜아웃 분류 규칙 JSON 경로. 미지정 시 스크립트 옆 callout_rules.json을 사용하고, 없으면 기본 이모지 규칙.",
    )
    # ── PDF 모드 (구 MD_to_PDF.py 통합) ─────────────────────────────────
    parser.add_argument(
        "--pdf",
        action="store_true",
        default=False,
        help="PDF 모드 — CLI는 MD→PDF로 동작, GUI는 PDF 생성 체크 상태로 진입 (헤드리스 Chrome 인쇄)",
    )
    parser.add_argument("--out-dir", dest="out_dir", default=None,
                        help="PDF 모드: 출력 디렉토리 (다중 입력용)")
    parser.add_argument("--keep-html", dest="keep_html", action="store_true",
                        help="PDF 모드: 인쇄용 중간 HTML을 <이름>.print.html로 보존")
    parser.add_argument("--no-mermaid", dest="no_mermaid", action="store_true",
                        help="PDF 모드: Mermaid 프리렌더 생략 (코드 블록으로 출력)")
    parser.add_argument("--new-page-h2", dest="new_page_h2", action="store_true",
                        help="PDF 모드: h2(##) 섹션마다 새 페이지에서 시작")
    parser.add_argument("--browser", dest="browser", default=None,
                        help="PDF 모드: Chrome/Edge 실행 파일 경로 (자동 탐색 실패 시). MD2DOC_BROWSER 환경변수도 인식.")
    parser.add_argument("--offline", dest="offline", action="store_true",
                        help="외부 네트워크 요청 금지 — Mermaid 사전렌더는 캐시만 사용, 미스는 클라이언트 렌더링 폴백")
    parser.add_argument("--verbose", "-v", dest="verbose", action="store_true",
                        help="진단 로그를 DEBUG 수준까지 출력")
    parser.add_argument("--quiet", "-q", dest="quiet", action="store_true",
                        help="경고 이상의 로그만 출력")
    args = parser.parse_args()

    logging.basicConfig(
        level=(logging.DEBUG if args.verbose
               else logging.ERROR if args.quiet
               else logging.INFO),
        format="%(message)s",
    )

    # Default to GUI unless --cli is provided. --pdf는 통합 GUI에서 PDF 체크 상태로 진입.
    if not bool(args.cli):
        raise SystemExit(run_gui(default_pdf=bool(args.pdf)))

    if not args.in_paths:
        raise SystemExit("--in is required in --cli mode. (Run without --cli to launch the GUI.)")

    in_paths = _expand_input_paths(list(args.in_paths))
    if not in_paths:
        raise SystemExit("No input files matched.")

    single = len(in_paths) == 1
    if args.out_path and not single:
        raise SystemExit("--out can only be used with a single input file.")
    if args.title and not single:
        raise SystemExit("--title can only be used with a single input file.")

    # ── PDF 모드 (구 MD_to_PDF.py CLI 경로) ────────────────────────────
    if args.pdf:
        out_dir = Path(args.out_dir) if args.out_dir else None
        done = 0
        for in_path in in_paths:
            out_path = (Path(args.out_path) if (args.out_path and single)
                        else (out_dir / (in_path.stem + '.pdf')) if out_dir
                        else None)
            try:
                written = convert_markdown_to_pdf(
                    in_path, out_path=out_path,
                    title=args.title if single else None,
                    keep_html=args.keep_html,
                    render_mermaid=not args.no_mermaid,
                    new_page_h2=args.new_page_h2,
                    browser=args.browser,
                    allow_network=not args.offline,
                )
                print(str(written))
                done += 1
            except Exception as e:
                logger.error("[error] %s: %s", in_path, e)
        if not single:
            logger.info("Converted %d/%d file(s).", done, len(in_paths))
        if done == 0:
            raise SystemExit("All conversions failed.")
        raise SystemExit(0)

    if args.collapse_min_lines is not None and int(args.collapse_min_lines) > 0:
        collapse_min_lines = int(args.collapse_min_lines)
    else:
        collapse_min_lines = COLLAPSE_CODEBLOCK_MIN_LINES

    render_config = RenderConfig(
        collapse_codeblock_min_lines=collapse_min_lines,
        embed_mermaid=bool(args.embed_mermaid),
        prerender_mermaid=bool(args.prerender_mermaid),
        callout_rules_file=args.callout_rules,
        allow_network=not args.offline,
    )

    done = 0
    for in_path in in_paths:
        out_path = Path(args.out_path) if (args.out_path and single) else None
        try:
            written = convert_markdown_file(
                in_path,
                out_path=out_path,
                title=args.title if single else None,
                config=render_config,
            )
            print(str(written))
            done += 1
        except Exception as e:
            logger.error("[error] %s: %s", in_path, e)

    if not single:
        logger.info("Converted %d/%d file(s).", done, len(in_paths))
    if done == 0:
        raise SystemExit("All conversions failed.")
