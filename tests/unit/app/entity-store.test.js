// tests/unit/app/entity-store.test.js
// @spec none
// src/core/entity-store.js — 엔티티 스토어 팩토리 계약 테스트.
// carework 스토어들이 공유하는 CRUD·한도·훅 계약을 고정한다
// (계약 드리프트 회귀 방지 — id·타임스탬프·{ok,error} 형상·훅 호출 순서).

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEntityStore } from '../../../src/core/entity-store.js';
import {
  createLocalStorageBackend,
  setStorageBackend,
  getStorageBackend,
  getJSON,
} from '../../../src/core/storage.js';

const KEY = 'test_entity_items';

function createMockStorage() {
  const store = {};
  return {
    getItem(key) { return key in store ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; },
    clear() { for (const k of Object.keys(store)) delete store[k]; },
    _store: store,
  };
}

let originalLocalStorage;
let originalBackend;

beforeEach(() => {
  originalLocalStorage = global.localStorage;
  Object.defineProperty(global, 'localStorage', {
    value: createMockStorage(),
    configurable: true,
    writable: true,
  });
  originalBackend = getStorageBackend();
  setStorageBackend(createLocalStorageBackend());
});

afterEach(() => {
  setStorageBackend(originalBackend);
  Object.defineProperty(global, 'localStorage', {
    value: originalLocalStorage,
    configurable: true,
    writable: true,
  });
});

const mk = (cfg = {}) => createEntityStore({ key: KEY, idPrefix: 'ts', ...cfg });

test('list — 비배열·미존재 키는 빈 배열', () => {
  assert.deepEqual(mk().list(), []);
});

test('add — id·createdAt 부여 후 선두 삽입, {ok,id,item} 반환', () => {
  const s = mk();
  const r1 = s.add({ name: '첫번째' });
  const r2 = s.add({ name: '두번째' });
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.match(r1.id, /^ts_[0-9a-z]+$/);
  assert.ok(r1.item.createdAt);
  const items = s.list();
  assert.equal(items.length, 2);
  assert.equal(items[0].name, '두번째'); // unshift — 최신이 선두
});

test('add — freeLimit 초과 시 {ok:false,error} (기본·커스텀 문구)', () => {
  const s = mk({ freeLimit: 1 });
  s.add({ name: 'a' });
  const r = s.add({ name: 'b' });
  assert.equal(r.ok, false);
  assert.match(r.error, /한도/);
  assert.equal(s.list().length, 1);

  const s2 = mk({ key: 'test_custom', idPrefix: 'x', freeLimit: 0 });
  const r2 = s2.add({ name: '무제한' });
  assert.equal(r2.ok, true);
});

test('add — limitText 커스텀·stampField·newId·defaults 적용', () => {
  const s = mk({
    freeLimit: 1, limitText: '커스텀 한도',
    stampField: 'savedAt', newId: () => 'fixed-id',
    defaults: { status: 'scheduled' },
  });
  const r = s.add({ name: 'a' });
  assert.equal(r.item.id, 'fixed-id');
  assert.ok(r.item.savedAt);
  assert.equal(r.item.createdAt, undefined);
  assert.equal(r.item.status, 'scheduled'); // defaults 깔림
  assert.equal(s.add({ name: 'b' }).error, '커스텀 한도');
});

test('add — entry 필드가 defaults를 덮어쓴다', () => {
  const s = mk({ defaults: { status: 'scheduled' } });
  const r = s.add({ status: 'done' });
  assert.equal(r.item.status, 'done');
});

test('add(entry, id) — id 지정 시 해당 항목 병합 갱신', () => {
  const s = mk();
  const r = s.add({ name: '원본', keep: 1 });
  const u = s.add({ name: '수정' }, r.id);
  assert.equal(u.ok, true);
  const it = s.list().find(x => x.id === r.id);
  assert.equal(it.name, '수정');
  assert.equal(it.keep, 1); // 기존 필드 보존
  assert.equal(s.list().length, 1); // 신규 추가 아님
});

test('update·remove — id 패치·필터 제거, {ok:true} 반환', () => {
  const s = mk();
  const r = s.add({ name: 'a', v: 1 });
  s.update(r.id, { v: 2 });
  assert.equal(s.list()[0].v, 2);
  const rm = s.remove(r.id);
  assert.equal(rm.ok, true);
  assert.deepEqual(s.list(), []);
});

test('save — beforeSave 호출 → 성공 시 onError 미호출', () => {
  let notices = 0, errors = 0;
  const s = mk({ beforeSave: () => notices++, onError: () => errors++ });
  const r = s.save({ name: 'a' });
  assert.equal(r.ok, true);
  assert.equal(notices, 1);
  assert.equal(errors, 0);
});

test('save — 한도 실패 시 onError에 결과 전달', () => {
  let err = null;
  const s = mk({ freeLimit: 1, onError: (r) => { err = r; } });
  s.save({ name: 'a' });
  const r = s.save({ name: 'b' });
  assert.equal(r.ok, false);
  assert.equal(err, r); // 동일 결과 객체가 onError로
});

test('onList — truthy 반환 시 변경분 1회 기록, falsy면 기록 없음', () => {
  // 백필 시나리오: 항목에 clientId 부여 → true 반환 → 저장소 갱신
  const s1 = mk();
  s1.add({ name: '대상자' });
  const s2 = mk({
    onList: (items) => {
      let changed = 0;
      for (const it of items) if (!it.clientId) { it.clientId = 'c1'; changed++; }
      return changed;
    },
  });
  s2.list(); // 백필 발생
  assert.equal(getJSON(KEY)[0].clientId, 'c1'); // 저장소에 1회 기록됨

  const s3 = mk({ key: 'test_nohook', idPrefix: 'x', onList: () => 0 });
  s3.add({ name: 'a' });
  s3.list();
  assert.equal(getJSON('test_nohook')[0].clientId, undefined); // 기록 없음
});

test('afterAdd — add 직후 호출, throw·reject는 삼킨다', async () => {
  const calls = [];
  const s = mk({ afterAdd: (it) => { calls.push(it.id); } });
  s.add({ name: 'a' });
  assert.equal(calls.length, 1);

  const sBad = mk({ key: 'test_bad', idPrefix: 'x', afterAdd: () => { throw new Error('sync fail'); } });
  const r = sBad.add({ name: 'b' }); // 예외 전파 없음
  assert.equal(r.ok, true);
  await new Promise(res => setTimeout(res, 0));
});
