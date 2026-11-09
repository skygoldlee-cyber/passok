import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// @spec PF-19 — 이미지 자산 형식 제한 (webp·svg만 허용, 예외 화이트리스트)
const src = readFileSync('tools/check/check_filenames.js', 'utf8');

test('check_filenames 이미지 형식 규칙 — 금지 확장자·대상 디렉터리·화이트리스트 (PF-19)', () => {
    assert.match(src, /IMG_BANNED\s*=.*png.*jpe\?g.*gif.*bmp.*avif/s);   // 금지 확장자 목록
    assert.match(src, /IMG_FORMAT_DIRS\s*=\s*\/\^\(content\|icons\)\\\//); // 배포 대상 디렉터리
    assert.match(src, /ICON_PNG_ALLOW/);                                  // PNG 예외 화이트리스트
    assert.match(src, /webp·svg만 허용/);                                 // 위반 사유에 규칙 명시
});

test('check_filenames 게이트 — 기존 화이트리스트 PNG 통과·신규 위반 0건', () => {
    // icons/의 PWA·favicon·OG PNG는 예외 화이트리스트로 통과해야 한다
    const out = execFileSync('node', ['tools/check/check_filenames.js'], { encoding: 'utf8' });
    assert.match(out, /신규 위반 0건/);
});
