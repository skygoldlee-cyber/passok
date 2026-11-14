#!/usr/bin/env python
# @spec none — docx_render_assert.py: check_docx_render.ps1의 PDF 렌더 계약 검증 단계
# 사용: python docx_render_assert.py <pdf_dir>
# 계약 (DOCX_GENERATION.md §5·§9):
#   1. 각 쪽에 워터마크 PNG(폭 1920px) 정확히 1개 — 0개=누락, 2개+=알파 배가 중첩
#   2. 워터마크 bbox는 전 쪽 동일 — 페이지 중심 앵커라 쪽마다 같은 좌표여야 함
#   3. 마지막 쪽이 꼬리 쪽이 아님 — 텍스트 블록이 QR 캡션+푸터만이면 회귀
#   4. 워터마크 bbox가 본문 영역을 4방향으로 넘음 — 페이지 중심 대각선 배치 증거
#      (잉크 픽셀 샘플은 기관명 폭·음영 칸에 민감해 제외 — 알파는 doc-wm.test.js가 보증)
import sys, os, glob
try:
    import pymupdf
except ImportError:
    print('SKIP: pymupdf not installed')
    sys.exit(0)

def main(pdf_dir):
    fails = []
    pdfs = sorted(glob.glob(os.path.join(pdf_dir, '*.pdf')))
    if not pdfs:
        print(f'FAIL: no pdf in {pdf_dir}')
        return 1
    for path in pdfs:
        name = os.path.basename(path)
        doc = pymupdf.open(path)
        bboxes = []
        for i, page in enumerate(doc):
            wms = [im for im in page.get_image_info() if im['width'] == 1920]
            if len(wms) != 1:
                fails.append(f'{name} p{i+1}: watermark count={len(wms)} (expect 1)')
            elif wms:
                bboxes.append(tuple(round(v, 1) for v in wms[0]['bbox']))
                # 페이지 상대 배치 — wm bbox가 본문 영역(11906×16838 − 여백)을 4방향
                # 모두 넘어야 함 (페이지 중심 대각선 띠 증거). 잉크 픽셀 샘플은 기관명이
                # 짧으면 잉크가 여백에 닿지 않고 음영 칸(<250)이 오염시켜 부정확하므로
                # 기하 판정으로 대체. 잉크 자체의 알파는 doc-wm.test.js가 보증
                pr, bb = page.rect, pymupdf.Rect(wms[0]['bbox'])
                l, t, r, b = 1417 / 20, 1134 / 20, pr.width - 1417 / 20, pr.height - 1134 / 20
                if not (bb.x0 < l and bb.y0 < t and bb.x1 > r and bb.y1 > b):
                    fails.append(f'{name} p{i+1}: wm bbox inside text area {[round(v,1) for v in bb]}')
        if len(set(bboxes)) > 1:
            fails.append(f'{name}: watermark bbox varies {bboxes}')
        # 꼬리 쪽 감지 — 마지막 쪽의 비공백 텍스트가 QR 캡션/푸터만이면 회귀
        tail = doc[-1].get_text().strip()
        meaningful = [l for l in tail.splitlines()
                      if l.strip() and not l.strip().startswith('문서번호') and l.strip() not in ('—',) and '—' != l.strip() and not l.strip().startswith('— ')]
        if doc.page_count > 1 and len(meaningful) < 2:
            fails.append(f'{name}: trailing near-empty page (p{doc.page_count})')
        doc.close()
        print(f'  ok {name}: {len(bboxes)} wm stamps')
    for f in fails:
        print('FAIL:', f)
    print(f'{len(pdfs)} docs checked, {len(fails)} failures')
    return 1 if fails else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else '.'))
