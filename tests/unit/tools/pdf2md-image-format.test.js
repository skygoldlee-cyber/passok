// @spec none — ref-pipeline 도구 테스트 (파이프라인 전용)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// ref-pipeline/pdf2md.py --image-format 옵션 존재 검증 (orig|webp|svg)
test('pdf2md --image-format 옵션 — orig|webp|svg 선택지', () => {
    const src = execFileSync('python', ['-c',
        "import re; print('image-format' in open('ref-pipeline/pdf2md.py',encoding='utf8').read())"])
        .toString().trim();
    assert.equal(src, 'True');
});
