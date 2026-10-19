/**
 * env.js — 루트 .env 로더 (dotenv 의존 없이 최소 파서)
 * @spec AI-02
 *
 * 로컬 시크릿의 단일 소스 — tools/ai 제작 도구·운영 CLI(report:*·admin:grant-pro)
 * 등 로컬 전용 도구가 공유한다. .env는 gitignore 대상으로 절대 커밋 금지.
 * 이미 설정된 환경변수는 덮어쓰지 않는다 (쉘 env가 .env보다 우선).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** .env 로드 — KEY=VALUE 행만 해석, # 주석·빈 행 무시, 따옴표 감싸기 제거 */
function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m || line.trimStart().startsWith('#')) continue;
        const val = m[2].replace(/^["']|["']$/g, '');
        if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
}

module.exports = { loadEnv };
