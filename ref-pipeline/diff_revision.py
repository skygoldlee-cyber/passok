# -*- coding: utf-8 -*-
# @spec FO-24
"""신규본 감지 문서의 조문 단위 대조 — '진짜 개정'과 '연혁 갱신'을 구분한다.

check_mfds_notice.py는 시행일자 비교로 '신규본 있음'까지만 판단한다.
하지만 시행일이 갱신돼도 본문이 동일한 경우가 있다 — 유예조항 발효로
연혁 시행본이 새 일련번호를 받는 경우 등 (실례: 기준규칙 제450호의
제241조②4호 후단 — 2025-09-01 공포, 2026-03-02 발효).

이 스크립트는 감지된 신규본의 원문을 DRF에서 다시 수집·렌더해
현재 ref_md와 조문 단위로 대조하고 판정한다:

  - identical : 본문 동일 → 파일명 시행일만 갱신하면 baseline 이동 (내용 교체 불요)
  - revised   : 조문 변경·신설·삭제 → 상세 diff 리포트 + 교재·문제은행 영향 검토 필요
  - no-text   : DRF가 본문 미제공 (admrul 일부) → fetch_revision.py 첨부파일 경로
  - error     : 조회·렌더 실패

사용:
    LAW_OC_KEY=<키> python ref-pipeline/diff_revision.py [--exam <id>]
        [--doc <문서명 부분일치>] [--all] [--stage <dir>]

- 기본: newer 감지된 문서만 대조 (없으면 '모든 문서 최신' 출력 후 종료)
- --all: 감지 여부와 무관하게 감시 문서 전체 대조 (검증용)
- --doc: 특정 문서만 대조 (감지 여부 무관)
- --stage: 신본 렌더 결과를 규약 파일명으로 지정 디렉터리에 저장 (사람 검토용)
- 리포트: {시험 루트}/report/법령개정대조결과.md (check_laws와 동일 관례)
- 종료코드: 0=전부 동일 또는 대상 없음, 2=실질 개정 발견
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _exam_root import exam_root, utf8_stdio  # noqa: E402
import drf_render  # noqa: E402

utf8_stdio()
ROOT = Path(__file__).resolve().parent.parent


def _arg(flag):
    for i, a in enumerate(sys.argv):
        if a == flag and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith(flag + '='):
            return a.split('=', 1)[1]
    return None


EXAM_DIR = exam_root(_arg('--exam'))
STATUS_FILE = EXAM_DIR / 'notice_status.json'
REPORT_FILE = EXAM_DIR / 'report' / '법령개정대조결과.md'
REF_MD = EXAM_DIR / '참조자료' / 'ref_md'


def _notice_api():
    import check_mfds_notice as n
    return n


def find_ref_md(filename):
    """ref_md 하위 어디든 규약 파일명을 탐색 — 과목 귀속 폴더/평탄형 모두 대응."""
    hits = sorted(REF_MD.rglob(filename)) if REF_MD.exists() else []
    return hits[0] if hits else None


def fetch_latest_meta(doc):
    """문서 1종의 최신본 메타 — check_mfds_notice의 검색 함수 재사용."""
    n = _notice_api()
    res = n.search_law(doc['name']) if doc['target'] == 'law' else n.search_admrul(doc['name'])
    return res['latest'] if res else None


def fetch_text(doc, serial):
    """최신본 전문 XML — law는 MST, admrul은 ID 파라미터."""
    n = _notice_api()
    if doc['target'] == 'law':
        return n.api_get('lawService.do', {'MST': serial, 'type': 'XML'}, target='law', raw=True)
    return n.api_get('lawService.do', {'ID': serial, 'type': 'XML'}, target='admrul', raw=True)


def staged_filename(doc, latest):
    """신본 규약 파일명 — fetch_revision의 파일명 조립 함수 재사용."""
    import fetch_revision as f
    agency = f.filename_agency(doc['file'])
    stem = f.new_filename(doc['name'], agency, latest.get('notice'),
                          (latest.get('effectiveDate') or '').replace('-', ''))
    return Path(stem).stem + '.md' if stem else None


def compare_doc(doc, latest):
    """문서 1종 대조 → 판정 dict.

    판정값: identical | revised | no-text | no-file | error
    """
    base = {'name': doc['name'], 'target': doc['target'],
            'baselineNotice': doc.get('baselineNotice'), 'baselineDate': doc.get('baselineDate'),
            'latestNotice': latest.get('notice'), 'latestDate': latest.get('effectiveDate'),
            'serial': latest.get('serial'), 'verdict': 'error', 'detail': '',
            'new_md': None, 'new_file': None}

    cur = find_ref_md(doc['file'])
    if not cur:
        base['verdict'] = 'no-file'
        base['detail'] = f'ref_md에 {doc["file"]} 없음'
        return base
    base['file'] = str(cur.relative_to(EXAM_DIR))

    try:
        xml = fetch_text(doc, latest['serial'])
    except Exception as e:  # noqa: BLE001 — 문서별 실패가 전체를 중단시키지 않음
        base['detail'] = f'원문 조회 실패: {e}'
        return base

    if '<조문단위' not in xml:
        base['verdict'] = 'no-text'
        base['detail'] = ('DRF 서비스가 본문 미제공 — 첨부파일 비교 필요 '
                          '(fetch_revision.py 경로)')
        return base

    new_md = drf_render.render_law(doc['name'], xml)
    old_md = cur.read_text(encoding='utf-8')
    cmp = drf_render.compare_articles(old_md, new_md)

    old_map, new_map = drf_render.article_map(old_md), drf_render.article_map(new_md)
    base['counts'] = {'old': len(old_map), 'new': len(new_map),
                      'changed': len(cmp['changed']),
                      'added': len(cmp['added']), 'removed': len(cmp['removed'])}
    base['new_md'] = new_md
    base['new_file'] = staged_filename(doc, latest)

    if not cmp['changed'] and not cmp['added'] and not cmp['removed']:
        base['verdict'] = 'identical'
        base['detail'] = f'본문 동일 — 조문 {len(old_map)}/{len(new_map)} 대조 차이 없음'
        if cmp.get('renamed'):
            base['detail'] += f' (헤더 개명 {len(cmp["renamed"])}건 — 표기 차이)'
        return base

    base['verdict'] = 'revised'
    base['changed'] = [(k, drf_render.article_diff(ob, nb, k)) for k, ob, nb in cmp['changed']]
    base['added'] = cmp['added']
    base['removed'] = cmp['removed']
    base['renamed'] = cmp.get('renamed', [])
    c = base['counts']
    base['detail'] = f"조문 변경 {c['changed']} · 신설 {c['added']} · 삭제 {c['removed']}"
    return base


def write_report(rows, out_path=None):
    """report/법령개정대조결과.md — check_laws의 리포트 관례와 동일."""
    p = Path(out_path) if out_path else REPORT_FILE
    p.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    L = [f"# 법령·고시 개정 대조 결과 (diff_revision.py)\n",
         f"> 생성: {now}\n",
         "> 시행일 갱신 감지 → 조문 단위 대조로 '실질 개정' 여부 판정.",
         "> identical은 baseline(파일명 시행일)만 갱신하면 된다.\n"]
    for r in rows:
        L.append(f"\n## {r['name']}\n")
        L.append(f"- 기준본: {r.get('baselineNotice') or '?'} ({r.get('baselineDate') or '?'})"
                 + (f" — `{r.get('file')}`" if r.get('file') else ""))
        L.append(f"- 최신본: {r.get('latestNotice') or '?'} ({r.get('latestDate') or '?'},"
                 f" 일련 {r.get('serial') or '?'})")
        verdict_label = {
            'identical': '**본문 동일** — 연혁/유예조항 발효 갱신',
            'revised': '**실질 개정** — 조문 변경 있음',
            'no-text': '본문 미제공 — 첨부파일 비교 필요',
            'no-file': 'ref_md 파일 없음',
            'error': '대조 실패',
        }.get(r['verdict'], r['verdict'])
        L.append(f"- 판정: {verdict_label}")
        if r.get('detail'):
            L.append(f"  - {r['detail']}")
        if r['verdict'] == 'identical':
            L.append(f"  - 조치: `{r.get('new_file') or '신규 파일명'}`으로 "
                     "파일명 갱신하면 baseline 이동")
        if r['verdict'] == 'revised':
            if r.get('renamed'):
                L.append(f"  - 헤더 개명(본문 동일): "
                         + ', '.join(f'{a}→{b}' for a, b in r['renamed']))
            if r.get('added'):
                L.append(f"  - 신설: {', '.join(r['added'])}")
            if r.get('removed'):
                L.append(f"  - 삭제: {', '.join(r['removed'])}")
            if r.get('changed'):
                L.append("  - 변경 조문 상세:")
                for key, diff in r['changed']:
                    L.append(f"\n    ```diff\n{diff}\n    ```")
            L.append("\n  - 조치: 신본 ref_md 교체 → `sync_citation_lines --check` → "
                     "인용 미발견 = 개정 영향 지점 → 교재·문제은행 검토")
    p.write_text('\n'.join(L) + '\n', encoding='utf-8')
    return p


def main():
    doc_filter = _arg('--doc')
    do_all = '--all' in sys.argv
    stage_dir = _arg('--stage')

    n = _notice_api()
    docs = n.watch_docs()
    if not docs:
        print('!! 감시 대상이 없습니다 — referenceLaw 확인')
        sys.exit(1)
    if doc_filter:
        docs = [d for d in docs if doc_filter in d['name']]
        if not docs:
            print(f'!! --doc "{doc_filter}" 일치 문서 없음')
            sys.exit(1)

    status = {}
    if STATUS_FILE.exists():
        status = json.loads(STATUS_FILE.read_text(encoding='utf-8'))
    flagged = {d['name'] for d in status.get('docs', []) if d.get('newer')}

    rows, revised, skipped_fresh = [], 0, 0
    print(f'감시 문서 {len(docs)}종 — 대조 대상 선별 중…')
    for doc in docs:
        if not (do_all or doc_filter) and doc['name'] not in flagged:
            skipped_fresh += 1
            continue
        try:
            latest = fetch_latest_meta(doc)
        except SystemExit:
            raise
        except Exception as e:  # noqa: BLE001
            print(f'  ✗ {doc["name"]}: 최신본 조회 실패 — {e}')
            continue
        if not latest or not latest.get('serial'):
            print(f'  ✗ {doc["name"]}: 최신본 없음')
            continue
        base = doc.get('baselineDate') or ''
        if not (do_all or doc_filter) and not (latest.get('effectiveDate', '') > base):
            skipped_fresh += 1
            continue
        print(f'  ▶ {doc["name"]}: {doc.get("baselineNotice")}({base}) '
              f'→ {latest.get("notice")}({latest.get("effectiveDate")}) — 대조 중…')
        r = compare_doc(doc, latest)
        rows.append(r)
        mark = {'identical': '✓ 동일', 'revised': '⚠ 실질 개정',
                'no-text': '… 본문 미제공', 'no-file': '✗ 파일 없음',
                'error': '✗ 실패'}.get(r['verdict'], r['verdict'])
        print(f'    {mark} — {r["detail"]}')
        if r['verdict'] == 'revised':
            revised += 1
        if stage_dir and r.get('new_md') and r.get('new_file'):
            sd = Path(stage_dir)
            sd.mkdir(parents=True, exist_ok=True)
            (sd / r['new_file']).write_text(r['new_md'], encoding='utf-8')
            print(f'    → 스테이징: {sd / r["new_file"]}')

    print('\n' + '=' * 60)
    n_id = sum(1 for r in rows if r['verdict'] == 'identical')
    n_nt = sum(1 for r in rows if r['verdict'] in ('no-text', 'no-file', 'error'))
    print(f'대조 {len(rows)}종 — 본문 동일 {n_id} · 실질 개정 {revised} · 기타 {n_nt}'
          + (f' · 최신 스킵 {skipped_fresh}' if skipped_fresh else ''))
    if rows:
        rp = write_report(rows)
        print('리포트:', rp.relative_to(ROOT) if rp.is_relative_to(ROOT) else rp)
    elif skipped_fresh:
        print('모든 문서가 최신입니다 (대조 대상 없음).')
    sys.exit(2 if revised else 0)


if __name__ == '__main__':
    main()
