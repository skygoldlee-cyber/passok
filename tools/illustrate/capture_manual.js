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

/** 합성 — 여러 PNG를 가로 병치해 한 장으로 (전후 비교·대응 그림) */
async function snapComposite(page, name, pngs, { gap = 16, quality = 0.82 } = {}) {
    const dataUrl = await page.evaluate(async ({ b64s, gap, quality }) => {
        const imgs = await Promise.all(b64s.map(b64 => new Promise(res => {
            const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64;
        })));
        const w = imgs.reduce((a, i) => a + i.naturalWidth, 0) + gap * (imgs.length - 1);
        const h = Math.max(...imgs.map(i => i.naturalHeight));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
        let off = 0;
        for (const i of imgs) { x.drawImage(i, off, 0); off += i.naturalWidth + gap; }
        return c.toDataURL('image/webp', quality);
    }, { b64s: pngs.map(b => b.toString('base64')), gap, quality });
    writeFileSync(join(OUT_DIR, `${name}.webp`), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`✓ ${name}.webp (합성 ${pngs.length}장)`);
}

/** 요소 PNG 스크린샷 (합성 재료) */
async function shotPng(page, locator) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    return el.screenshot();
}

const SHOTS = {
    // ① 사이드바 — 그룹 라벨 + 전체 메뉴
    'manual-01-sidebar': async (page) => {
        await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
        await snap(page, 'manual-01-sidebar', page.locator('nav, .sidebar, aside').first());
    },
    // ① 첫 진입 3단계 안내 — 별도 컨텍스트 필요 (플래그 미설정)
    'manual-01-guide': async (_page) => { /* GUIDE 플래그로 main에서 별도 처리 */ },
    // ① 더보기 전후 — 합성 2장
    'manual-01-more': async (page) => {
        await page.goto(`${BASE}/#/care-log`, { waitUntil: 'networkidle' });
        const row = 'details.care-more-actions';
        const before = await shotPng(page, row);
        await page.locator('details.care-more-actions > summary').first().click();
        await page.waitForTimeout(300);
        const after = await shotPng(page, row);
        await snapComposite(page, 'manual-01-more', [before, after]);
    },
    // ① 저장 배지 — 저장 클릭 직후 표시
    'manual-01-badge': async (page) => {
        await page.goto(`${BASE}/#/care-incident`, { waitUntil: 'networkidle' });
        await page.fill('#inc-client', '김○○');
        await page.fill('#inc-place', '거실');
        await page.fill('#inc-desc', '침대에서 내려오다 미끄러짐');
        await page.fill('#inc-action', '확인 후 안정 조치');
        await page.locator('[data-click="careIncidentGenerate"]').click();
        await page.locator('details.care-more-actions > summary').first().click({force:true});
        await page.locator('[data-click="careIncidentSave"]').click();
        await page.waitForSelector('.saved-flash', { timeout: 5000 });
        await snap(page, 'manual-01-badge', '.saved-flash');
    },
    // ① 공유 메뉴 — 모바일 뷰포트 컨텍스트 (main에서 별도 처리)
    'manual-01-share': async (_page) => { /* MOBILE 플래그로 main에서 별도 처리 */ },
    // ② 홈
    'manual-02-home': async (page) => {
        await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#care-home-view .care-home-card', { timeout: 15000 });
        await snap(page, 'manual-02-home', '#care-home-view .care-home-card');
    },
    // ② 서명 카드
    'manual-02-sign': async (page) => {
        await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
        await page.fill('#home-sign-author', '김요양');
        await page.fill('#home-sign-confirmer', '박시설');
        await page.fill('#home-sign-receiver', '이인수');
        await snap(page, 'manual-02-sign', '.care-home-card:has(#home-sign-author)');
    },
    // ③ 일지 작성 폼
    'manual-03-form': async (page) => {
        await page.goto(`${BASE}/#/care-log`, { waitUntil: 'networkidle' });
        await page.fill('#log-client', '김○○');
        await snap(page, 'manual-03-form', '#care-log-view .care-calc-form');
    },
    // ③ 관찰 칩 ↔ 명부 배지 — 합성
    'manual-03-chips': async (page) => {
        await page.goto(`${BASE}/#/care-log`, { waitUntil: 'networkidle' });
        await page.locator('.obs-chips input[value="소"]').first().check({force:true});
        const chips = await shotPng(page, '.obs-chips');
        await page.goto(`${BASE}/#/care-client`, { waitUntil: 'networkidle' });
        const badge = await shotPng(page, '#cli-list');
        await snapComposite(page, 'manual-03-chips', [chips, badge]);
    },
    // ④ 방문 결과 패널
    'manual-04-result': async (page) => {
        await page.goto(`${BASE}/#/care-visit`, { waitUntil: 'networkidle' });
        await page.fill('#vis-client','김○○'); await page.fill('#vis-visitor','김보호');
        await page.locator('[data-click="careVisitAdd"]').click(); await page.waitForTimeout(600);
        await page.locator('[data-click="careVisitResultOpen"]').first().click({force:true});
        await page.waitForSelector('#vis-result-panel:not(.is-hidden)', { timeout: 8000 });
        await snap(page, 'manual-04-result', '#vis-result-panel');
    },
    // ⑤ 사고보고 미리보기 — 본문 + 사진 그리드
    'manual-05-preview': async (page) => {
        await page.goto(`${BASE}/#/care-incident`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#inc-client', { timeout: 15000 });
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
    // ⑥ 인수인계 미리보기
    'manual-06-handover': async (page) => {
        await page.goto(`${BASE}/#/care-handover`, { waitUntil: 'networkidle' });
        await page.locator('[data-click="careHandoverGenerate"]').click();
        await page.waitForSelector('#ho-preview', { timeout: 10000 });
        await snap(page, 'manual-06-handover', '#ho-preview');
    },
    // ⑦ 근무표 목록
    'manual-07-roster': async (page) => {
        await page.goto(`${BASE}/#/care-roster`, { waitUntil: 'networkidle' });
        await page.fill('#ros-worker', '김요양');
        await page.locator('[data-click="careRosterAdd"]').click();
        await page.waitForTimeout(500);
        await snap(page, 'manual-07-roster', '#ros-preview, #ros-list');
    },
    // ⑧ 명부 카드
    'manual-08-client': async (page) => {
        await page.goto(`${BASE}/#/care-client`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#cli-list', { timeout: 15000 });
        await snap(page, 'manual-08-client', '#cli-list');
    },
    // ⑨ 대처카드 상세
    'manual-09-card': async (page) => {
        await page.goto(`${BASE}/#/care-card`, { waitUntil: 'networkidle' });
        await page.locator('.care-card-item, [data-click*="Card"], .care-card button').first().click();
        await page.waitForSelector('#care-card-detail', { timeout: 8000 });
        await snap(page, 'manual-09-card', '#care-card-detail');
    },
    // ⑩ 평가점검
    'manual-10-audit': async (page) => {
        await page.goto(`${BASE}/#/care-audit`, { waitUntil: 'networkidle' });
        await page.locator('#audit-list [data-audit] input').first().check({force:true});
        await snap(page, 'manual-10-audit', '#audit-progress, #audit-list');
    },
    // ⑪ 양식 편집기
    'manual-11-template': async (page) => {
        await page.goto(`${BASE}/#/care-custom-form`, { waitUntil: 'networkidle' });
        await snap(page, 'manual-11-template', '#care-custom-form-view .care-calc-form, #care-custom-form-view');
    },
    // ⑪ 점검표 인식 미리보기
    'manual-11-import': async (page) => {
        await page.goto(`${BASE}/#/care-audit`, { waitUntil: 'networkidle' });
        const csv = '구분,점검항목,근거\n인권,기관 인권교육 실시,기관 지침\n안전,기관 낙상 점검,기관 매뉴얼';
        await page.setInputFiles('#audit-file', { name: '기관점검표.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
        await page.waitForSelector('#audit-import-preview', { timeout: 8000 });
        await snap(page, 'manual-11-import', '#audit-import-preview');
    },
    // ⑫ 본인부담금
    'manual-12-calc': async (page) => {
        await page.goto(`${BASE}/#/care-calc`, { waitUntil: 'networkidle' });
        await page.selectOption('#care-grade', '1');
        await page.selectOption('#care-type', 'home');
        await page.fill('#care-use', '20');
        await page.locator('[data-click="careCalcRun"]').click();
        await page.waitForSelector('#care-result .care-doc', { timeout: 8000 });
        await snap(page, 'manual-12-calc', '#care-result');
    },
    // ⑬ 기관찾기 결과
    'manual-13-finder': async (page) => {
        await page.goto(`${BASE}/#/care-finder`, { waitUntil: 'networkidle' });
        await page.fill('#find-q', '요양');
        await page.locator('[data-click="careFinderSearch"]').click();
        await page.waitForTimeout(800);
        await snap(page, 'manual-13-finder', '#find-list');
    },
    // ⑭ 서식모음
    'manual-14-forms': async (page) => {
        await page.goto(`${BASE}/#/care-forms`, { waitUntil: 'networkidle' });
        await snap(page, 'manual-14-forms', '#care-forms-view .care-calc-form, #care-forms-view');
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
        try {
            if (n === 'manual-01-guide') { // 플래그 미설정 컨텍스트 — 3컷 안내 노출
                const g = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
                const gp = await g.newPage(); await seed(gp, { guide: true });
                await gp.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
                await gp.waitForSelector('#home-guide:not(.is-hidden)', { timeout: 8000 });
                await snap(gp, 'manual-01-guide', '#home-guide');
                await g.close();
            } else if (n === 'manual-01-share') { // 모바일 뷰포트 — 공유 시트 항목 포함 6개
                const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', isMobile: true, hasTouch: true });
                const mp = await m.newPage(); await seed(mp);
                await mp.goto(`${BASE}/#/care-incident`, { waitUntil: 'networkidle' });
                await mp.locator('[data-click="careShare"]').first().click();
                await mp.waitForTimeout(800);
                await snap(mp, 'manual-01-share', '.app-share-sheet, .share-sheet, [class*="share"][class*="menu"], [class*="share"][class*="sheet"]');
                await m.close();
            } else if (!SHOTS[n]) { console.warn(`? ${n} — 미구현 캡처`); continue; }
            else await SHOTS[n](page);
        } catch (e) { console.error(`✗ ${n}: ${e.message.split('\n')[0]}`); }
    }
    await browser.close();
    console.log('완료 — 자리 표시 줄을 ![캡션](images/<이름>.webp)로 교체하세요.');
}
main().catch(e => { console.error(e); process.exit(1); });
