// tests/unit/gates/exam-onboard.test.js — 시험 팩 온보딩·승격 진단 체커 검증
// @spec DA-06,ES-01
// check_exam_onboard.js가 저장소 현 상태에서 구조 오류 없이 종료하고,
// 등급(정식/준비중)·문항 실측이 리포트에 반영되는지 검증.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const run = () => execFileSync(process.execPath,
    [join(ROOT, 'tools/check/check_exam_onboard.js')],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const exams = JSON.parse(readFileSync(join(ROOT, 'content', 'exams.json'), 'utf8')).exams;

describe('check:onboard — 시험 팩 온보딩·승격 진단', () => {
    it('저장소 전 시험이 구조 오류 없이 진단된다', () => {
        assert.match(run(), /구조 오류 0건/);
    });

    it('등록 시험 전부가 리포트 행에 표시된다', () => {
        const out = run();
        for (const e of exams) {
            assert.match(out, new RegExp(`^\\s*${e.id}\\s`, 'm'), `${e.id} 행 누락`);
        }
    });

    it('comingSoon ↔ 등급 표기가 정합이다', () => {
        const out = run();
        for (const e of exams) {
            const expected = e.comingSoon ? '준비중' : '정식';
            assert.match(out, new RegExp(`^\\s*${e.id}\\s+${expected}`, 'm'),
                `${e.id} 등급 불일치 (기대: ${expected})`);
        }
    });

    it('정식 시험은 과목당 문항 기준을 충족한다', () => {
        const out = run();
        for (const e of exams.filter((x) => !x.comingSoon)) {
            assert.ok(!out.includes(`[${e.id}] 정식 시험인데`), `${e.id}: 문항 부족 경고`);
        }
    });
});
