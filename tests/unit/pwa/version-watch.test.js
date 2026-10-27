// 배포 버전 감지 — parseDeployedVersion·checkForNewVersion
// @spec P-07
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeployedVersion, checkForNewVersion, _resetVersionWatch } from '../../../src/pwa/version-watch.js';

test('data/version.js 텍스트에서 버전 추출', () => {
    assert.equal(parseDeployedVersion("window.APP_VERSION = 'v20261028-abc1234';"), 'v20261028-abc1234');
    assert.equal(parseDeployedVersion('no version'), null);
    assert.equal(parseDeployedVersion(''), null);
});

test('버전 동일·조회 실패·미설정 시 프롬프트 없음', async () => {
    globalThis.window = { APP_VERSION: 'v1' };
    mock.method(globalThis, 'fetch', async () => new Response("window.APP_VERSION='v1'"));
    assert.equal(await checkForNewVersion(), false);
    mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
    assert.equal(await checkForNewVersion(), false);
    delete globalThis.window;
    _resetVersionWatch();
});

test('배포본이 다르면 프롬프트 경로 발화', async () => {
    globalThis.window = { APP_VERSION: 'v1' };
    globalThis.document = undefined;
    mock.method(globalThis, 'fetch', async () => new Response("window.APP_VERSION='v2'"));
    assert.equal(await checkForNewVersion(), true);
    delete globalThis.window;
    _resetVersionWatch();
});
