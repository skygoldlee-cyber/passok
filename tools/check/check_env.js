#!/usr/bin/env node
/**
 * check_env.js — .env 로컬 시크릿 신선도 게이트
 * @spec none
 *
 * .env는 gitignore라 추적 파일 스캔(check:secrets)·pre-commit·CI 어디에도
 * 잡히지 않는다 — 만료 토큰·빈 값·미선언 키가 방치되는 사각을 메운다.
 * 스키마 정본은 추적 파일 .env.example — 여기 선언된 키 ↔ .env를 대조한다.
 *
 * 판정:
 *   실패 — 만료 JWT(eyJ… 3세그먼트, exp 클레임 < now)
 *        — .env.example의 `@required` 키가 .env에 없거나 빈 값
 *        — .env.example 자체 부재 (스키마 정본은 추적 대상)
 *   경고 — .env.example 미선언 키 (스테일 잔재 후보)
 *        — JWT 형태인데 exp 해석 불가
 *        — 값 안의 미인용 `#` (env.js 파서는 인라인 주석을 제거하지 않음 — 값 오염)
 *   정보 — 선언됐지만 빈 값 (미발급 키로 추정)
 *   스킵 — .env 부재 (CI·신규 클론 — 시크릿 없이도 앱 동작하므로 통과)
 *
 * 사용법:
 *   npm.cmd run check:env
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { parseEnvFile, ROOT } = require('../lib/env.js');

const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');

/** JWT 형태인가 (헤더가 base64url JSON `{"…` → eyJ 로 시작) */
function isJwtLike(value) {
    return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

/** JWT payload의 exp(초) 반환. 해석 불가·exp 부재는 null. */
function jwtExpiry(value) {
    try {
        const payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'));
        return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
        return null;
    }
}

/**
 * .env.example 파싱 — 선언 키 집합. 값은 문서용 주석뿐이므로 parseEnvFile이 아닌
 * 전용 해석: `KEY=` 행에서 키와 `@required` 마커만 추출한다.
 * @returns {Map<string, {required:boolean, line:number}>}
 */
function parseExample(examplePath) {
    const declared = new Map();
    if (!fs.existsSync(examplePath)) return declared;
    fs.readFileSync(examplePath, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (line.trimStart().startsWith('#')) return;
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (m) declared.set(m[1], { required: /@required/.test(line), line: i + 1 });
    });
    return declared;
}

/**
 * 순수 판정 — 테스트 가능하게 I/O와 분리.
 * @param {{key,value,raw,line}[]} envEntries .env 항목
 * @param {Map<string,{required:boolean}>} declared .env.example 선언
 * @param {number} nowSec epoch 초
 * @returns {{fail:string[], warn:string[], info:string[]}}
 */
function analyze(envEntries, declared, nowSec) {
    const fail = [], warn = [], info = [];
    const seen = new Set();
    for (const e of envEntries) {
        const at = `.env:${e.line}`;
        if (seen.has(e.key)) warn.push(`${at} ${e.key} — 중복 선언 (뒤 값이 이기지 않음: env.js는 첫 값만 적용)`);
        seen.add(e.key);
        if (!declared.has(e.key)) warn.push(`${at} ${e.key} — .env.example 미선언 키 (스테일 잔재면 제거, 유효하면 스키마에 등록)`);
        if (e.value === '') {
            info.push(`${at} ${e.key} — 빈 값`);
        } else if (isJwtLike(e.value)) {
            const exp = jwtExpiry(e.value);
            if (exp === null) warn.push(`${at} ${e.key} — JWT 형태이나 exp 해석 불가`);
            else if (exp < nowSec) fail.push(`${at} ${e.key} — 만료된 JWT (exp: ${new Date(exp * 1000).toISOString()}) — 제거하거나 재발급`);
        } else if (/^[^"']*#/.test(e.raw)) {
            warn.push(`${at} ${e.key} — 값에 미인용 '#' — env.js 파서는 인라인 주석을 제거하지 않아 값이 오염됩니다`);
        }
    }
    for (const [key, d] of declared) {
        const e = envEntries.find((x) => x.key === key);
        if (d.required && (!e || e.value === '')) fail.push(`.env.example:${d.line} ${key} — @required 키가 .env에 없거나 빈 값`);
    }
    return { fail, warn, info };
}

function main() {
    if (!fs.existsSync(ENV_PATH)) {
        console.log('✅ check:env 스킵 — .env 부재 (시크릿 없이도 앱 동작)');
        return 0;
    }
    if (!fs.existsSync(EXAMPLE_PATH)) {
        console.error('✗ check:env 실패 — 스키마 정본 .env.example이 없습니다 (추적 파일, 삭제됐다면 복원)');
        return 1;
    }
    const envEntries = parseEnvFile(ENV_PATH);
    const declared = parseExample(EXAMPLE_PATH);
    const { fail, warn, info } = analyze(envEntries, declared, Math.floor(Date.now() / 1000));

    for (const m of info) console.log(`  ℹ ${m}`);
    for (const m of warn) console.log(`  ⚠ ${m}`);
    for (const m of fail) console.error(`  ✗ ${m}`);
    if (fail.length) {
        console.error(`\n⚠ check:env 실패 ${fail.length}건 (경고 ${warn.length}·정보 ${info.length})`);
        return 1;
    }
    console.log(`✅ check:env — .env ${envEntries.length}키 ↔ .env.example ${declared.size}키 정합 (경고 ${warn.length}·정보 ${info.length})`);
    return 0;
}

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check_env.js');
if (isDirectRun) process.exit(main());

module.exports = { isJwtLike, jwtExpiry, parseExample, analyze, main };
