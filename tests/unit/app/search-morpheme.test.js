// tests/unit/search-morpheme.test.js — 형태소 경계·동의어 확장 단위 테스트
// @spec TS-13,TS-14,TS-16
// 검증: buildBoundaryVocab — 어절-두어 빈도로 형태소 어휘 마이닝
//       isCoverable — 접두 완전 분해(DP 커버)로 형태소 경계 판정
//       termHitQuality — 어절/형태소 경계 매치(2) vs 부분(중간) 매치(1) vs 없음(0)
//       expandSynonyms — registry.synonyms 정방향·역방향 확장 (그룹 내 OR)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildBoundaryVocab, isCoverable, termHitQuality, expandSynonyms,
} from '../../../src/search-morpheme.js';

// 실제 코퍼스 형태를 모사한 어절 집합 — 보조·유화·세정·석유·화학 등이
// 복합어를 이루는 형태소로 반복 두어( prefix )됨을 반영
const CORPUS_TOKENS = [
    '유화', '유화제', '유화작용', '유화액', '유화상태', '유화안정제', '유화분산',
    '보조유화제', '보조제', '보조성분', '보조원료',
    '세정유화증점', '세정제', '세정력', '혼합유화냉각', '혼합물', '혼합제',
    '석유화학', '석유화학원료', '화학물질', '화학제품', '화학식',
    '계면활성제', '계면활성', '활성제', '활성화',
    '사유화', '자유화',
    '화장품', '화장품법', '조제관리사',
];
const VOCAB = buildBoundaryVocab(CORPUS_TOKENS);

test('buildBoundaryVocab — 독립 어절과 재사용 접두(2회+)를 형태소 어휘로 수집', () => {
    assert.ok(VOCAB.words.has('보조유화제'));      // 독립 어절
    assert.ok(VOCAB.prefixes.has('유화'));        // 유화제·유화작용… 2회+ 두어
    assert.ok(VOCAB.prefixes.has('보조'));        // 보조유화제·보조제…
    assert.ok(VOCAB.prefixes.has('세정'));        // 세정유화증점·세정제…
    assert.ok(VOCAB.prefixes.has('석유'));        // 석유화학·석유화학원료
    assert.ok(!VOCAB.prefixes.has('석'));         // 1글자 접두는 형태소로 채택하지 않음
    assert.ok(!VOCAB.prefixes.has('보조유화제'.substring(0, 5) + 'x'));
});

test('isCoverable — 접두가 형태소들로 완전 분해되면 경계로 인정', () => {
    assert.ok(isCoverable('보조', VOCAB));          // [보조]
    assert.ok(isCoverable('세정', VOCAB));          // [세정]
    assert.ok(isCoverable('석유', VOCAB));          // [석유] — 접두 자체는 경계
    assert.ok(isCoverable('보조유화', VOCAB));      // [보조|유화] 연쇄 분해
    assert.ok(isCoverable('계면활성', VOCAB));      // [계면|활성] 또는 [계면활성]
    assert.ok(!isCoverable('석', VOCAB));           // 1글자 — 분해 불가
    assert.ok(!isCoverable('보', VOCAB));
    assert.ok(!isCoverable('없는접두', VOCAB));
    assert.ok(!isCoverable('', VOCAB));
});

test('termHitQuality — 어절 시작 매치는 본매치(2)', () => {
    assert.equal(termHitQuality('유화제는 계면활성제이다', '유화', VOCAB), 2);
    assert.equal(termHitQuality('이 장은 유화 작용을 다룬다', '유화', VOCAB), 2);
    assert.equal(termHitQuality('(유화 상태)', '유화', VOCAB), 2); // 괄호 직후도 경계
});

test('termHitQuality — 형태소 경계의 어절 중간 매치도 본매치(2)', () => {
    // 보조|유화|제 — 유화가 형태소 경계에 정렬
    assert.equal(termHitQuality('보조유화제를 사용한다', '유화', VOCAB), 2);
    assert.equal(termHitQuality('세정유화증점 원리', '유화', VOCAB), 2);
    assert.equal(termHitQuality('혼합유화냉각 공정', '유화', VOCAB), 2);
    // 뒤쪽 형태소도 동일 규칙 — 석유|화학에서 '화학'은 경계 매치
    assert.equal(termHitQuality('석유화학 원료', '화학', VOCAB), 2);
});

test('termHitQuality — 형태소 경계를 걸치는 우연한 음절열은 부분 매치(1)', () => {
    // 석유|화학 — '유화'는 형태소 경계를 걸치는 가짜 음절열
    assert.equal(termHitQuality('석유화학 원료를 사용한다', '유화', VOCAB), 1);
    // 사유|화 — 1글자 접두는 경계 불인정
    assert.equal(termHitQuality('사유화 문제', '유화', VOCAB), 1);
    assert.equal(termHitQuality('자유화 정책', '유화', VOCAB), 1);
    // 매치 없음
    assert.equal(termHitQuality('화장품법 정의', '유화', VOCAB), 0);
});

test('termHitQuality — 본매치·부분 매치가 섞여 있으면 본매치를 반환', () => {
    // '석유화학'(부분) + '보조유화제'(경계) — 최고 품질 2
    assert.equal(termHitQuality('석유화학과 보조유화제', '유화', VOCAB), 2);
});

// TS-16 — 용어집 키워드 주입의 기반 메커니즘: 코퍼스 빈도가 부족해 접두
// 마이닝(2회+)에 잡히지 않는 도메인 형태소도 어절(words)로 주입되면
// DP 커버의 분해 단위로 쓰여 경계로 인정된다.
test('TS-16 — 용어집 키워드 어절 주입으로 저빈도 형태소 경계 인정', () => {
    // '책임'이 코퍼스에서 '책임판매업' 1회만 두어 → 접두 마이닝 미채택
    const vocabNoKw = buildBoundaryVocab(['책임판매업', '판매업', '제조업']);
    assert.equal(termHitQuality('책임판매업 등록', '판매', vocabNoKw), 1);
    // 용어집 키워드 '책임'을 어절로 주입 → [책임|판매업] 완전 분해 → 본매치
    const vocabKw = buildBoundaryVocab(['책임판매업', '판매업', '제조업', '책임']);
    assert.equal(termHitQuality('책임판매업 등록', '판매', vocabKw), 2);
});

test('expandSynonyms — 정방향·역방향 모두 확장, 원어 선두', () => {
    const syn = {
        'cgmp': ['우수화장품제조및품질관리기준', '씨지엠피'],
        '유화': ['에멀션', '에멀전', 'emulsion'],
    };
    assert.deepEqual(expandSynonyms('유화', syn), ['유화', '에멀션', '에멀전', 'emulsion']);
    // 역방향 — '에멀전'으로 검색해도 '유화' 그룹으로 확장
    assert.deepEqual(expandSynonyms('에멀전', syn), ['에멀전', '유화', '에멀션', 'emulsion']);
    // 미등록 용어는 원어 그대로
    assert.deepEqual(expandSynonyms('화장품', syn), ['화장품']);
    // 사전 없으면 확장 없음
    assert.deepEqual(expandSynonyms('유화', null), ['유화']);
});
