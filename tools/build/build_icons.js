// tools/build/build_icons.js — 앱 아이콘 파생 생성·검증 파이프라인
// @spec none (정적 자산 신선도 체계 연장)
//
// 정본 passok-icon-512.png → 파생(apple-touch 180, favicon 32·16) 일괄 렌더
// (Playwright canvas 고품질 다운스케일) + maskable 전면 배경(코너 불투명) 검증
// + root manifest.webmanifest 아이콘 `?v=` 해시 스탬프(시험별 manifest와 정합)
// + tools/state/icons_stamp.json 신선도 스탬프 — `--check`로 게이트 재현.
//
// 사용: node tools/build/build_icons.js [--check]

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const ICONS = path.join(ROOT, 'icons');
const STAMP_FILE = path.join(ROOT, 'tools', 'state', 'icons_stamp.json');
const ROOT_MANIFEST = path.join(ROOT, 'manifest.webmanifest');
const MASTER = path.join(ICONS, 'passok-icon-512.png');
const MASKABLE = path.join(ICONS, 'passok-icon-maskable-512.png');

const DERIVED = [
    { size: 180, out: 'passok-icon-180.png' },
    { size: 32, out: 'favicon-32.png' },
    { size: 16, out: 'favicon-16.png' },
];

// maskable 안전 영역 — 배경(#0b0f19) 풀블리드 + 아이콘을 75%로 중앙 축소 (80% 세이프존 내)
const MASKABLE_BG = '#0b0f19';
const MASKABLE_SCALE = 0.75;

const sha1 = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);

/** manifest.icons[].src에 파일 콘텐츠 해시 `?v=` 스탬프 — build_exams_list와 동형 */
function stampManifestIcons(manifest, rootDir) {
    if (!Array.isArray(manifest.icons)) return;
    for (const icon of manifest.icons) {
        const clean = String(icon.src).split('?')[0];
        const f = path.join(rootDir, clean);
        if (fs.existsSync(f)) icon.src = `${clean}?v=${sha1(fs.readFileSync(f))}`;
    }
}

async function renderSize(browser, srcDataUrl, size) {
    const page = await browser.newPage();
    await page.setContent(`<canvas id="c" width="${size}" height="${size}"></canvas>`);
    const bytes = await page.evaluate(async ({ dataUrl, s }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const ctx = /** @type {CanvasRenderingContext2D} */ (document.getElementById('c').getContext('2d'));
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, s, s);
        const blob = await new Promise(r => document.getElementById('c').toBlob(r, 'image/png'));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, { dataUrl: srcDataUrl, s: size });
    await page.close();
    return Buffer.from(bytes);
}

/** maskable 생성 — 정본을 세이프존(75%)으로 축소해 불투명 배경 위에 배치 */
async function renderMaskable(browser, srcDataUrl) {
    const page = await browser.newPage();
    await page.setContent('<canvas id="c" width="512" height="512"></canvas>');
    const bytes = await page.evaluate(async ({ dataUrl, bg, scale }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const ctx = /** @type {CanvasRenderingContext2D} */ (document.getElementById('c').getContext('2d'));
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 512, 512);
        const s = Math.round(512 * scale);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (512 - s) / 2, (512 - s) / 2, s, s);
        const blob = await new Promise(r => document.getElementById('c').toBlob(r, 'image/png'));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, { dataUrl: srcDataUrl, bg: MASKABLE_BG, scale: MASKABLE_SCALE });
    await page.close();
    return Buffer.from(bytes);
}

/** maskable 전면 배경 검증 — 4코너 불투명(풀블리드) + 중심부 비배경 존재 */
async function checkMaskable(browser, dataUrl) {
    const page = await browser.newPage();
    await page.setContent('<canvas id="c" width="64" height="64"></canvas>');
    const res = await page.evaluate(async ({ dataUrl }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const ctx = /** @type {CanvasRenderingContext2D} */ (document.getElementById('c').getContext('2d'));
        ctx.drawImage(img, 0, 0, 64, 64);
        const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
        const corner = [px(0, 0), px(63, 0), px(0, 63), px(63, 63)];
        return { cornersOpaque: corner.every(p => p[3] > 200), center: px(32, 32) };
    }, { dataUrl });
    await page.close();
    return res;
}

async function build() {
    const { chromium } = require('playwright');
    if (!fs.existsSync(MASTER)) throw new Error(`정본 아이콘 없음: ${MASTER}`);
    const masterDataUrl = 'data:image/png;base64,' + fs.readFileSync(MASTER).toString('base64');
    const browser = await chromium.launch();
    try {
        for (const d of DERIVED) {
            const buf = await renderSize(browser, masterDataUrl, d.size);
            fs.writeFileSync(path.join(ICONS, d.out), buf);
            console.log(`✅ icons/${d.out} — ${d.size}×${d.size} (${(buf.length / 1024).toFixed(1)}KB)`);
        }
        // maskable — 기존 파일이 풀블리드가 아니면 정본에서 재생성 (세이프존 보장)
        let regenMaskable = true;
        if (fs.existsSync(MASKABLE)) {
            const m = await checkMaskable(browser, 'data:image/png;base64,' + fs.readFileSync(MASKABLE).toString('base64'));
            regenMaskable = !m.cornersOpaque;
        }
        if (regenMaskable) {
            const buf = await renderMaskable(browser, masterDataUrl);
            fs.writeFileSync(MASKABLE, buf);
            console.log(`✅ icons/passok-icon-maskable-512.png 재생성 — 세이프존 ${MASKABLE_SCALE * 100}%·풀블리드 (${(buf.length / 1024).toFixed(1)}KB)`);
        } else {
            console.log('✅ maskable 전면 배경 검증 통과 (코너 불투명)');
        }
    } finally {
        await browser.close();
    }
    // root manifest `?v=` 스탬프 — 시험별 manifest(build_exams_list)와 동일 해시 규약
    const wm = JSON.parse(fs.readFileSync(ROOT_MANIFEST, 'utf-8'));
    stampManifestIcons(wm, ROOT);
    fs.writeFileSync(ROOT_MANIFEST, JSON.stringify(wm, null, 2) + '\n');
    // 신선도 스탬프 — 소스 해시 기록
    const stamp = {
        master: `passok-icon-512.png:${sha1(fs.readFileSync(MASTER))}`,
        outputs: [...DERIVED.map(d => d.out), 'passok-icon-maskable-512.png']
            .map(o => `${o}:${sha1(fs.readFileSync(path.join(ICONS, o)))}`),
    };
    fs.mkdirSync(path.dirname(STAMP_FILE), { recursive: true });
    fs.writeFileSync(STAMP_FILE, JSON.stringify(stamp, null, 2) + '\n');
    console.log('✅ manifest.webmanifest ?v= 스탬프 + icons_stamp.json 갱신');
}

function check() {
    if (!fs.existsSync(STAMP_FILE)) throw new Error('icons_stamp.json 없음 — npm run build:icons 실행 필요');
    const stamp = JSON.parse(fs.readFileSync(STAMP_FILE, 'utf-8'));
    const errs = [];
    const masterNow = `passok-icon-512.png:${sha1(fs.readFileSync(MASTER))}`;
    if (stamp.master !== masterNow) errs.push(`정본 아이콘 변경됨 — 파생 재생성 필요 (${masterNow})`);
    for (const o of stamp.outputs || []) {
        const f = path.join(ICONS, o.split(':')[0]);
        if (!fs.existsSync(f)) { errs.push(`파생 누락: ${o.split(':')[0]}`); continue; }
        const now = `${o.split(':')[0]}:${sha1(fs.readFileSync(f))}`;
        if (now !== o) errs.push(`파생 불일치: ${o.split(':')[0]} (수정됐거나 소스에서 재생성 안 됨)`);
    }
    // root manifest ?v= 정합 — 모든 icons src에 현재 파일 해시가 붙어 있어야 함
    const wm = JSON.parse(fs.readFileSync(ROOT_MANIFEST, 'utf-8'));
    for (const icon of wm.icons || []) {
        const clean = String(icon.src).split('?')[0];
        const f = path.join(ROOT, clean);
        const want = fs.existsSync(f) ? `?v=${sha1(fs.readFileSync(f))}` : null;
        if (want && !String(icon.src).endsWith(want)) errs.push(`manifest.webmanifest ${clean} ?v= 스탬프 불일치`);
    }
    if (errs.length) { console.error('❌ icons 신선도 실패:\n  ' + errs.join('\n  ') + '\n복구: npm run build:icons'); process.exit(1); }
    console.log('✅ icons 파생·manifest 스탬프 신선');
}

if (require.main === module) {
    if (process.argv.includes('--check')) check();
    else build().catch(e => { console.error('❌ build_icons 실패:', e.message); process.exit(1); });
}

module.exports = { stampManifestIcons, sha1 };
