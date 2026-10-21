// tests/unit/practice-registry.test.js
// @spec UM-01~05
// 실무작업실 피처 레지스트리 — 시험 features 키 ↔ 실무 뷰 정의 매핑,
// 진입 가능 판정·랜딩·타이틀·슬러그·지연 핸들러 유도를 검증.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    isPracticeCapable, getEnabledPracticeFeatures, getPracticeLanding,
    getPracticeViewTitles, getPracticeHashSlugs, getPracticeLazyHandlers,
    getPracticeViewRenderers, warmPracticeFeatures, getPracticeDomainSpec,
} from '../../../src/practice-registry.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let originalWindow;

function setExams(exams) {
    Object.defineProperty(global, 'window', {
        value: { EXAMS_LIST: { exams } },
        writable: true, configurable: true,
    });
}

beforeEach(() => { originalWindow = global.window; });
afterEach(() => {
    Object.defineProperty(global, 'window', {
        value: originalWindow, writable: true, configurable: true,
    });
});

test('실무 피처 보유 시험 — isPracticeCapable true, 랜딩은 formula-view', () => {
    setExams([
        { id: 'cosmetic', default: true, features: { formula: true } },
    ]);
    assert.equal(isPracticeCapable(), true);
    assert.equal(getPracticeLanding(), 'formula-view');
    assert.equal(getEnabledPracticeFeatures().length, 1);
});

test('실무 피처 미보유 시험 — isPracticeCapable false, 랜딩 폴백 dashboard-view', () => {
    setExams([
        { id: 'insadj', default: true, features: { dictionary: true } },
    ]);
    assert.equal(isPracticeCapable(), false);
    assert.equal(getPracticeLanding(), 'dashboard-view');
    assert.deepEqual(getEnabledPracticeFeatures(), []);
});

test('시험 목록 없음 — 진입 불가 판정 (레지스트리 부재 안전)', () => {
    setExams([]);
    assert.equal(isPracticeCapable(), false);
    assert.equal(getPracticeLanding(), 'dashboard-view');
});

test('타이틀 맵 — 선언된 실무 뷰의 title/subtitle을 제공', () => {
    setExams([]);
    const titles = getPracticeViewTitles();
    assert.equal(titles['formula-view'].title, '실습');
    assert.ok(titles['formula-view'].subtitle.length > 0);
});

test('타이틀 맵 — registry.uiText[uiTextKey]가 중립 기본값을 덮어쓴다 (도메인 카피는 시험 소유)', () => {
    setExams([]);
    const titles = getPracticeViewTitles({ uiText: { formula: { title: 'Formula OS', subtitle: '원료 조회 · 배합 계산' } } });
    assert.equal(titles['formula-view'].title, 'Formula OS');
    assert.equal(titles['formula-view'].subtitle, '원료 조회 · 배합 계산');
    // uiText 미선언(일부 필드만 선언) — 기본값 폴백 유지
    const partial = getPracticeViewTitles({ uiText: { formula: { title: 'My OS' } } });
    assert.equal(partial['formula-view'].title, 'My OS');
    assert.ok(partial['formula-view'].subtitle.length > 0);
    const none = getPracticeViewTitles({ uiText: {} });
    assert.equal(none['formula-view'].title, '실습');
});

test('실무 피처 카피 계약 — formula 보유 시험은 uiText에 카피 슬롯을 선언한다', () => {
    // 플랫폼 기본값은 도메인 중립 — 도메인 카피(Formula OS·원료·포뮬러 등)는
    // 시험 manifest uiText.formula/planLimits가 소유해야 실무 뷰·플랜 비교에서
    // 중립 문구가 노출되지 않는다 (DA-15 정신의 카피 계층 확장).
    const exams = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf8')).exams || [];
    for (const exam of exams) {
        if (!(exam.features && exam.features.formula)) continue;
        const mp = path.join(ROOT, exam.contentRoot || `content/exams/${exam.id}`, 'manifest.json');
        const uiText = (JSON.parse(fs.readFileSync(mp, 'utf8')).uiText) || {};
        assert.ok(uiText.formula && uiText.formula.title, `${exam.id}: uiText.formula.title 누락`);
        assert.ok(uiText.formula.subtitle, `${exam.id}: uiText.formula.subtitle 누락`);
        assert.ok(uiText.planLimits && uiText.planLimits.title, `${exam.id}: uiText.planLimits.title 누락`);
        for (const k of ['formula', 'customer', 'material', 'batch']) {
            assert.ok(uiText.planLimits[k], `${exam.id}: uiText.planLimits.${k} 라벨 누락`);
        }
    }
});

test('해시 슬러그 — formula-view → formula', () => {
    setExams([]);
    assert.deepEqual(getPracticeHashSlugs(), { 'formula-view': 'formula' });
});

test('지연 핸들러 — 로더 함수 + 이름 배열 쌍, 이름은 전체 유니크', () => {
    setExams([]);
    const handlers = getPracticeLazyHandlers();
    assert.equal(handlers.length, 10); // main·batch·customer·material·compliance·sales·products·notice·audit·adverse
    const names = [];
    for (const [load, list] of handlers) {
        assert.equal(typeof load, 'function');
        assert.ok(Array.isArray(list) && list.length > 0);
        names.push(...list);
    }
    assert.equal(new Set(names).size, names.length);
    // 대표 핸들러 표본 — 도메인 디스패치 계약 확인
    for (const sample of ['openFormulaList', 'openBatchPanel', 'openCustomerPanel', 'openMaterialPanel', 'openCompliancePanel', 'openLabelPanel', 'openAdLintPanel', 'openProductPanel', 'productOpenByIngredient', 'checkMfdsNoticeNow', 'auditPrintReport', 'openAdversePanel']) {
        assert.ok(names.includes(sample), `핸들러 누락: ${sample}`);
    }
});

test('지연 핸들러 — 등록 이름 전부가 대상 뷰 모듈에서 export된다 (재수출 체인 추적)', () => {
    // 뷰 모듈 파사드 분해 시 재수출 누락으로 data-click 핸들러가
    // undefined로 브리지되는 회귀 차단 — 선언 이름 ↔ 소스 export 정합 검증.
    const collectExports = (absPath, seen = new Set()) => {
        if (seen.has(absPath)) return new Set();
        seen.add(absPath);
        const names = new Set();
        if (!fs.existsSync(absPath)) return names;
        const src = fs.readFileSync(absPath, 'utf8');
        for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) {
            names.add(m[1]);
        }
        for (const m of src.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
            for (const part of m[1].split(',')) {
                const name = part.trim().split(/\s+as\s+/).pop().trim();
                if (name) names.add(name);
            }
            const dep = path.resolve(path.dirname(absPath), m[2]);
            for (const n of collectExports(dep, seen)) names.add(n);
        }
        return names;
    };
    for (const [load, names] of getPracticeLazyHandlers()) {
        const rel = /** @type {any} */ (load).rel;
        if (!rel) continue; // 도메인 무관 플랫폼 모듈(notice)은 규약 경로 없음
        const exported = collectExports(path.join(ROOT, 'src', 'exams', 'cosmetic', rel));
        for (const name of names) {
            assert.ok(exported.has(name), `${rel}: 핸들러 '${name}' 미export — 파사드 재수출 누락 추정`);
        }
    }
});

test('뷰 렌더러 맵 — 등록된 실무 뷰 id 키의 함수', () => {
    setExams([]);
    const renderers = getPracticeViewRenderers();
    assert.equal(typeof renderers['formula-view'], 'function');
});

test('유휴 예열 — warmPracticeFeatures가 유효 피처만 예열한다', () => {
    setExams([{ id: 'x', features: {} }]);
    const calls = [];
    const origFetch = global.fetch;
    global.fetch = (...a) => { calls.push(a[0]); return Promise.resolve({ ok: true, text: () => Promise.resolve('') }); };
    try {
        warmPracticeFeatures(); // 피처 미보유 — 아무 요청도 없어야 함
        assert.equal(calls.length, 0);
    } finally { global.fetch = origFetch; }
    assert.equal(typeof warmPracticeFeatures, 'function');
});

test('도메인 경로 규약 — feature를 켠 시험마다 뷰 모듈·마크업이 src/html/exams/<id>/ 아래 존재', () => {
    // 레지스트리가 시험 id 리터럴 없이 규약 경로로 해석하므로, 피처 활성 시험은
    // 규약 위치에 파일을 배치해야 한다 — 신규 시험의 누락을 여기서 차단.
    const spec = getPracticeDomainSpec();
    assert.ok(Object.keys(spec).length > 0);
    const exams = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf8')
    ).exams;
    for (const exam of exams) {
        for (const [featKey, decl] of Object.entries(spec)) {
            if (!exam.features || !exam.features[featKey]) continue;
            for (const rel of decl.modules) {
                assert.ok(
                    fs.existsSync(path.join(ROOT, 'src', 'exams', exam.id, rel)),
                    `${exam.id}: src/exams/${exam.id}/${rel} 없음 (features.${featKey} 활성)`
                );
            }
            if (decl.markup) {
                assert.ok(
                    fs.existsSync(path.join(ROOT, 'html', 'exams', exam.id, decl.markup)),
                    `${exam.id}: html/exams/${exam.id}/${decl.markup} 없음 (features.${featKey} 활성)`
                );
            }
            if (decl.styles) {
                assert.ok(
                    fs.existsSync(path.join(ROOT, 'css', 'exams', exam.id, decl.styles)),
                    `${exam.id}: css/exams/${exam.id}/${decl.styles} 없음 (features.${featKey} 활성)`
                );
            }
        }
    }
});
