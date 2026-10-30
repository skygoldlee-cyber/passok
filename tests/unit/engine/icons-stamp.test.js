// tests/unit/engine/icons-stamp.test.js — build_icons 스탬프 계약
// @spec none

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const { stampManifestIcons, sha1 } = createRequire(import.meta.url)('../../../tools/build/build_icons.js');

test('ROAD-Q5: stampManifestIcons — icons[].src에 파일 해시 ?v= 부여', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
    fs.mkdirSync(path.join(dir, 'icons'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'icons/a.png'), Buffer.from([1, 2, 3]));
    const manifest = { icons: [{ src: 'icons/a.png' }, { src: 'icons/missing.png' }] };
    stampManifestIcons(manifest, dir);
    const want = `icons/a.png?v=${sha1(Buffer.from([1, 2, 3]))}`;
    assert.equal(manifest.icons[0].src, want);
    // 기존 ?v=는 교체되고, 없는 파일은 src 그대로
    manifest.icons[0].src = 'icons/a.png?v=old';
    stampManifestIcons(manifest, dir);
    assert.equal(manifest.icons[0].src, want);
    assert.equal(manifest.icons[1].src, 'icons/missing.png');
    // icons 배열 없으면 무해
    stampManifestIcons({}, dir);
});
