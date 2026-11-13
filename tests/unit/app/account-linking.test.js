// account-linking — 로그인 수단 연결 순수 로직 검증
// @spec AU-10
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedProviders, canUnlink } from '../../../src/auth-sync/auth-view.js';

const user = identities => ({ identities });

test('linkedProviders — identities에서 provider 목록 추출·중복 제거', () => {
    assert.deepEqual(linkedProviders(user([
        { provider: 'kakao' }, { provider: 'google' }, { provider: 'google' },
    ])), ['kakao', 'google']);
});

test('linkedProviders — 이메일 계정은 email 포함', () => {
    assert.deepEqual(linkedProviders(user([{ provider: 'email' }])), ['email']);
});

test('linkedProviders — 비어있거나 없는 identities는 빈 배열', () => {
    assert.deepEqual(linkedProviders(user([])), []);
    assert.deepEqual(linkedProviders(user(null)), []);
    assert.deepEqual(linkedProviders(null), []);
    assert.deepEqual(linkedProviders(user([{ provider: null }, {}])), []);
});

test('canUnlink — 검증 수단 2개 이상만 해제 허용', () => {
    assert.equal(canUnlink(user([{ provider: 'kakao' }, { provider: 'google' }])), true);
    assert.equal(canUnlink(user([{ provider: 'email' }, { provider: 'kakao' }])), true);
    assert.equal(canUnlink(user([{ provider: 'kakao' }])), false);
    assert.equal(canUnlink(user([{ provider: 'google' }, { provider: 'google' }])), false);
    assert.equal(canUnlink(user([])), false);
});
