import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const has = (needle) => execFileSync('python', ['-c',
    `s=open('ref-pipeline/pdf2md.py',encoding='utf8').read(); print(${JSON.stringify(needle)} in s)`])
    .toString().trim() === 'True';

// @spec none — ref-pipeline 도구 테스트 (파이프라인 전용)

test('pdf2md --image-format 옵션 — orig|webp|svg 선택지', () => {
    assert.ok(has('image-format') && has("'orig', 'webp', 'svg'"));
});

test('pdf2md svg — clip 인자 미지원 대응 (show_pdf_page 경유)', () => {
    assert.ok(has('show_pdf_page'));
});

test('pdf2md 입력 목록 드래그앤드롭 — setAcceptDrops + eventFilter', () => {
    assert.ok(has('setAcceptDrops') && has('mimeData'));
});

test('pdf2md QFont 경고 — qInstallMessageHandler로 차단', () => {
    assert.ok(has('qInstallMessageHandler'));
});
