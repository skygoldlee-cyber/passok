#!/usr/bin/env node
/**
 * ai_stale_scan.js — 법령 개정 영향 분석 (ref_md 변경 ↔ 인용 문항 재판정)
 * @spec AI-12,AI-02,AI-13
 *
 * 사용법:
 *   node tools/ai/ai_stale_scan.js --ref HEAD~5      # ref..HEAD 간 ref_md 변경 대상
 *   node tools/ai/ai_stale_scan.js                  # 미커밋(working tree) 변경 대상
 *   node tools/ai/ai_stale_scan.js --file <ref_md경로>  # 파일 직접 지정
 *
 * - check:reffresh가 "해시 변경"을 감지하면, 본 도구가 "어떤 문항의 정답이
 *   영향받는지"를 좁힌다: 변경된 ref_md 파일을 인용하는 문항 전수 추출
 * - --llm 시 변경 diff와 문항 정답을 대조해 영향 여부를 판정 (무키면 후보 목록만)
 *
 * 산출물: tmp/ai_drafts/stale_<date>.md — 재검증 대기 문항 목록.
 */

'use strict';

const path = require('path');
const { execFileSync } = require('child_process');
const { parseArgs, getTargets, listQbanks, writeDraft, loadEnv, ROOT } = require('./lib/ai_common.js');
const { parseQuestionBank } = require('./lib/qbank.js');
const llm = require('./llm_client.js');

const SYSTEM = '당신은 법령 개정 영향 분석 보조입니다. 변경된 법령 diff와 해당 법령을 근거로 한 문항의 정답을 대조해, 개정으로 정답이 무효·변경되는지 판정하라. "영향 있음/없음/불명" + 한 줄 근거로 답할 것.';

/** 변경된 ref_md 파일 목록 (git diff 기반) */
function changedRefFiles(opts, flags) {
    if (opts.file) return [opts.file];
    const args = ['-c', 'core.quotepath=false', 'diff', '--name-only',
        ...(flags.has('staged') ? ['--cached'] : opts.ref ? [`${opts.ref}..HEAD`] : [])];
    const out = execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' });
    return out.split(/\r?\n/).filter(f => f && /참조자료[/\\]ref_md[/\\].*\.md$/.test(f));
}

/** 파일별 변경 라인 범위(신본 기준) — git diff -U0 hunk 파싱 */
function changedLineRanges(opts, flags) {
    if (opts.file) return new Map(); // 범위 정보 없음 → 파일 전체 영향으로 간주
    const args = ['-c', 'core.quotepath=false', 'diff', '-U0',
        ...(flags.has('staged') ? ['--cached'] : opts.ref ? [`${opts.ref}..HEAD`] : []), '--', '*.md'];
    let out;
    try { out = execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }); }
    catch { return new Map(); }
    const ranges = new Map();
    let cur = null;
    for (const line of out.split(/\r?\n/)) {
        const df = line.match(/^\+\+\+ b\/(.+)$/);
        if (df) { cur = df[1].trim(); continue; }
        const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
        if (h && cur) {
            const start = +h[1], count = +(h[2] ?? 1);
            if (!ranges.has(cur)) ranges.set(cur, []);
            ranges.get(cur).push([start, Math.max(start, start + count - 1)]);
        }
    }
    return ranges;
}

/** 인용 라인이 변경 범위에 닿는지 (전후 여유 MARGIN행 — 재변환 라인 이동 흡수) */
const MARGIN = 10;
function lineHit(lineNo, fileRanges) {
    if (!fileRanges) return true; // 범위 정보 없으면 보수적으로 플래그
    return fileRanges.some(([a, b]) => lineNo >= a - MARGIN && lineNo <= b + MARGIN);
}

function main0() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const useLlm = flags.has('llm') && llm.isAvailable();

    const changed = changedRefFiles(opts, flags);
    if (!changed.length) { console.log('변경된 ref_md 없음 — 재검증 대상 0건'); return; }
    console.log(`변경 ref_md ${changed.length}개:`);
    changed.forEach(f => console.log(`  ${f}`));

    // 변경 파일을 인용하는 문항 수집 — 인용 링크의 파일명 매칭(경로 정규화 후 endsWith)
    // 라인 범위가 파악되면 인용 L번호가 변경 hunk ±MARGIN 안인 문항만 플래그
    const norm = s => s.replace(/\\/g, '/');
    const ranges = changedLineRanges(opts, flags);
    const hits = [];
    const seen = new Set(); // 파일|문항숫자 중복 방지 (파서 num↔로우 라벨 정규화)
    const qk = n => String(n).replace(/\D/g, '');
    for (const target of getTargets(opts)) {
        for (const { exam, absPath } of listQbanks(target)) {
            const { questions, answers } = parseQuestionBank(absPath);
            for (const q of questions) {
                const ans = answers.get(q.num);
                if (!ans) continue;
                for (const cit of ans.citations) {
                    const rel = norm(path.relative(ROOT, path.resolve(path.dirname(absPath), cit.file)));
                    if (changed.some(cf => norm(cf) === rel) && (!cit.lineNo || lineHit(cit.lineNo, ranges.get(rel)))) {
                        hits.push({ exam: exam.key, q, ans, cit, file: rel });
                        seen.add(`${absPath}|${qk(q.num)}`);
                        break;
                    }
                }
            }
            // 로우 스캔 폴백 — ### S 등 파서 미인식 포맷의 인용도 포착
            const fs = require('fs');
            const lines = fs.readFileSync(absPath, 'utf-8').split('\n');
            let cur = null, stem = '';
            for (const line of lines) {
                const hm = line.match(/^#{1,4}\s*([QS]\d+)\./) || line.match(/^\*\*([QS]\d+)\./);
                if (hm) { cur = hm[1]; stem = line.replace(/^#+\s*|\*\*/g, '').slice(0, 60); continue; }
                if (!cur) continue;
                const cm = line.matchAll(/\[([^\]]*L(\d+)[^\]]*)\]\(<([^>]+?)(?:#L(\d+))?>\)/g);
                for (const m of cm) {
                    const rel = norm(path.relative(ROOT, path.resolve(path.dirname(absPath), m[3])));
                    const ln = m[4] ? +m[4] : +m[2];
                    if (changed.some(cf => norm(cf) === rel) && (!ln || lineHit(ln, ranges.get(rel))) && !seen.has(`${absPath}|${qk(cur)}`)) {
                        hits.push({ exam: exam.key, q: { num: cur, stem }, ans: { answer: '?' }, cit: { label: m[1], lineNo: ln }, file: rel });
                        seen.add(`${absPath}|${qk(cur)}`);
                    }
                }
            }
        }
    }
    return { changed, hits, useLlm };
}

async function main() {
    const r = main0();
    if (!r) return;
    const { changed, hits, useLlm } = r;

    const lines = [`# 법령 개정 영향 분석 — 재검증 대기 ${hits.length}문`, '',
        `변경 ref_md ${changed.length}개를 인용하는 문항 목록. check:reffresh(해시 감지)의 의미 판정 확장.`, ''];
    for (const h of hits) {
        let verdict = '';
        if (useLlm) {
            const res = await llm.complete(
                `변경 파일: ${h.file}\n문항 발문: ${h.q.stem}\n정답: ${h.ans.answer}\n인용: ${h.cit.label} (L${h.cit.lineNo})\n\n개정으로 이 정답이 영향받는가?`,
                { system: SYSTEM, maxTokens: 200 });
            verdict = res.dryRun ? '' : ` — 판정: ${res.text.trim().split('\n')[0]}`;
        }
        lines.push(`- **${h.exam} Q${h.q.num}** — ${h.q.stem.slice(0, 60)}… · 정답 ${h.ans.answer} · 인용 ${h.cit.label}${verdict}`);
    }
    const out = writeDraft(`misc/stale_${new Date().toISOString().slice(0, 10)}.md`, lines, { model: useLlm ? llm.modelName() : 'scan' });
    console.log(`\n재검증 대기 ${hits.length}문 → ${out}`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { changedRefFiles };
