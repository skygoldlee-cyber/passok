#!/usr/bin/env node
/**
 * check_glossary_signal.js — 용어집 저신호 일반명사 카드 노출 감시 (BP-14 후속)
 *
 * 배경: TS-15 용어 정의 카드는 쿼리가 용어집 키워드와 경계 매치(termHitQuality≥2)되면
 * 결과 최상단에 노출된다. BP-14 --apply가 법령 정의 조문에서 추출한 단일어 일반명사
 * ('관리'·'감사'·'청소'·'건물' 등)는 정의 자체는 정확하지만, 일상어를 검색한
 * 사용자에게 맥락 의존 정의가 THE 정의처럼 노출되는 저신호 위험이 있다.
 *
 * 이 검사는 용어집 JSON의 키워드 중 저신호 위험군(2~4자 순수 한글 단일어 —
 * 공백·괄호·숫자 없이 일상 단일 명사로 읽히는 형태)을 수집해 기준선과 대조한다:
 *   - 기준선에 없는 신규 위험 키워드 → 실패 (정의 품질·노출 적정성 검토 요구)
 *   - 조치: 검토 후 유지면 --update로 기준선 갱신, 부적합이면 glossary 항목 제거
 *     또는 정의문에 맥락 명시 보강
 *
 * 실행: node tools/check/check_glossary_signal.js [--update]
 */

// @spec BP-14
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getExamTargets } = require('../build/exam_targets.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_PATH = path.join(__dirname, '..', 'state', 'glossary_signal_baseline.json');

// 저신호 위험군 — 자동 추출(autoExtracted) 항목 중 2~4자 순수 한글 단일어.
// 큐레이션 항목은 작성 시 사람이 검토했으므로 대상에서 제외하고,
// --apply 파이프라인 유입분만 감시한다 (복합어·약어·영문 병기 제외).
const GENERIC_NOUN_RE = /^[가-힣]{2,4}$/;

/**
 * 각 시험 팩의 glossary/subject{N}.json에서 저신호 위험 키워드를 수집한다.
 * @param {Array<{id:string, contentRoot:string}>} targets
 * @param {string} root - 저장소 루트
 * @returns {Array<{exam:string, file:string, keyword:string, definition:string}>}
 */
export function findGenericGlossaryKeywords(targets, root) {
    const out = [];
    for (const t of targets) {
        const gDir = path.join(root, t.contentRoot, '교재', 'glossary');
        if (!fs.existsSync(gDir)) continue;
        for (const f of fs.readdirSync(gDir).filter(f => /^subject\d+\.json$/u.test(f))) {
            const file = path.join(gDir, f);
            const items = JSON.parse(fs.readFileSync(file, 'utf-8'));
            for (const item of items) {
                const kw = String(item.keyword || '').trim();
                if (!item.autoExtracted || !GENERIC_NOUN_RE.test(kw)) continue;
                out.push({
                    exam: t.id,
                    file: path.relative(root, file).replace(/\\/g, '/'),
                    keyword: kw,
                    definition: String(item.definition || ''),
                });
            }
        }
    }
    return out;
}

/** 신규 위험 키워드 = 기준선에 없는 "exam|keyword" 쌍 */
export function diffBaselineKeywords(entries, baselineKeys) {
    const base = new Set(baselineKeys);
    const seen = new Set();
    return entries.filter(e => {
        const k = `${e.exam}|${e.keyword}`;
        return !base.has(k) && !seen.has(k) && seen.add(k);
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const update = process.argv.includes('--update');
    const entries = findGenericGlossaryKeywords(getExamTargets(ROOT), ROOT);
    const keys = [...new Set(entries.map(e => `${e.exam}|${e.keyword}`))].sort();

    if (update) {
        fs.writeFileSync(BASELINE_PATH, JSON.stringify({ keys }, null, 2) + '\n', 'utf-8');
        console.log(`기준선 갱신 — 저신호 위험 키워드 ${keys.length}건 기록 (${path.basename(BASELINE_PATH)})`);
        process.exit(0);
    }

    const baseline = fs.existsSync(BASELINE_PATH)
        ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'))
        : { keys: [] };
    const fresh = diffBaselineKeywords(entries, baseline.keys || []);

    console.log(`용어집 저신호 감시 — 위험 키워드 ${entries.length}건 (고유 ${keys.length}건), 기준선 ${(baseline.keys || []).length}건\n`);
    if (!fresh.length) {
        console.log('✅ 신규 저신호 용어 키워드 없음');
        process.exit(0);
    }
    console.log(`❌ 신규 저신호 용어 키워드 ${fresh.length}건 — 통합검색 시 정의 카드가 최상단 노출됩니다:\n`);
    for (const e of fresh) {
        console.log(`   ${e.file}  '${e.keyword}' — ${e.definition.slice(0, 60)}…`);
    }
    console.log('\n조치: 정의가 시험 도메인 정의로 정확하면 --update로 기준선 갱신,');
    console.log('      오검출·저품질이면 glossary JSON에서 제거하거나 정의문을 보강하세요.');
    process.exit(1);
}
