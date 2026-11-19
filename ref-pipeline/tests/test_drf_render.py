# -*- coding: utf-8 -*-
"""drf_render.py 순수 함수 테스트 — DRF XML 렌더·조문 단위 대조.

실행: python -m pytest ref-pipeline/tests/test_drf_render.py -v
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import drf_render as R  # noqa: E402


XML = """<?xml version="1.0" encoding="UTF-8"?>
<법령>
  <법령키>12345</법령키>
  <법령ID>007363</법령ID>
  <기본정보><법령명_한글>테스트규칙</법령명_한글><시행일자>20260302</시행일자></기본정보>
  <조문>
    <조문단위>
      <조문번호>1</조문번호>
      <조문제목><![CDATA[목적]]></조문제목>
      <조문내용><![CDATA[제1조(목적) 이 규칙은 목적을 규정한다.]]></조문내용>
      <조문여부>조문</조문여부>
      <항>
        <항번호><![CDATA[①]]></항번호>
        <항내용><![CDATA[① 사업주는 안전하다.]]></항내용>
      </항>
      <항>
        <항번호><![CDATA[②]]></항번호>
        <항내용><![CDATA[② 사업주는 다음을 지킨다.]]></항내용>
        <호><호내용><![CDATA[1. 첫째 호]]></호내용>
          <목><목내용><![CDATA[가. 첫째 목]]></목내용></목></호>
        <호><호내용><![CDATA[2. 둘째 호]]></호내용></호>
      </항>
    </조문단위>
    <조문단위>
      <조문번호>2</조문번호><조문가지번호>2</조문가지번호>
      <조문제목><![CDATA[의무]]></조문제목>
      <조문내용><![CDATA[제2조의2(의무) 의무를 규정한다.]]></조문내용>
      <조문여부>조문</조문여부>
      <항>
        <항내용><![CDATA[다중 CDATA 첫 부분]]></항내용>
        <항번호><![CDATA[①]]></항번호>
      </항>
    </조문단위>
    <조문단위>
      <조문번호>321</조문번호>
      <조문제목><![CDATA[표]]></조문제목>
      <조문내용><![CDATA[제321조(표) 표가 있는 조문이다.]]></조문내용>
      <조문여부>조문</조문여부>
      <항>
        <항번호><![CDATA[①]]></항번호>
        <항내용><![CDATA[① 분할 시작]]>
<![CDATA[<img 분할 이미지>]]>
<![CDATA[ 분할 끝]]></항내용>
      </항>
    </조문단위>
  </조문>
  <부칙>
    <부칙공포일자>20110706</부칙공포일자>
    <부칙내용><![CDATA[부칙 <제30호,2011.7.6>\n제1조(시행일) 이 규칙은 공포한 날부터 시행한다.]]></부칙내용>
  </부칙>
  <별표단위>
    <별표번호>0001</별표번호><별표가지번호>00</별표가지번호>
    <별표구분>별표</별표구분>
    <별표제목><![CDATA[제목1]]></별표제목>
    <별표내용><![CDATA[별표 본문 내용]]></별표내용>
  </별표단위>
</법령>
"""


class TestRender:
    def test_header_and_articles(self):
        md = R.render_law('테스트규칙', XML)
        assert '> 법령ID 007363 · 시행일 20260302 · law.go.kr' in md
        assert '## 제1조 (목적)' in md
        # 가지번호는 헤더에 붙는다
        assert '## 제2의2조 (의무)' in md

    def test_hang_number_dedup(self):
        """신판 DRF는 항내용에 항번호가 중복 포함 — '①①' 렌더 방지."""
        md = R.render_law('테스트규칙', XML)
        assert '①①' not in md
        assert '- ① 사업주는 안전하다.' in md

    def test_nested_ho_mok(self):
        md = R.render_law('테스트규칙', XML)
        assert '  - 1. 첫째 호' in md
        assert '    - 가. 첫째 목' in md

    def test_multi_cdata_joined(self):
        """하나의 항내용에 복수 CDATA가 들어있어도 전부 이어붙인다."""
        md = R.render_law('테스트규칙', XML)
        assert '① 분할 시작' in md
        assert '분할 끝' in md
        assert ']]>' not in md  # CDATA 구분자 누수 없음

    def test_buchik_and_byl(self):
        md = R.render_law('테스트규칙', XML)
        assert '## 부칙 (공포 20110706)' in md
        assert '### 별표 1 — 제목1' in md


class TestArticleMap:
    OLD_STYLE = """# 규칙\n\n## 제66조 (제목)\n\n제66조의2(내용) 가지번호는 본문에만 있다.\n"""
    NEW_STYLE = """# 규칙\n\n## 제66의2조 (제목)\n\n제66조의2(내용) 가지번호는 본문에만 있다.\n"""

    def test_branch_no_from_body_when_header_lacks(self):
        """구 렌더(헤더에 의번호 없음)·신 렌더(헤더에 포함)가 같은 키로 묶인다."""
        o = R.article_map(self.OLD_STYLE)
        n = R.article_map(self.NEW_STYLE)
        assert '제66조의2' in o and '제66조의2' in n

    def test_buchik_does_not_collide_with_article(self):
        """부칙 본문의 '제1조(시행일)'이 본문 제1조 키를 덮어쓰지 않는다."""
        md = R.render_law('테스트규칙', XML)
        am = R.article_map(md)
        assert '제1조' in am and '(목적)' in md
        assert any(k.startswith('§부칙') for k in am)

    def test_counts(self):
        am = R.article_map(R.render_law('테스트규칙', XML))
        assert '제1조' in am and '제2조의2' in am and '제321조' in am


class TestCompare:
    BASE = "# A\n\n## 제1조 (목적)\n\n제1조(목적) 내용.\n\n## 제2조 (의무)\n\n제2조(의무) 원문.\n"

    def test_identical_when_only_whitespace_differs(self):
        new = "# A\n\n## 제1조 (목적)\n\n제1조(목적) 내용.\n\n\n## 제2조 (의무)\n\n\n제2조(의무)   원문.\n"
        r = R.compare_articles(self.BASE, new)
        assert not r['changed'] and not r['added'] and not r['removed']

    def test_changed_article_detected(self):
        new = self.BASE.replace('원문.', '개정된 원문.')
        r = R.compare_articles(self.BASE, new)
        assert [k for k, _, _ in r['changed']] == ['제2조']

    def test_renamed_section_collapses_when_body_identical(self):
        """§ 헤더의 시행일 표기만 다른 부록 섹션은 개명으로 접어 실질 변경에서 제외."""
        old = self.BASE + "\n## 📎 별표·서식 원문 부록 (시행일 20250901)\n\n### 별표 1 — 표\n\n내용.\n"
        new = old.replace('20250901', '20260302')
        r = R.compare_articles(old, new)
        assert not r['added'] and not r['removed']
        assert len(r['renamed']) == 1

    def test_added_removed(self):
        new = self.BASE + "\n## 제3조 (신설)\n\n제3조(신설) 신설 내용.\n"
        r = R.compare_articles(self.BASE, new)
        assert r['added'] == ['제3조']
        r2 = R.compare_articles(new, self.BASE)
        assert r2['removed'] == ['제3조']
