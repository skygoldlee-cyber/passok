#!/usr/bin/env node
/**
 * check_nouncheckedindex.js — noUncheckedIndexedAccess 잔여 래칫 (TS 점진 전환 Phase 2, ADR-0015)
 * @spec none (품질 게이트)
 *
 * noImplicitAny 소진(Phase 1) 이후의 다음 컴파일러 강화 플래그.
 * obj[key]·arr[i] 인덱스 접근의 반환 타입을 T | undefined로 강제해
 * 미등록 키·범위 밖 인덱스의 조용한 undefined 전파를 컴파일 타임에 차단한다.
 * jsconfig.json은 백로그 때문에 플래그를 켜지 못하므로, 이 체커가 별도로
 * tsc를 플래그 적용 상태로 실행해 측정한다 (check_noimplicitany.js와 동일 패턴).
 *
 * 규칙 (단조 감소 계약):
 *   - 파일별 에러 수 > 기준선 또는 기준선 없는 신규 에러 → 차단
 *   - 파일별 에러 수 < 기준선 → 해소 보고 (--update로 반영)
 *   - 기준선이 0이 된 파일은 목록에서 제거 — 이후 재유입도 차단
 *
 * 사용:
 *   node tools/check/check_nouncheckedindex.js            # 검사
 *   node tools/check/check_nouncheckedindex.js --update   # 기준선 갱신
 *   node tools/check/check_nouncheckedindex.js --dir src/core/  # 디렉터리만 표시
 */

// @spec none (품질 게이트)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(ROOT, 'tools', 'state', 'nouncheckedindex_baseline.json');
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

/** tsc --noUncheckedIndexedAccess 실행 → { 파일경로: 에러수, ... } */
function measure() {
    const r = spawnSync(process.execPath, [TSC, '-p', 'jsconfig.json', '--noEmit', '--noUncheckedIndexedAccess'], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    const out = (r.stdout || '') + (r.stderr || '');
    if (r.error) throw new Error(`tsc 실행 실패: ${r.error.message}`);
    // 'src/x.js(12,34): error TS7006: …' 형식 — 에러 외 출력(notice 등)은 패턴 불일치로 자연 제외
    const counts = {};
    for (const m of out.matchAll(/^((?:src|data|tools)\/[^()\r\n]+)\(\d+,\d+\): error TS/gm)) {
        const f = m[1].replace(/\\/g, '/');
        counts[f] = (counts[f] || 0) + 1;
    }
    return { counts, out };
}

const { counts, out } = measure();
const dirArg = process.argv.indexOf('--dir');
const dirFilter = dirArg >= 0 ? process.argv[dirArg + 1] : null;

if (process.argv.includes('--update')) {
    const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`기준선 갱신 — 파일 ${Object.keys(counts).length}개 · 에러 ${total}건 (${path.relative(ROOT, BASELINE)})`);
    process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};

const regressions = []; // 기준선 초과·신규 파일
const improved = [];    // 감소했으나 0 아님
const resolved = [];    // 0 도달
for (const [f, n] of Object.entries(counts)) {
    const b = baseline[f] || 0;
    if (n > b) regressions.push({ f, n, b });
    else if (n < b) improved.push({ f, n, b });
}
for (const f of Object.keys(baseline)) {
    if (!counts[f]) resolved.push(f);
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const baseTotal = Object.values(baseline).reduce((a, b) => a + b, 0);

if (dirFilter) {
    // --dir: 디렉터리 한정 실측 나열 (게이트 판정 없이 소진 작업용 리포트)
    const rows = Object.entries(counts).filter(([f]) => f.startsWith(dirFilter)).sort((a, b) => b[1] - a[1]);
    const sub = rows.reduce((a, [, n]) => a + n, 0);
    console.log(`${dirFilter} — 파일 ${rows.length}개 · 에러 ${sub}건`);
    for (const [f, n] of rows) console.log(`  ${String(n).padStart(4)}  ${f}`);
    process.exit(0);
}

if (resolved.length || improved.length) {
    console.log(`ℹ 소진 진행 — 0 도달 ${resolved.length}파일, 감소 ${improved.length}파일 — --update로 단조 감소 반영`);
    for (const { f, n, b } of improved) console.log(`   ${f} ${b} → ${n}`);
}
if (regressions.length) {
    console.error(`\n❌ noUncheckedIndexedAccess 에러 기준선 초과 ${regressions.length}파일:`);
    for (const { f, n, b } of regressions) {
        console.error(`   ${f} — ${b ? `${b} → ${n}` : `신규 ${n}건`}`);
        // 해당 파일의 실제 에러 라인 최대 5건 표시
        const lines = out.split('\n').filter((l) => l.startsWith(`${f}(`)).slice(0, 5);
        for (const l of lines) console.error(`      ${l.trim()}`);
    }
    console.error('\n인덱스 접근에 || 폴백·?./가드를 추가해 undefined를 소비처가 처리하세요 — 미등록 키·범위 밖 인덱스 전파 차단 래칫 (ADR-0015)');
    process.exit(1);
}
console.log(`✅ noUncheckedIndexedAccess 래칫 통과 — 잔여 ${total}건 (기준선 ${baseTotal}건, 파일 ${Object.keys(baseline).length}개)`);
