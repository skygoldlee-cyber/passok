// tests/unit/gates/admin-bot-contract.test.js — Discord 조회 봇 계약 검증 (AD-11)
// @spec AD-11
// Deno Edge Function은 node --test로 직접 실행할 수 없어 소스 계약을 정적으로 검증한다 —
// 등록된 슬래시 명령(COMMANDS)과 index.ts의 핸들러 분기·보안 가드의 1:1 대응.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require2 = createRequire(import.meta.url);
const { COMMANDS } = require2(path.join(ROOT, 'tools', 'deploy', 'register_admin_bot.js'));
const SRC = fs.readFileSync(
    path.join(ROOT, 'tools', 'supabase', 'functions', 'admin-bot', 'index.ts'), 'utf8');

test('등록 명령마다 index.ts에 case 핸들러가 존재한다', () => {
    assert.ok(COMMANDS.length >= 5, '최소 명령 세트 누락');
    for (const c of COMMANDS) {
        assert.match(SRC, new RegExp(`case '${c.name}'`), `핸들러 없음: /${c.name}`);
        assert.match(c.description, /\S/, `description 없음: /${c.name}`);
    }
});

test('필수 인자 명령은 required 옵션을 선언한다', () => {
    const user = COMMANDS.find((c) => c.name === 'user');
    assert.ok(user.options?.some((o) => o.name === 'email' && o.required === true),
        '/user는 email 필수 인자 필요');
});

test('보안 계약 — 서명 검증·관리자 게이트·멘션 차단이 존재한다', () => {
    assert.match(SRC, /x-signature-ed25519/, 'ed25519 서명 헤더 검증 누락');
    assert.match(SRC, /Ed25519/, 'Ed25519 검증 호출 누락');
    assert.match(SRC, /ADMIN_DISCORD_ID/, '관리자 ID 게이트 누락');
    assert.match(SRC, /allowed_mentions/, 'allowed_mentions 비활성화 누락');
    assert.match(SRC, /invalid signature/, '서명 실패 401 경로 누락');
});

test('읽기 전용 계약 — 쓰기 PostgREST(PATCH·POST·DELETE) 경로가 없다', () => {
    const mutating = SRC.match(/method:\s*'(POST|PATCH|DELETE|PUT)'/g);
    assert.equal(mutating?.length ?? 0, 0, `쓰기 경로 발견: ${mutating}`);
});
