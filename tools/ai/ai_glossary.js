#!/usr/bin/env node
/**
 * ai_glossary.js — 용어집 부실 정의 보강 초안 생성 → glossary/subjectN.json 병합
 * @spec AI-20
 *
 * 사용법:
 *   node tools/ai/ai_glossary.js [--exam cosmetic] [--subject subject1] [--max-len 45] [--limit 30] [--dry-run]
 *   node tools/ai/ai_glossary.js --apply [--write]
 *
 * 대상: 교재/glossary/subjectN.json 항목 중 정의가 --max-len 미만이거나 말줄임으로
 * 끝나는 부실 항목. 자동 추출 파이프라인(extract_glossary_candidates)이 원문을
 * 잘라낸 정의를, LLM이 원문 맥락에서 읽기 쉬운 문장으로 다듬는다.
 *
 * 산출물: tmp/ai_drafts/glossary_<examId>_<file>.md — 리뷰 후 --apply가 정의를 교체.
 * 컨텍스트는 용어가 정의되는 교재·참조자료 실제 라인으로 제한한다 (grounded).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, writeDraft, loadEnv, DRAFT_DIR, ROOT } = require('./lib/ai_common');
const llm = require('./llm_client');

const SYSTEM = '당신은 자격시험 용어집의 정의 작성 보조입니다. 제공된 원문 근거만을 바탕으로 용어 정의를 한국어 1~2문장으로 다듬어라. 근거에 없는 사실을 추가하지 말 것.';

const CTX_SPAN = 5;

/** 시험 코퍼스(교재+참조자료)에서 용어 정의 라인 주변 컨텍스트 탐색 */
function termContext(target, keyword) {
    const roots = [
        path.join(ROOT, target.contentRoot, '교재'),
        path.join(ROOT, target.contentRoot, '참조자료', 'ref_md'),
    ];
    const defRe = new RegExp(`${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]{0,20}(이란|이?라 ?함|를 말한다|을 말한다|의미한다)`);
    for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const stack = [root];
        while (stack.length) {
            const d = stack.pop();
            for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                const p = path.join(d, e.name);
                if (e.isDirectory()) { stack.push(p); continue; }
                if (!e.name.endsWith('.md')) continue;
                const lines = fs.readFileSync(p, 'utf-8').split('\n');
                const idx = lines.findIndex(l => defRe.test(l) || l.includes(keyword));
                if (idx >= 0) {
                    return {
                        file: path.relative(path.join(ROOT, target.contentRoot), p),
                        text: lines.slice(Math.max(0, idx - 1), idx + CTX_SPAN).join('\n').slice(0, 1200),
                    };
                }
            }
        }
    }
    return null;
}

function buildPrompt(entry, ctx) {
    return [
        '아래 용어집 항목의 정의를 다듬어라.',
        '',
        `[용어] ${entry.keyword}`,
        `[현재 정의] ${entry.definition || '(없음)'}`,
        '',
        ctx ? `[원문 근거 — ${ctx.file}]\n${ctx.text}` : '[원문 근거 없음 — 코퍼스에서 용어 미발견]',
        '',
        '정의만 출력. 시험 학습자가 구분점을 이해할 수 있는 1~2문장.',
    ].join('\n');
}

/** glossary 디렉터리 파일 목록 → [{file, subjectNo, absPath}] */
function listGlossaryFiles(target) {
    const dir = path.join(ROOT, target.contentRoot, '교재', 'glossary');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => /^subject\d+\.json$/.test(f))
        .map(f => ({ file: f, subjectNo: f.match(/\d+/)[0], absPath: path.join(dir, f) }));
}

/** 초안 md 파싱 → Map<examId, Map<file, Map<keyword, definition>>> */
function parseGlossaryDrafts() {
    const byExam = new Map();
    if (!fs.existsSync(DRAFT_DIR)) return byExam;
    for (const f of fs.readdirSync(DRAFT_DIR).filter(f => /^glossary_.+\.md$/.test(f))) {
        const m0 = f.match(/^glossary_([^_]+)_(subject\d+)\.md$/);
        if (!m0) continue;
        const [, examId, subjFile] = m0;
        const md = fs.readFileSync(path.join(DRAFT_DIR, f), 'utf-8');
        const files = byExam.get(examId) || new Map();
        const map = files.get(subjFile) || new Map();
        for (const m of md.matchAll(/## term (.+?)\s*\n[\s\S]*?^> \*\*정의\*\*:\s*(.+)$/gm)) {
            const text = m[2].trim();
            if (!text || /미생성|DRY RUN|TODO/.test(text)) continue;
            map.set(m[1].trim(), text);
        }
        files.set(subjFile, map);
        byExam.set(examId, files);
    }
    return byExam;
}

async function generate(opts, flags) {
    loadEnv();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = opts.limit ? Number(opts.limit) : Infinity;
    const maxLen = opts['max-len'] ? Number(opts['max-len']) : 45;

    let total = 0, drafted = 0, ungrounded = 0;
    for (const target of getTargets(opts)) {
        for (const gf of listGlossaryFiles(target)) {
            if (opts.subject && gf.file.replace('.json', '') !== opts.subject) continue;
            const entries = JSON.parse(fs.readFileSync(gf.absPath, 'utf-8'));
            const thin = entries.filter(e =>
                !e.definition || e.definition.length < maxLen || e.definition.endsWith('…') || e.definition.endsWith('...'));
            if (!thin.length) continue;
            total += thin.length;
            if (drafted >= limit) continue;

            const lines = [`# 용어집 정의 보강 초안 — ${gf.file} (대상 ${thin.length}항목 · 정의 ${maxLen}자 미만)`, ''];
            const ungroundedList = [];
            for (const e of thin) {
                if (drafted >= limit) break;
                const ctx = termContext(target, e.keyword);
                if (!ctx) { // 근거 미발견 — 비근거 정의 생성 차단
                    ungrounded++;
                    ungroundedList.push(`- ${e.keyword} — 코퍼스에서 용어 미발견`);
                    continue;
                }
                const prompt = buildPrompt(e, ctx);
                lines.push(`## term ${e.keyword}`, '',
                    `- 현재 정의: ${e.definition || '(없음)'}`, '');
                if (dryRun) {
                    lines.push('> **정의**: (미생성 — DRY RUN 또는 API 키 없음)', '',
                        '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
                } else {
                    const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 200 });
                    lines.push(res.dryRun
                        ? '> **정의**: (미생성 — DRY RUN)'
                        : `> **정의**: ${res.text.trim().replace(/\n+/g, ' ')}`, '');
                }
                drafted++;
            }
            if (ungroundedList.length) {
                lines.push('## ⚠️ 근거 부재 — 정의 미생성', '', ...ungroundedList, '');
            }
            const out = writeDraft(`glossary_${target.id}_${gf.file.replace('.json', '')}.md`, lines, { model: llm.modelName() });
            console.log(`${gf.file}: 부실 정의 ${thin.length}항목 (근거 부재 ${ungroundedList.length}개 제외) → ${out}`);
        }
    }
    console.log(`\n총 대상 항목: ${total}개 · 초안 작성: ${drafted}개 · 근거 부재: ${ungrounded}개${dryRun ? ' (dry-run)' : ''}`);
}

function apply(flags, opts) {
    const write = flags.has('write');
    const byExam = parseGlossaryDrafts();
    const targets = getTargets(opts);
    let applied = 0;
    for (const [examId, files] of byExam) {
        const target = targets.find(t => t.id === examId);
        if (!target) { console.log(`${examId}: 대상 시험 없음 — 건너뜀`); continue; }
        for (const [subjFile, map] of files) {
            const gf = listGlossaryFiles(target).find(g => g.file === `${subjFile}.json`);
            if (!gf) { console.log(`${examId}/${subjFile}: glossary 파일 없음 — 건너뜀`); continue; }
            const entries = JSON.parse(fs.readFileSync(gf.absPath, 'utf-8'));
            let hit = 0;
            for (const e of entries) {
                if (map.has(e.keyword)) { e.definition = map.get(e.keyword); hit++; }
            }
            console.log(`${gf.file}: ${hit}/${map.size}항목 ${write ? '교체' : '미리보기'}`);
            if (write && hit) fs.writeFileSync(gf.absPath, JSON.stringify(entries, null, 1) + '\n');
            applied += hit;
        }
    }
    console.log(`\n총 ${applied}항목 ${write ? '반영' : '미리보기 (적용은 --write)'}`);
}

async function main() {
    const { flags, opts } = parseArgs();
    if (flags.has('apply')) return apply(flags, opts);
    return generate(opts, flags);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { buildPrompt, termContext, parseGlossaryDrafts, listGlossaryFiles };
