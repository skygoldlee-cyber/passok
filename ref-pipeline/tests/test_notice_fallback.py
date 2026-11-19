# -*- coding: utf-8 -*-
"""baseline 폴백·규약불일치 회귀 테스트 — 첫 실전 실행에서 드러난 허위 판정 방지.

- check_doc: 파일명에 (제N호)(날짜) 규약이 없는 문서는 이전 notice_status의
  latestDate를 baseline 대용으로 쓴다 (첫 실행은 시딩만 — 영구 newer 오탐 방지)
- drf_render.uncomparable: PDF 변환본 ref_md('## 제조' — 조문번호 소실)는
  DRF 렌더와 대조 불가 — 전량 '신설' 허위 판정 방지
- diff_revision.find_ref_md: referenceLaw가 .pdf 원본명을 가리켜도 .md 대응본 탐색
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import check_mfds_notice as M  # noqa: E402
import diff_revision as D  # noqa: E402
import drf_render as R  # noqa: E402


def _res(date):
    v = {'notice': '제1호', 'effectiveDate': date, 'serial': 'S1'}
    return {'latest': dict(v), 'current': dict(v)}


def _doc(**kw):
    return {'name': 'X법', 'target': 'law', 'file': 'x.md', **kw}


class TestBaselineFallback:
    def test_prior_date_used_when_filename_has_no_baseline(self, monkeypatch):
        monkeypatch.setattr(M, 'search_law', lambda n: _res('2026-10-27'))
        assert M.check_doc(_doc(_priorDate='2026-10-27'))['newer'] is False
        assert M.check_doc(_doc(_priorDate='2026-01-01'))['newer'] is True

    def test_first_run_seeds_quietly(self, monkeypatch):
        """파일명 규약도 이전 상태도 없으면 newer=False — 최신값만 시딩."""
        monkeypatch.setattr(M, 'search_law', lambda n: _res('2026-10-27'))
        r = M.check_doc(_doc())
        assert r['newer'] is False
        assert r['latestDate'] == '2026-10-27'

    def test_filename_baseline_wins_over_prior(self, monkeypatch):
        monkeypatch.setattr(M, 'search_law', lambda n: _res('2026-10-27'))
        r = M.check_doc(_doc(baselineDate='2026-10-27', _priorDate='2020-01-01'))
        assert r['newer'] is False


class TestUncomparable:
    def test_pdf_converted_old_is_uncomparable(self):
        # '## 제조'처럼 조문번호가 깨진 PDF 변환본 — §키만 남아 조문 대조 불가
        old = "# 산업안전보건법\n\n## 제조\n\n① 정부는 …\n\n## 제조\n\n① 사업주는 …\n"
        new_map = {f'제{i}조': 'x' for i in range(1, 20)}
        assert R.uncomparable(R.article_map(old), new_map)

    def test_drf_rendered_old_is_comparable(self):
        old = {f'제{i}조': 'x' for i in range(1, 20)}
        assert not R.uncomparable(old, dict(old))

    def test_small_law_not_flagged(self):
        # 신본 자체가 작으면(장절 포함 10섹션 미만) 규약 판정 보류
        old_map = {'§머리': 'x'}
        new_map = {'제1조': 'a', '제2조': 'b', '§부칙': 'c'}
        assert not R.uncomparable(old_map, new_map)


class TestFindRefMd:
    def test_pdf_reference_resolves_md_sibling(self, tmp_path, monkeypatch):
        (tmp_path / '과목1').mkdir()
        f = tmp_path / '과목1' / '법(제1호)(20260101).md'
        f.write_text('x', encoding='utf-8')
        monkeypatch.setattr(D, 'REF_MD', tmp_path)
        assert D.find_ref_md('법(제1호)(20260101).pdf') == f
        assert D.find_ref_md('법(제1호)(20260101).md') == f
        assert D.find_ref_md('없는법(제1호)(20260101).pdf') is None
