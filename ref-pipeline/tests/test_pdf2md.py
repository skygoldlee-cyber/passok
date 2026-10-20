"""pdf2md.py 순수 변환·검증 함수 단위 테스트.

pdfplumber/pymupdf 없이 import 가능하도록 설계된 함수만 대상으로 한다
(pdf2md는 두 의존성을 lazy import하므로 테스트 환경에 설치 불필요).
convert() 엔드투엔드 테스트는 pymupdf로 PDF를 런타임 생성하며,
의존성 미설치 환경에서는 자동 스킵된다.
실행: python -m pytest ref-pipeline/tests/ -v
"""
import json
import logging
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pdf2md  # noqa: E402


# ---------------------------------------------------------------------------
# cell_text / table_to_md / merge_split_columns
# ---------------------------------------------------------------------------

class TestCellText:
    def test_none_becomes_empty(self):
        assert pdf2md.cell_text(None) == ''

    def test_newline_merged_and_whitespace_collapsed(self):
        assert pdf2md.cell_text('  ab\nc  d ') == 'abc d'

    def test_pipe_escaped_to_fullwidth(self):
        assert pdf2md.cell_text('a|b') == 'a｜b'


class TestTableToMd:
    def test_header_separator_body(self):
        rows = [['A', 'B'], ['1', '2'], ['3', '4']]
        md = pdf2md.table_to_md(rows)
        lines = md.split('\n')
        assert lines[0] == '| A | B |'
        assert lines[1] == '| --- | --- |'
        assert lines[2] == '| 1 | 2 |'

    def test_empty_input(self):
        assert pdf2md.table_to_md([]) == ''
        assert pdf2md.table_to_md([[None, None]]) == ''

    def test_ragged_rows_padded(self):
        md = pdf2md.table_to_md([['A', 'B', 'C'], ['1']])
        assert '| 1 |  |  |' in md


class TestMergeSplitColumns:
    def test_constant_pair_merged(self):
        # 모든 행에서 'CAS'|'No' 쌍이 상수 → 병합
        rows = [
            ['CAS', 'No', 'Name'],
            ['CAS', 'No', 'a'],
            ['CAS', 'No', 'b'],
        ]
        out = pdf2md.merge_split_columns(rows)
        assert out[0] == ['CAS No', 'Name']
        assert out[1] == ['CAS No', 'a']

    def test_varying_pair_not_merged(self):
        rows = [
            ['1', 'x', 'a'],
            ['2', 'y', 'b'],
            ['3', 'z', 'c'],
        ]
        out = pdf2md.merge_split_columns(rows)
        assert out[0] == ['1', 'x', 'a']

    def test_too_few_rows_passthrough(self):
        rows = [['CAS', 'No']]
        assert pdf2md.merge_split_columns(rows) == rows


# ---------------------------------------------------------------------------
# promote_text_header / merge_continuation_tables
# ---------------------------------------------------------------------------

class TestPromoteTextHeader:
    def _tbl(self, first_cell='1'):
        return f'| {first_cell} | x | y |\n| --- | --- | --- |\n| 2 | a | b |'

    def test_text_header_promoted_into_table(self):
        segs = [
            (10, 'text', 'No 성분 한도'),
            (20, 'table', self._tbl()),
        ]
        out = pdf2md.promote_text_header(segs)
        assert len(out) == 1
        assert out[0][2].split('\n')[0] == '| No | 성분 | 한도 |'
        # 승격된 텍스트 세그먼트는 제거됨
        assert all(s[2] is not None for s in out)

    def test_token_count_mismatch_not_promoted(self):
        segs = [
            (10, 'text', '단어 두개만'),
            (20, 'table', self._tbl()),
        ]
        out = pdf2md.promote_text_header(segs)
        assert len(out) == 2

    def test_non_data_first_row_not_promoted(self):
        segs = [
            (10, 'text', 'No 성분 한도'),
            (20, 'table', self._tbl(first_cell='가')),
        ]
        out = pdf2md.promote_text_header(segs)
        assert len(out) == 2

    def test_far_apart_not_promoted(self):
        segs = [
            (10, 'text', 'No 성분 한도'),
            (200, 'table', self._tbl()),
        ]
        out = pdf2md.promote_text_header(segs)
        assert len(out) == 2


class TestMergeContinuationTables:
    def test_continuation_merged(self):
        t1 = '| No | A |\n| --- | --- |\n| 1 | x |'
        t2 = '| 2 | y |\n| --- | --- |\n| 3 | z |'
        segs = [(0, 'table', t1), (10, 'table', t2)]
        out = pdf2md.merge_continuation_tables(segs)
        assert len(out) == 1
        assert '| 2 | y |' in out[0][2]
        assert '| 3 | z |' in out[0][2]

    def test_repeated_header_dropped(self):
        t1 = '| No | A |\n| --- | --- |\n| 1 | x |'
        t2 = '| No | A |\n| --- | --- |\n| 2 | y |'
        segs = [(0, 'table', t1), (10, 'table', t2)]
        out = pdf2md.merge_continuation_tables(segs)
        assert len(out) == 1
        assert out[0][2].count('| No | A |') == 1  # 반복 헤더 1번만

    def test_junk_text_between_tables_ignored(self):
        t1 = '| No | A |\n| --- | --- |\n| 1 | x |'
        t2 = '| 2 | y |\n| --- | --- |\n| 3 | z |'
        segs = [
            (0, 'table', t1),
            (5, 'text', '- 3 -'),           # 쪽번호 잡행
            (10, 'table', t2),
        ]
        out = pdf2md.merge_continuation_tables(segs)
        assert len(out) == 2  # 표 병합됨, 잡행 텍스트는 남음
        assert out[0][1] == 'table' and '| 2 | y |' in out[0][2]

    def test_real_text_between_tables_blocks_merge(self):
        t1 = '| No | A |\n| --- | --- |\n| 1 | x |'
        t2 = '| 2 | y |\n| --- | --- |\n| 3 | z |'
        segs = [
            (0, 'table', t1),
            (5, 'text', '일반 문단 텍스트입니다'),
            (10, 'table', t2),
        ]
        out = pdf2md.merge_continuation_tables(segs)
        assert len(out) == 3

    def test_width_mismatch_not_merged(self):
        t1 = '| No | A |\n| --- | --- |\n| 1 | x |'
        t2 = '| 2 | y | z | w |\n| --- | --- | --- | --- |\n| 3 | a | b | c |'
        segs = [(0, 'table', t1), (10, 'table', t2)]
        out = pdf2md.merge_continuation_tables(segs)
        assert len(out) == 2


# ---------------------------------------------------------------------------
# segment_sentences
# ---------------------------------------------------------------------------

class TestSegmentSentences:
    @pytest.fixture(autouse=True)
    def _segment_on(self):
        old = pdf2md.PROFILE.get('segment', True)
        pdf2md.PROFILE['segment'] = True
        yield
        pdf2md.PROFILE['segment'] = old

    def test_wrap_lines_merged(self):
        segs = [
            (0, 'text', '화장품은 인체를'),
            (1, 'text', '청결·미화하기 위하여'),
            (2, 'text', '사용되는 물품을 말한다.'),
        ]
        out = pdf2md.segment_sentences(segs)
        assert out == [(0, 'text',
                        '화장품은 인체를 청결·미화하기 위하여 사용되는 물품을 말한다.')]

    def test_closed_unit_starts_new(self):
        segs = [
            (0, 'text', '정의한다.'),
            (1, 'text', '다음 문장 시작'),
        ]
        out = pdf2md.segment_sentences(segs)
        assert len(out) == 2

    def test_struct_marker_starts_new(self):
        segs = [
            (0, 'text', '이전 내용'),
            (1, 'text', '제3조(정의) 새 조항'),
        ]
        out = pdf2md.segment_sentences(segs)
        assert len(out) == 2
        assert out[1][2] == '제3조(정의) 새 조항'

    def test_table_boundary_resets(self):
        segs = [
            (0, 'text', '앞 문장'),
            (1, 'table', '| a |\n| --- |'),
            (2, 'text', '뒤 문장'),
        ]
        out = pdf2md.segment_sentences(segs)
        assert len(out) == 3

    def test_segment_off_passthrough(self):
        pdf2md.PROFILE['segment'] = False
        segs = [(0, 'text', 'a'), (1, 'text', 'b')]
        assert pdf2md.segment_sentences(segs) == segs


# ---------------------------------------------------------------------------
# whitespace_ratio / _norm_cmp / _is_junk_cmp
# ---------------------------------------------------------------------------

class TestCompareHelpers:
    def test_whitespace_ratio(self):
        assert pdf2md.whitespace_ratio('ab cd') == pytest.approx(20.0)
        assert pdf2md.whitespace_ratio('') == 0

    def test_norm_cmp_strips_markup(self):
        a = pdf2md._norm_cmp('| 셀 **내용** |')
        b = pdf2md._norm_cmp('셀내용')
        assert a == b

    def test_is_junk_cmp(self):
        assert pdf2md._is_junk_cmp('- 12 -')          # 쪽번호
        assert pdf2md._is_junk_cmp('국가법령정보센터')   # 워터마크
        assert not pdf2md._is_junk_cmp('제1조(목적) 이 법은')


# ---------------------------------------------------------------------------
# _md_table_blocks / table_health / doctor_report
# ---------------------------------------------------------------------------

class TestTableHealth:
    def test_md_table_blocks(self):
        md = '문단\n| a | b |\n| --- | --- |\n\n또 문단\n| c |\n| --- |\n| d |\n'
        blocks = pdf2md._md_table_blocks(md)
        assert len(blocks) == 2

    def test_single_pipe_line_not_a_block(self):
        assert pdf2md._md_table_blocks('| only one line |') == []

    def test_table_health_flags(self):
        h = pdf2md.table_health('| a | b |\n| --- | --- |\n|  | x |')
        assert h['cols'] == 2 and h['rows'] == 1
        assert h['empty_pct'] == pytest.approx(50.0)
        assert not h['ragged']

    def test_doctor_report_counts_flagged(self, caplog):
        md = '| a |\n| --- |\n|  |'  # 열<2 + 빈셀
        with caplog.at_level('WARNING', logger='pdf2md'):
            n = pdf2md.doctor_report('doc', md)
        assert n == 1
        assert '표 1개 점검 필요' in caplog.text

    def test_doctor_report_healthy(self):
        md = '| a | b |\n| --- | --- |\n| 1 | 2 |'
        assert pdf2md.doctor_report('doc', md) == 0


# ---------------------------------------------------------------------------
# _scan_dir / collect_pdfs / _labeled
# ---------------------------------------------------------------------------

class TestInputResolution:
    def test_scan_dir_finds_pdfs(self, tmp_path):
        (tmp_path / 'a.pdf').write_bytes(b'x')
        sub = tmp_path / '과목1'
        sub.mkdir()
        (sub / 'b.pdf').write_bytes(b'x')
        (sub / 'skip.md').write_text('x')
        found = pdf2md._scan_dir(str(tmp_path))
        assert len(found) == 2
        # 라벨은 부모 디렉터리명
        labels = {os.path.basename(p): l for l, p in found}
        assert labels['b.pdf'] == '과목1'

    def test_scan_dir_excludes_output_dirs(self, tmp_path):
        for d in ('ref_md', 'ref_md_v2', 'out', 'md', 'keep'):
            (tmp_path / d).mkdir()
            (tmp_path / d / 'x.pdf').write_bytes(b'x')
        found = pdf2md._scan_dir(str(tmp_path), apply_excludes=True)
        assert [os.path.basename(p) for l, p in found] == ['x.pdf']
        assert found[0][0] == 'keep'

    def test_collect_pdfs_explicit_paths(self, tmp_path):
        (tmp_path / 'one.pdf').write_bytes(b'x')
        out = pdf2md.collect_pdfs([str(tmp_path / 'one.pdf')], str(tmp_path))
        assert len(out) == 1

    def test_collect_pdfs_name_filter(self, tmp_path):
        (tmp_path / 'alpha.pdf').write_bytes(b'x')
        (tmp_path / 'beta.pdf').write_bytes(b'x')
        out = pdf2md.collect_pdfs(['alpha'], str(tmp_path))
        assert [os.path.basename(p) for _, p in out] == ['alpha.pdf']

    def test_collect_pdfs_dedupes(self, tmp_path):
        (tmp_path / 'a.pdf').write_bytes(b'x')
        out = pdf2md.collect_pdfs(
            [str(tmp_path / 'a.pdf'), str(tmp_path / 'a.pdf')], str(tmp_path))
        assert len(out) == 1


# ---------------------------------------------------------------------------
# plan_doc_jobs — 동명 PDF 출력 충돌 구분
# ---------------------------------------------------------------------------

def _mk_pdfs(tmp_path, pairs):
    """(subdir, name) 쌍으로 PDF 파일을 만들고 (label, path) 리스트 반환."""
    pdfs = []
    for sub, name in pairs:
        d = tmp_path / sub
        d.mkdir(parents=True, exist_ok=True)
        p = d / (name + '.pdf')
        p.write_bytes(b'x')
        pdfs.append((sub, str(p)))
    return pdfs


class TestPlanDocJobs:
    def test_unique_basenames_flat_structure(self, tmp_path):
        pdfs = _mk_pdfs(tmp_path, [('과목1', 'a'), ('과목2', 'b')])
        jobs = pdf2md.plan_doc_jobs(pdfs, str(tmp_path / 'out'))
        dirs = {j['doc']: j['md'] for j in jobs}
        assert 'a' in dirs and dirs['a'].endswith(os.path.join('a', 'a.md'))
        assert all(not j['collided'] for j in jobs)

    def test_collision_uses_subdir(self, tmp_path):
        pdfs = _mk_pdfs(tmp_path, [('과목1', '법'), ('과목2', '법'), ('과목1', '고시')])
        jobs = pdf2md.plan_doc_jobs(pdfs, str(tmp_path / 'out'))
        by_doc = {j['doc']: j for j in jobs}
        # 충돌 문서는 {out}/{subdir}/{name}/{name}.md — 골드 과목N 구조와 정합
        assert '과목1/법' in by_doc and '과목2/법' in by_doc
        p1 = by_doc['과목1/법']['md'].replace('/', os.sep)
        assert p1.endswith(os.path.join('과목1', '법', '법.md'))
        # 비충돌 문서는 기존 구조 유지
        assert '고시' in by_doc
        assert by_doc['고시']['md'].endswith(os.path.join('고시', '고시.md'))

    def test_flat_collision_uses_stem_prefix(self, tmp_path):
        pdfs = _mk_pdfs(tmp_path, [('s1', 'x'), ('s2', 'x')])
        jobs = pdf2md.plan_doc_jobs(pdfs, str(tmp_path / 'out'), flat=True)
        mds = sorted(j['md'] for j in jobs)
        assert len(mds) == 2
        assert any('s1__x.md' in m for m in mds)
        assert all(j['img_prefix'].endswith('_') for j in jobs)

    def test_none_out_dir_uses_input_folder(self, tmp_path):
        """out_dir=None이면 문서 출력 루트는 각 입력 PDF의 폴더."""
        pdfs = _mk_pdfs(tmp_path, [('과목1', 'a'), ('과목2', 'b')])
        jobs = pdf2md.plan_doc_jobs(pdfs, None)
        by_doc = {j['doc']: j for j in jobs}
        assert by_doc['a']['md'] == str(
            tmp_path / '과목1' / 'a' / 'a.md')
        assert by_doc['b']['md'] == str(
            tmp_path / '과목2' / 'b' / 'b.md')

    def test_none_out_dir_flat(self, tmp_path):
        pdfs = _mk_pdfs(tmp_path, [('과목1', 'a')])
        jobs = pdf2md.plan_doc_jobs(pdfs, None, flat=True)
        assert jobs[0]['md'] == str(tmp_path / '과목1' / 'a.md')


# ---------------------------------------------------------------------------
# verify — 중첩·충돌 구분 산출물 vs 골드
# ---------------------------------------------------------------------------

def _write(p: Path, text: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')


class TestVerify:
    def test_nested_twolevel_vs_gold(self, tmp_path):
        out = tmp_path / 'out'
        gold = tmp_path / 'gold'
        body = '내용 첫 줄이다.\n내용 둘째 줄이다.\n'
        # 충돌 구분 산출물 out/과목1/법/법.md vs gold/과목1/법/법.md
        _write(out / '과목1' / '법' / '법.md', '# 법\n\n' + body)
        _write(gold / '과목1' / '법' / '법.md', body)
        assert pdf2md.verify(str(out), str(gold)) == 0

    def test_missing_content_flagged(self, tmp_path):
        out = tmp_path / 'out'
        gold = tmp_path / 'gold'
        _write(out / 'doc' / 'doc.md', '있는 내용\n')
        _write(gold / 'doc' / 'doc.md', '있는 내용\n없어진 중요 내용 라인\n')
        assert pdf2md.verify(str(out), str(gold)) == 1

    def test_flat_output_matched(self, tmp_path):
        out = tmp_path / 'out'
        gold = tmp_path / 'gold'
        body = '플랫 산출물 본문 내용\n'
        _write(out / 'doc.md', body)
        _write(gold / '과목1' / 'doc' / 'doc.md', body)
        assert pdf2md.verify(str(out), str(gold)) == 0

    def test_only_filter(self, tmp_path):
        out = tmp_path / 'out'
        gold = tmp_path / 'gold'
        _write(out / 'a' / 'a.md', '공통 내용\n')
        _write(out / 'b' / 'b.md', '일부만\n')
        _write(gold / 'a' / 'a.md', '공통 내용\n')
        _write(gold / 'b' / 'b.md', '일부만\n누락된 줄이다\n')
        # only='a' 이면 b의 누락은 무시
        assert pdf2md.verify(str(out), str(gold), only='a') == 0
        assert pdf2md.verify(str(out), str(gold)) == 1

    def test_only_multiple_filters(self, tmp_path):
        out = tmp_path / 'out'
        gold = tmp_path / 'gold'
        for name, missing in (('a', True), ('b', True), ('c', False)):
            _write(out / name / f'{name}.md', '공통 내용\n')
            _write(gold / name / f'{name}.md',
                   '공통 내용\n' + ('누락된 줄이다\n' if missing else ''))
        assert pdf2md.verify(str(out), str(gold), only=['a', 'c']) == 1


# ---------------------------------------------------------------------------
# reconstruct_borderless — edges 밖 단어가 마지막 열에 흡수되지 않음
# ---------------------------------------------------------------------------

class _FakePage:
    """reconstruct_borderless가 쓰는 최소 페이지 스텁."""
    height = 800.0

    def __init__(self, words):
        self._w = words

    def extract_words(self):
        return self._w


def _w(x0, x1, top, text):
    return {'x0': x0, 'x1': x1, 'top': top, 'bottom': top + 8, 'text': text}


class TestReconstructBorderless:
    EDGES = [0, 100, 200, 300]  # 3열 밴드

    def _page(self, extra_word=None):
        words = []
        for i, mark in enumerate(('가.', '나.', '다.', '라.', '마.')):
            y = 100 + i * 12
            words += [
                _w(10, 30, y, mark),
                _w(120, 160, y, f'v{i}'),
                _w(220, 260, y, f'w{i}'),
            ]
            if extra_word and i == 2:
                words.append(extra_word)
        return _FakePage(words)

    def test_basic_reconstruct(self):
        md, ivs, rows = pdf2md.reconstruct_borderless(
            self._page(), self.EDGES, 0, [])
        assert md is not None
        assert '| 가.' in md or '가.' in md

    def test_margin_word_beyond_edges_excluded(self):
        # 우측 마진 잡행 (edges[-1]+15=315 초과) — 마지막 셀에 붙으면 안 됨
        page = self._page(extra_word=_w(400, 430, 124, '마진잡행'))
        md, ivs, rows = pdf2md.reconstruct_borderless(
            page, self.EDGES, 0, [])
        assert md is not None
        assert '마진잡행' not in md

    def test_near_edge_word_still_included(self):
        # edges[-1]+15 이내는 표 오버행으로 간주해 유지
        page = self._page(extra_word=_w(305, 312, 124, '오버행'))
        md, ivs, rows = pdf2md.reconstruct_borderless(
            page, self.EDGES, 0, [])
        assert '오버행' in md


# ---------------------------------------------------------------------------
# collect_pdfs — 토큰 해석 경고 (침묵적 무시/격하 방지)
# ---------------------------------------------------------------------------

class TestCollectPdfsWarnings:
    def test_filter_ignored_when_path_given_warns(self, tmp_path, caplog):
        # 경로 입력이 매칭되면 파일명 필터 토큰은 적용되지 않음 — 경고 필수
        (tmp_path / 'a.pdf').write_bytes(b'x')
        with caplog.at_level(logging.WARNING, 'pdf2md'):
            out = pdf2md.collect_pdfs(
                [str(tmp_path / 'a.pdf'), '화장품법'], str(tmp_path))
        assert len(out) == 1
        assert any('화장품법' in r.getMessage() for r in caplog.records)

    def test_filter_matching_nothing_warns(self, tmp_path, caplog):
        # 존재하지 않는 경로 오타 → 필터로 격하 후 무매칭 — 경고로 표출
        (tmp_path / 'a.pdf').write_bytes(b'x')
        with caplog.at_level(logging.WARNING, 'pdf2md'):
            out = pdf2md.collect_pdfs(['zzz_nomatch'], str(tmp_path))
        assert out == []
        assert any('zzz_nomatch' in r.getMessage() for r in caplog.records)


# ---------------------------------------------------------------------------
# _pool_init — --no-segment가 프로파일보다 우선 (직렬 경로와 동일 우선순위)
# ---------------------------------------------------------------------------

class TestPoolInit:
    def test_cli_segment_flag_wins_over_profile(self, tmp_path):
        prof = tmp_path / 'p.json'
        prof.write_text('{"segment": true}', encoding='utf-8')
        old = pdf2md.PROFILE['segment']
        try:
            pdf2md._pool_init(False, str(prof))
            assert pdf2md.PROFILE['segment'] is False
        finally:
            pdf2md.PROFILE['segment'] = old


# ---------------------------------------------------------------------------
# main() — 문서별 실패가 있으면 종료 코드 1 (CI/스크립트 체인이 감지 가능)
# ---------------------------------------------------------------------------

class TestMainExitCode:
    def test_doc_failure_exits_1(self, tmp_path, monkeypatch):
        pdf = tmp_path / 'a.pdf'
        pdf.write_bytes(b'x')
        monkeypatch.setattr(
            pdf2md, '_convert_one',
            lambda job, use_images: (_ for _ in ()).throw(
                RuntimeError('convert fail')))
        monkeypatch.setattr(
            sys, 'argv',
            ['pdf2md.py', '--cli', str(pdf), '-o', str(tmp_path / 'out')])
        with pytest.raises(SystemExit) as e:
            pdf2md.main()
        assert e.value.code == 1

    def test_all_success_does_not_exit(self, tmp_path, monkeypatch):
        pdf = tmp_path / 'a.pdf'
        pdf.write_bytes(b'x')
        monkeypatch.setattr(pdf2md, '_convert_one',
                            lambda job, use_images: '본문')
        out_dir = tmp_path / 'out'
        monkeypatch.setattr(
            sys, 'argv',
            ['pdf2md.py', '--cli', str(pdf), '-o', str(out_dir)])
        assert pdf2md.main() is None
        assert (out_dir / 'a' / 'a.md').exists()

    def test_convert_wrapper_failure_exits_1(self, tmp_path, monkeypatch):
        # convert.py(convert:refs 진입점)도 동일한 종료 코드 계약을 가져야 함
        old = pdf2md.PROFILE['segment']
        try:
            import convert
            (tmp_path / 'a.pdf').write_bytes(b'x')
            monkeypatch.setattr(
                pdf2md, 'convert',
                lambda *a, **k: (_ for _ in ()).throw(RuntimeError('x')))
            monkeypatch.setattr(
                sys, 'argv',
                ['convert.py', '--pdf-root', str(tmp_path),
                 '--staging', str(tmp_path / 'st')])
            with pytest.raises(SystemExit) as e:
                convert.main()
            assert e.value.code == 1
        finally:
            pdf2md.PROFILE['segment'] = old


# ---------------------------------------------------------------------------
# profile_context — 실행 간 프로파일 오버라이드 격리
# ---------------------------------------------------------------------------

class TestProfileContext:
    def test_overrides_restored(self, tmp_path):
        prof = tmp_path / 'p.json'
        prof.write_text('{"margin_pt": 99}', encoding='utf-8')
        seg_before = pdf2md.PROFILE['segment']
        margin_before = pdf2md.MARGIN_PT
        with pdf2md.profile_context(str(prof), segment=False):
            assert pdf2md.MARGIN_PT == 99          # 컴파일 전역도 갱신됨
            assert pdf2md.PROFILE['segment'] is False
        assert pdf2md.MARGIN_PT == margin_before
        assert pdf2md.PROFILE['segment'] == seg_before

    def test_segment_only(self):
        seg_before = pdf2md.PROFILE['segment']
        with pdf2md.profile_context(segment=False):
            assert pdf2md.PROFILE['segment'] is False
        assert pdf2md.PROFILE['segment'] == seg_before


# ---------------------------------------------------------------------------
# verify — 골드 글로브 폴백이 모호하면 경고
# ---------------------------------------------------------------------------

class TestVerifyAmbiguousGold:
    def test_multiple_gold_hits_warns(self, tmp_path, caplog):
        out = tmp_path / 'out'
        gold = tmp_path / 'gold'
        body = '공통 내용\n'
        _write(out / 'doc' / 'doc.md', body)
        # 같은 stem의 골드가 두 과목에 존재 — 어느 쪽과 비교됐는지 알 수 없다
        _write(gold / '과목1' / 'doc' / 'doc.md', body)
        _write(gold / '과목2' / 'doc' / 'doc.md', body + '추가 줄이다\n')
        with caplog.at_level(logging.WARNING, 'pdf2md'):
            pdf2md.verify(str(out), str(gold))
        assert any('골드 매칭 모호' in r.getMessage() for r in caplog.records)


# ---------------------------------------------------------------------------
# convert() 골든 회귀 — pdfplumber/pymupdf 필요, 미설치 환경은 스킵
# ---------------------------------------------------------------------------

def _make_sample_pdf(path):
    """최소 샘플 PDF 생성 — 텍스트 2줄 + ruled 2열 표 1개 (격자선 감지용)."""
    pymupdf = pytest.importorskip('pymupdf')
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 80), 'Section 1 Purpose of this document sample line.')
    page.insert_text((72, 96), 'Second paragraph continues the sample text.')
    # 2열 3행 격자 표 (테두리 rect + 세로선 + 가로선 2개)
    page.draw_rect(pymupdf.Rect(72, 150, 300, 246))
    page.draw_line((186, 150), (186, 246))
    for y in (182, 214):
        page.draw_line((72, y), (300, y))
    for x, y, t in ((80, 172, 'No'), (194, 172, 'Name'),
                    (80, 204, '1'), (194, 204, 'alpha'),
                    (80, 236, '2'), (194, 236, 'beta')):
        page.insert_text((x, y), t)
    doc.save(str(path))
    doc.close()


class TestConvertGolden:
    def test_convert_extracts_text_and_table(self, tmp_path):
        pytest.importorskip('pdfplumber')
        pdf = tmp_path / 'sample.pdf'
        _make_sample_pdf(pdf)
        out = pdf2md.convert(str(pdf))
        assert 'Purpose of this document' in out
        assert '| No | Name |' in out
        assert '| 1 | alpha |' in out
        assert '| 2 | beta |' in out

    def test_convert_respects_no_segment(self, tmp_path, monkeypatch):
        pytest.importorskip('pdfplumber')
        pdf = tmp_path / 'sample.pdf'
        _make_sample_pdf(pdf)
        monkeypatch.setitem(pdf2md.PROFILE, 'segment', False)
        out = pdf2md.convert(str(pdf))
        assert 'Purpose of this document' in out


def _make_margin_pdf(path, npages=3):
    """러닝 헤더(상단 마진)·쪽번호(하단)가 매 페이지 반복되는 PDF.

    collect_margin_junk는 같은 마진 텍스트가 MARGIN_FREQ_MIN(3)회 이상
    반복돼야 잡행으로 수집한다 — 3페이지 모두에 같은 헤더를 배치한다.
    """
    pymupdf = pytest.importorskip('pymupdf')
    doc = pymupdf.open()
    for i in range(npages):
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 30), 'Repeating Running Header')   # top<45 마진
        page.insert_text((72, 200),
                         f'Body paragraph sentence of page {i + 1}.')
        page.insert_text((280, 820), f'- {i + 1} -')             # 하단 쪽번호
    doc.save(str(path))
    doc.close()


def _make_borderless_pdf(path):
    """무선 표 재구성 검증용 — 1행 격자 헤더 + 무선 본문 5행.

    헤더 전용 표(≤3행·≥5열)가 감지되면 열 밴드를 학습해 아래 무선 본문을
    표로 재구성한다. 행 마커는 ROW_MARKER_RE에 맞는 '1.' 스타일.
    """
    pymupdf = pytest.importorskip('pymupdf')
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    edges = [72, 140, 208, 276, 344, 412]                 # 5열 밴드 경계
    page.draw_rect(pymupdf.Rect(edges[0], 150, edges[-1], 178))
    for x in edges[1:-1]:
        page.draw_line((x, 150), (x, 178))
    for x, t in zip(edges, ('Num', 'Name', 'CAS', 'Pct', 'Note')):
        page.insert_text((x + 8, 172), t)
    rows = [(f'{i}.', f'ing{i}', f'{i}11-{i}1-{i}',
             f'{i}.0%', f'note{i}') for i in range(1, 6)]
    for i, row in enumerate(rows):
        y = 210 + i * 14
        for x, t in zip(edges[:-1], row):
            page.insert_text((x + 8, y), t)
    doc.save(str(path))
    doc.close()


def _make_image_pdf(path):
    """이미지 1개가 내장된 PDF."""
    pymupdf = pytest.importorskip('pymupdf')
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 100), 'Document with an embedded image below.')
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 8, 8))
    page.insert_image(pymupdf.Rect(72, 150, 120, 198),
                      stream=pix.tobytes('png'))
    doc.save(str(path))
    doc.close()


class TestConvertFixtures:
    """생성 PDF 기반 엔드투엔드 — 마진 잡행·무선 표·이미지·동명 문서."""

    def test_margin_junk_removed_across_pages(self, tmp_path):
        pytest.importorskip('pdfplumber')
        pdf = tmp_path / 'multi.pdf'
        _make_margin_pdf(pdf)
        out = pdf2md.convert(str(pdf))
        # 3페이지 반복 러닝 헤더는 제거, 본문은 유지
        assert 'Repeating Running Header' not in out
        assert '- 1 -' not in out
        assert 'Body paragraph sentence of page 1' in out
        assert 'Body paragraph sentence of page 3' in out

    def test_borderless_table_reconstructed(self, tmp_path):
        pytest.importorskip('pdfplumber')
        pdf = tmp_path / 'borderless.pdf'
        _make_borderless_pdf(pdf)
        out = pdf2md.convert(str(pdf))
        # 무선 본문이 표로 재구성됐다 — 텍스트가 아닌 파이프 행으로 존재
        assert '| 1. |' in out
        assert 'ing5' in out and 'note5' in out

    def test_image_extracted_and_referenced(self, tmp_path):
        pytest.importorskip('pdfplumber')
        pytest.importorskip('pymupdf')
        pdf = tmp_path / 'img.pdf'
        _make_image_pdf(pdf)
        images_dir = tmp_path / 'out' / 'images'
        out = pdf2md.convert(str(pdf), str(images_dir))
        assert '![이미지](images/page000_img00.png)' in out
        assert (images_dir / 'page000_img00.png').exists()
        assert 'embedded image' in out

    def test_image_skipped_without_dir(self, tmp_path):
        pytest.importorskip('pdfplumber')
        pdf = tmp_path / 'img.pdf'
        _make_image_pdf(pdf)
        out = pdf2md.convert(str(pdf))   # images_dir=None → 이미지 미추출
        assert '![이미지]' not in out

    def test_same_name_docs_disambiguated_e2e(self, tmp_path, monkeypatch):
        pytest.importorskip('pdfplumber')
        for sub in ('s1', 's2'):
            d = tmp_path / sub
            d.mkdir()
            _make_sample_pdf(d / 'common.pdf')
        out_dir = tmp_path / 'out'
        monkeypatch.setattr(
            sys, 'argv',
            ['pdf2md.py', '--cli', str(tmp_path), '-o', str(out_dir)])
        assert pdf2md.main() is None
        assert (out_dir / 's1' / 'common' / 'common.md').exists()
        assert (out_dir / 's2' / 'common' / 'common.md').exists()
        # 정규화된 리포트 스키마 — status/src가 모든 행에 존재
        report = json.loads(
            (out_dir / '_report.json').read_text(encoding='utf-8'))
        assert len(report) == 2
        assert all(r['status'] == 'OK' for r in report)
        assert {r['src'] for r in report} == {'s1', 's2'}

    def test_corrupt_pdf_reports_fail_row(self, tmp_path, monkeypatch):
        pytest.importorskip('pdfplumber')
        bad = tmp_path / 'bad.pdf'
        bad.write_bytes(b'this is not a real pdf file')
        out_dir = tmp_path / 'out'
        monkeypatch.setattr(
            sys, 'argv',
            ['pdf2md.py', '--cli', str(bad), '-o', str(out_dir)])
        with pytest.raises(SystemExit) as e:
            pdf2md.main()
        assert e.value.code == 1
        report = json.loads(
            (out_dir / '_report.json').read_text(encoding='utf-8'))
        assert report[0]['status'] == 'FAIL'
        assert report[0]['error'] and report[0]['src']


# ---------------------------------------------------------------------------
# merge_continuation_tables — ±1 열 허용은 유령 열에만 (오병합 차단)
# ---------------------------------------------------------------------------

class TestPhantomColumnMerge:
    def test_phantom_col_merged_at_narrower_width(self):
        t1 = '| 1 | x |\n| --- | --- |\n| 2 | a |'
        # 3열로 감지됐지만 가운데 열은 전 행이 빈 유령 열
        t2 = ('| 3 |  | b |\n| --- | --- | --- |\n'
              '| 4 |  | c |')
        out = pdf2md.merge_continuation_tables(
            [(0, 'table', t1), (10, 'table', t2)])
        assert len(out) == 1
        assert '| 3 | b |' in out[0][2]
        assert out[0][2].split('\n')[0].count('|') - 1 == 2

    def test_real_extra_col_not_merged(self):
        t1 = '| 1 | x |\n| --- | --- |\n| 2 | a |'
        # 유령 열이 아닌 실제 3열 표 → 별개 표로 남겨야 한다
        t2 = ('| 3 | mid | b |\n| --- | --- | --- |\n'
              '| 4 | mid2 | c |')
        out = pdf2md.merge_continuation_tables(
            [(0, 'table', t1), (10, 'table', t2)])
        assert len(out) == 2

    def test_wider_prev_phantom_merged(self):
        # 앞 표가 유령 열을 가진 경우도 병합
        t1 = '| 1 |  | x |\n| --- | --- | --- |\n| 2 |  | a |'
        t2 = '| 3 | b |\n| --- | --- |\n| 4 | c |'
        out = pdf2md.merge_continuation_tables(
            [(0, 'table', t1), (10, 'table', t2)])
        assert len(out) == 1
        assert '| 4 | c |' in out[0][2]
