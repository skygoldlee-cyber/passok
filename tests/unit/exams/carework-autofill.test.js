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
