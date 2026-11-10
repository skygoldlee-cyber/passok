// tools/illustrate/capture_manual.js — 실무매뉴얼 삽화 자동 캡처
// @spec none — 뷰 직접 진입 전 #/care-home 워밍업 필요(초기화 순서) — 문서 삽화 산출 도구 (런타임 미사용)
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
async function seed(page, { guide = false, study = false } = {}) {
    await page.addInitScript(({ guide, study }) => {
        const L = localStorage;
        L.setItem('current_exam', 'carework');
        L.setItem('ui_mode', study ? 'study' : 'practice');
        if (study) { // 학습안내서 삽화 — 시험일·목표만 시드 (기록 없는 신입 사용자 상태)
            const d = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
            L.setItem('exam_date', d);
            L.setItem('study_goals', JSON.stringify({ dailyCards: 50, dailyQuizzes: 10, weeklyStudyDays: 5 }));
        }
        L.setItem('appTheme', 'dark'); // 실무 삽화는 앱 기본 테마(다크) 기준 — 라이트는 colorScheme 라이트 별도 컨텍스트로
        L.setItem('pro_notice_seen', JSON.stringify({ _global: '2026-01-01' })); // Pro 최초 안내 모달이 캡처에 겹치는 것 방지
        if (!guide) L.setItem('carework_guide_seen', '1');
        L.setItem('carework:carework_doc_sign', JSON.stringify({ author: '김요양', confirmer: '박시설', receiver: '이인수' }));
        L.setItem('carework:carework_org_name', '○○요양원');
        L.setItem('carework:carework_clients', JSON.stringify([
            { id: 'c1', name: '김○○', status: '입소중', room: '101', birth: '1942-03-05', phone: '', allergy: '복숭아', caution: '우측 편마비', memo: '', docs: {}, createdAt: '2026-10-01T00:00:00Z' },
            { id: 'c2', name: '이○○', status: '입소중', room: '102', birth: '1938-07-12', phone: '', allergy: '', caution: '경도 인지저하', memo: '', docs: {}, createdAt: '2026-10-01T00:00:00Z' },
        ]));
        const today = new Date().toISOString().slice(0, 10);
        const log = (i, meal) => ({ id: 'l' + i, date: today, time: '0' + (8 + i) + ':30', client: '김○○', service: '방문요양', start: '08:30', end: '10:30', acts: ['신체활동', '식사보조'], obs: { meal, sleep: '양호', void: '정상' }, note: '특이사항 없음', text: '', createdAt: today + 'T' + i + ':00:00Z' });
        // 소→반→전 = 최신순 악화 시계열 — 명부 "식사량 확인 권장" 추세 배지 발동 (clientTrends)
        L.setItem('carework:carework_care_logs', JSON.stringify([log(1, '소'), log(2, '반'), log(3, '전')]));
        L.setItem('carework:carework_visits', JSON.stringify([
            { id: 'v1', date: today, time: '14:00', client: '김○○', visitor: '김보호', phone: '', relation: '자녀', purpose: '면회', status: 'scheduled', createdAt: today + 'T00:00:00Z' },
        ]));
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10); // 저장 건과 날짜 구분용
        L.setItem('carework:carework_incidents', JSON.stringify([
            { id: 'i1', date: yesterday, time: '09:15', client: '김○○', place: '거실', type: '낙상', severity: '경미', desc: '침대에서 내려오다 미끄러짐', action: '확인 후 안정 조치', witness: '박보호', familyNotified: true, text: '', createdAt: yesterday + 'T00:00:00Z' },
        ]));
        L.setItem('carework:carework_handovers', JSON.stringify([
            { id: 'h1', date: today, shift: '주간', from: '김요양', to: '이인수', status: '김○○ 식사량 감소 추세', tasks: '욕창 체크', caution: '낙상 주의', text: '', createdAt: today + 'T00:00:00Z' },
        ]));
        // documentElement는 document-start 시점에 없을 수 있음 — 시드 실패 방지용 가드+지연 주입
        try {
            const inject = () => {
                const st = document.createElement('style');
                st.textContent = '*{transition:none!important;animation:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
                (document.documentElement || document.head || document.body).appendChild(st);
            };
            if (document.documentElement) inject(); else document.addEventListener('DOMContentLoaded', inject, { once: true });
        } catch (_) { /* 스타일 실패해도 시드는 유지 */ }
    }, { guide, study });
}

/** PNG 버퍼 → webp 변환 (페이지 내 canvas 사용 — 외부 이미지 라이브러리 불필요)
 *  투명 영역은 body 배경색으로 평탄화 — 다크 테마의 밝은 텍스트가 흰 배경에 묻히는 것 방지 */
async function toWebp(page, pngBuf, quality = 0.82) {
    const dataUrl = await page.evaluate(async ({ b64, quality }) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
        const W = Math.min(924, img.naturalWidth), r = W / img.naturalWidth;
        const H = Math.round(img.naturalHeight * r);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const x = c.getContext('2d');
        x.fillStyle = getComputedStyle(document.body).backgroundColor;
        x.fillRect(0, 0, W, H);
        x.drawImage(img, 0, 0, W, H);
        // 하단 데드존 자동 트림 — 배경색만 남은 행을 아래에서 스캔해 제거 (수동 트림 대체)
        const d = x.getImageData(0, 0, W, H).data;
        const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number);
        let last = H - 1;
        outer: for (let y = H - 1; y >= 0; y--) {
            for (let px = 0; px < W; px += 4) {
                const i = (y * W + px) * 4;
                if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 36) { last = y; break outer; }
            }
        }
        const trimH = Math.min(H, last + 21);
        if (trimH < H) { const c2 = document.createElement('canvas'); c2.width = W; c2.height = trimH; c2.getContext('2d').drawImage(c, 0, 0); return c2.toDataURL('image/webp', quality); }
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
        document.querySelectorAll('.app-toast, .toast, .sw-toast, .consent-banner, .app-banner, [id*="toast"], [class*="toast"], [class*="banner"], [class*="update"], dialog[open]:not(#app-confirm-overlay), [class*="backdrop"], [class*="dim"]').forEach(e => e.remove());
        document.body.style.backgroundImage = 'none'; // 그라디언트만 제거 — 테마 배경색은 유지(다크 캡처 시 흰 배경 방지)
        document.getElementById('mobile-tab-bar')?.style.setProperty('display', 'none'); // 고정 탭 바가 요소 캡처에 겹치는 것 방지 (tabs 샷은 자체 복원)
    });
    await page.waitForTimeout(250);
}

/** 캡처 헬퍼 — locator 스크린샷 → images/<name>.webp */
async function snap(page, name, locator, { quality = 0.82 } = {}) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await dismissOverlays(page);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const expect = SHOT_EXPECT[name];
    if (expect) { // 캡처 대상이 의도한 내용인지 텍스트 단언 — 오매칭·모달 겹침 사전 차단
        const txt = await el.innerText().catch(() => '');
        if (!txt.includes(expect)) throw new Error(`expect 실패 — '${expect}' 미포함 (실제: ${txt.slice(0, 60)}…)`);
    }
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
        const x = c.getContext('2d');
        x.fillStyle = getComputedStyle(document.body).backgroundColor;
        x.fillRect(0, 0, w, h);
        let off = 0;
        for (const i of imgs) { x.drawImage(i, off, 0); off += i.naturalWidth + gap; }
        return c.toDataURL('image/webp', quality);
    }, { b64s: pngs.map(b => b.toString('base64')), gap, quality });
    writeFileSync(join(OUT_DIR, `${name}.webp`), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`✓ ${name}.webp (합성 ${pngs.length}장)`);
}

/** 원본 크기 캡처 — 리사이즈 없이 (사이드바처럼 좁은 요소) */
async function snapRaw(page, name, locator) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await dismissOverlays(page);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const png = await el.screenshot();
    writeFileSync(join(OUT_DIR, `${name}.webp`), png); // PNG 그대로 — 폭 유지
    console.log(`✓ ${name}.webp (원본 폭)`);
}

/** 요소 PNG 스크린샷 (합성 재료) */
async function shotPng(page, locator) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await dismissOverlays(page);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    return el.screenshot();
}

// 학습안내서 삽화 — 학습 모드(study 시드) 전용, STUDY_SHOTS와 이름 쌍
const STUDY = new Set(['manual-g01-dashboard', 'manual-g02-flow', 'manual-g04-mock', 'manual-g05-calendar']);

// 샷별 필수 텍스트 — 캡처 대상이 의도한 화면인지 단언 (없으면 스킵)
const SHOT_EXPECT = {
    'manual-01-badge': '기기에 저장됨',
    'manual-01-share': '내보낼 방식',
    'manual-02-sign': '출력물 서명',
    'manual-03-chips': '식사량',
    'manual-04-result': '방문 결과',
    'manual-11-template': '사본 만들기',
    'manual-15-mask': '인명 가림',
    'manual-g01-dashboard': '오늘 할 일',
    'manual-g02-flow': '개념 학습',
    'manual-g04-mock': '모의고사',
    'manual-g05-calendar': '캘린더',
};

const SHOTS = {
    // ── 학습 모드 삽화 (학습안내서 DOC-USR-25) ─────────────────
    'manual-g01-dashboard': async (page) => {
        await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#dashboard-view:not(.is-hidden)', { timeout: 20000 });
        await snap(page, 'manual-g01-dashboard', '#dashboard-view');
    },
    'manual-g02-flow': async (page) => {
        await page.goto(`${BASE}/#/care-flow`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#care-flow-view:not(.is-hidden)', { timeout: 20000 }).catch(() => {});
        await snap(page, 'manual-g02-flow', '#care-flow-view');
    },
    'manual-g04-mock': async (page) => {
        await page.goto(`${BASE}/#/exam`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#exam-view:not(.is-hidden)', { timeout: 20000 }).catch(() => {});
        await snap(page, 'manual-g04-mock', '#exam-view');
    },
    'manual-g05-calendar': async (page) => {
        await page.goto(`${BASE}/#/calendar`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#calendar-view:not(.is-hidden)', { timeout: 20000 }).catch(() => {});
        await snap(page, 'manual-g05-calendar', '#calendar-view');
    },

    // ① 사이드바 — PC 전용 UI (main에서 데스크탑 컨텍스트로 별도 처리)
    'manual-01-sidebar': async (_page) => { /* DESKTOP 플래그로 main에서 별도 처리 */ },
    // ① 모바일 하단 탭 바 — 실무 모드에서는 탭 바 자체가 전체 내비 (더보기 시트는 학습 전용)
    'manual-01-tabs': async (page) => {
        // page.goto는 항상 풀 리로드(=재부트) — same-document 해시 내비로 즉시 전환
        await page.evaluate(() => { location.hash = '/care-home'; });
        await page.waitForSelector('#care-home-view:not(.is-hidden)', { timeout: 60000 });
        await page.waitForSelector('#mobile-tab-bar .mobile-tab-item', { state: 'attached', timeout: 20000 });
        // 실제 UI는 좌우 스와이프 탭 바 — 첫 화면 그대로 캡처 (dismissOverlays가 숨기므로 복원 후 직접 캡처)
        await dismissOverlays(page);
        await page.evaluate(() => { const b = document.getElementById('mobile-tab-bar'); if (b) b.style.display = ''; });
        const png = await page.locator('#mobile-tab-bar').screenshot();
        writeFileSync(join(OUT_DIR, 'manual-01-tabs.webp'), await toWebp(page, png));
        console.log('✓ manual-01-tabs.webp');
    },
    // ① 첫 진입 3단계 안내 — 별도 컨텍스트 필요 (플래그 미설정)
    'manual-01-guide': async (_page) => { /* GUIDE 플래그로 main에서 별도 처리 */ },
    // ① 더보기 전후 — 합성 2장
    'manual-01-more': async (page) => {
        await page.goto(`${BASE}/#/care-log`, { waitUntil: 'networkidle' });
        const det = page.locator('details.care-more-actions').first();
        await dismissOverlays(page);
        const before = await det.screenshot();
        await page.evaluate(() => document.querySelectorAll('details.care-more-actions').forEach(d => d.open = true));
        await page.waitForTimeout(300);
        const after = await det.screenshot();
        await snapComposite(page, 'manual-01-more', [before, after]);
    },
    // ① 저장 배지 — 저장 클릭 직후 표시
    'manual-01-badge': async (_page) => { /* DSF2 플래그로 main에서 별도 처리 */ },
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
        await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
        await page.goto(`${BASE}/#/care-log`, { waitUntil: 'networkidle' });
        // 라디오 input은 display:none — 클릭 불가, 감싸는 라벨 칩을 클릭
        await page.locator('.obs-chip:has(input[value="소"])').first().click();
        // 칩 행만 자르면 라벨 잘림·합성 시 빈 공간 — 특이사항+관찰칩이 든 폼 블록째 캡처
        const chips = await shotPng(page, '.care-calc-form:has(.obs-chips)');
        await page.goto(`${BASE}/#/care-client`, { waitUntil: 'networkidle' });
        const badge = await shotPng(page, '#cli-list');
        await snapComposite(page, 'manual-03-chips', [chips, badge]);
    },
    // ④ 방문 결과 패널
    'manual-04-result': async (page) => {
        await page.goto(`${BASE}/#/care-visit`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#care-visit-view:not(.is-hidden)', { timeout: 20000 });
        await page.fill('#vis-date', '2026-11-09');
        await page.selectOption('#vis-relation', { index: 1 }).catch(() => {});
        await page.fill('#vis-time', '14:00');
        await page.fill('#vis-client', '김○○');
        await page.fill('#vis-visitor', '김보호');
        await page.locator('[data-click="careVisitAdd"]').click(); await page.waitForTimeout(800);
        // 모바일 하단 탭 바가 목록 하단 버튼을 가릴 수 있어 JS 클릭으로 디스패치
        await page.evaluate(() => document.querySelector('#vis-scheduled [data-click="careVisitResultOpen"]')?.click());
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
        await page.evaluate(() => {
            const v = (id, x) => { const e = document.getElementById(id); if (e) e.value = x; };
            v('ho-date', '2026-11-09'); v('ho-time', '17:00'); v('ho-from', '김요양'); v('ho-to', '이인수');
            v('ho-status', '김○○ 식사량 감소 추세'); v('ho-caution', '낙상 주의');
        });
        await page.locator('[data-click="careHandoverGenerate"]').click();
        await page.waitForSelector('#ho-preview .care-doc, #ho-preview pre', { timeout: 10000 });
        await snap(page, 'manual-06-handover', '#ho-preview .care-doc, #ho-preview pre');
    },
    // ⑦ 근무표 목록
    'manual-07-roster': async (page) => {
        await page.goto(`${BASE}/#/care-roster`, { waitUntil: 'networkidle' });
        await page.fill('#ros-date', '2026-11-09');
        await page.selectOption('#ros-shift', { index: 1 }).catch(() => {});
        await page.fill('#ros-worker', '김요양');
        await page.locator('[data-click="careRosterAdd"]').click();
        await page.waitForTimeout(800);
        await snap(page, 'manual-07-roster', '#care-roster-view');
    },
    // ⑧ 명부 카드
    'manual-08-client': async (page) => {
        // 콜드 랜딩은 시험 스코프 해석 전에 렌더돼 명부가 빌 수 있음 — 해시 내비로 진입
        await page.evaluate(() => { location.hash = '/care-client'; });
        await page.waitForSelector('#cli-list .care-log-saved-item', { timeout: 15000 });
        // 카드가 #cli-list 박스보다 넓어 가장자리가 잘림 — 클립을 넓혀 캡처
        await dismissOverlays(page);
        await page.locator('#cli-list').scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        const box = await page.locator('#cli-list').boundingBox();
        const png = await page.screenshot({ clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 4), width: box.width + 16, height: box.height + 8 } });
        writeFileSync(join(OUT_DIR, 'manual-08-client.webp'), await toWebp(page, png));
        console.log('✓ manual-08-client.webp');
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
        await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#care-home-view', { timeout: 15000 });
        await page.goto(`${BASE}/#/care-audit`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#audit-list > *', { timeout: 15000 });
        await dismissOverlays(page);
        await page.locator('#audit-list').scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        // 근거 배지가 박스 우측을 넘어 잘림 — 클립을 넓혀 캡처 (하단 빈 영역은 후처리 트림)
        const box = await page.locator('#audit-list').boundingBox();
        const png = await page.screenshot({ clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 4), width: box.width + 24, height: box.height + 8 } });
        writeFileSync(join(OUT_DIR, 'manual-10-audit.webp'), await toWebp(page, png));
        console.log('✓ manual-10-audit.webp');
    },
    // ⑪ 기본 양식 목록 — .care-calc-form 폴백은 홈 서명 카드를 오매칭하므로 제외,
    // 콜드 랜딩 시 뷰 미활성이므로 care-home 워밍업 후 해시 이동
    'manual-11-template': async (page) => {
        await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
        await page.goto(`${BASE}/#/care-custom-form`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#cf-seed-list > *', { timeout: 8000 });
        await snap(page, 'manual-11-template', '#cf-seed-list');
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
        await page.evaluate(() => { document.getElementById('care-grade').value='1'; document.getElementById('care-type').value='home'; document.getElementById('care-use').value='1200000'; });
        await page.locator('[data-click="careCalcRun"]').click();
        await page.waitForSelector('#care-result .care-doc', { timeout: 8000 });
        await snap(page, 'manual-12-calc', '#care-result .care-doc, #care-result');
    },
    // ⑬ 기관찾기 결과
    'manual-13-finder': async (page) => {
        await page.goto(`${BASE}/#/care-finder`, { waitUntil: 'networkidle' });
        await page.fill('#find-q', '행복요양');
        await page.locator('[data-click="careFinderSearch"]').click();
        await page.waitForTimeout(800);
        await page.locator('#find-list [data-click="careFinderUseOrg"]').first().click().catch(() => {});
        await page.waitForTimeout(400);
        await snap(page, 'manual-13-finder', '#find-list > *');
    },
    // ⑭ 서식모음
    'manual-14-forms': async (page) => {
        await page.goto(`${BASE}/#/care-forms`, { waitUntil: 'networkidle' });
        await snap(page, 'manual-14-forms', '#care-forms-view .care-home-card, #care-forms-view .care-calc-form');
    },
};

async function main() {
    const names = process.argv.filter(a => a.startsWith('manual-'));
    const browser = await chromium.launch();
    // 공용 컨텍스트 — 현장 사용이 모바일 중심이므로 폰 뷰포트 기본 (사이드바 등 PC 전용만 별도 컨텍스트)
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await seed(page);
    // 첫 내비게이션은 콜드 부트라 뷰 활성화가 느림 — 워밍업으로 흡수
    await page.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#care-home-view:not(.is-hidden)', { timeout: 30000 }).catch(() => {});
    const run = names.length ? names : Object.keys(SHOTS);
    let studyPage = null;
    for (const n of run) {
        try {
            if (n === 'manual-01-sidebar') { // PC 전용 UI — 데스크탑 컨텍스트 (PC 병기)
                const s = await browser.newContext({ viewport: { width: 1280, height: 1600 }, locale: 'ko-KR' });
                const sp = await s.newPage(); await seed(sp);
                await sp.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
                await sp.waitForSelector('nav, aside, .sidebar', { timeout: 15000 });
                await snapRaw(sp, 'manual-01-sidebar', sp.locator('nav, aside, .sidebar').first());
                await s.close();
            } else if (n === 'manual-01-guide') { // 플래그 미설정 컨텍스트 — 3컷 안내 노출
                const g = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', isMobile: true, hasTouch: true });
                const gp = await g.newPage(); await seed(gp, { guide: true });
                await gp.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
                await gp.waitForSelector('#home-guide:not(.is-hidden)', { timeout: 8000 });
                await snap(gp, 'manual-01-guide', '#home-guide');
                await g.close();
            } else if (n === 'manual-01-badge') { // 고해상도 — 배지 블러 대응
                const b = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
                const bp = await b.newPage(); await seed(bp);
                await bp.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
                await bp.waitForSelector('#care-home-view', { timeout: 15000 });
                await bp.goto(`${BASE}/#/care-incident`, { waitUntil: 'networkidle' });
                await bp.waitForSelector('#inc-client', { timeout: 15000 });
                // 시드 사고(김○○·낙상)와 구분되도록 다른 대상자·유형으로 저장 — 목록 중복 방지
                await bp.fill('#inc-client', '이○○');
                await bp.fill('#inc-place', '식사실');
                await bp.selectOption('#inc-type', { index: 2 }).catch(() => {});
                await bp.fill('#inc-desc', '식사 중 목멤 호소');
                await bp.fill('#inc-action', '확인 후 안정 조치');
                await bp.locator('[data-click="careIncidentGenerate"]').click();
                await bp.evaluate(() => document.querySelectorAll('details.care-more-actions').forEach(d => d.open = true));
                await bp.locator('.care-more-actions-list [data-click="careIncidentSave"]').click({ force: true });
                await bp.waitForTimeout(1500);
                await snap(bp, 'manual-01-badge', '#inc-saved');
                await b.close();
            } else if (n === 'manual-01-share') { // 모바일 뷰포트 — 공유 시트 항목 포함 6개
                const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', isMobile: true, hasTouch: true });
                const mp = await m.newPage(); await seed(mp);
                await mp.goto(`${BASE}/#/care-home`, { waitUntil: 'networkidle' });
                await mp.waitForSelector('#care-home-view:not(.is-hidden)', { timeout: 30000 }).catch(() => {});
                await mp.goto(`${BASE}/#/care-incident`, { waitUntil: 'networkidle' });
                await mp.waitForSelector('#care-incident-view:not(.is-hidden)', { timeout: 20000 });
                await mp.evaluate(() => document.querySelectorAll('details.care-more-actions').forEach(d => d.open = true));
                await mp.getByText('공유·내보내기').locator('visible=true').first().click();
                await mp.waitForSelector('.care-export-sheet', { timeout: 8000 });
                // 시트 배경이 반투명 --bg-elevated라 뒤 페이지가 비침 — 캡처용 불투명 처리
                await mp.evaluate(() => { const s = document.querySelector('.care-export-sheet'); if (s) s.style.background = '#1f2937'; });
                await snap(mp, 'manual-01-share', '.care-export-sheet');
                await m.close();
            } else if (STUDY.has(n)) { // 학습 모드 — 별도 시드 페이지 (학습안내서 삽화)
                if (!studyPage) {
                    studyPage = await ctx.newPage();
                    await seed(studyPage, { study: true });
                    await studyPage.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' });
                    await studyPage.waitForSelector('#dashboard-view:not(.is-hidden)', { timeout: 30000 }).catch(() => {});
                }
                await SHOTS[n](studyPage);
            } else if (!SHOTS[n]) { console.warn(`? ${n} — 미구현 캡처`); continue; }
            else await SHOTS[n](page);
        } catch (e) {
            console.error(`✗ ${n}: ${e.message.split('\n')[0]}`);
            try { // 실패 시 페이지 상태 덤프 — 뷰 활성화·셀렉터 진단
                const dbg = await page.evaluate(() => ({ url: location.href, view: [...document.querySelectorAll('.view-section')].find(x => !x.classList.contains('is-hidden') && x.offsetParent !== null)?.id, items: document.querySelectorAll('#mobile-tab-bar .mobile-tab-item').length }));
                console.error('   dbg', JSON.stringify(dbg));
            } catch (_) { /* 진단 실패 무시 */ }
        }
    }
    await browser.close();
    console.log('완료 — 자리 표시 줄을 ![캡션](images/<이름>.webp)로 교체하세요.');
}
main().catch(e => { console.error(e); process.exit(1); });
