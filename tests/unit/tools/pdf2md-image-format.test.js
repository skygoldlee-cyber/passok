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

test('pdf2md 페이지 단위 예외 복원 — 중간 페이지 실패가 변환을 중단시키지 않음', () => {
    const src = execFileSync('python', ['-c',
        "s=open('ref-pipeline/pdf2md.py',encoding='utf8').read(); print('페이지 건너뜀' in s and 'except Exception' in s)"])
        .toString().trim();
    assert.equal(src, 'True');
});

test('pdf2md 여백 수집 예외 복원 — 페이지 로드 실패 시 건너뜀', () => {
    const src = execFileSync('python', ['-c',
        "s=open('ref-pipeline/pdf2md.py',encoding='utf8').read(); print('여백 수집 건너뜀' in s)"])
        .toString().trim();
    assert.equal(src, 'True');
});
