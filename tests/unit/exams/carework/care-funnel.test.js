// tests/unit/exams/carework/care-funnel.test.js
// @spec CO-12·CO-13·CO-08·CO-09·CO-10 — 전환 퍼널 계측 순수 로직
import { test } from 'node:test';
import assert from 'node:assert/strict';

// storage.js는 브라우저 storage 필요 — 순수 판독만 검증하기 위해 localStorage 스텁
const mem = {};
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };

const { markFunnel, funnelStats } = await import('../../../../src/exams/carework/care-funnel.js');

test('최초 사용 기록 + 도구별 누적', () => {
    const f1 = markFunnel('tool:care-log');
    assert.ok(f1.first_use);
    markFunnel('tool:care-log');
    const f2 = markFunnel('tool:care-client');
    assert.equal(f2.tools['tool:care-log'], 2);
    assert.equal(f2.tools['tool:care-client'], 1);
    assert.equal(f2.first_use, f1.first_use); // 첫 사용 시점 불변
    const s = funnelStats();
    assert.equal(s.tools['tool:care-log'], 2);
});

test('roster 계측 — 신규 도구 키 누적', () => {
    markFunnel('tool:care-roster');
    assert.equal(funnelStats().tools['tool:care-roster'], 1);
});

// 카카오맵 검색 쿼리 계약 — 주소만 전달 (기관명+주소 조합은 지도 미검색)
import { readFileSync } from 'node:fs';
test('카카오맵 링크 — 주소만 검색 쿼리로 사용', () => {
    const src = readFileSync('src/exams/carework/views/care-finder.js', 'utf8');
    assert.match(src, /encodeURIComponent\(f\.address \|\| f\.region \|\| f\.name\)/);
});

test('공단 검색 링크 — 카드 반복 없이 뷰 상단 단일 위치', () => {
    assert.ok(!/selectLtcoSrch/.test(readFileSync('src/exams/carework/views/care-finder.js', 'utf8')));
    assert.match(readFileSync('html/exams/carework/care-finder.html', 'utf8'), /selectLtcoSrch/);
});

test('CO-13 공유 — careShare 핸들러 등록 + 뷰 버튼 존재', () => {
    assert.match(readFileSync('src/practice-registry.js', 'utf8'), /careShare/);
    assert.match(readFileSync('html/exams/carework/care-handover.html', 'utf8'), /data-click="careShare"/);
    assert.match(readFileSync('src/exams/carework/care-share.js', 'utf8'), /navigator\.share/);
});

test('CO-13 프라이버시 — 수급자 데이터 공유는 경고+인명 가림', () => {
    const src = readFileSync('src/exams/carework/care-share.js', 'utf8');
    assert.match(src, /기관 정책을 확인하세요/); // 한 번 클릭 공유 — 경고는 비차단 안내
    assert.match(src, /flag === 'mask'/);
    for (const f of ['care-log', 'care-handover', 'care-incident', 'care-client', 'care-visit', 'care-roster']) {
        assert.match(readFileSync(`html/exams/carework/${f}.html`, 'utf8'), /\|mask/); // 수급자 데이터 출력물 mask 기본
    }
});

test('CO-13 공유 — 미생성 시 자동 생성 + 폼 폴백 (단독 완결)', () => {
    const src = readFileSync('src/exams/carework/care-share.js', 'utf8');
    assert.match(src, /&& gen && !gen\.endsWith/); // 미생성 시 생성 핸들러 자동 실행
    assert.match(src, /_formText/); // 생성 실패 시 폼 양식 폴백
    assert.match(src, /f3 === 'mask'/); // mask 생략 시 3번째가 생성 핸들러
    assert.match(src, /care-calc-err/); // 오류 마커는 양식으로 폴백
    for (const [f, g] of [['care-calc', 'careCalcRun'], ['care-log', 'careLogGenerate'], ['care-handover', 'careHandoverGenerate'], ['care-incident', 'careIncidentGenerate'], ['care-client', 'careClientCsvExport'], ['care-visit', 'careVisitCsvExport'], ['care-roster', 'careRosterCsvExport']]) {
        assert.match(readFileSync(`html/exams/carework/${f}.html`, 'utf8'), new RegExp(`\\|${g}[|"]`));
    }
});

test('CO-08 가명처리 — 이름·연락처·호실 제거, 구조화 필드 유지', async () => {
    const { pseudonymize } = await import('../../../../src/exams/carework/care-ai.js');
    const p = pseudonymize({ client: '김철수', room: '301호', phone: '010-1234-5678', note: '박영희 방문 010-9876-5432', obs: { meal: '반' } });
    assert.equal(p.client, '대상자A');
    assert.ok(!p.room && !p.phone);
    assert.ok(!/010/.test(p.note));
    assert.equal(p.obs.meal, '반');
});

test('CO-08 프롬프트 — 시스템+프롬프트 반환, 가명 데이터만 포함', async () => {
    const { buildDraftPrompt } = await import('../../../../src/exams/carework/care-ai.js');
    const { system, prompt } = buildDraftPrompt({ client: '김철수', obs: { meal: '반' } });
    assert.match(system, /보조/);
    assert.match(prompt, /대상자A/);
    assert.ok(!prompt.includes('김철수'));
});

test('CO-09 주간 리포트 — 최근 7일 대상자 기록 요약', async () => {
    const { weeklyReport } = await import('../../../../src/exams/carework/care-report.js');
    const today = new Date().toISOString().slice(0, 10);
    const r = weeklyReport('김철수', { logs: [{ client: '김철수', date: today, note: '산책', obs: { meal: '반' } }], visits: [], incidents: [] });
    assert.equal(r.count, 1);
    assert.match(r.text, /김철수|일지 1건/);
});
test('CO-10 증적 커버리지 — 기록 유무 매칭·부족 항목 열거', async () => {
    const { auditCoverage } = await import('../../../../src/exams/carework/care-coverage.js');
    const c = auditCoverage({ clients: [{}], logs: [{ obs: { meal: '전' } }], visits: [], incidents: [], handovers: [] });
    assert.equal(c.total, 6);
    assert.ok(c.missing.includes('방문·면회'));
    assert.ok(!c.missing.includes('관찰(obs)'));
});

test('CO-08 인수인계 가명처리 — 대상자 목록·근무자명·인계 작업 마스킹', async () => {
    const { pseudonymize, buildDraftPrompt } = await import('../../../../src/exams/carework/care-ai.js');
    const p = pseudonymize({ clients: '김철수, 이영희', from: '김요양', to: '박요양', tasks: '홍길동 산책' });
    assert.equal(p.clients, '[대상자 목록]');
    assert.equal(p.from, '인계자');
    assert.equal(p.to, '인수자');
    const { prompt } = buildDraftPrompt({ clients: 'x', date: '2026-11-04', shift: '주간' }, 'ho');
    assert.match(prompt, /인수인계서/);
});

test('CO-10 커버리지 배너 — 보간 출력은 esc 적용 (싱크 규약)', () => {
    assert.match(readFileSync('src/exams/carework/views/care-audit.js', 'utf8'), /esc\(cov\.text\)/);
});

test('CO-13 공유 — 모바일 파일 첨부 우선·데스크톱 복사+다운로드, 항상 반응 보장', () => {
    const src = readFileSync('src/exams/carework/care-share.js', 'utf8');
    assert.match(src, /copyFallback/);
    assert.match(src, /clipboard\?\.writeText|clipboard\.writeText/);
    assert.match(src, /pointer:coarse/); // 터치 기기에서만 파일 공유 시트
    assert.match(src, /new File\(/); // 모바일 파일 첨부 공유
    assert.match(src, /a\.download/); // 데스크톱 파일 다운로드
    assert.match(src, /z-index:-9999/); // html2canvas 오프스크린(left:-9999px)은 빈 캔버스 — 뷰포트 내 숨김 필수
});
