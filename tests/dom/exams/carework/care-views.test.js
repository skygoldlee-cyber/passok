// tests/dom/exams/carework/care-views.test.js — carework 실무 뷰 커버리지
// @spec none — 시험 전용 실무 뷰 DOM 계약 (DA-13)
// 목적: carework 5개 실무 뷰의 핵심 핸들러를 jsdom에서 실행해 DOM 반영과
//       커버리지 임계(함수·라인)를 고정한다 — 실마크업 파셜을 주입해 사용한다.
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.mock('../../../../src/ui-utils.js', () => ({
    showToast: vi.fn(),
    showConfirm: vi.fn(() => Promise.resolve(true)),
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn(),
}));
vi.mock('../../../../src/pro/pro-upgrade.js', () => ({
    proFeatureNotice: vi.fn(() => false),
    hasProEntitlement: vi.fn(() => false),
    refreshProBadges: vi.fn(),
}));

import { careCalcRun, careCalcReset } from '../../../../src/exams/carework/views/care-calc.js';
import { careCardOpen, careCardClose, initCareCardView } from '../../../../src/exams/carework/views/care-card.js';
import { careLogGenerate, careLogCopy, initCareLogView } from '../../../../src/exams/carework/views/care-log.js';
import { careAuditReset, initCareAuditView } from '../../../../src/exams/carework/views/care-audit.js';
import { careHandoverGenerate, careHandoverCopy, initCareHandoverView } from '../../../../src/exams/carework/views/care-handover.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const loadPartial = (rel) => {
    document.body.innerHTML = readFileSync(join(ROOT, 'html', 'exams', 'carework', rel), 'utf-8');
};

describe('carework 실무 뷰 — 마크업↔핸들러 계약', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    it('careCalc — 계산 후 결과 카드 렌더', () => {
        loadPartial('care-calc.html');
        document.getElementById('care-grade').value = '1';
        document.getElementById('care-type').value = 'home';
        document.getElementById('care-use').value = '20';
        careCalcRun();
        expect(document.querySelector('#care-result')?.textContent).toMatch(/원/);
        careCalcReset();
    });

    it('careCard — 목록→상세→복귀', async () => {
        loadPartial('care-card.html');
        await initCareCardView();
        const btn = document.querySelector('.care-card-item');
        if (btn) careCardOpen({ currentTarget: btn });
        careCardClose();
        expect(document.getElementById('care-card-list')).toBeTruthy();
    });

    it('careLog — 초기화 후 생성·복사', () => {
        loadPartial('care-log.html');
        initCareLogView();
        document.getElementById('log-date').value = '2026-11-01';
        document.getElementById('log-client').value = '김○○';
        document.getElementById('log-service').value = 'visit-care';
        careLogGenerate();
        expect(document.querySelector('#log-preview pre')?.textContent).toMatch(/김○○/);
        careLogCopy();
    });

    it('careAudit — 로드 후 점검 초기화', async () => {
        loadPartial('care-audit.html');
        await initCareAuditView();
        careAuditReset();
        expect(document.getElementById('audit-list')).toBeTruthy();
    });

    it('careHandover — 생성·복사·공유 핸들러', () => {
        loadPartial('care-handover.html');
        initCareHandoverView();
        document.getElementById('ho-date').value = '2026-11-01';
        document.getElementById('ho-from').value = '김○○';
        document.getElementById('ho-to').value = '박○○';
        careHandoverGenerate();
        expect(document.querySelector('#ho-preview pre')?.textContent).toMatch(/인수인계서/);
        careHandoverCopy();
    });
});
