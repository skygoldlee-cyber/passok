/**
 * 배포 스테이징 정리 헬퍼 — detached 자식으로 실행된다.
 *
 * win32에서 vercel 자식의 cwd 핸들이 부모 종료 후에도 수십 초간 남아
 * 부모의 rmSync가 EPERM으로 실패한다. 배포 흐름을 블로킹하지 않도록
 * 이 프로세스가 최대 5분간 5초 간격으로 재시도하고, 잔재는 Temp라
 * 최종 실패해도 무해하다 (종료 코드로만 보고).
 *
 * 사용: node cleanup_staging.js <dir>
 */
'use strict';
// @spec BP-07
const fs = require('fs');

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) process.exit(dir ? 0 : 2);

const INTERVAL_MS = 5000;
const DEADLINE_MS = 5 * 60 * 1000;
const deadline = Date.now() + DEADLINE_MS;

const tryRemove = () => {
    try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
        return !fs.existsSync(dir);
    } catch {
        return !fs.existsSync(dir);
    }
};

(function loop() {
    if (tryRemove()) process.exit(0);
    if (Date.now() >= deadline) process.exit(1);
    setTimeout(loop, INTERVAL_MS);
})();
