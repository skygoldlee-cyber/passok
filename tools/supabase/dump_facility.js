/**
 * dump_facility.js — 기관(facility) 테이블 백업·복원 (DOC-RBK-24 §2~§3 절차 도구)
 * @spec none
 *
 * Free 플랜은 Supabase 자동 백업이 없어 PostgREST JSON 덤프가 실질 백업 경로.
 * 덤프 파일에는 개인정보가 포함될 수 있으므로 backup/은 gitignore 대상 — 커밋 금지.
 *
 * 사용:
 *   node tools/supabase/dump_facility.js                 # 프로덕션 기관 테이블 → backup/
 *   node tools/supabase/dump_facility.js --test          # 테스트 프로젝트 대상
 *   node tools/supabase/dump_facility.js --out <dir>
 *   node tools/supabase/dump_facility.js --restore <file>           # 복원 계획 출력 (dry-run)
 *   node tools/supabase/dump_facility.js --restore <file> --apply   # 복원 실행 (upsert)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../lib/env.js');
const ops = require('../lib/supabase_ops.js');

// FK 부모 우선 순서 — 복원 시 이 순서대로 upsert한다
const TABLES = [
    'facilities',
    'facility_members',
    'facility_form_templates',
    'shift_handovers',
    'handover_acks',
    'family_visits',
    'incident_reports',
    'facility_records',
];

function parseArgs(argv) {
    const args = { test: false, out: 'backup', restore: null, apply: false };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--test') args.test = true;
        else if (argv[i] === '--out') args.out = argv[++i];
        else if (argv[i] === '--restore') args.restore = argv[++i];
        else if (argv[i] === '--apply') args.apply = true;
    }
    return args;
}

/** 대상 프로젝트의 URL·Secret 해석 — --test면 TEST_SUPABASE_*, 아니면 운영 자격 */
function resolveTarget(args) {
    loadEnv();
    if (args.test) {
        const url = process.env.TEST_SUPABASE_URL;
        const secret = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !secret) throw new Error('TEST_SUPABASE_URL·TEST_SUPABASE_SERVICE_ROLE_KEY를 .env에 설정하세요');
        return { url: url.replace(/\/$/, ''), secret };
    }
    const secret = ops.requireSecret('tools/supabase/dump_facility.js');
    if (!secret) process.exit(1);
    return { url: ops.supabaseUrl(), secret };
}

async function dump(target, outDir) {
    const tables = {};
    for (const t of TABLES) {
        tables[t] = await ops.restGetAll(target.secret, t, 'select=*');
        console.log(`  ${t}: ${tables[t].length}행`);
    }
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.join(outDir, `facility_dump_${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify({
        tool: 'dump_facility', created_at: new Date().toISOString(),
        project: new URL(target.url).host, tables,
    }, null, 2));
    console.log(`\n✅ 덤프 완료 → ${file} (커밋 금지 — 개인정보 포함 가능)`);
    return file;
}

/** upsert — PostgREST merge-duplicates. 복원 대상 URL은 target으로 고정 */
async function upsertRows(target, table, rows) {
    const res = await fetch(`${target.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            apikey: target.secret, authorization: `Bearer ${target.secret}`,
            'content-type': 'application/json',
            prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(rows),
    });
    if (!res.ok) {
        console.error(`${table} 복원 실패 HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        process.exit(1);
    }
}

async function restore(target, file, apply) {
    const dumpData = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (dumpData.tool !== 'dump_facility' || !dumpData.tables) {
        throw new Error('dump_facility 덤프 파일이 아닙니다');
    }
    console.log(`덤프: ${dumpData.created_at} · 프로젝트 ${dumpData.project}`);
    const counts = TABLES.map((t) => `    ${t}: ${(dumpData.tables[t] || []).length}행`).join('\n');
    console.log(counts);
    if (!apply) {
        console.log('\n(dry-run) 실제 복원은 --apply를 붙여 실행 — 대상 프로젝트를 재확인하세요');
        return;
    }
    for (const t of TABLES) {
        const rows = dumpData.tables[t] || [];
        if (!rows.length) { console.log(`  ${t}: 0행 — 건너뜀`); continue; }
        // supabase max-rows 제한 대비 청크 업서트
        for (let i = 0; i < rows.length; i += 500) {
            await upsertRows(target, t, rows.slice(i, i + 500));
        }
        console.log(`  ${t}: ${rows.length}행 복원 완료`);
    }
    console.log('\n✅ 복원 완료 — 접근 기록(DOC-RBK-24 §1.5)에 작업을 남기세요');
}

(async () => {
    const args = parseArgs(process.argv);
    const target = resolveTarget(args);
    console.log(`대상: ${new URL(target.url).host}${args.test ? ' (테스트 프로젝트)' : ' (프로덕션)'}`);
    if (args.restore) await restore(target, args.restore, args.apply);
    else await dump(target, args.out);
})().catch((e) => { console.error(`실패: ${e.message}`); process.exit(1); });
