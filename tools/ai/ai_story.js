#!/usr/bin/env node
/**
 * ai_story.js — 표준형 story:slot 미작성분 스캔 → 서사 패치(@insert) 초안 생성
 * @spec AI-17
 *
 * 사용법:
 *   node tools/ai/ai_story.js [--exam cosmetic] [--subject law] [--limit 20] [--dry-run]
 *   node tools/ai/ai_story.js --apply [--write]
 *
 * 산출물: tmp/ai_drafts/story_<examId>_<subjKey>.md — 완성 @insert 블록 초안.
 * 리뷰 후 --apply로 story/<과목>_서사.md에 병합한다 (빈 @insert 채우기 또는 파일 끝 추가).
 * 병합 후 `npm run build:story`로 이야기형 교재를 재생성해야 반영된다.
 *
 * 컨텍스트: 슬롯 주변 표준형 본문 + 기존 서사 스타일 샘플(등장인물·첫 서사 블록).
 * 서사는 창작 영역이지만 사실 관계는 제공 본문에 한정한다 (grounded).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, writeDraft, loadEnv, DRAFT_DIR } = require('./lib/ai_common');
const { listTextbooks } = require('./lib/textbook');
const llm = require('./llm_client');

const SYSTEM = '당신은 자격시험 이야기형 학습교재의 서사 작성 보조입니다. 제공된 본문 내용만을 소재로, 기존 서사와 같은 등장인물·문체로 상황극을 한국어로 작성하라. 본문에 없는 사실·수치·법령 내용을 만들어 내지 말 것.';

const SLOT_RE = /<!-- story:slot:(\w[\w-]*) -->/g;
const INSERT_RE = /<!-- @insert slot="(\w[\w-]*)"([^>]*)-->([\s\S]*?)<!-- \/\@ -->/g;
const CTX_LINES = 45;      // 슬롯 뒤 본문 최대 라인수
const CTX_CHARS = 2800;    // 프롬프트 컨텍스트 최대 길이

/** 표준형 라인 배열 → 슬롯 목록 [{id, lineIdx}] */
function listSlots(lines) {
    const slots = [];
    lines.forEach((l, i) => {
        for (const m of l.matchAll(SLOT_RE)) slots.push({ id: m[1], lineIdx: i });
    });
    return slots;
}

/** 슬롯 뒤 본문 컨텍스트 — 다음 슬롯 마커 또는 CTX_LINES까지 */
function slotContext(lines, lineIdx) {
    const out = [];
    for (let i = lineIdx + 1; i < lines.length && out.length < CTX_LINES; i++) {
        if (SLOT_RE.test(lines[i])) break;
        SLOT_RE.lastIndex = 0;
        out.push(lines[i]);
    }
    return out.join('\n').slice(0, CTX_CHARS);
}

/** 서사 패치 파일 → { filled: Set<slot>, empty: Set<slot>, text } */
function parsePatch(patchPath) {
    const text = fs.existsSync(patchPath) ? fs.readFileSync(patchPath, 'utf-8') : '';
    const filled = new Set(), empty = new Set();
    for (const m of text.matchAll(INSERT_RE)) (m[3].trim() ? filled : empty).add(m[1]);
    return { filled, empty, text };
}

/** 스타일 샘플 — 등장인물 블록 + 첫 채워진 story 블록 (최대 ~1400자) */
function styleExemplar(patchText) {
    const parts = [];
    const cast = patchText.match(/## 🧭 이야기의 등장인물[\s\S]{0,1500}/);
    if (cast) parts.push(`[등장인물]\n${cast[0].slice(0, 1300)}`);
    for (const m of patchText.matchAll(INSERT_RE)) {
        if (m[2].includes('story') && m[3].trim()) {
            parts.push(`[기존 서사 예시]\n${m[3].trim().slice(0, 1200)}`);
            break;
        }
    }
    return parts.join('\n\n');
}

function buildPrompt(slotId, context, exemplar) {
    return [
        '아래 슬롯에 삽입할 서사(상황극)를 작성하라.',
        '',
        `[슬롯] ${slotId}`,
        '',
        '[표준형 본문 — 서사의 소재가 될 학습 내용]',
        context || '(본문 없음)',
        '',
        exemplar || '(스타일 예시 없음 — 새 이야기형 교재의 첫 서사. 주인공이 개념을 겪으며 배우는 상황극)',
        '',
        '출력 형식: 📖 ┈┈┈┈ **이야기** ┈┈┈┈ 로 시작해 ┈┈┈┈ **본문** ┈┈┈┈ 📘 로 끝나는 본문만.',
        '대화·상황 묘사 8~20줄. 본문의 핵심 개념·함정을 등장인물의 경험으로 표현.',
    ].join('\n');
}

/** 서사 본문 → @insert 블록으로 감싸기 */
function wrapBlock(slotId, body) {
    return `<!-- @insert slot="${slotId}" story -->\n\n${body.trim()}\n\n<!-- /@ -->`;
}

/** 초안 md에서 {slotId → blockText} 추출 (미생성 플레이스홀더 제외) */
function parseStoryDrafts() {
    const byExam = new Map(); // examId → Map<subjKey, Map<slotId, block>>
    if (!fs.existsSync(DRAFT_DIR)) return byExam;
    for (const f of fs.readdirSync(DRAFT_DIR).filter(f => /^story_.+\.md$/.test(f))) {
        const m0 = f.match(/^story_([^_]+)_(.+)\.md$/);
        if (!m0) continue;
        const [, examId, subjKey] = m0;
        const md = fs.readFileSync(path.join(DRAFT_DIR, f), 'utf-8');
        const slots = byExam.get(examId) || new Map();
        const map = slots.get(subjKey) || new Map();
        for (const m of md.matchAll(/<!-- @insert slot="(\w[\w-]*)"[^>]*-->([\s\S]*?)<!-- \/\@ -->/g)) {
            const body = m[2].trim();
            if (!body || /미생성|DRY RUN|TODO/.test(body)) continue;
            map.set(m[1], m[0]);
        }
        slots.set(subjKey, map);
        byExam.set(examId, slots);
    }
    return byExam;
}

/** 패치 파일에 블록 병합 — 빈 @insert 교체, 없으면 파일 끝 추가 */
function mergePatch(patchPath, blocks) {
    let text = fs.existsSync(patchPath) ? fs.readFileSync(patchPath, 'utf-8') : '';
    if (!text) text = `# 서사 패치 (자동 생성)\n`;
    let merged = 0;
    for (const [slotId, block] of blocks) {
        const re = new RegExp(`<!-- @insert slot="${slotId}"[^>]*-->[\\s\\S]*?<!-- \\/@ -->`);
        if (re.test(text)) {
            const cur = text.match(re)[0];
            if (/^<!-- @insert[^\n]*-->\s*<!-- \/\@ -->$/.test(cur.replace(/\n/g, ' ')) || cur.replace(/<!--[^>]*-->/g, '').trim() === '') {
                text = text.replace(re, block);
                merged++;
            } // 이미 내용이 있으면 건너뜀 — 수동 서사 보호
        } else {
            text += (text.endsWith('\n') ? '\n' : '\n\n') + block + '\n';
            merged++;
        }
    }
    return { text, merged };
}

async function generate(opts, flags) {
    loadEnv();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = opts.limit ? Number(opts.limit) : Infinity;

    let totalOpen = 0, drafted = 0;
    for (const target of getTargets(opts)) {
        for (const book of listTextbooks(target)) {
            if (opts.subject && book.subjectKey !== opts.subject) continue;
            const stdLines = fs.readFileSync(book.absPath, 'utf-8').split('\n');
            const storyDir = path.join(path.dirname(book.absPath), 'story');
            const patchFile = fs.existsSync(storyDir)
                ? fs.readdirSync(storyDir).find(f => f.endsWith('_서사.md')) : null;
            const patchPath = patchFile ? path.join(storyDir, patchFile) : null;
            const patch = parsePatch(patchPath);
            const open = listSlots(stdLines).filter(s => !patch.filled.has(s.id));
            if (!open.length) continue;
            totalOpen += open.length;
            if (drafted >= limit) continue;

            const exemplar = styleExemplar(patch.text);
            const lines = [`# 서사 초안 — ${book.subjectKey} (미작성 슬롯 ${open.length}개)`, ''];
            for (const s of open) {
                if (drafted >= limit) break;
                const ctx = slotContext(stdLines, s.lineIdx);
                const prompt = buildPrompt(s.id, ctx, exemplar);
                lines.push(`## slot ${s.id}`, '');
                if (dryRun) {
                    lines.push('(미생성 — DRY RUN 또는 API 키 없음)', '',
                        '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
                } else {
                    const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 900 });
                    lines.push(res.dryRun ? '(미생성 — DRY RUN)' : wrapBlock(s.id, res.text), '');
                }
                drafted++;
            }
            const out = writeDraft(`${target.id}/story_${target.id}_${book.subjectKey}.md`, lines, { model: llm.modelName() });
            console.log(`${book.subjectKey}: 미작성 슬롯 ${open.length}개 → ${out}`);
        }
    }
    console.log(`\n총 미작성 슬롯: ${totalOpen}개 · 초안 작성: ${drafted}개${dryRun ? ' (dry-run)' : ''}`);
}

function apply(flags, opts) {
    const write = flags.has('write');
    const byExam = parseStoryDrafts();
    let applied = 0;
    for (const [examId, subjs] of byExam) {
        const target = getTargets(opts).find(t => t.id === examId);
        if (!target) { console.log(`${examId}: 대상 시험 없음 — 건너뜀`); continue; }
        for (const [subjKey, blocks] of subjs) {
            const book = listTextbooks(target).find(b => b.subjectKey === subjKey);
            if (!book) { console.log(`${examId}/${subjKey}: 표준형 없음 — 건너뜀`); continue; }
            const storyDir = path.join(path.dirname(book.absPath), 'story');
            fs.mkdirSync(storyDir, { recursive: true });
            const patchFile = fs.readdirSync(storyDir).find(f => f.endsWith('_서사.md'))
                || `${path.basename(book.absPath).replace(/_표준형\.md$/, '')}_서사.md`;
            const patchPath = path.join(storyDir, patchFile);
            const { text, merged } = mergePatch(patchPath, blocks);
            console.log(`${subjKey}: ${merged}/${blocks.size}블록 ${write ? '병합' : '미리보기'} → ${patchFile}`);
            if (write && merged) fs.writeFileSync(patchPath, text);
            applied += merged;
        }
    }
    console.log(`\n총 ${applied}블록 ${write ? '병합 — `npm run build:story`로 재생성하세요' : '미리보기 (적용은 --write)'}`);
}

async function main() {
    const { flags, opts } = parseArgs();
    if (flags.has('apply')) return apply(flags, opts);
    return generate(opts, flags);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { buildPrompt, wrapBlock, parsePatch, mergePatch, listSlots, slotContext };
