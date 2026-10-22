#!/usr/bin/env node
/**
 * check_meta_sections.js — 메타 섹션 규약 기준선 래칫 (TS-17)
 *
 * 배경: 리더와 통합검색은 reader-toc.js의 isStoryMetaSection을 공유해
 * "렌더 안 되는 섹션은 검색 결과로도 반환하지 않는" 불변식을 유지한다.
 * 그런데 _STORY_META_PATTERNS는 현행 교재의 메타 헤딩 표기(📊 비교표·
 * ✅ 확인문제 등)에 하드코딩돼 있어, 교재 교체 시 새로운 메타 표기가
 * 들어오면 리더가 본문 카드로 렌더하고 검색 인덱스에도 포함된다 —
 * 의도한 메타 섹션이 본문으로 노출되는 품질 회귀다.
 *
 * 이 검사는 "메타 의심" 헤딩(체크리스트 키워드 포함 ## 헤딩) 중
 * isStoryMetaSection에 매칭되지 않는 제목을 수집해 기준선과 대조한다:
 *   - 기준선에 없는 신규 의심 제목 → 실패 (작성 의도 검토 요구)
 *   - 조치: 메타 의도면 reader-toc.js 패턴 추가, 본문 의도면
 *     --update로 기준선 갱신
 *
 * 실행: node tools/check/check_meta_sections.js [--update]
 */

// @spec TS-17
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { isStoryMetaSection } from '../../src/reader/reader-toc.js';

const require = createRequire(import.meta.url);
const { getExamTargets } = require('../build/exam_targets.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_PATH = path.join(__dirname, '..', 'state', 'meta_sections_baseline.json');

// 메타 섹션 의심 키워드 — 작성 가이드의 보조 섹션 명명 패턴.
// 이모지 단독(📌 등)은 본문 섹션에도 쓰이므로 키워드 기준으로만 의심한다.
const META_KEYWORD_RE = /비교표|확인문제|기출문제|목차|핵심\s*요약|학습\s*안내|체크리스트|회상|암기\s*미리보기|암기\s*축|시험\s*직전|키워드|용어\s*정리|여정도|과목\s*지도|출처/;
const CHAPTER_RE = /Chapter\s*\d+/i;

/**
 * 교재 MD의 ## 헤딩(리더 섹션 카드 단위) 중 메타 의심이지만
 * isStoryMetaSection에 매칭되지 않는 헤딩을 수집한다.
 * @param {Array<{id:string, contentRoot:string}>} targets
 * @param {string} root - 저장소 루트
 * @returns {Array<{exam:string, file:string, line:number, title:string}>}
 */
export function findMetaSuspects(targets, root) {
    const out = [];
    for (const t of targets) {
        const eduDir = path.join(root, t.contentRoot, '교재');
        if (!fs.existsSync(eduDir)) continue;
        for (const file of walkMd(eduDir)) {
            const lines = fs.readFileSync(file, 'utf-8').split('\n');
            let inFence = false;
            lines.forEach((l, i) => {
                if (/^```/.test(l.trim())) { inFence = !inFence; return; }
                if (inFence) return;
                const m = l.match(/^##\s+(.*)/);
                if (!m) return;
                const title = m[1].trim();
                if (CHAPTER_RE.test(title)) return;
                if (META_KEYWORD_RE.test(title) && !isStoryMetaSection(title)) {
                    out.push({ exam: t.id, file: path.relative(root, file).replace(/\\/g, '/'), line: i + 1, title });
                }
            });
        }
    }
    return out;
}

function* walkMd(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walkMd(p);
        else if (e.name.endsWith('.md')) yield p;
    }
}

/** 신규 의심 제목 = 기준선에 없는 제목 (발생 위치·횟수 증가는 무시) */
export function diffBaselineTitles(suspects, baselineTitles) {
    const base = new Set(baselineTitles);
    const seen = new Set();
    return suspects.filter(s => !base.has(s.title) && !seen.has(s.title) && seen.add(s.title));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const update = process.argv.includes('--update');
    const suspects = findMetaSuspects(getExamTargets(ROOT), ROOT);
    const titles = [...new Set(suspects.map(s => s.title))].sort();

    if (update) {
        fs.writeFileSync(BASELINE_PATH, JSON.stringify({ titles }, null, 2) + '\n', 'utf-8');
        console.log(`기준선 갱신 — 의심 제목 ${titles.length}건 기록 (${path.basename(BASELINE_PATH)})`);
        process.exit(0);
    }

    const baseline = fs.existsSync(BASELINE_PATH)
        ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'))
        : { titles: [] };
    const fresh = diffBaselineTitles(suspects, baseline.titles || []);

    console.log(`메타 섹션 규약 — 의심 헤딩 ${suspects.length}건 (고유 제목 ${titles.length}건), 기준선 ${(baseline.titles || []).length}건\n`);
    if (!fresh.length) {
        console.log('✅ 신규 메타 의심 제목 없음');
        process.exit(0);
    }
    console.log(`❌ 신규 메타 의심 제목 ${fresh.length}건 — 리더가 본문 카드로 렌더·검색 인덱스에도 포함됩니다:\n`);
    for (const s of fresh) console.log(`   ${s.file}:${s.line}  ${s.title}  [${s.exam}]`);
    console.log('\n조치: 메타 섹션 의도면 src/reader/reader-toc.js의 _STORY_META_PATTERNS에 패턴 추가,');
    console.log('      본문 의도면 --update로 기준선 갱신 후 커밋하세요.');
    process.exit(1);
}
