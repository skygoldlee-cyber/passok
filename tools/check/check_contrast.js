// check_contrast.js — CSS 테마 토큰 WCAG 대비 감사
// @spec none — 스타일 검증 도구
//   · base.css의 :root(다크)·.light-theme 토큰을 파싱해 텍스트용 색상 토큰과
//     배경 토큰 조합의 WCAG 대비비를 계산한다.
//   · AA 일반 텍스트 4.5 미만 = 경고, 3.0 미만(의미 전달 실패) = 오류.
//   · 새 시맨틱 색이 추가돼도 TEXT_TOKENS/BG_TOKENS 목록만 늘리면 된다.
const fs = require('fs');
const path = require('path');

const CSS = path.resolve(__dirname, '..', '..', 'css', 'base.css');
const src = fs.readFileSync(CSS, 'utf8');

// 텍스트로 쓰이는 색 토큰과 배경 토큰 — 신규 토큰은 여기에 등록
const TEXT_TOKENS = [
    '--color-text-main', '--color-text-muted',
    '--color-link', '--color-link-visited', '--color-link-hover',
    '--color-primary', '--color-secondary',
    '--color-success', '--color-danger', '--color-warning',
];
const BG_TOKENS = ['--bg-app', '--bg-card'];

function parseBlock(name) {
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm');
    const m = src.match(re);
    const vars = {};
    if (!m) return vars;
    for (const v of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars['--' + v[1]] = v[2].trim();
    return vars;
}

const toRgb = (v) => {
    let m = v.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
    m = v.match(/^#([0-9a-f]{3})$/i);
    if (m) { const n = m[1]; return [...n].map(c => parseInt(c + c, 16)).concat([1]); }
    m = v.match(/rgba?\(([\d.,\s%]+)\)/i);
    if (m) { const p = m[1].split(',').map(x => parseFloat(x)); return [p[0], p[1], p[2], p[3] ?? 1]; }
    return null;
};

const composite = (fg, bg) => { // fg의 알파를 bg 위에 합성
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
};

const lum = (rgb) => {
    const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};

const contrast = (fg, bg) => {
    const [hi, lo] = [Math.max(lum(fg), lum(bg)), Math.min(lum(fg), lum(bg))];
    return (hi + 0.05) / (lo + 0.05);
};

const errors = [];
const warns = [];

for (const [theme, sel] of [['다크', ':root'], ['라이트', '.light-theme']]) {
    const root = parseBlock(':root');
    const vars = { ...root, ...parseBlock(sel) };
    for (const b of BG_TOKENS) {
        const bgRaw = toRgb(vars[b] || '');
        if (!bgRaw) { warns.push(`${theme}: ${b} 파싱 불가 — ${vars[b]}`); continue; }
        const bg = bgRaw[3] < 1 ? composite(bgRaw, toRgb(vars['--bg-app'])) : bgRaw.slice(0, 3);
        for (const t of TEXT_TOKENS) {
            const fgRaw = toRgb(vars[t] || '');
            if (!fgRaw) continue;
            const fg = fgRaw[3] < 1 ? composite(fgRaw, bg) : fgRaw.slice(0, 3);
            const r = contrast(fg, bg);
            const msg = `${theme} ${t}(${vars[t]}) on ${b}(${vars[b]}) — 대비 ${r.toFixed(2)}:1`;
            if (r < 3) errors.push(`${msg} — 의미 전달 불가 (<3.0)`);
            else if (r < 4.5) warns.push(`${msg} — AA 일반 텍스트 미달 (<4.5)`);
        }
    }
}

warns.forEach(w => console.log(`⚠️  ${w}`));
if (errors.length) {
    errors.forEach(e => console.error(`❌ ${e}`));
    process.exit(1);
}
console.log(`✅ 테마 대비 검증 통과${warns.length ? ` (경고 ${warns.length}건)` : ''}`);
