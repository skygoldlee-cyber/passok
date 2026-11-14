#!/usr/bin/env python
# @spec none — docx_render_assert.py: check_docx_render.ps1의 PDF 렌더 계약 검증 단계
# 사용: python docx_render_assert.py <pdf_dir>
# 계약 (DOCX_GENERATION.md §5·§9):
#   1. 각 쪽에 워터마크 PNG(폭 1920px) 정확히 1개 — 0개=누락, 2개+=알파 배가 중첩
#   2. 워터마크 bbox는 전 쪽 동일 — 페이지 중심 앵커라 쪽마다 같은 좌표여야 함
#   3. 마지막 쪽이 꼬리 쪽이 아님 — 텍스트 블록이 QR 캡션+푸터만이면 회귀
#   4. 워터마크 잉크가 여백(비표 영역) 위에서도 가시 — 대각선 띠의 여백 구간 샘플
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
                # 여백 잉크 — 띠가 지나는 좌측 여백 구간(y≈페이지 75%)의 비255 픽셀
                h = page.rect.height
                pix = page.get_pixmap(dpi=96, clip=pymupdf.Rect(0, h * 0.70, 60, h * 0.95))
                dark = sum(1 for x in range(pix.width) for y in range(pix.height)
                           for p in [pix.pixel(x, y)] if min(p[0], p[1], p[2]) < 250)
                if dark < 50:
                    fails.append(f'{name} p{i+1}: no margin ink (dark px={dark})')
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
