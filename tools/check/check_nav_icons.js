#!/usr/bin/env node
/**
 * 메뉴 아이콘 고유성 게이트 — 사이드바(nav-menu)·모바일 탭(mobile-tab-bar)·
 * 설정/도움말 영역(settings-menu 포함 header 내부 버튼)의 각 *기능*이
 * 서로 다른 FA 아이콘을 쓰도록 강제한다.
 * 기능 식별은 data-uitext 키·data-target·data-click 기준 — 사이드바와
 * 모바일 탭의 동일 기능 반복(반응형)은 허용, 다른 기능의 재사용만 차단.
 * @spec UX-VFY-07 (메뉴 아이콘 고유성 규약 — 기능별 시각 구분 보장)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// [시작 마커, 종료 마커] — 설정·도움말은 header 내부 전체를 스캔 범위로
const REGIONS = [
    ['<nav class="nav-menu"', '</nav>'],
    ['<nav class="mobile-tab-bar"', '</nav>'],
    ['<header', '</header>'],
];
const ITEM_RE = /<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/g;
const ICON_RE = /fa-(?:solid|regular|brands) (fa-[a-z0-9-]+)/;
const UITEXT_RE = /data-uitext="([^":]+)(?::[^"]*)?"/;
const TARGET_RE = /data-target="([^"]+)"/;
const CLICK_RE = /data-click="([^"]+)"/;

/** 동일 기능 판정 — 'manual' ⊂ 'ManualViewer.openManual'처럼 포함 관계(≥5자)면 같은 기능 */
function sameFeature(a, b) {
    const ka = a.toLowerCase().replace(/[^a-z가-힣]/g, '');
    const kb = b.toLowerCase().replace(/[^a-z가-힣]/g, '');
    if (ka === kb) return true;
    const [s, l] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
    return s.length >= 5 && l.includes(s);
}

const byIcon = new Map(); // icon -> [{key}]
for (const file of ['index.template.html', 'landing.template.html']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, 'utf-8');
    for (const [start, end] of REGIONS) {
        const si = html.indexOf(start);
        if (si < 0) continue;
        const ei = html.indexOf(end, si);
        const region = html.slice(si, ei < 0 ? undefined : ei);
        let m;
        ITEM_RE.lastIndex = 0;
        while ((m = ITEM_RE.exec(region))) {
            const icon = m[2].match(ICON_RE);
            if (!icon) continue;
            const feat = m[2].match(UITEXT_RE) || m[1].match(TARGET_RE) || m[0].match(CLICK_RE);
            const key = (feat ? feat[1] : '?').replace(/-view$/, '');
            if (!byIcon.has(icon[1])) byIcon.set(icon[1], []);
            const list = byIcon.get(icon[1]);
            if (!list.some(k => sameFeature(k, key))) list.push(key);
        }
    }
}
const dups = [...byIcon.entries()].filter(([, keys]) => keys.length > 1);
if (dups.length) {
    console.error(`✗ 메뉴 아이콘 중복 ${dups.length}건 — 기능별 고유 아이콘 사용:`);
    for (const [icon, keys] of dups) console.error(`  - ${icon}: ${keys.join(' · ')}`);
    process.exit(1);
}
console.log(`✓ 메뉴 아이콘 고유성 통과 — ${byIcon.size}개 아이콘 모두 기능별 고유`);
