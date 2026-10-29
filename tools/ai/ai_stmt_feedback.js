#!/usr/bin/env node
/**
 * ai_stmt_feedback.js — 진술 단위 오답 피드백 초안 생성 + 편입
 * @spec AI-14,AI-15,AI-16,AI-02,AI-03
 *
 * 사용법:
 *   node tools/ai/ai_stmt_feedback.js [--exam cosmetic] [--limit 50] [--all] [--dry-run]
 *   node tools/ai/ai_stmt_feedback.js --stats <백업JSON> [--min-wrong 1] [--limit 50]
 *   node tools/ai/ai_stmt_feedback.js --apply [--write]
 *
 * 생성 모드: {dataRoot}/drills/combo_*.js의 진술을 sid 기준 중복 제거해
 *   "왜 참·거짓인지 + 어떤 혼동(수치·주체·극성)을 노리는지" 1~2문장 초안을 만든다.
 *   기본 대상은 거짓 진술(오인 유도 — 오판 피드백 가치가 가장 큼), --all로 전체.
 *   이미 stmt_explain.json에 반영된 sid는 자동 스킵 — 반복 실행 시 미커버 진술로 진행.
 *   --stats: 앱 백업 JSON(cosmetic_backup_*.json의 statement_stats 키) 또는
 *   {sid:{j,w,...}} 맵을 읽어 오판 w ≥ --min-wrong 진술만 대상으로 하고 오판수 내림차순 정렬.
 *   통계상 오판율이 극단인 진술(j≥5, w/j≥0.8)은 초안에 ⚠️ 표시해 콘텐츠 검수 후보로 구분한다.
 *   초안: tmp/ai_drafts/stmtfb_<examId>_<bundleKey>.md
 *
 * 편입 모드(--apply): 리뷰된 초안의 `> **진술해설**:` 행을 모아
 *   content/exams/<id>/피드백/stmt_explain.json (sid→해설 맵)에 병합.
 *   기본은 미리보기, --write로 실반영. 이후 build:drills가 진술 explain에 병합한다.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, writeDraft, loadEnv, DRAFT_DIR, ROOT } = require('./lib/ai_common');
const { loadJsBundle } = require('./lib/similarity');
const llm = require('./llm_client');

const SYSTEM = '당신은 자격시험 문제은행의 진술 피드백 작성 보조입니다. 제공된 모문항의 정답·해설만을 근거로, 해당 진술이 왜 참/거짓인지를 수험생이 이해하기 쉬운 1~2문장으로 한국어로 작성하라. 거짓 진술이면 어떤 혼동(수치 바꿈·주체 바꿈·극성 반전)을 노린 함정인지 짚어라. 근거에 없는 주장은 하지 말 것.';

function buildPrompt(stmt, parent) {
    return [
        '아래 복수정답형 진술의 피드백을 작성하라.',
        '',
        `[모문항 발문] ${parent.stem}`,
        `[진술] ${stmt.text}`,
        `[실제 진위] ${stmt.truth ? '참' : '거짓'}`,
        parent.explain ? `[모문항 해설·근거]\n${parent.explain}` : '[모문항 해설 없음]',
        '',
        '진술 피드백만 출력. 1~2문장.',
    ].join('\n');
}

/** target의 combo 드릴에서 sid 고유 진술 수집 → {key, stmts: Map<sid,{text,truth,parent}>} */
function collectStatements(target) {
    const dir = path.join(ROOT, target.dataRoot, 'drills');
    const perBundle = new Map();
    if (!fs.existsSync(dir)) return perBundle;
    for (const f of fs.readdirSync(dir).filter(f => /^combo_(?!pilot).+\.js$/.test(f)).sort()) {
        const key = f.replace(/^combo_/, '').replace(/\.js$/, '');
        const bundle = loadJsBundle(path.join(dir, f));
        const items = Array.isArray(bundle) ? bundle : (bundle && bundle.questions) || [];
        const stmts = perBundle.get(key) || new Map();
        for (const q of items) {
            for (const s of q.statements || []) {
                if (!s.sid || stmts.has(s.sid)) continue;
                stmts.set(s.sid, {
                    text: s.text, truth: s.truth, existing: !!s.explain,
                    parent: { stem: q.stem, explain: q.explain || '', from: q.derivedFrom || q.id },
                });
            }
        }
        perBundle.set(key, stmts);
    }
    return perBundle;
}

/**
 * 오판 통계 로드 — 백업 JSON({statement_stats: "<json>"} 또는 "<exam>:statement_stats")과
 * 순수 {sid:{j,w,...}} 맵 모두 허용한다.
 * @param {string} file
 * @returns {Object<string,{j:number,w:number,lw?:string|null,streak?:number}>}
 */
function loadStats(file) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf-8'));
    const key = Object.keys(raw).find(k => /(^|:)statement_stats$/.test(k));
    let stats = key ? raw[key] : raw;
    if (typeof stats === 'string') stats = JSON.parse(stats);
    return stats && typeof stats === 'object' && stats !== null ? stats : {};
}

/** 이상 의심 — statement-tracker.getAnomalousStatements와 동일 기준 (j≥5, w/j≥0.8) */
function isAnomalous(rec) {
    return rec && (rec.j || 0) >= 5 && (rec.w || 0) / rec.j >= 0.8;
}

async function generate(flags, opts) {
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const all = flags.has('all');
    const limit = opts.limit ? Number(opts.limit) : Infinity;
    const stats = opts.stats ? loadStats(opts.stats) : null;
    const minWrong = opts['min-wrong'] ? Number(opts['min-wrong']) : 1;

    let total = 0, drafted = 0, ungrounded = 0;
    for (const target of getTargets(opts)) {
        // 이미 반영된 피드백은 재생성하지 않음 — 반복 실행 시 미커버 진술로 자연 진행
        const appliedFp = path.join(ROOT, target.contentRoot, '피드백', 'stmt_explain.json');
        const applied = fs.existsSync(appliedFp) ? JSON.parse(fs.readFileSync(appliedFp, 'utf-8')) : {};
        for (const [key, stmts] of collectStatements(target)) {
            if (opts.subject && key !== opts.subject) continue;
            let entries = [...stmts.entries()].filter(([sid, s]) => (all || !s.truth) && !(sid in applied));
            if (stats) {
                entries = entries
                    .filter(([sid]) => (stats[sid] && stats[sid].w || 0) >= minWrong)
                    .sort((a, b) => (stats[b[0]].w - stats[a[0]].w) || ((stats[b[0]].j || 0) - (stats[a[0]].j || 0)));
            }
            if (!entries.length) continue;
            total += entries.length;
            if (drafted >= limit) continue;
            const lines = [`# 진술 피드백 초안 — ${key} (대상 ${entries.length}진술${stats ? ` · 오판 ${minWrong}회+` : ''})`, ''];
            const ungroundedList = [];
            for (const [sid, s] of entries) {
                if (drafted >= limit) break;
                if (!s.parent.explain) { // 모문항 해설(근거) 부재 — 비근거 피드백 생성 차단
                    ungrounded++;
                    ungroundedList.push(`- sid ${sid} — 모문항 해설 없음 (출처: ${s.parent.from})`);
                    continue;
                }
                const rec = stats && stats[sid];
                const prompt = buildPrompt(s, s.parent);
                lines.push(`## sid ${sid}`, '',
                    `- 진술: ${s.text}`,
                    `- 진위: ${s.truth ? '참' : '거짓'} · 출처: ${s.parent.from}` +
                        (rec ? ` · 오판 ${rec.w}/${rec.j}회${isAnomalous(rec) ? ' ⚠️ 이상 의심(표현·진위 검수 후보)' : ''}` : ''), '');
                if (dryRun) {
                    lines.push('> **진술해설**: (미생성 — DRY RUN 또는 API 키 없음)', '',
                        '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
                } else {
                    const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 300 });
                    lines.push(res.dryRun
                        ? '> **진술해설**: (미생성 — DRY RUN)'
                        : `> **진술해설**: ${res.text.trim().replace(/\n+/g, ' ')}`, '');
                }
                drafted++;
            }
            if (ungroundedList.length) {
                lines.push('## ⚠️ 근거 부재 — 피드백 미생성 (모문항 해설 보강 후 재실행)', '', ...ungroundedList, '');
            }
            const out = writeDraft(`${target.id}/stmtfb_${target.id}_${key}.md`, lines, { model: llm.modelName() });
            console.log(`${key}: 진술 ${entries.length}개 (근거 부재 ${ungroundedList.length}개 제외) → ${out}`);
        }
    }
    console.log(`\n총 대상 진술: ${total}개 · 초안 작성: ${drafted}개 · 근거 부재: ${ungrounded}개${dryRun ? ' (dry-run)' : ''}`);
}

/** 초안 파싱 → Map<examId, Map<sid, explain>> */
function parseStmtDrafts() {
    const byExam = new Map();
    if (!fs.existsSync(DRAFT_DIR)) return byExam;
    for (const f of fs.readdirSync(DRAFT_DIR).filter(f => /^stmtfb_.+\.md$/.test(f))) {
        const examId = f.replace(/^stmtfb_/, '').replace(/_[^_]+\.md$/, '');
        const md = fs.readFileSync(path.join(DRAFT_DIR, f), 'utf-8');
        const map = byExam.get(examId) || new Map();
        for (const m of md.matchAll(/## sid (\S+)\s*\n[\s\S]*?^> \*\*진술해설\*\*:\s*(.+)$/gm)) {
            const text = m[2].trim();
            if (!text || /미생성|DRY RUN|TODO/.test(text)) continue;
            map.set(m[1], text);
        }
        byExam.set(examId, map);
    }
    return byExam;
}

function apply(flags, opts) {
    const write = flags.has('write');
    const byExam = parseStmtDrafts();
    const targets = getTargets(opts);
    let applied = 0;
    for (const [examId, map] of byExam) {
        const target = targets.find(t => t.id === examId);
        if (!target) { console.log(`${examId}: 대상 시험 없음 — 건너뜀`); continue; }
        const dir = path.join(ROOT, target.contentRoot, '피드백');
        const fp = path.join(dir, 'stmt_explain.json');
        const cur = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : {};
        const fresh = [...map].filter(([sid]) => !(sid in cur)).length;
        const merged = { ...cur, ...Object.fromEntries(map) };
        console.log(`${examId}: 초안 ${map.size}건 (신규 ${fresh} · 갱신 ${map.size - fresh}) → ${path.relative(ROOT, fp)}`);
        if (write) {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fp, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
        }
        applied += map.size;
    }
    console.log(`${write ? '반영 완료' : '미리보기'}: ${applied}건 — build:drills 재생성 시 진술 explain에 병합됩니다`);
}

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    if (flags.has('apply')) return apply(flags, opts);
    await generate(flags, opts);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { buildPrompt, collectStatements, parseStmtDrafts, loadStats, isAnomalous };
