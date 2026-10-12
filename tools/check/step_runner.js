'use strict';
/**
 * step_runner.js — 검증 단계 병렬 실행기 (run.js·push_gate.js 공용)
 *
 * steps.js 선언 순서를 유지하면서 연속된 비-serial 단계를 워커 풀로 병렬
 * 실행한다. serial:true 단계(워크트리를 쓰는 단계 — datafresh·build)는
 * 배치 사이에서 단독 실행돼 다른 단계와 겹치지 않는다.
 *
 *   const results = await runSteps(steps, { jobs: 3, failFast: false,
 *     onResult: (r) => console.log(r.ok ? '✅' : '❌', r.step.desc) });
 *
 * 반환: 선언 순서대로의 결과 배열 [{step, ok, status, output, ms}].
 * failFast 시 미실행 단계는 결과에서 빠진다.
 *
 * // @spec none (검증 실행기)
 */
const { spawn } = require('child_process');
const path = require('path');

function runOne(step, cwd) {
    return new Promise((resolve) => {
        const started = Date.now();
        const done = (status, output) =>
            resolve({ step, ok: status === 0, status, output, ms: Date.now() - started });
        // 인프로세스 단계 — 모듈이 run({args,cwd}) → {status,output} 계약을
        // export하면 spawn을 건너뛰고 직접 호출한다 (노드 기동 비용 제거).
        // 계약: 출력·종료코드를 반환값으로 돌려주고 process.exit을 호출하지 않는 것.
        if (step.inProcess) {
            (async () => {
                try {
                    const mod = require(path.resolve(cwd, step.inProcess));
                    const r = await mod.run({ args: step.args.slice(1), cwd });
                    done(r.status ?? (r.ok === false ? 1 : 0), r.output || '');
                } catch (err) {
                    done(-1, String(err && err.stack || err));
                }
            })();
            return;
        }
        let child;
        try {
            child = spawn(step.bin, step.args, { cwd, shell: step.shell });
        } catch (err) {
            return done(-1, String(err));
        }
        let output = '';
        child.stdout.on('data', (d) => { output += d; });
        child.stderr.on('data', (d) => { output += d; });
        child.on('error', (err) => done(-1, String(err)));
        child.on('close', (status) => done(status ?? -1, output));
    });
}

async function runBatch(batch, jobs, cwd, failFast, onResult, results) {
    let next = 0;
    let failed = false;
    async function worker() {
        while (next < batch.length) {
            if (failed && failFast) return;
            const { step, idx } = batch[next++];
            const r = await runOne(step, cwd);
            results[idx] = r;
            if (!r.ok) failed = true;
            if (onResult) onResult(r);
        }
    }
    const n = Math.max(1, Math.min(jobs, batch.length));
    await Promise.all(Array.from({ length: n }, worker));
    return failed;
}

/**
 * @param {Array} steps — {bin,args,shell,serial?,...}
 * @param {{jobs?:number, failFast?:boolean, cwd?:string, onResult?:Function}} opts
 */
async function runSteps(steps, { jobs = 3, failFast = false, cwd = process.cwd(), onResult } = {}) {
    const results = new Array(steps.length);
    let failed = false;
    let i = 0;
    while (i < steps.length) {
        if (failed && failFast) break;
        if (steps[i].serial) {
            const r = await runOne(steps[i], cwd);
            results[i] = r;
            if (!r.ok) failed = true;
            if (onResult) onResult(r);
            i++;
            continue;
        }
        const batch = [];
        while (i < steps.length && !steps[i].serial) {
            batch.push({ step: steps[i], idx: i });
            i++;
        }
        if (await runBatch(batch, jobs, cwd, failFast, onResult, results)) failed = true;
    }
    return results.filter(Boolean);
}

module.exports = { runSteps };
