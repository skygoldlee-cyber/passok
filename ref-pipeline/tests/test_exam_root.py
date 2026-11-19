"""_exam_root.py·check_mfds_notice.py의 로컬 시크릿 해석 단위 테스트.

대상: load_dotenv()(루트 .env 로더)와 load_oc_key()(LAW_OC_KEY 해석 우선순위).
실행: python -m pytest ref-pipeline/tests/ -v
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import _exam_root  # noqa: E402
import check_mfds_notice  # noqa: E402


class TestLoadDotenv:
    def test_parses_key_value_and_comments(self, tmp_path, monkeypatch):
        (tmp_path / '.env').write_text(
            '# 주석\n\nT_DE_A=hello\nT_DE_B="quoted"\nT_DE_C=  spaced  \n',
            encoding='utf-8')
        monkeypatch.setattr(_exam_root, 'REPO_ROOT', tmp_path)
        for k in ('T_DE_A', 'T_DE_B', 'T_DE_C'):
            monkeypatch.delenv(k, raising=False)
        _exam_root.load_dotenv()
        assert os.environ['T_DE_A'] == 'hello'
        assert os.environ['T_DE_B'] == 'quoted'
        assert os.environ['T_DE_C'] == 'spaced'

    def test_does_not_override_existing_env(self, tmp_path, monkeypatch):
        (tmp_path / '.env').write_text('T_DE_EXIST=from_file\n', encoding='utf-8')
        monkeypatch.setattr(_exam_root, 'REPO_ROOT', tmp_path)
        monkeypatch.setenv('T_DE_EXIST', 'from_shell')
        _exam_root.load_dotenv()
        assert os.environ['T_DE_EXIST'] == 'from_shell'

    def test_missing_file_is_noop(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_exam_root, 'REPO_ROOT', tmp_path)
        _exam_root.load_dotenv()  # .env 없음 — 예외 없이 통과


class TestLoadOcKey:
    def test_env_var_wins(self, monkeypatch):
        monkeypatch.setenv('LAW_OC_KEY', 'envkey')
        assert check_mfds_notice.load_oc_key() == 'envkey'

    def test_empty_env_falls_through(self, tmp_path, monkeypatch):
        monkeypatch.delenv('LAW_OC_KEY', raising=False)
        monkeypatch.setattr(check_mfds_notice, 'load_dotenv', lambda: None)
        # 루트 .env도 못 읽는 상태 → 빈 문자열
        assert check_mfds_notice.load_oc_key() == ''

    def test_dotenv_file_resolves_key(self, tmp_path, monkeypatch):
        (tmp_path / '.env').write_text('LAW_OC_KEY=from_dotenv\n', encoding='utf-8')
        monkeypatch.setattr(_exam_root, 'REPO_ROOT', tmp_path)
        monkeypatch.delenv('LAW_OC_KEY', raising=False)
        assert check_mfds_notice.load_oc_key() == 'from_dotenv'


class TestParseRefFilename:
    """파일명 '{문서명}({발령기관})({제N호})({시행일})' → law/admrul 분류."""

    def test_law_targets(self):
        for fn, target in [
            ('산업안전보건법(법률)(제22122호)(20270428).md', 'law'),
            ('산업안전보건법 시행령(대통령령)(제36540호)(20260801).md', 'law'),
            ('화장품법 시행규칙(총리령)(제02109호)(20260402).pdf', 'law'),
            # 부처령(부령) 계열 — 시행규칙·기준규칙 (이전엔 admrul로 오분류)
            ('공중위생관리법 시행규칙(부령)(제01186호)(20260714).md', 'law'),
            ('산업안전보건법 시행규칙(고용노동부령)(제00477호)(20260801).md', 'law'),
            ('산업안전보건기준에 관한 규칙(고용노동부령)(제00450호)(20250901).md', 'law'),
            ('건설기술 진흥법 시행규칙(국토교통부령)(제01597호)(20260611).md', 'law'),
        ]:
            d = _exam_root.parse_ref_filename(fn)
            assert d['target'] == target, f'{fn} → {d["target"]}'
            assert d['baselineNotice'] is not None
            assert d['baselineDate'] is not None

    def test_admrul_targets(self):
        for fn in [
            '화장품 안전기준 등에 관한 규정(식품의약품안전처고시)(제2026-19호)(20260318).pdf',
            '사업장 위험성평가에 관한 지침(고용노동부고시)(제2026-73호)(20261104).md',
            '가설공사 표준안전 작업지침(고용노동부고시)(제2020-3호)(20200116).md',
            # 예규·훈령은 '…부령'으로 끝나지 않아 admrul 유지
            '안전·보건관리전문기관 및 건설재해예방전문지도기관 관리규정(고용노동부예규)(제231호)(20250101).md',
        ]:
            d = _exam_root.parse_ref_filename(fn)
            assert d['target'] == 'admrul', f'{fn} → {d["target"]}'
