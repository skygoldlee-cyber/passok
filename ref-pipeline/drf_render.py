# -*- coding: utf-8 -*-
# @spec FO-24
"""법제처 DRF lawService XML → ref_md 렌더러 + 조문 단위 대조.

법률·령·규칙류 ref_md는 PDF 변환이 아니라 DRF XML 렌더로 만들어진다
(fetch_revision.py 주석 참조 — DRF는 법령 문서 파일을 제공하지 않는다).
이 모듈은 그 렌더 규약을 정규화하고, 구본 ref_md와 신본 XML 렌더를
조문 단위로 대조해 "본문 동일(연혁·유예조항 발효 갱신)"과
"실질 개정(조문 추가·변경·삭제)"을 구분한다.

DRF XML의 함정 세 가지를 흡수한다:
  ① 내용 태그(조문내용·항내용·호내용·목내용)가 복수 CDATA로 분할됨
    — 태그 블록을 먼저 잡고 안의 CDATA를 전부 이어붙인다 (cdata()).
  ② 신판 XML은 항내용에 항번호가 중복 포함됨 — '①①' 렌더 방지.
  ③ CDATA 닫힘과 태그 닫힘 사이 개행 — 블록 우선 추출로 무해화.
"""
import difflib
import html
import re


def cd(t):
    return html.unescape(t).replace('\r', '').strip()


def cdata(block, tag):
    """<tag> 블록 안의 모든 CDATA를 이어붙여 반환 — DRF는 하나의 내용 태그에
    복수 CDATA(표·이미지 분할)를 넣기도 하므로 단일 캡처로는 누락/누수가 생긴다."""
    m = re.search(r'<' + tag + r'>(.*?)</' + tag + r'>', block, re.S)
    if not m:
        return ''
    return cd(''.join(re.findall(r'<!\[CDATA\[(.*?)\]\]>', m.group(1), re.S)))


def byl_sections(xml):
    """<별표단위> 블록 → (구분, 번호, 제목, 본문) 목록."""
    secs = []
    for m in re.finditer(r'<별표단위[^>]*>(.*?)</별표단위>', xml, re.S):
        b = m.group(1)
        num = re.search(r'<별표번호>(\d+)</별표번호>', b)
        sub = re.search(r'<별표가지번호>(\d+)</별표가지번호>', b)
        gubun = re.search(r'<별표구분>([^<]*)</별표구분>', b)
        tit = re.search(r'<별표제목><!\[CDATA\[(.*?)\]\]></별표제목>', b, re.S)
        body = ''.join(re.findall(r'<!\[CDATA\[(.*?)\]\]>', b[b.find('<별표내용>'):], re.S))
        n = str(int(num.group(1))) if num else '?'
        if sub and sub.group(1) != '00':
            n += '의' + str(int(sub.group(1)))
        secs.append((gubun.group(1).strip() if gubun else '별표', n,
                     cd(tit.group(1)) if tit else '', cd(body)))
    return secs


def law_effective_date(xml):
    """기본정보의 시행일자 (연혁본이면 해당 버전의 시행일)."""
    m = re.search(r'<기본정보>.*?<시행일자>(\d+)</시행일자>', xml, re.S) \
        or re.search(r'<시행일자>(\d+)</시행일자>', xml)
    return m.group(1) if m else ''


def render_law(name, xml):
    """DRF lawService XML → ref_md 규약 Markdown.

    헤더: `# {name}` + `> 법령ID … · 시행일 … · law.go.kr`
    조문: `## 제N조 (제목)` + `- ①` 항 / `  - ` 호 / `    - ` 목
    부칙: `## 부칙 (공포 YYYYMMDD)` · 별표: `### 별표 N — 제목` 부록
    """
    lawid = re.search(r'<법령ID>(\d+)</법령ID>', xml)
    eff = law_effective_date(xml)
    out = [f"# {name}\n\n> 법령ID {lawid.group(1) if lawid else '?'} · "
           f"시행일 {eff or '?'} · law.go.kr\n"]
    for m in re.finditer(r'<조문단위[^>]*>(.*?)</조문단위>', xml, re.S):
        b = m.group(1)
        kind = re.search(r'<조문여부>([^<]*)</조문여부>', b)
        kind = kind.group(1) if kind else '조문'
        content = cdata(b, '조문내용')
        if kind in ('편장절', '전문') or re.match(r'\s*제\d+[장편절]\s', content):
            ttl = re.sub(r'<[^>]*>', '', content).strip()
            if ttl:
                out.append(f"\n## {ttl}\n")
            continue
        num = re.search(r'<조문번호>(\d+)</조문번호>', b)
        sub = re.search(r'<조문가지번호>(\d+)</조문가지번호>', b)
        tit = re.search(r'<조문제목><!\[CDATA\[(.*?)\]\]></조문제목>', b, re.S)
        if not num:
            continue
        n = str(int(num.group(1)))
        if sub and sub.group(1) != '00':
            n += '의' + str(int(sub.group(1)))
        t = cd(tit.group(1)) if tit else ''
        out.append(f"\n## 제{n}조 ({t})\n")
        if content:
            out.append(f"\n{content}\n")
        for hm in re.finditer(r'<항>(.*?)</항>', b, re.S):
            hb = hm.group(1)
            hnum = re.search(r'<항번호><!\[CDATA\[(.*?)\]\]></항번호>', hb, re.S)
            body_txt = cdata(hb, '항내용')
            marker = hnum.group(1) if hnum else ''
            # 신판 DRF는 항내용에 항번호가 중복 포함 — '①①' 렌더 방지
            line = body_txt if marker and body_txt.lstrip().startswith(marker) else marker + body_txt
            if line.strip():
                out.append(f"- {line}\n")
            for hm2 in re.finditer(r'<호>(.*?)</호>', hb, re.S):
                hob = hm2.group(1)
                htxt2 = cdata(hob, '호내용')
                if htxt2:
                    out.append(f"  - {htxt2}\n")
                for mm in re.finditer(r'<목>(.*?)</목>', hob, re.S):
                    mt = cdata(mm.group(1), '목내용')
                    if mt:
                        out.append(f"    - {mt}\n")
        out.append('\n')
    for bm in re.finditer(r'<부칙>(.*?)</부칙>', xml, re.S):
        bb = bm.group(1)
        bt = re.search(r'<부칙공포일자>(\d+)</부칙공포일자>', bb)
        body = cd(''.join(re.findall(r'<!\[CDATA\[(.*?)\]\]>', bb, re.S)))
        if body:
            out.append(f"\n## 부칙 (공포 {bt.group(1) if bt else '?'})\n\n{body}\n")
    secs = byl_sections(xml)
    if secs:
        out.append(f"\n---\n\n## 📎 별표·서식 원문 부록 (법제처 DRF 원문 — 시행일 {eff or '?'})\n")
        for g, n, t, body in secs:
            out.append(f"\n### {g} {n} — {t}\n\n{body}\n")
    return ''.join(out)


# ---------------------------------------------------------------------------
# 조문 단위 대조 — ref_md 두 판을 '## ' 섹션으로 잘라 조문 번호 키로 비교한다.
# 키는 본문의 조문 마커(`제N조의M(`)를 우선시한다 — 구 렌더는 가지번호를
# 헤더에 붙이지 않아 헤더만으로는 '제66조'/'제66조의2'가 충돌한다.
# ---------------------------------------------------------------------------

def section_key(header, body):
    """'## ' 섹션 → 대조 키. 조문은 '제N조[의M]', 그 외는 '§'+헤더."""
    m = re.match(r'^제(\d+)(?:의(\d+))?조\b', header)
    if not m:
        return '§' + re.sub(r'\s+', '', header)
    n, sub = m.group(1), m.group(2)
    # 본문 첫 마커가 가지번호를 들고 있으면 본문을 신뢰한다 (구 렌더 호환)
    bm = re.match(r'\s*제(\d+)조(?:의(\d+))?\(', body)
    if bm and bm.group(1) == n and bm.group(2):
        sub = bm.group(2)
    return f'제{int(n)}조' + (f'의{int(sub)}' if sub else '')


def article_map(md):
    """ref_md → {섹션키: 본문}. 헤더 라인은 본문에서 제외."""
    d = {}
    for m in re.finditer(r'^## (.+?)\n(.*?)(?=^## |\Z)', md, re.S | re.M):
        header, body = m.group(1).strip(), m.group(2)
        key = section_key(header, body)
        d[key] = body  # 동일 키 재등장은 마지막이 우선 (부칙 제N조(시행일) 충돌 흡수)
    return d


def norm_body(s):
    """비교용 정규화 — 공백·개행 차이는 렌더 세대 차이일 뿐이므로 제거."""
    return re.sub(r'\s+', '', s)


def compare_articles(old_md, new_md):
    """{changed: [(key, old, new)], added: [key], removed: [key], renamed: [(old_key, new_key)]}.

    §키(장절·부칙·부록 헤더)는 헤더 텍스트가 키라 시행일·공포일 표기가
    달라지면 added+removed 쌍으로 나타난다 — 본문이 동일한 쌍은 'renamed'로
    접어 실질 변경에서 제외한다 (연혁 시행일 ≠ 기본정보 시행일 케이스)."""
    o, n = article_map(old_md), article_map(new_md)
    changed = [(k, o[k], n[k]) for k in o
               if k in n and norm_body(o[k]) != norm_body(n[k])]
    added = [k for k in n if k not in o]
    removed = [k for k in o if k not in n]
    renamed, hit_a, hit_r = [], set(), set()
    for ka in added:
        for kr in removed:
            if kr not in hit_r and norm_body(n[ka]) == norm_body(o[kr]):
                renamed.append((kr, ka))
                hit_a.add(ka)
                hit_r.add(kr)
                break
    added = [k for k in added if k not in hit_a]
    removed = [k for k in removed if k not in hit_r]
    return {'changed': changed, 'added': added, 'removed': removed, 'renamed': renamed}


def article_diff(old_body, new_body, key):
    """변경 조문의 unified diff (리포트용, 최대 60줄)."""
    diff = difflib.unified_diff(
        old_body.splitlines(), new_body.splitlines(),
        fromfile=f'구본 {key}', tofile=f'신본 {key}', lineterm='', n=2)
    lines = [l for l in diff if l.strip()]
    if len(lines) > 60:
        lines = lines[:60] + [f'… ({len(lines) - 60}줄 생략)']
    return '\n'.join(lines)
