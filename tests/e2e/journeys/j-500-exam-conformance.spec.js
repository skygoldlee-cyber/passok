// tests/e2e/journeys/j-500-exam-conformance.spec.js — J-500 시험 팩 학습 적합성
// @spec none
//
// exams.json의 전 팩을 순회하며 학습 표면(부팅·교재·퀴즈·모의고사)과 선언된 실무
// 피처 뷰가 실제로 렌더되는지 계약 검증 — 신규 팩은 exams.json 추가만으로 자동 편입.
// 표면 기대치의 정본은 data/exams/<id>/registry.js (빌드 산출물): 퀴즈·문제은행
// 콘텐츠가 없는 팩은 '정상 빈 상태' 처리까지 검증하고, 있으면 실제 출제를 요구한다.
// 심층 여정은 별도 스펙 — 여기서는 "팩이 학습 앱으로서 부팅 가능한가"만 본다.
import { test, expect } from '@playwright/test';
import { EXAMS, PRACTICE_SLUGS, examSeed } from '../support/exam-matrix.js';

async function boot(page) {
    await page.goto('/index.html#/dashboard');
    await page.waitForFunction(() => window.__APP_INITIALIZED === true, null, { timeout: 30_000 });
}

test.describe('J-500 시험 팩 학습 적합성 (exams.json 매트릭스)', () => {
    for (const exam of EXAMS) {
        test(`${exam.id} [${exam.tier}] — 부팅·교재·퀴즈·선언 피처 뷰 @p2`, async ({ page }) => {
            test.setTimeout(150_000);
            const errors = [];
            page.on('pageerror', (e) => errors.push(String(e)));

            await page.addInitScript(examSeed(exam.id));
            await boot(page);
            await expect(page.locator('.view-section').first()).toBeVisible();
            expect(await page.evaluate(() => localStorage.getItem('current_exam'))).toBe(exam.id);

            // 교재 — 과목을 순회하며 목차/본문이 실제로 나오는 과목을 찾는다
            // (팩별로 문항 없는 과목이 섞여 있어 임의 index 선택은 불가 — 사용자와 동일하게
            //  비어 있으면 다음 과목을 고른다). 전 과목 비어 있으면 draft만 허용.
            await page.goto('/index.html#/reader');
            await expect(page.locator('#reader-subject-select')).toBeVisible({ timeout: 20_000 });
            const readerLoc = page.locator('#reader-toc-list .reader-toc-item, #textbook-reader-container .reader-section-card').first();
            let readerOk = false;
            for (let i = 0; i < await page.locator('#reader-subject-select option').count(); i++) {
                await page.locator('#reader-subject-select').selectOption({ index: i });
                try {
                    await expect(readerLoc).toBeVisible({ timeout: 5_000 });
                    readerOk = true;
                    break;
                } catch { /* 이 과목은 콘텐츠 없음 — 다음 과목 */ }
            }
            if (!readerOk) expect(exam.tier, `${exam.id} — 교재 콘텐츠가 있는 과목 0건`).toBe('draft');

            // 퀴즈(빈칸 채우기) — registry의 과목별 quizzes 통계가 기대치의 정본.
            //  quizSubjects=0: 이 팩은 퀴즈 콘텐츠를 저작하지 않음 → 빈 뱅크 처리가
            //   정상 계약(경고 토스트, 아레나 미오픈)인지만 검증. >0/미빌드(null):
            //   과목을 순회해 출제되는 과목을 찾아 1회분 응답→결과 패널까지 검증.
            const expectQuiz = exam.registry ? exam.registry.quizSubjects > 0 : exam.tier !== 'draft';
            await page.goto('/index.html#/quiz');
            await expect(page.locator('#quiz-subject-select')).toBeVisible({ timeout: 20_000 });
            if (!expectQuiz) {
                await page.locator('#quiz-subject-select').selectOption({ index: 0 });
                await page.locator('#start-quiz-btn').click();
                await expect(page.locator('.app-toast-item:has-text("출제 가능한 퀴즈가 없습니다")'),
                    `${exam.id} — 빈 퀴즈 뱅크 무응답(토스트도 아레나도 없음)`).toBeVisible({ timeout: 15_000 });
            } else {
            let quizStarted = false;
            for (let i = 0; i < await page.locator('#quiz-subject-select option').count(); i++) {
                await page.locator('#quiz-subject-select').selectOption({ index: i });
                await page.locator('#start-quiz-btn').click();
                try {
                    await expect(page.locator('#quiz-arena-panel')).toBeVisible({ timeout: 8_000 });
                    quizStarted = true;
                    break;
                } catch { /* '출제 가능한 퀴즈가 없습니다' — 다음 과목 */ }
            }
            if (quizStarted) {
                for (let i = 0; i < 12; i++) {
                    if (await page.locator('#quiz-result-panel').isVisible()) break;
                    const options = page.locator('#quiz-options-container:not(.is-hidden) button');
                    const ox = page.locator('#quiz-ox-container:not(.is-hidden) .quiz-ox-btn');
                    const input = page.locator('#quiz-input-group:not(.is-hidden) #quiz-answer-input');
                    if (await options.count()) await options.first().click();
                    else if (await ox.count()) await ox.first().click();
                    else {
                        await input.fill('1');
                        await page.locator('#submit-quiz-btn').click();
                    }
                    await expect(page.locator('#next-quiz-btn')).toBeVisible({ timeout: 10_000 });
                    await page.locator('#next-quiz-btn').click();
                }
                await expect(page.locator('#quiz-result-panel')).toBeVisible({ timeout: 10_000 });
            } else {
                expect(exam.tier, `${exam.id} — 퀴즈 문항 0건 (비draft는 실패)`).toBe('draft');
            }
            }

            // 통합 모의고사 — 전 과목 문항 커버(simCovered)면 실제 출제를 요구하고,
            // 일부 과목 뱅크 부재면 '데이터 불완전' 경고 토스트의 정상 열화를 검증한다.
            // 완주가 아닌 1문항 응답 스모크 — 심층 여정은 J-201 소관.
            if (exam.registry?.hasIntegrated) {
                await page.goto('/index.html#/exam');
                await expect(page.locator('#integrated-exam-btn')).toBeVisible({ timeout: 15_000 });
                await page.locator('#integrated-exam-btn').click();
                if (exam.registry.simCovered) {
                    await expect(page.locator('#sim-arena-panel'),
                        `${exam.id} — 전 과목 뱅크 있는데 모의고사 미시작`).toBeVisible({ timeout: 20_000 });
                    // 셔플된 1번 문항 유형 무관 응답 — 객관식·OX·조합은 .sim-option-item, 단답형은 #sim-text-input
                    await page.locator('.sim-option-item, #sim-text-input').first()
                        .waitFor({ state: 'visible', timeout: 20_000 });
                    const simTextInput = page.locator('#sim-text-input');
                    if (await simTextInput.isVisible()) {
                        await simTextInput.fill('5');
                    } else {
                        await page.locator('.sim-option-item').first().click();
                    }
                    await expect(page.locator('#omr-solved-count')).toHaveText('1', { timeout: 10_000 });
                } else {
                    await expect(page.locator('.app-toast-item:has-text("모의고사 데이터가 불완전")'),
                        `${exam.id} — 뱅크 미커버 과목 있는데 경고 토스트 없음`).toBeVisible({ timeout: 20_000 });
                }
            }

            // 선언된 실무 피처 — 슬러그 진입 시 뷰가 실제로 렌더된다 (마크업 지연 주입 포함)
            for (const [key, slug] of Object.entries(PRACTICE_SLUGS)) {
                if (!exam.features[key]) continue;
                await page.goto(`/index.html#/${slug}`);
                await expect(page.locator('.view-section:visible').first(),
                    `${exam.id}.${key} → #/${slug} 뷰 미렌더`).toBeVisible({ timeout: 20_000 });
            }

            // 스코프 격리 — 이 세션에서 생긴 'xxx:' 접두 키는 전부 현재 팩 스코프여야 한다
            // (신선 컨텍스트라 다른 팩의 잔존 키는 없음 — 크로스 스코프 쓰기만 걸러낸다)
            const stray = await page.evaluate((id) => Object.keys(localStorage)
                .map((k) => /^([a-z][a-z0-9]*):/.exec(k)?.[1])
                .filter((p) => p && p !== id), exam.id);
            expect(stray, `타 스코프 키 생성: ${stray.join(',')}`).toHaveLength(0);

            expect(errors.filter((e) => !/favicon|manifest/i.test(e)),
                `pageerror: ${errors.join(' | ')}`).toHaveLength(0);
        });
    }
});
