// tests/unit/repo-integrity-gates.test.js — 저장소 무결성 게이트 로직 검증
// @spec none (게이트 도구 — 순수 로직 픽스처 검증)
// check_replacement_char·check_orphan_assets·check_secrets의 판정 코어를
// 합성 픽스처로 검증 — 스캐너 변경으로 게이트가 무력화·오탐화되는 회귀 차단.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import enc from '../../../tools/check/check_replacement_char.js';
import orphan from '../../../tools/check/check_orphan_assets.js';
import secrets from '../../../tools/check/check_secrets.js';

// ── check_replacement_char — FFFD 잔재 ↔ 기준선 비교 ─────────────────
const { compareCounts, FFFD } = enc;

test('FFFD 비교 — 신규 유입 파일은 위반', () => {
  const { violations, decreased } = compareCounts({ 'docs/new.md': 2 }, {});
  assert.equal(violations.length, 1);
  assert.match(violations[0], /신규 유입: docs\/new\.md/);
  assert.equal(decreased.length, 0);
});

test('FFFD 비교 — 기준선 이내는 통과, 초과는 위반', () => {
  const ok = compareCounts({ 'a.css': 3 }, { 'a.css': 5 });
  assert.equal(ok.violations.length, 0);
  const over = compareCounts({ 'a.css': 6 }, { 'a.css': 5 });
  assert.match(over.violations[0], /기준선 초과: a\.css \(6 > 5\)/);
});

test('FFFD 비교 — 감소·소멸은 하향 안내만', () => {
  const { violations, decreased } = compareCounts(
    { 'a.css': 2 }, { 'a.css': 5, 'b.css': 1 });
  assert.equal(violations.length, 0);
  assert.equal(decreased.length, 2); // a.css 5→2 + b.css 소멸
  assert.ok(decreased.some((d) => d.includes('b.css') && d.includes('0')));
});

test('FFFD 상수 — U+FFFD 코드포인트 정합', () => {
  assert.equal(FFFD.codePointAt(0), 0xFFFD);
  assert.equal(FFFD.length, 1);
});

// ── check_orphan_assets — 미참조 자산 분류 + 예외 명단 ────────────────
const { collectOrphans, compareOrphans, ASSET_RE, EXEMPT_RE } = orphan;

test('고아 분류 — 다른 파일이 파일명을 참조하면 참조된 자산', () => {
  const corpus = new Map([
    ['docs/a.md', '![img](images/logo.svg)'],
    ['docs/images/logo.svg', '<svg/>'],
  ]);
  assert.deepEqual(collectOrphans(['docs/images/logo.svg'], corpus), []);
});

test('고아 분류 — 어디에도 등장하지 않으면 고아', () => {
  const corpus = new Map([['docs/a.md', 'no refs here']]);
  assert.deepEqual(collectOrphans(['docs/img/old.png'], corpus), ['docs/img/old.png']);
});

test('고아 분류 — 자기 자신의 참조는 참조로 세지 않음', () => {
  const corpus = new Map([['docs/img/a.svg', 'a.svg를 언급하는 SVG 주석']]);
  assert.deepEqual(collectOrphans(['docs/img/a.svg'], corpus), ['docs/img/a.svg']);
});

test('고아 분류 — 텍스트 자산(svg) 내부 참조도 참조로 인정', () => {
  const corpus = new Map([['icons/parent.svg', '<image href="child.png"/>']]);
  assert.deepEqual(collectOrphans(['icons/child.png'], corpus), []);
});

test('자산·예외 규약 — 확장자 목록과 규약 디렉터리 면제', () => {
  assert.ok(ASSET_RE.test('x/y.PNG') && ASSET_RE.test('a.woff2') && ASSET_RE.test('b.pdf'));
  assert.ok(!ASSET_RE.test('a.md') && !ASSET_RE.test('b.js'));
  assert.ok(EXEMPT_RE.test('content/exams/x/참조자료/_archive/old.pdf'));
  assert.ok(EXEMPT_RE.test('tests/e2e/visual.spec.js-snapshots/a.png'));
  assert.ok(!EXEMPT_RE.test('docs/business/old.png'));
});

test('고아 비교 — 예외 명단 등록 자산은 통과, 미등록은 위반', () => {
  const orphans = ['docs/keep.pdf', 'docs/new.png'];
  const { violations } = compareOrphans(orphans, { 'docs/keep.pdf': '의도적 보존' });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /미참조 자산: docs\/new\.png/);
});

test('고아 비교 — 명단 항목이 고아에서 빠지면 정리 안내', () => {
  const { violations, resolved } = compareOrphans([], { 'docs/gone.png': '보존' });
  assert.equal(violations.length, 0);
  assert.equal(resolved.length, 1);
  assert.ok(resolved[0].includes('docs/gone.png'));
});

// ── check_secrets — 시크릿 패턴 스캔 ─────────────────────────────────
const { scanText, PATTERNS } = secrets;

test('시크릿 스캔 — 알려진 비밀값 패턴 각각을 탐지', () => {
  // 픽스처는 소스에 패턴 형태로 적지 않고 런타임에 조립한다 —
  // 리터럴로 쓰면 check:secrets가 이 테스트 파일 자체를 위반으로 잡는다.
  const cases = [
    ['-----BEGIN ' + 'RSA PRIVATE KEY-----', '개인키 블록'],
    ['key = "sb' + '_secret_abcXYZ123"', 'Supabase Secret key'],
    ['service' + '_role: "eyJhbGciOiJIUzI1NiJ9.longjwtvalue"', 'service_role 키 대입'],
    ['AK' + 'IAIOSFODNN7EXAMPLE', 'AWS Access Key'],
    ['AIza' + 'SyD4iE2x'.repeat(4) + 'abc', 'GCP API Key'],
    [`token = "ghp_${'a1B2c3'.repeat(6)}"`, 'GitHub 토큰'],
    [`xoxb-${'1234567890-1234'}`, 'Slack 토큰'],
    [`sk_live_${'4eC39HqLyjWDarjtT1zdp7dc'}`, '결제 라이브 키 (Stripe)'],
    ['pass' + 'word: "supersecretvalue99"', '비밀값 하드코딩 대입'],
  ];
  for (const [line, label] of cases) {
    const hits = scanText(line);
    assert.equal(hits.length, 1, `미탐지: ${label}`);
    assert.ok(hits[0].includes(label), `라벨 불일치: ${hits[0]}`);
  }
});

test('시크릿 스캔 — 무해한 코드는 오탐 없음', () => {
  const benign = [
    'const password = getUserInput();',            // 짧은 리터럴 아님·대입 아님
    'secret: env.SECRET',                          // 환경변수 참조
    'api_key = "short"',                           // 12자 미만 리터럴
    'Publishable key: sb_publishable_xxx',         // 공개키 접두사 (패턴 아님)
    'AKIAIOSFOD',                                  // AWS 형식 길이 미달
    'const PRIVATE_KEY_PATH = "./keys/dev.pem"',   // 키 경로, 블록 아님
  ];
  for (const line of benign) {
    assert.equal(scanText(line).length, 0, `오탐: ${line}`);
  }
});

test('시크릿 스캔 — 라인 단위 탐지 + 첫 패턴만 라벨 (라인당 1히트)', () => {
  const text = 'normal line\nsb_secret_key9\nghp_' + 'z'.repeat(36) + '\nlast';
  const hits = scanText(text);
  assert.equal(hits.length, 2);
  assert.ok(hits[0].startsWith('2 —') && hits[1].startsWith('3 —'));
});

test('시크릿 패턴 수 — 레지스트리 공백 감지', () => {
  assert.ok(PATTERNS.length >= 8, '패턴 수 감소 — 신규 시크릿 유형 미등록 가능성');
});
