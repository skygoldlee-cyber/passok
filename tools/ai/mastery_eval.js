#!/usr/bin/env node
/**
 * mastery_eval.js — PassLoop 개념 숙련도 오프라인 실측 (AI-40 단계 1)
 * @spec AI-40
 *
 * 사용법:
 *   node tools/ai/mastery_eval.js --stats <백업JSON> [--exam <id>]
 *
 * - 입력: 앱 백업 JSON의 statement_stats·quiz_results·fc_review_log
 *   (scoped 키 `…:<key>` 패턴 자동 해석 — ai_seed_eval과 동일 규약)
 * - 개념 해석: {dataRoot}/question_chapters.js의 CID_SECTION·
 *   CHAPTER_RANGES·QUESTION_CHAPTERS·CHAPTER_TITLES (빌드 번들 — 없으면
 *   `npm run build:data` 후 재실행)
 * - 출력: 등급 분포·커버리지 통계·최하 숙련 개념(nextActions) 리포트 —
 *   산출식 계수(사전·반감·등급 임계)의 수험 유효성 판단 근거 (DOC-DSN-56 §5 단계 1)
 * - 한계: 카드 리뷰는 카드→§앵커 해석 포트(itemCid)가 런타임 전용이라
 *   본 도구에서는 미반영 — 진술·퀴즈 신호만으로 분포를 산출한다.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { parseArgs, getTargets } = require('./lib/ai_common.js');
const {
    collectConceptStats,
    computeConceptTotals,
    computeMastery,
    nextActions,
} = require('../../src/passloop/index.js');

const DAY_MS = 24 * 60 * 60 * 1000;

/** 백업 JSON에서 scoped 키(`<scope>:<key>`)로 항목 로드 */
function loadKey(raw, name) {
    const key = Object.keys(raw).find(k => new RegExp(`(^|:)${name}$`).test(k));
    let v = key ? raw[key] : null;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
    return v && typeof v === 'object' ? v : null;
}

/** question_chapters.js 번들 로드 — var 전역을 window 시임으로 평가 */
function loadChapterBundle(target) {
    const p = path.join(target.dataRoot, 'question_chapters.js');
    if (!fs.existsSync(p)) return null;
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
    return sandbox.window;
}

/** CHAPTER_RANGES[subj] → {단원명: 'N.M'} 맵 (과목별 — 제목이 과목 간 충돌하므로
 *  과목 스코프로 만든다). "Chapter NN." 경계로 장 번호를 추적하고 "M. 제목"
 *  항목을 `${NN}.${M}`으로, "Chapter NN." 제목 자체는 `${N}.0`으로 환산 */
function buildTitleAnchor(ranges) {
    const out = {}; // subj → {title: 'N.M'}
    for (const [subj, list] of Object.entries(ranges || {})) {
        const m = out[subj] = {};
        let chap = null;
        for (const [, title] of list || []) {
            const cm = /^Chapter\s+(\d+)\./.exec(title || '');
            if (cm) { chap = parseInt(cm[1], 10); m[title] = `${chap}.0`; continue; }
            const sm = /^(\d+)\./.exec(title || '');
            if (chap && sm && !(title in m)) m[title] = `${chap}.${parseInt(sm[1], 10)}`;
        }
    }
    return out;
}

/** qid·sid 등 신호 항목 id → 과목 키.
 *  문제은행 qid는 `${exam.key}_qN` — manifest exams의 key→subject로 해석.
 *  sid·카드 id는 `${subj}_st_`/`${subj}_card_` 패턴 (CID_SECTION 키와 대조). */
function makeSubjOf(target, cidSection) {
    const examSubj = {};  // exam.key → subject
    for (const ex of (target.manifest && target.manifest.exams) || []) {
        if (ex && ex.key && ex.subject) examSubj[ex.key] = ex.subject;
    }
    const subjKeys = new Set(Object.keys(cidSection || {}));
    return (ctxId) => {
        let id = String(ctxId || '');
        if (id.startsWith('weak_quiz_')) id = id.slice('weak_quiz_'.length);
        const em = /^(.+?)_q\d+$/.exec(id);
        if (em && examSubj[em[1]]) return examSubj[em[1]];
        const prefix = String(id).split('_')[0];
        return subjKeys.has(prefix) ? prefix : null;
    };
}

/** conceptId → `subj:§N.M` 정규화 — §앵커는 과목별 충돌하므로 과목을 키에 포함.
 *  ctxId의 과목을 우선 쓰고, L####는 해당 과목 CID_SECTION 우선·전체 탐색 폴백 */
function makeNormalizeCid(cidSection, subjOf) {
    return (cid, ctxId) => {
        const s = String(cid || '').trim();
        if (!s) return null;
        if (/^[^\s]+:§\d/.test(s)) return s;                       // 이미 과목한정
        const subj = subjOf(ctxId);
        const m = /^L(\d+)$/i.exec(s);
        if (m) {
            const sub = (subj && cidSection[subj]) || null;
            if (sub && sub[m[1]]) return `${subj}:§${sub[m[1]]}`;
            for (const [k, map] of Object.entries(cidSection || {})) {
                if (map && map[m[1]]) return `${k}:§${map[m[1]]}`;
            }
            return null;
        }
        if (/^§?\d+(\.\d+)?$/.test(s)) {
            return subj ? `${subj}:§${s.replace(/^§/, '')}` : null;
        }
        return null;
    };
}

function main() {
    const { opts } = parseArgs();
    if (!opts.stats) {
        console.error('사용법: node tools/ai/mastery_eval.js --stats <백업JSON> [--exam <id>]');
        process.exit(2);
    }
    const raw = JSON.parse(fs.readFileSync(opts.stats, 'utf8'));
    const statementStats = loadKey(raw, 'statement_stats') || {};
    const quizResults = loadKey(raw, 'quiz_results') || {};
    const reviewLog = loadKey(raw, 'fc_review_log');
    const target = (getTargets(opts) || [])[0];
    if (!target) { console.error('--exam 대상을 찾지 못했습니다.'); process.exit(2); }

    const bundle = loadChapterBundle(target);
    if (!bundle || !bundle.CID_SECTION) {
        console.error(`${target.dataRoot}/question_chapters.js 부재 — npm run build:data 후 재실행`);
        process.exit(2);
    }
    const titleAnchor = buildTitleAnchor(bundle.CHAPTER_RANGES);
    const subjOf = makeSubjOf(target, bundle.CID_SECTION);
    const normalizeCid = makeNormalizeCid(bundle.CID_SECTION, subjOf);

    // 문항 → `subj:§앵커`: QUESTION_CHAPTERS 단원명 → 해당 과목 CHAPTER_RANGES 환산
    const quizById = {};
    for (const [qid, title] of Object.entries(bundle.QUESTION_CHAPTERS || {})) {
        const subj = subjOf(qid);
        const anchor = subj && titleAnchor[subj] && titleAnchor[subj][title];
        if (anchor) quizById[qid] = { id: qid, conceptId: `${subj}:§${anchor}` };
    }

    const idx = {
        normalizeCid,
        questionCids: (q) => q && q.conceptId ? [q.conceptId] : [],
        conceptTitle: (cid) => {
            const m = /^([^\s]+):§(\d+)\./.exec(String(cid));
            if (!m) return cid;
            const subj = (bundle.CHAPTER_TITLES || {})[m[1]] || {};
            return subj[m[2]] ? `${subj[m[2]]} · §${String(cid).split(':§')[1]}` : cid;
        },
    };

    const stats = collectConceptStats(
        { statementStats, quizResults, quizById, reviewLog: Array.isArray(reviewLog) ? reviewLog : [] },
        idx);
    const totals = computeConceptTotals({ quizzes: Object.values(quizById) }, idx);
    const mastery = computeMastery(stats, { conceptTotals: totals, idx });
    const acts = nextActions(mastery);

    // ── 리포트 ────────────────────────────────────────────────
    const entries = Object.values(mastery);
    const hist = {};
    for (const m of entries) hist[m.grade] = (hist[m.grade] || 0) + 1;
    const evidenced = entries.filter(m => m.n > 0);
    const avgCov = evidenced.length
        ? evidenced.reduce((s, m) => s + m.cov, 0) / evidenced.length : 0;

    console.log(`개념 ${entries.length}개 (신호 귀속 ${evidenced.length}, 콘텐츠만 ${entries.length - evidenced.length})`);
    console.log(`  진술 통계 ${Object.keys(statementStats).length}건 · 퀴즈 결과 ${Object.keys(quizResults).length}건 · 리뷰 로그 ${(reviewLog || []).length}건`);
    console.log(`등급 분포: ${Object.entries(hist).map(([g, n]) => `${g} ${n}`).join(' · ') || '—'}`);
    console.log(`평균 커버리지(신호 개념): ${(avgCov * 100).toFixed(0)}%`);
    const scores = evidenced.map(m => m.score).sort((a, b) => a - b);
    if (scores.length) {
        console.log(`점수 분포: 최소 ${scores[0]} · 중앙 ${scores[Math.floor(scores.length / 2)]} · 최대 ${scores[scores.length - 1]}`);
    }
    if (acts.length) {
        console.log('다음 학습 추천 (최하 숙련):');
        for (const a of acts) {
            console.log(`  ${a.cid} — 점수 ${a.score} · ${a.grade} · 커버리지 ${(a.cov * 100).toFixed(0)}% · ${a.title || ''}`);
        }
    } else {
        console.log('다음 학습 추천 없음 — 도입~진행·커버리지≥30% 개념 부재 (또는 신호 부족)');
    }
    const days = Math.round((Date.now() - Math.max(0, ...evidenced.map(m => m.lastTs))) / DAY_MS);
    console.log(`마지막 학습 신호: ${evidenced.length ? `${days}일 전` : '없음'}`);
}

main();
