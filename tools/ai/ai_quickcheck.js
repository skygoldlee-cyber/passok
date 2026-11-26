#!/usr/bin/env node
/**
 * ai_quickcheck.js — 챕터 퀵체크(이해도 점검) 초안 생성 + 편입
 * @spec AI-43
 *
 * 사용법:
 *   node tools/ai/ai_quickcheck.js [--exam cosmetic] [--limit 20] [--dry-run]
 *   node tools/ai/ai_quickcheck.js --apply [--write]
 *
 * 생성 모드: 표준형 교재의 `## M.` 섹션(§N.M 앵커) 단위로 섹션 본문만 근거로
 *   이해점검 2~3문 초안을 만든다 — OX·단답형 한정 (객관식 선지는 오답 설계
 *   검증 비용이 커 v1 제외 — DOC-DSN-56 §3.5).
 *   이미 quickcheck.json에 반영된 섹션 키(`<subj>:§N.M`)는 자동 스킵.
 *   근거(evidence)가 섹션 본문에 없는 항목·ai:lint 위반 발문은 [폐기 후보] 표시 —
 *   사람 리뷰가 삭제하면 --apply에서 자연 제외된다.
 *   초안: tmp/ai_drafts/quickcheck_<examId>_<subjKey>.md
 *
 * 편입 모드(--apply): 리뷰된 초안의 `> **퀵체크**:` 행을 모아
 *   content/exams/<id>/피드백/quickcheck.json (`<subj>:§N.M` → [{q,a,type}])에 병합.
 *   기본은 미리보기, --write로 실반영. 정본 없으면 앱은 기능 무표시.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs, getTargets, writeDraft, DRAFT_DIR, ROOT } = require('./lib/ai_common.js');
const { listTextbooks, chunkTextbook } = require('./lib/textbook.js');
const { anchorBoundariesOf, anchorAt } = require('../build/textbook_anchors.js');
const { lintQuestion } = require('./ai_lint.js');
const llm = require('./llm_client.js');

const SYSTEM = '당신은 자격시험 교재의 이해도 점검 문항을 만드는 보조입니다. 제공된 섹션 본문만을 근거로 OX 2문·단답형 1문을 한국어로 만드세요. 핵심 사실·정의·수치를 묻되 본문에 없는 사실은 묻지 말 것. 각 문항에는 본문에서 그대로 복사한 근거 문장(evidence)을 달 것.';

const SECTION_KEY_RE = /^##\s+(\S+:§\d+\.\d+)\s+—/;

function buildPrompt(heading, text) {
    return [
        `아래 교재 섹션의 이해도 점검 문항을 만들어라.`,
        '',
        `[섹션 제목] ${heading}`,
        '',
        '[섹션 본문]',
        text.slice(0, 3000),
        '',
        'JSON만 출력: {"items":[{"type":"ox","q":"참·거짓 판단 발문","a":"O|X","evidence":"본문에서 복사한 근거 문장"},{"type":"sa","q":"단답형 발문","a":"짧은 정답","evidence":"본문에서 복사한 근거 문장"}]}',
        '- OX 2문 + 단답형(sa) 1문, 총 3문. evidence는 본문 문장을 그대로 복사.',
    ].join('\n');
}

/** 텍스트 정규화 — 공백 압축 후 부분열 검사용 */
const _flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** 초안 항목 검증 — evidence 미검출·lint 위반은 [폐기 후보] */
function verifyItem(item, flatText) {
    const issues = lintQuestion(item.q || '', item.type === 'sa' ? item.a || '' : '');
    if (!_flat(item.evidence) || !flatText.includes(_flat(item.evidence))) {
        issues.push('근거(evidence) 미검출 — 본문에 없는 내용일 수 있음');
    }
    if (item.type === 'ox' && !/^[OX]$/.test(String(item.a || '').trim())) {
        issues.push('OX 정답이 O/X가 아님');
    }
    if (item.type === 'sa' && !_flat(item.a)) issues.push('단답 정답 없음');
    return issues;
}

/** 섹션 청크 → §N.M 키로 그룹핑 (서두·비번호 절·챕터 헤더(§N.0) 제외) */
function groupChunksByAnchor(chunks, boundaries, subjKey) {
    const groups = new Map();
    for (const c of chunks) {
        const a = anchorAt(boundaries, c.startLine - 1); // 헤딩 라인
        if (!a || a.endsWith('.0')) continue;
        const key = `${subjKey}:§${a}`;
        const g = groups.get(key) || { heading: c.heading, text: [] };
        g.text.push(c.text);
        groups.set(key, g);
    }
    return groups;
}

async function generate(flags, opts) {
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const limit = opts.limit ? Number(opts.limit) : Infinity;
    let sections = 0, drafted = 0, skipped = 0;

    for (const target of getTargets(opts)) {
        const appliedFp = path.join(ROOT, target.contentRoot, '피드백', 'quickcheck.json');
        const applied = fs.existsSync(appliedFp) ? JSON.parse(fs.readFileSync(appliedFp, 'utf-8')) : {};
        for (const tb of listTextbooks(target)) {
            if (opts.subject && tb.subjectKey !== opts.subject) continue;
            const groups = groupChunksByAnchor(
                chunkTextbook(tb.absPath), anchorBoundariesOf(tb.absPath), tb.subjectKey);
            const lines = [`# 퀵체크 초안 — ${target.id}/${tb.subjectKey} ${tb.file}`, ''];
            for (const [key, g] of groups) {
                if (key in applied) { skipped++; continue; }
                sections++;
                if (drafted >= limit) continue;
                const text = g.text.join('\n\n');
                const flatText = _flat(text);
                const prompt = buildPrompt(g.heading, text);
                lines.push(`## ${key} — ${g.heading}`, `> 파일: ${tb.subjectKey}/${tb.file}`, '');
                if (dryRun) {
                    lines.push('> **퀵체크**: (미생성 — DRY RUN 또는 API 키 없음)', '',
                        '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
                    drafted++;
                    continue;
                }
                const res = await llm.completeJson(prompt, { system: SYSTEM, maxTokens: 1500 });
                if (res.dryRun || !res.data) {
                    lines.push('> **퀵체크**: (미생성 — DRY RUN 또는 파싱 실패)', '');
                    continue;
                }
                const items = (Array.isArray(res.data.items) ? res.data.items : []).slice(0, 3);
                for (const it of items) {
                    if (it.type !== 'ox' && it.type !== 'sa') continue;
                    const issues = verifyItem(it, flatText);
                    const payload = JSON.stringify({ type: it.type, q: String(it.q || '').trim(), a: String(it.a ?? '').trim(), evidence: String(it.evidence || '').trim() }, null, 0);
                    lines.push(issues.length
                        ? `> **퀵체크** [폐기 후보 — ${issues.join(' · ')}]: ${payload}`
                        : `> **퀵체크**: ${payload}`);
                }
                lines.push('');
                drafted++;
            }
            if (lines.length > 2) {
                const out = writeDraft(`quickcheck_${target.id}_${tb.subjectKey}_${tb.file.replace(/\.md$/, '')}`, lines);
                console.log(`📝 ${path.relative(ROOT, out)}`);
            }
        }
    }
    console.log(`대상 섹션 ${sections} · 초안 생성 ${drafted} · 이미 반영 스킵 ${skipped}${dryRun ? ' · DRY RUN' : ''}`);
}

/** 리뷰 초안 → quickcheck.json 병합. `## <key>` 헤딩 + `> **퀵체크**:` JSON 행 파싱 */
function apply(flags, opts) {
    const write = flags.has('write');
    const files = [];
    if (fs.existsSync(DRAFT_DIR)) {
        (function walk(d) {
            for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                if (e.isDirectory()) walk(path.join(d, e.name));
                else if (/^quickcheck_.+\.md$/.test(e.name)) files.push(path.join(d, e.name));
            }
        })(DRAFT_DIR);
    }
    // 시험별 병합 묶음 — 파일명 quickcheck_<examId>_… 에서 시험 키 추출
    const merged = new Map(); // examId → {key → items[]}
    let parsed = 0, dropped = 0;
    for (const f of files) {
        const examId = path.basename(f, '.md').replace(/^quickcheck_/, '').split('_')[0];
        if (opts.exam && examId !== opts.exam) continue;
        let curKey = null;
        for (const line of fs.readFileSync(f, 'utf-8').split(/\r?\n/)) {
            const km = SECTION_KEY_RE.exec(line);
            if (km) { curKey = km[1]; continue; }
            const im = line.match(/^>\s*\*\*퀵체크\*\*(\s*\[폐기 후보[^\]]*\])?\s*:\s*(.+)$/);
            if (!im || !curKey) continue;
            if (im[1]) { dropped++; continue; }
            try {
                const it = JSON.parse(im[2]);
                if ((it.type === 'ox' || it.type === 'sa') && it.q && it.a) {
                    const m = merged.get(examId) || {};
                    (m[curKey] = m[curKey] || []).push({ type: it.type, q: it.q, a: it.a });
                    merged.set(examId, m);
                    parsed++;
                }
            } catch (e) { /* 리뷰 중 손상 행 — 스킵 */ }
        }
    }
    for (const target of getTargets(opts)) {
        const add = merged.get(target.id);
        if (!add) continue;
        const fp = path.join(ROOT, target.contentRoot, '피드백', 'quickcheck.json');
        const cur = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : {};
        for (const [k, items] of Object.entries(add)) cur[k] = [...(cur[k] || []), ...items];
        if (write) {
            fs.mkdirSync(path.dirname(fp), { recursive: true });
            fs.writeFileSync(fp, JSON.stringify(cur, null, 2) + '\n', 'utf-8');
        }
        console.log(`${write ? '✅ 반영' : '🔍 미리보기'} ${path.relative(ROOT, fp)} — 섹션 ${Object.keys(add).length}개 추가`);
    }
    console.log(`파싱 ${parsed}문 · 폐기 후보 제외 ${dropped}문${write ? '' : ' (--write로 실반영)'}`);
}

const { flags, opts } = parseArgs();
if (flags.has('apply')) apply(flags, opts);
else generate(flags, opts).catch(e => { console.error('❌', e.message); process.exit(1); });
