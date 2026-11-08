// tests/unit/ui/saved-flash.test.js — 저장 확인 배지·삭제 확인 계약 (사용성 개선 회귀)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('저장 확인 배지 (③ 시니어 사용성)', () => {
    const uu = readFileSync('src/ui-utils.js', 'utf8');

    it('flashSavedBadge 헬퍼 — 목록 상단에 방금 배지를 남긴다', () => {
        assert.match(uu, /export function flashSavedBadge/);
        assert.match(uu, /saved-flash/);
        assert.match(uu, /기기에 저장됨/);
    });

    it('기록 뷰 저장 경로에 배지 호출 — 일지·인수인계·사고·방문', () => {
        for (const [f, host] of [
            ['src/exams/carework/views/care-log.js', 'log-saved'],
            ['src/exams/carework/views/care-handover.js', 'ho-saved'],
            ['src/exams/carework/views/care-incident.js', 'inc-saved'],
        ]) {
            const src = readFileSync(f, 'utf8');
            assert.match(src, /flashSavedBadge/, `${f} 배지 미연결`);
            assert.ok(src.includes(host), `${f} 호스트 ${host} 부재`);
        }
    });
});

describe('삭제 확인 일관 (⑥ 파괴적 동작)', () => {
    it('삭제 핸들러 8종에 showConfirm 확인 단계', () => {
        for (const f of [
            'src/exams/carework/views/care-log.js',
            'src/exams/carework/views/care-handover.js',
            'src/exams/carework/views/care-incident.js',
            'src/exams/carework/views/care-visit.js',
            'src/exams/carework/views/care-client.js',
            'src/exams/carework/views/care-roster.js',
            'src/exams/carework/views/care-custom-form.js',
        ]) {
            const src = readFileSync(f, 'utf8');
            const deletes = (src.match(/export (async )?function care\w*Delete/g) || []).length;
            const confirms = (src.match(/showConfirm\(/g) || []).length;
            assert.ok(deletes === 0 || confirms >= deletes, `${f} 삭제 ${deletes}개 중 확인 ${confirms}개`);
        }
    });
});
