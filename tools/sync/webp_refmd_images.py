"""ref_md 이미지 jpeg/png → webp 재인코딩 + md/html 참조 갱신.
원본은 마스터로 저장소에 두고 .vercelignore로 배포 제외 (교재 webp 규약 동일)."""
import os, sys
from PIL import Image

ROOT = 'content/exams'
EXTS = ('.jpeg', '.jpg', '.png')
converted = failed = 0
ref_dirs = set()

for r, _, fs in os.walk(ROOT):
    parts = os.path.normpath(r).split(os.sep)
    if 'ref_md' not in parts or 'images' not in parts:
        continue
    ref_dirs.add(os.path.dirname(r))  # images 부모 = ref 문서 디렉토리
    for f in fs:
        ext = os.path.splitext(f)[1].lower()
        if ext not in EXTS:
            continue
        src_p = os.path.join(r, f)
        dst_p = os.path.splitext(src_p)[0] + '.webp'
        try:
            Image.open(src_p).convert('RGB').save(dst_p, 'WEBP', quality=82)
            converted += 1
        except Exception as e:
            failed += 1
            print('FAIL', src_p, e)
    if converted % 1000 == 0:
        print('progress:', converted, flush=True)

# ref 문서 디렉토리 트리 전체(md/html)의 이미지 참조를 .webp로 갱신
texts = 0
for d in ref_dirs:
    for r, _, fs in os.walk(d):
        if 'ref_md' not in os.path.normpath(r).split(os.sep): continue
        for f in fs:
            if os.path.splitext(f)[1].lower() not in ('.md', '.html'): continue
            p = os.path.join(r, f)
            t = open(p, encoding='utf-8').read()
            t2 = t.replace('.jpeg', '.webp').replace('.jpg', '.webp').replace('.png', '.webp')
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
                texts += 1
print(f'converted={converted} failed={failed} refs_updated={texts}')
