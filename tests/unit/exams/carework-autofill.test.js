// tests/unit/exams/carework-autofill.test.js — 반복 입력 자동 기입 계약 (시니어 사용성)
// @spec none
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const keys = readFileSync(new URL('../../../src/core/storage-keys.js', import.meta.url), 'utf8');
const inc = readFileSync(new URL('../../../src/exams/carework/views/care-incident.js', import.meta.url), 'utf8');
const ho = readFileSync(new URL('../../../src/exams/carework/views/care-handover.js', import.meta.url), 'utf8');

describe('carework 반복 입력 자동 기입', () => {
    it('저장 키 선언', () => {
        assert.match(keys, /CARE_LAST_INCIDENT:/);
        assert.match(keys, /CARE_LAST_HANDOVER:/);
    });
    it('사고보고 — 저장 시 persist + 초기화 시 복원', () => {
        assert.match(inc, /setJSON\(STORAGE_KEYS\.CARE_LAST_INCIDENT/);   // 저장 persist
        assert.match(inc, /getJSON\(STORAGE_KEYS\.CARE_LAST_INCIDENT/);   // 초기화 복원
        assert.match(inc, /inc-\$\{k\}/);                                 // 필드 매핑
        assert.match(inc, /!el\.value/);                                  // 빈 필드만 채움
    });
    it('인수인계 — 저장 시 persist + 초기화 시 복원', () => {
        assert.match(ho, /setJSON\(STORAGE_KEYS\.CARE_LAST_HANDOVER/);
        assert.match(ho, /getJSON\(STORAGE_KEYS\.CARE_LAST_HANDOVER/);
        assert.match(ho, /ho-\$\{k\}/);
        assert.match(ho, /!el\.value/);
    });
});

describe('carework 파괴 동작 확인 일관성', () => {
    it('초기화·복원에도 showConfirm 필수', () => {
        const audit = readFileSync(new URL('../../../src/exams/carework/views/care-audit.js', import.meta.url), 'utf8');
        const calc = readFileSync(new URL('../../../src/exams/carework/views/care-calc.js', import.meta.url), 'utf8');
        for (const [src, fn] of [[audit, 'careAuditReset'], [audit, 'careAuditFileReset'], [calc, 'careCalcReset']]) {
            const i = src.indexOf(`function ${fn}`);
            assert.match(src.slice(i, i + 300), /await showConfirm\(/, `${fn} 확인 없음`);
        }
    });
    it('저장 피드백 — flashSavedBadge 호출', () => {
        for (const f of ['care-client.js', 'care-custom-form.js', 'care-incident.js', 'care-handover.js', 'care-log.js', 'care-visit.js']) {
            const src = readFileSync(new URL(`../../../src/exams/carework/views/${f}`, import.meta.url), 'utf8');
            assert.match(src, /flashSavedBadge\(/, `${f} 저장 배지 없음`);
        }
    });
    it('홈 다음 행동 안내 — 건수 요약을 행동 안내로', () => {
        const home = readFileSync(new URL('../../../src/exams/carework/views/care-home.js', import.meta.url), 'utf8');
        assert.match(home, /\$\('home-next'\)/);          // 안내 요소 렌더
        assert.match(home, /아직 오늘 기록이 없어요/);      // 기록 0건 안내
        assert.match(home, /인수인계.*넘기|넘기세요/);      // 마무리 흐름 안내
    });
});
