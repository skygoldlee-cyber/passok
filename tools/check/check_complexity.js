#!/usr/bin/env node
/**
 * check_complexity.js — 순환복잡도 래칫 (타입 래칫과 동형 단조 감소 계약)
 * @spec none (품질 게이트)
 *
 * COMPLEXITY_BACKLOG.md가 수동 문서라 측정치와 드리프트하던 문제를 해소한다 —
 * 기준선(tools/state/complexity_baseline.json)을 정본으로 두고, eslint
 * complexity 규칙(임계 10) 실측이 기준선을 넘으면 차단한다.
 *
 * 기준선 단위는 파일별 { count, max, sum } 3중 지표 — 함수 단위 키는
 * 이름 변경·익명 함수 재배치에서 오탐이 나므로, 파일 단위 집계로 환산한다:
 *   - count: 임계 초과 함수 수 — 신규 진입 차단
 *   - max:   최대 복잡도 — 최악 함수의 악화 차단
 *   - sum:   초과 함수의 점수 합 — 중간층 악화·분해 우회 차단
 * 세 지표 모두 비증가여야 통과 (분해로 sum이 줄면 허용).
 *
 * 사용:
 *   node tools/check/check_complexity.js            # 검사
 *   node tools/check/check_complexity.js --update   # 기준선 갱신
 *   node tools/check/check_complexity.js --dir src/views/  # 디렉터리만 표시
 *   node tools/check/check_complexity.js --report   # COMPLEXITY_BACKLOG.md 재생성
 */

// @spec none (품질 게이트)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(ROOT, 'tools', 'state', 'complexity_baseline.json');
const BACKLOG = path.join(ROOT, 'docs', 'dev', 'COMPLEXITY_BACKLOG.md');
const ESLINT = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const THRESHOLD = 10;

/**
 * eslint complexity 실행 → { files: {file:{count,max,sum}}, entries: [{file,name,line,score}] }
 */
function measure() {
    const r = spawnSync(process.execPath, [
        ESLINT, 'src/**/*.js', '--no-config-lookup',
        '--rule', JSON.stringify({ complexity: ['warn', THRESHOLD] }),
        '--format', 'json',
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.error) throw new Error(`eslint 실행 실패: ${r.error.message}`);
    let results;
    try {
        results = JSON.parse(r.stdout || '[]');
    } catch (e) {
        throw new Error(`eslint 출력 파싱 실패: ${e.message}\n${(r.stdout || '').slice(0, 500)}`);
    }
    const files = {};
    const entries = [];
    let anonSeq = 0;
    for (const res of results) {
        const file = path.relative(ROOT, res.filePath).split(path.sep).join('/');
        for (const msg of res.messages || []) {
            if (msg.ruleId !== 'complexity') continue;
            const sm = /complexity of (\d+)/.exec(msg.message || '');
            if (!sm) continue;
            const score = Number(sm[1]);
            const nm = /'([^']+)'/.exec(msg.message || '');
            const name = nm ? nm[1] : `(anonymous)#${++anonSeq}`;
            const f = files[file] || (files[file] = { count: 0, max: 0, sum: 0 });
            f.count += 1;
            f.max = Math.max(f.max, score);
            f.sum += score;
            entries.push({ file, name, line: msg.line, score });
        }
    }
    return { files, entries };
}

const { files, entries } = measure();
const dirArg = process.argv.indexOf('--dir');
const dirFilter = dirArg >= 0 ? process.argv[dirArg + 1] : null;
const total = Object.values(files).reduce((a, f) => a + f.count, 0);

if (process.argv.includes('--update')) {
    const sorted = Object.fromEntries(
        Object.entries(files).sort(([a], [b]) => a.localeCompare(b))
    );
    const doc = { threshold: THRESHOLD, files: sorted };
    fs.writeFileSync(BASELINE, JSON.stringify(doc, null, 2) + '\n');
    console.log(`기준선 갱신 — 파일 ${Object.keys(sorted).length}개 · 경고 ${total}건 (${path.relative(ROOT, BASELINE)})`);
    process.exit(0);
}

if (process.argv.includes('--report')) {
    const rows = [...entries].sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
    const table = rows.map((e) => `| ${e.score} | \`${e.name}\` | ${e.file}:${e.line} |`).join('\n');
    const body = `# 복잡도 분해 백로그 — 순환복잡도 상위 함수 목록

> **문서 ID**: DOC-DEV-14
> **범위**: platform · 판본: none
> **관련 SPEC ID**: 해당 없음 (유지보수 백로그 — 측정 규약은 [PROJECT_METRICS.md](reference/PROJECT_METRICS.md) §8 순환 복잡도 행)
> ⚙️ 생성물 — 정본은 tools/state/complexity_baseline.json + eslint 실측. 재생성: \`node tools/check/check_complexity.js --report\`

## 측정 규약

\`node tools/check/check_complexity.js\` (eslint complexity 임계 ${THRESHOLD}, Δ 비교는 동일 임계 유지 필수).

- 기준선: **${total}건 경고 / 임계 ${THRESHOLD} 초과** — 파일별 {count,max,sum} 비증가 게이트가 신규 진입·악화를 차단
- 분해 순서: 복잡도 점수 내림차순 — 상위부터 처리해야 곡선이 꺾인다
- 분해 완료 시 \`--update\`로 기준선을 축소하고 \`--report\`로 이 표를 재생성한다
- 분해 규약: 렌더 분기는 \`if\` 체인 → early return·테이블 조회·서브함수 추출로 내리고, 동작 변경 없이 구조만 정리한다. 대형 렌더 함수는 섹션별 private 렌더 함수로 분할

## 상위 함수 목록 (점수 내림차순)

| 복잡도 | 함수 | 위치 |
|---:|---|---|
${table}
`;
    fs.writeFileSync(BACKLOG, body);
    console.log(`백로그 재생성 — ${rows.length}건 (${path.relative(ROOT, BACKLOG)})`);
    process.exit(0);
}

const baseline = fs.existsSync(BASELINE)
    ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).files || {}
    : {};

const regressions = [];
const improved = [];
const resolved = [];
for (const [f, cur] of Object.entries(files)) {
    const b = baseline[f];
    if (!b) { regressions.push({ f, cur, b: { count: 0, max: 0, sum: 0 } }); continue; }
    const up = cur.count > b.count || cur.max > b.max || cur.sum > b.sum;
    const down = cur.count < b.count || cur.max < b.max || cur.sum < b.sum;
    if (up) regressions.push({ f, cur, b });
    else if (down) improved.push({ f, cur, b });
}
for (const f of Object.keys(baseline)) {
    if (!files[f]) resolved.push(f);
}

if (dirFilter) {
    const rows = entries.filter((e) => e.file.startsWith(dirFilter))
        .sort((a, b) => b.score - a.score);
    const sub = rows.length;
    console.log(`${dirFilter} — 경고 ${sub}건`);
    for (const e of rows) console.log(`  ${String(e.score).padStart(4)}  ${e.file}:${e.line} ${e.name}`);
    process.exit(0);
}

if (resolved.length || improved.length) {
    console.log(`ℹ 소진 진행 — 0 도달 ${resolved.length}파일, 감소 ${improved.length}파일 — --update로 단조 감소 반영`);
    for (const { f, cur, b } of improved) console.log(`   ${f} count ${b.count}→${cur.count} · max ${b.max}→${cur.max} · sum ${b.sum}→${cur.sum}`);
}
if (regressions.length) {
    console.error(`\n❌ 순환복잡도 기준선 초과 ${regressions.length}파일:`);
    for (const { f, cur, b } of regressions) {
        console.error(`   ${f} — count ${b.count}→${cur.count} · max ${b.max}→${cur.max} · sum ${b.sum}→${cur.sum}`);
        const lines = entries.filter((e) => e.file === f).slice(0, 5);
        for (const e of lines) console.error(`      L${e.line} ${e.name} (복잡도 ${e.score})`);
    }
    console.error('\n신규 임계 초과 함수는 분할하거나, 기존 함수는 점수를 낮추세요 — COMPLEXITY_BACKLOG.md 참조 (분해 후 --update)');
    process.exit(1);
}
const baseTotal = Object.values(baseline).reduce((a, f) => a + f.count, 0);
console.log(`✅ 순환복잡도 래칫 통과 — 잔여 ${total}건 (기준선 ${baseTotal}건, 파일 ${Object.keys(baseline).length}개 · 임계 ${THRESHOLD})`);
