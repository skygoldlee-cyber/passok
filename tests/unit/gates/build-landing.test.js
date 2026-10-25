// tests/unit/gates/build-landing.test.js — 랜딩 페이지 빌드 파이프라인 검증
// @spec LP-01,LP-02,LP-03,LP-04,LP-07,LP-08,LP-09
// 시험 카드 렌더·데모 데이터 수집·스키마 검증·마커 주입을 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const bl = require('../../../tools/build/build_landing.js');
const examsJson = JSON.parse(readFileSync(join(ROOT, 'content/exams.json'), 'utf-8'));

test('LP-03: 시험 카드가 exams.json 순회로 생성되고 comingSoon이 구분된다', () => {
    const html = bl.renderExamCards(examsJson.exams);
    for (const e of examsJson.exams) {
        assert.ok(html.includes(bl.esc(e.appName || e.name)), `${e.id} 카드 제목`);
    }
    const coming = examsJson.exams.filter(e => e.comingSoon);
    if (coming.length) {
        assert.ok(/landing-exam-coming">준비 중</.test(html), 'comingSoon 배지');
        assert.ok(!/coming-soon"[^>]*href/.test(html), 'comingSoon 카드는 링크 없음');
    }
    // 실제 시험 카드는 앱 링크 (?app=1 — LP-10 리다이렉트 우회 표시)
    assert.ok(html.includes('href="./index.html?app=1"'), '앱 링크');
});

test('LP-03: 카드 텍스트는 HTML 이스케이프된다', () => {
    const html = bl.renderExamCards([{ id: 'x', appName: '<img onerror=1>', desc: 'a<b', icon: 'fa-x', theme: { '--color-primary': '#fff' } }]);
    assert.ok(!html.includes('<img'), '미이스케이프 태그 차단');
    assert.ok(html.includes('&lt;img'), 'esc 적용');
});

test('LP-02: build()가 두 마커를 치환하고 데모 JSON을 내장한다', () => {
    const out = bl.build();
    assert.ok(!out.includes('@landing-exams') && !out.includes('@landing-demo'), '마커 잔존 없음');
    const m = out.match(/<script type="application\/json" id="landing-demo-data">\s*([\s\S]*?)\s*<\/script>/);
    assert.ok(m, '데모 JSON 블록');
    const data = JSON.parse(m[1]);
    assert.ok(Array.isArray(data.exams), 'exams 배열');
    assert.ok(!m[1].includes('</script'), '조기 종료 이스케이프');
});

test('LP-04: landing_demo.json 선언 시험만 데모에 포함된다', () => {
    const data = bl.collectDemoData(examsJson.exams);
    for (const entry of data.exams) {
        const demoFile = join(ROOT, examsJson.exams.find(e => e.id === entry.id).contentRoot, 'landing_demo.json');
        assert.ok(existsSync(demoFile) || entry.plan, `${entry.id}는 자산 없이 포함되면 안 됨`);
    }
    // 현재 리포: cosmetic만 landing_demo.json 보유
    const withQuiz = data.exams.filter(e => e.quiz);
    assert.ok(withQuiz.length >= 1, '퀴즈 데모 최소 1개');
    for (const e of withQuiz) {
        for (const it of e.quiz.items) {
            assert.ok(it.question && it.choices.length >= 2 && it.choices[it.answer], '문항 스키마');
        }
    }
});

test('LP-04: 데모 스키마 위반은 빌드를 중단시킨다', () => {
    assert.throws(() => bl.validateDemoItems('t', []), /items 배열/);
    assert.throws(() => bl.validateDemoItems('t', [{ question: 'q', choices: ['a'], answer: 0 }]), /choices/);
    assert.throws(() => bl.validateDemoItems('t', [{ question: 'q', choices: ['a', 'b'], answer: 5 }]), /범위/);
    assert.throws(() => bl.validateDemoItems('t', [{ question: 'q', choices: ['a', 'b'], answer: 1, explanation: 3 }]), /explanation/);
});

test('LP-07: landing.html은 SHELL_ASSETS 프리캐시에 포함되지 않는다', () => {
    const sw = readFileSync(join(ROOT, 'sw.js'), 'utf-8');
    const shellBlock = sw.match(/SHELL_ASSETS\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(shellBlock, 'SHELL_ASSETS 블록');
    assert.ok(!shellBlock[1].includes('landing.html'), '랜딩은 프리캐시 제외 (쉘 경량화)');
});

test('LP-08: 템플릿이 OG·JSON-LD·canonical 메타를 갖는다', () => {
    const tpl = readFileSync(join(ROOT, 'landing.template.html'), 'utf-8');
    assert.ok(/property="og:/.test(tpl), 'OG 메타');
    assert.ok(tpl.includes('application/ld+json'), 'JSON-LD');
    assert.ok(/rel="canonical"/.test(tpl), 'canonical');
});

test('LP-09: manifest에서 과목 비중·권장 리드타임을 추출한다', () => {
    const cosmetic = examsJson.exams.find(e => e.id === 'cosmetic');
    const plan = bl.loadPlanData(join(ROOT, cosmetic.contentRoot, 'manifest.json'));
    assert.ok(plan && plan.subjects.length >= 2, '과목 수집');
    assert.ok(plan.subjects.every(s => s.name), '과목명');
    assert.ok(plan.subjects.some(s => s.count > 0), '문항 수 추출 — (N제) 패턴');
    assert.equal(plan.minLeadDays, 90, 'study.minExamLeadDays');
    // 미존재 manifest → null (섹션 숨김 계약)
    assert.equal(bl.loadPlanData(join(ROOT, 'nonexistent/manifest.json')), null);
});
