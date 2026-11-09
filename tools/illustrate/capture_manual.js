// tools/illustrate/capture_manual.js — 실무매뉴얼 삽화 자동 캡처
// @spec none — 문서 삽화 산출 도구 (런타임 미사용)
// 사용: node tools/illustrate/capture_manual.js [--all|manual-02-home ...]
// 선행: npm run serve (localhost:3000) 기동 상태에서 실행
// 산출: content/exams/carework/docs/images/manual-*.webp (자리 표시 줄의 파일명과 동일)
const { chromium } = require('@playwright/test');
const { writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = join(__dirname, '../../content/exams/carework/docs/images');
mkdirSync(OUT_DIR, { recursive: true });

// 가명 시드 — 실명·실제 사진 금지 규약 (삽화 전용 더미 데이터)
// (더미 사진은 photoBuffer가 페이지 캔버스로 생성 — 실명·실사 금지)

/** 시드 주입 — 활성 시험·실무 모드·더미 기록 (페이지 로드 전) */
async function seed(page, { guide = false } = {}) {
    await page.addInitScript(({ guide }) => {
        const L = localStorage;
        L.setItem('current_exam', 'carework');
        L.setItem('ui_mode', 'practice');
        if (!guide) L.setItem('carework_guide_seen', '1');
        L.setItem('carework_doc_sign', JSON.stringify({ author: '김요양', confirmer: '박시설', receiver: '이인수' }));
        L.setItem('carework_org_name', '○○요양원');
        L.setItem('carework_clients', JSON.stringify([
            { id: 'c1', name: '김○○', status: '입소중', room: '101', birth: '1942-03-05', phone: '', allergy: '복숭아', caution: '우측 편마비', memo: '', docs: {}, createdAt: '2026-10-01T00:00:00Z' },
            { id: 'c2', name: '이○○', status: '입소중', room: '102', birth: '1938-07-12', phone: '', allergy: '', caution: '경도 인지저하', memo: '', docs: {}, createdAt: '2026-10-01T00:00:00Z' },
        ]));
        const today = new Date().toISOString().slice(0, 10);
        const log = (i, meal) => ({ id: 'l' + i, date: today, time: '0' + (8 + i) + ':30', client: '김○○', service: '방문요양', start: '08:30', end: '10:30', acts: ['신체활동', '식사보조'], obs: { meal, sleep: '양호', void: '정상' }, note: '특이사항 없음', text: '', createdAt: today + 'T' + i + ':00:00Z' });
        L.setItem('carework_care_logs', JSON.stringify([log(1, '적음'), log(2, '적음'), log(3, '적음')]));
        L.setItem('carework_visits', JSON.stringify([
            { id: 'v1', date: today, time: '14:00', client: '김○○', visitor: '김보호', phone: '', relation: '자녀', purpose: '면회', status: 'scheduled', createdAt: today + 'T00:00:00Z' },
        ]));
        L.setItem('carework_incidents', JSON.stringify([
            { id: 'i1', date: today, time: '09:15', client: '김○○', place: '거실', type: '낙상', severity: '경미', desc: '침대에서 내려오다 미끄러짐', action: '확인 후 안정 조치', witness: '박보호', familyNotified: true, text: '', createdAt: today + 'T00:00:00Z' },
        ]));
        L.setItem('carework_handovers', JSON.stringify([
            { id: 'h1', date: today, shift: '주간', from: '김요양', to: '이인수', status: '김○○ 식사량 감소 추세', tasks: '욕창 체크', caution: '낙상 주의', text: '', createdAt: today + 'T00:00:00Z' },
        ]));
    }, { guide });
}

/** PNG 버퍼 → webp 변환 (페이지 내 canvas 사용 — 외부 이미지 라이브러리 불필요) */
async function toWebp(page, pngBuf, quality = 0.82) {
    const dataUrl = await page.evaluate(async ({ b64, quality }) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/webp', quality);
    }, { b64: pngBuf.toString('base64'), quality });
    return Buffer.from(dataUrl.split(',')[1], 'base64');
}

/** 오버레이 정리 — 온보딩·토스트·배너가 캡처에 겹치지 않도록 닫기/제거 */
async function dismissOverlays(page) {
    // 온보딩 대화상자 — "건너뛰기" 있으면 클릭해 종료
    const skip = page.locator('button:has-text("건너뛰기")').first();
    if (await skip.count()) { await skip.click().catch(() => {}); }
    await page.waitForTimeout(400);
    // 토스트·배너·업데이트 알림 제거 — 스냅샷을 깨끗하게
    await page.evaluate(() => {
        document.querySelectorAll('.app-toast, .toast, .sw-toast, .consent-banner, .app-banner, [id*="toast"], [class*="toast"], [class*="banner"], [class*="update"], dialog[open]:not(#app-confirm-overlay)').forEach(e => e.remove());
    });
    await page.waitForTimeout(250);
}

/** 캡처 헬퍼 — locator 스크린샷 → images/<name>.webp */
async function snap(page, name, locator, { quality = 0.82 } = {}) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await dismissOverlays(page);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const png = await el.screenshot();
    writeFileSync(join(OUT_DIR, `${name}.webp`), await toWebp(page, png, quality));
    console.log(`✓ ${name}.webp`);
}

/** 사진 첨부용 더미 이미지 버퍼 생성 (페이지 캔버스) */
async function photoBuffer(page, label, color) {
    const b64 = await page.evaluate(({ label, color }) => {
        const c = document.createElement('canvas');
        c.width = 800; c.height = 500;
        const x = c.getContext('2d');
        x.fillStyle = color; x.fillRect(0, 0, 800, 500);
        x.fillStyle = '#fff'; x.font = 'bold 64px sans-serif'; x.textAlign = 'center';
        x.fillText(label, 400, 260);
        return c.toDataURL('image/jpeg', 0.85).split(',')[1];
    }, { label, color });
    return Buffer.from(b64, 'base64');
}

const SHOTS = {
    // ② 홈 — 요약 카드 + 다음 행동 + 빠른 기록
    'manual-02-home': async (page) => {
        await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#care-home-view .care-home-card', { timeout: 15000 });
        await snap(page, 'manual-02-home', '#care-home-view .care-home-card');
    },
    // ⑤ 사고보고 미리보기 — 본문 + 사진 그리드
    'manual-05-preview': async (page) => {
        await page.goto(`${BASE}/#/care-incident`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#inc-client', { timeout: 15000 });
        // 폼 입력 + 사진 첨부 → 생성 → 미리보기 캡처
        await page.fill('#inc-client', '김○○');
        await page.fill('#inc-place', '거실');
        await page.fill('#inc-desc', '침대에서 내려오다 미끄러짐');
        await page.fill('#inc-action', '확인 후 안정 조치');
        const p1 = await photoBuffer(page, '현장 사진', '#4a6fa5');
        const p2 = await photoBuffer(page, '부위 사진', '#6a8f6a');
        await page.setInputFiles('#inc-photo-file', [
            { name: 'site.jpg', mimeType: 'image/jpeg', buffer: p1 },
            { name: 'part.jpg', mimeType: 'image/jpeg', buffer: p2 },
        ]);
        await page.waitForTimeout(400);
        await page.locator('[data-click="careIncidentGenerate"]').click();
        await page.waitForSelector('#inc-preview .care-photo-grid', { timeout: 10000 });
        await snap(page, 'manual-05-preview', '#inc-preview');
    },
};

async function main() {
    const names = process.argv.filter(a => a.startsWith('manual-'));
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await seed(page);
    const run = names.length ? names : Object.keys(SHOTS);
    for (const n of run) {
        if (!SHOTS[n]) { console.warn(`? ${n} — 미구현 캡처`); continue; }
        try { await SHOTS[n](page); } catch (e) { console.error(`✗ ${n}: ${e.message.split('\n')[0]}`); }
    }
    await browser.close();
    console.log('완료 — 자리 표시 줄을 ![캡션](images/<이름>.webp)로 교체하세요.');
}
main().catch(e => { console.error(e); process.exit(1); });
