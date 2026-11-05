// @spec none — carework 4단계 흐름 뷰 모듈 스모크 (핸들러 export 확인)
import { test } from 'node:test';
import assert from 'node:assert';

test('care-flow 뷰 모듈이 핸들러·초기화 함수를 export한다', async () => {
    const m = await import('../../../src/exams/carework/views/care-flow.js');
    for (const fn of ['initCareFlowView', 'flowBack', 'flowNext', 'flowOpt']) {
        assert.equal(typeof m[fn], 'function', fn);
    }
});
