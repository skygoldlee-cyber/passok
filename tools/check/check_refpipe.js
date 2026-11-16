// tools/check/check_refpipe.js — ref-pipeline pytest 회귀 단계
// @spec none (검증 단계)
//
// ref-pipeline/md2doc.py의 MD→HTML/DOCX/PDF 변환 회귀를 pytest로 검증한다.
// Python/pytest 환경이 없는 머신(CI 등)에서는 경고 후 스킵 통과한다 —
// 로컬 개발 환경에서는 설치되어 있어야 하므로 tests/ 회귀를 놓치지 않는다.
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const r = spawnSync(
  'python',
  ['-m', 'pytest', 'ref-pipeline/tests/', '-q', '--no-header'],
  { cwd: root, stdio: 'inherit', encoding: 'utf-8' },
);
if (r.error) {
  // python 자체가 없으면 이 게이트를 적용할 수 없다 — 스킵(경고)으로 통과
  console.warn('⚠ python 실행 불가 — ref-pipeline pytest 스킵:', r.error.message);
  process.exit(0);
}
process.exit(r.status ?? 1);
