# ref-pipeline/tests/test_convert.py — convert.py 스테이징 래퍼 가드 테스트
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONVERT = ROOT / "ref-pipeline" / "convert.py"


def run_convert(pdf_root):
    # Windows 콘솔 기본 인코딩(cp949)이 stderr 한글을 깨뜨리므로 UTF-8 고정
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    return subprocess.run(
        [sys.executable, str(CONVERT), "--pdf-root", str(pdf_root)],
        capture_output=True, text=True, encoding="utf-8", errors="replace", env=env,
    )


def test_no_pdfs_plain_dir(tmp_path):
    """PDF 없고 pdf_hosting.json도 없으면 일반 오류 메시지."""
    r = run_convert(tmp_path)
    assert r.returncode == 1
    assert "변환할 PDF가 없습니다" in r.stderr + r.stdout


def test_no_pdfs_externalized_shows_fetch_hint(tmp_path):
    """pdf_hosting.json이 있으면 외부 호스팅 복원 절차를 안내한다 (DOC-RBK-12)."""
    (tmp_path / "pdf_hosting.json").write_text(
        json.dumps({"assetBase": "https://example.com/x"}), encoding="utf-8")
    r = run_convert(tmp_path)
    assert r.returncode == 1
    out = r.stderr + r.stdout
    assert "fetch_ref_pdfs.js" in out
    assert "외부 호스팅" in out
