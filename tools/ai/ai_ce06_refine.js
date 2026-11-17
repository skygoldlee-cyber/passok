#!/usr/bin/env node
/**
 * ai_ce06_refine.js — CE-06 가독성 규약 기반 교재 본문 리라이트 (검수 보조)
 * @spec CE-06,AI-01
 *
 * 지정 파일의 `## 📚 심화 보강` 블록을 ### 단위로 LLM에 재작성 요청:
 *   문장 40자(최대 60)·문단 3문장·목록 7항목·표 6행 — 사실·수치·용어 보존 요구.
 * 안전장치: 출력의 숫자·단위 토큰이 원문과 다르면 해당 절은 기각(원문 유지).
 * 출력은 적용 전 tmp/ai_drafts/ 에 스테이징 — --apply 시에만 파일 반영.
 *
 * 사용:
 *   node tools/ai/ai_ce06_refine.js --file <교재경로> [--apply] [--dry-run] [--limit N]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { complete } = require('./llm_client.js');
const { loadEnv, parseArgs, DRAFT_DIR } = require('./lib/ai_common.js');

loadEnv();

const { flags, opts } = parseArgs();
const FILE = opts.file;
const APPLY = flags.has('apply');
const DRY = flags.has('dry-run');
const LIMIT = opts.limit ? Number(opts.limit) : Infinity;

if (!FILE) { console.error('--file 필수'); process.exit(1); }

const SYSTEM = `당신은 자격시험 수험서 편집자다. 주어진 마크다운 본문을 가독성 규약에 맞게 재작성한다.
규약:
- 문장은 40자 이내(어떤 경우에도 60자 초과 금지) — '하며/하고/이며/는데/지만' 등으로 이어진 장문은 종결형으로 바꿔 둘로 나눈다
- 문단은 3문장 이내 — 넘으면 빈 줄로 문단을 나눈다
- 불릿 목록은 하나에 7항목 이내 — 넘으면 의미 단위로 나누고 소제목(####)을 붙인다
- 표는 4열×6행 이내 — 넘으면 두 표로 나눈다 (헤더 반복). 2열 정리표는 행 제한 없음
- 본문은 ~한다체, 표·목록은 명사형 종결
절대 규칙:
- 사실·수치·날짜·법령 조문·전문용어·표 데이터는 한 글자도 바꾸지 않는다
- **수치·숫자가 포함된 표현은 원문에 나타난 횟수 그대로 유지한다 — 하나라도 빠뜨리면 안 된다**
- 내용 추가·삭제·요약·생략 금지 — 모든 문장·모든 목록 항목·모든 표 행을 보존한다
- 순수하게 문장 쪼개기·문단 나누기·표 분할만 한다 — 어휘를 바꾸지 않는다
- #### 소제목·표 헤더·마크다운 구조 유지, 입력과 같은 마크다운 산출
- 설명문·주석·코드펜스 없이 재작성된 본문만 출력한다`;

function numericTokens(text) {
    const t = text.replace(/\s+/g, '');
    const m = t.match(/\d+(?:\.\d+)?(?:%|℃|도|년|월|일|세|회|분|초|시간|개|명|건|원|배|등급|조|항|층|점|mmHg|kcal|mL|cc|L|g|mg|kg|cm|mm|m|km|명|위)/g) || [];
    return m.sort();
}

function chunkSections(body) {
    // '### ' 단위로 절 분할 — 첫 청크는 블록 헤더(소개문)로 원본 유지
    const idx = [];
    const re = /^### /gm;
    let m;
    while ((m = re.exec(body))) idx.push(m.index);
    const chunks = [];
    if (!idx.length) return [{ head: true, text: body }];
    chunks.push({ head: true, text: body.slice(0, idx[0]) });
    for (let i = 0; i < idx.length; i++) {
        chunks.push({ head: false, text: body.slice(idx[i], idx[i + 1]) });
    }
    return chunks;
}

async function main() {
    const src = fs.readFileSync(FILE, 'utf8');
    const mark = '## 📚 심화 보강';
    const cut = src.indexOf(mark);
    if (cut < 0) { console.error('심화 보강 블록 없음'); process.exit(1); }
    const head = src.slice(0, cut);
    const body = src.slice(cut);
    const chunks = chunkSections(body);
    console.log(`대상 ${FILE} — 절 ${chunks.length - 1}개`);

    const outParts = [];
    let applied = 0, kept = 0, failed = 0;
    let n = 0;
    for (const ch of chunks) {
        if (ch.head) { outParts.push(ch.text); continue; }
        n++;
        if (n > LIMIT) { outParts.push(ch.text); kept++; continue; }
        const title = ch.text.split('\n', 1)[0];
        const res = await complete(SYSTEM + '\n\n---\n' + ch.text, { maxTokens: 12000, dryRun: DRY });
        if (res.dryRun) {
            console.log(`[dry-run] ${title} (${ch.text.length}자)`);
            outParts.push(ch.text); kept++; continue;
        }
        const newText = (res.text || '').trim();
        if (!newText || newText.length < ch.text.length * 0.4) {
            console.log(`✗ 폐기(출력 이상) ${title}`);
            outParts.push(ch.text); failed++; continue;
        }
        // 수치 무결성 — 숫자+단위 토큰 다중집합 비교
        const a = numericTokens(ch.text).join('|');
        const b = numericTokens(newText).join('|');
        if (a !== b) {
            console.log(`✗ 폐기(수치 불일치) ${title}`);
            const dbg = path.join(DRAFT_DIR, `ce06_reject_${Date.now()}.diff.txt`);
            fs.mkdirSync(DRAFT_DIR, { recursive: true });
            fs.writeFileSync(dbg, `=== 원문 토큰 ===
${a}

=== 출력 토큰 ===
${b}

=== LLM 출력 ===
${newText}

=== 원문 ===
${ch.text}`);
            outParts.push(ch.text); failed++; continue;
        }
        console.log(`✓ 재작성 ${title} (${ch.text.length}→${newText.length}자)`);
        outParts.push(newText + '\n\n');
        applied++;
    }

    const result = head + outParts.join('');
    const tag = path.basename(FILE).replace(/\.md$/, '');
    fs.mkdirSync(DRAFT_DIR, { recursive: true });
    const draftPath = path.join(DRAFT_DIR, `ce06_${tag}.md`);
    fs.writeFileSync(draftPath, result);
    console.log(`\n재작성 ${applied} · 유지 ${kept} · 폐기 ${failed} — 초안 ${draftPath}`);
    if (APPLY && applied > 0) {
        fs.writeFileSync(FILE, result);
        console.log(`적용 완료 → ${FILE}`);
    }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
