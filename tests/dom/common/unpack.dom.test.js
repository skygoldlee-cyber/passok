// @spec DA-16
import { describe, it, expect } from 'vitest';
import { pkDecode, pkDecodeFiles } from '../../../src/content/unpack.js';

// Node 빌드측(content_pack.js)과 동일 규격으로 픽스처 생성 — XOR + base64
function pk1Encode(text, key = 'passok-pk1-5f3a') {
    const bytes = new TextEncoder().encode(text);
    const xored = Array.from(bytes, (b, i) => b ^ key.charCodeAt(i % key.length));
    return 'pk1:' + btoa(String.fromCharCode(...xored));
}

describe('content/unpack.js — pk1 디코더 (DA-16)', () => {
    it('pk1 인코딩 값을 원문으로 복원한다', () => {
        const src = '# 제1과목 화장품법의 이해\n\n> 화장품법 제3조에 따라…';
        expect(pkDecode(pk1Encode(src))).toBe(src);
    });

    it('평문·비문자열은 그대로 통과시킨다', () => {
        expect(pkDecode('plain text')).toBe('plain text');
        expect(pkDecode(42)).toBe(42);
        expect(pkDecode(null)).toBe(null);
    });

    it('pkDecodeFiles는 맵 값 전체를 디코드한다', () => {
        const files = { 'a.md': pk1Encode('가'), 'b.md': '평문', n: 7 };
        const out = pkDecodeFiles(files);
        expect(out['a.md']).toBe('가');
        expect(out['b.md']).toBe('평문');
        expect(out.n).toBe(7);
    });
});
