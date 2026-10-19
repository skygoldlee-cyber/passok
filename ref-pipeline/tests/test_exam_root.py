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
        # .env.local.json도 없는 상태 → 빈 문자열
        assert check_mfds_notice.load_oc_key() == ''

    def test_dotenv_file_resolves_key(self, tmp_path, monkeypatch):
        (tmp_path / '.env').write_text('LAW_OC_KEY=from_dotenv\n', encoding='utf-8')
        monkeypatch.setattr(_exam_root, 'REPO_ROOT', tmp_path)
        monkeypatch.delenv('LAW_OC_KEY', raising=False)
        assert check_mfds_notice.load_oc_key() == 'from_dotenv'
