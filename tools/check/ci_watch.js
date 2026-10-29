// @spec P-14 — CI 감시 래퍼: HEAD의 최신 CI run을 감시하고, 실패 시 실패 잡 로그를
// 즉시 출력한다 (gh run watch --exit-status만으로는 실패 사유가 보고되지 않는 문제 해소).
// 사용: node tools/check/ci_watch.js          # 감시만 (실패 시 로그 출력, exit 1)
//       node tools/check/ci_watch.js --deploy  # 성공 시 npm run deploy까지 체인
const { execSync, spawnSync } = require('child_process');

const runId = execSync(
  'gh run list --branch main --limit 1 --json databaseId -q ".[0].databaseId"',
  { encoding: 'utf8', shell: true }
).trim();
if (!runId) { console.error('✗ 최신 CI run을 찾지 못함'); process.exit(1); }
console.log(`▶ CI 감시 — run ${runId}`);

const watch = spawnSync(`gh run watch ${runId} --exit-status`, { shell: true, encoding: 'utf8' });
if (watch.stdout) process.stdout.write(watch.stdout);
if (watch.status !== 0) {
  console.error(`\n✗ CI 실패 — 실패 잡 로그:`);
  try {
    const logs = execSync(`gh run view ${runId} --log-failed`, { encoding: 'utf8', shell: true });
    // 에러 라인 중심으로 압축 출력
    const lines = logs.split('\n').filter((l) => /error|fail|✗|assert/i.test(l)).slice(0, 40);
    console.error(lines.join('\n') || logs.slice(-3000));
  } catch (e) { console.error('로그 추출 실패:', e.message); }
  process.exit(1);
}
console.log('✅ CI 통과');
if (process.argv.includes('--deploy')) {
  const d = spawnSync('npm.cmd run deploy', { shell: true, stdio: 'inherit' });
  process.exit(d.status ?? 1);
}
