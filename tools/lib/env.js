/**
 * env.js — 루트 .env 로더·파서 (dotenv 의존 없이 최소 파서)
 * @spec AI-02
 *
 * 로컬 시크릿의 단일 소스 — tools/ai 제작 도구·운영 CLI(report:*·admin:grant-pro)
 * 등 로컬 전용 도구가 공유한다. .env는 gitignore 대상으로 절대 커밋 금지.
 * 이미 설정된 환경변수는 덮어쓰지 않는다 (쉘 env가 .env보다 우선).
 *
 * parseEnvFile은 check_env.js 신선도 게이트가 같은 해석 규칙으로 재사용한다 —
 * 파서 규칙 변경 시 양쪽이 함께 따라간다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/**
 * .env 파일 파싱 — KEY=VALUE 행만 해석, # 주석·빈 행 무시, 따옴표 감싸기 제거.
 * @param {string} envPath
 * @returns {{key:string, value:string, raw:string, line:number}[]}
 *   value는 따옴표 제거 후 값, raw는 따옴표 포함 원문, line은 1기반 행번호.
 */
function parseEnvFile(envPath) {
    const entries = [];
    if (!fs.existsSync(envPath)) return entries;
    fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line, i) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m || line.trimStart().startsWith('#')) return;
        const raw = m[2];
        entries.push({ key: m[1], value: raw.replace(/^["']|["']$/g, ''), raw, line: i + 1 });
    });
    return entries;
}

/** .env 로드 — 이미 설정된 환경변수는 덮어쓰지 않는다 */
function loadEnv() {
    for (const e of parseEnvFile(path.join(ROOT, '.env'))) {
        if (process.env[e.key] === undefined) process.env[e.key] = e.value;
    }
}

module.exports = { loadEnv, parseEnvFile, ROOT };
