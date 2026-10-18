#!/usr/bin/env node
/**
 * ai_draft_questions.js — 교재 청크 → `### Q{n}` 문제 초안 생성
 * @spec AI-05,AI-02,AI-03
 *
 * 사용법:
 *   node tools/ai/ai_draft_questions.js --subject law [--lines 200-400] [--count 5] [--type choice] [--dry-run]
 *
 * - 지정 교재 파일·라인 범위를 섹션 청크로 분할해 청크별 초안 생성
 * - 출력은 문제은행 포맷(발문/선지 + 정답 블록: 정답·📖 근거 file#LNN·해설) — 파서·게이트 변경 불요
 * - 인용 없는 초안은 [폐기 후보] 표시 (근거 강제, 설계 §2-2)
 */

'use strict';

const path = require('path');
const { parseArgs, getTargets, writeDraft, loadEnv, ROOT } = require('./lib/ai_common');
const { listTextbooks, chunkTextbook } = require('./lib/textbook');
const { citationValid } = require('./lib/citations');
const llm = require('./llm_client');

const SYSTEM = `당신은 자격시험 출제 보조입니다. 제공된 교재 청크만을 근거로 문제 초안을 만든다.
출력 형식(각 문항):
### Q{n}. <발문>
① <선지1>
② <선지2>
③ <선지3>
④ <선지4>
⑤ <선지5>

**Q{n}답**
> **정답: <①~⑤ 또는 단답 텍스트>**
> **근거 라인: L<청크 내 실제 라인 번호>**
> **해설**: <1~3문장>
규칙:
- 근거 라인 번호는 제공된 청크의 라인 표기를 그대로 쓸 것. 근거가 없으면 그 문항은 만들지 말 것.
- 발문은 독립 완결형으로 쓸 것 — '제시된', '청크', '본문', '아래', '제시문', '교재 목차/항목 번호'처럼
  지문 제시를 전제로 하는 표현 금지. 수험생이 지문 없이 풀 수 있는 발문만 허용.
- 선지는 서로 모순되거나 구분 가능한 사실 관계로 구성할 것.`;

async function main() {
    loadEnv();
    const { flags, opts } = parseArgs();
    const dryRun = flags.has('dry-run') || !llm.isAvailable();
    const count = Number(opts.count || 5);

    const target = getTargets(opts)[0];
    if (!target) { console.error('대상 시험을 찾을 수 없음 (--exam 지정)'); process.exit(1); }
    const books = listTextbooks(target).filter(b => !opts.subject || b.subjectKey === opts.subject);
    if (!books.length) { console.error(`교재 없음 — --subject 값 확인 (${(target.manifest.subjects || []).map(s => s.key).join('/')})`); process.exit(1); }

    for (const book of books) {
        let chunks = chunkTextbook(book.absPath);
        if (opts.lines) {
            const [lo, hi] = String(opts.lines).split('-').map(Number);
            chunks = chunks.filter(c => c.endLine >= lo && c.startLine <= (hi || Infinity));
        }
        if (!chunks.length) { console.log(`${book.file}: 범위 내 청크 없음`); continue; }

        const lines = [`# 문제 초안 — ${book.file} (${opts.lines || '전체'})`, ''];
        let n = 0;
        for (const chunk of chunks) {
            // 청크 라인에 실제 L번호를 부여해 인용 정확도를 높인다
            const numbered = chunk.text.split('\n')
                .map((l, i) => `L${chunk.startLine + i} | ${l}`).join('\n');
            const prompt = `교재 청크 (라인 L번호 포함):\n\n${numbered}\n\n위 청크에서 ${count}문 초안을 만들어라. 유형: ${opts.type || '선다형(choice)'}.`;

            lines.push(`## ${chunk.heading} (L${chunk.startLine}~L${chunk.endLine})`, '');
            if (dryRun) {
                n++;
                lines.push(`### Q${n}. (미생성 — DRY RUN 또는 API 키 없음)`, '',
                    '<details><summary>전송 예정 프롬프트</summary>', '', '```', prompt, '```', '</details>', '');
            } else {
                const res = await llm.complete(prompt, { system: SYSTEM, maxTokens: 4000 });
                if (res.dryRun) {
                    lines.push('(미생성 — DRY RUN)', '');
                } else {
                    // 자기검증: 생성 인용 라인이 실제 파일 범위 내인지 확인, 밖이면 폐기 표시 (설계 §3.1)
                    const body = res.text;
                    const bad = [...body.matchAll(/근거 라인:\s*L(\d+)/g)]
                        .filter(m => !citationValid(book.absPath, Number(m[1])));
                    if (bad.length) lines.push(`> ⚠️ [폐기 후보] 인용 라인 범위 초과: ${bad.map(m => 'L' + m[1]).join(', ')}`, '');
                    lines.push(body, '');
                }
                n++;
            }
        }
        const out = writeDraft(`draft_${book.subjectKey}.md`, lines, { model: llm.modelName() });
        console.log(`${book.file}: 청크 ${chunks.length}개 → ${path.relative(ROOT, out)}`);
    }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = {};
