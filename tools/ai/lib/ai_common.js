#!/usr/bin/env node
/**
 * ai_common.js — AI 제작 도구 공용 헬퍼
 * @spec AI-01,AI-13
 *
 * - .env 로드 (dotenv 의존 없이 최소 파서)
 * - CLI 인자 파싱 (--exam <id> --subject <key> --limit N --dry-run 등)
 * - tmp/ai_drafts/ 초안 출력 + `<!-- ai-draft -->` 메타 주석 (설계 §4)
 * - 멀티시험 대상 순회 (DA-13 — exam_targets 재사용)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getExamTargets } = require('../../build/exam_targets');
const { loadEnv } = require('../../lib/env');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DRAFT_DIR = path.join(ROOT, 'tmp', 'ai_drafts');
/** 채택률 로그 — 추적 파일(배치 계측의 영속 SSOT). 레코드 스키마는 ai_adoption.js */
const ADOPTION_LOG = path.join(ROOT, 'tools', 'ai', 'adoption_log.jsonl');

/**
 * CLI 인자 파싱 — `--flag` → flags 집합, `--key value`·`--key=value` → opts.
 */
function parseArgs(argv = process.argv.slice(2)) {
    const flags = new Set();
    const opts = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) continue;
        const eq = a.indexOf('=');
        if (eq > 0) {
            opts[a.slice(2, eq)] = a.slice(eq + 1);
        } else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) {
            opts[a.slice(2)] = argv[++i];
        } else {
            flags.add(a.slice(2));
        }
    }
    return { flags, opts };
}

/**
 * 멀티시험 대상 — --exam <id>로 필터, manifest 없는 대상은 제외.
 * @returns {Array<{id,contentRoot,dataRoot,manifest}>}
 */
function getTargets(opts = {}) {
    return getExamTargets(ROOT).filter(t =>
        t.manifest && (!opts.exam || t.id === opts.exam));
}

/** 시험 대상의 manifest 등록 문제은행 파일 목록 → [{target, exam, absPath}] */
function listQbanks(target) {
    return (target.manifest.exams || []).map(exam => ({
        target, exam,
        absPath: path.join(ROOT, target.contentRoot, '문제은행', exam.file),
    })).filter(e => fs.existsSync(e.absPath));
}

/** 초안 출력 경로 (생성 보장) */
function draftPath(name) {
    fs.mkdirSync(DRAFT_DIR, { recursive: true });
    return path.join(DRAFT_DIR, name);
}

/** 초안 본문 해시 — 메타 주석 행을 제외한 본문의 sha1(단축). 리뷰 수정 감지용 (AI-23) */
function draftBodyHash(text) {
    const body = String(text).split(/\r?\n/)
        .filter(l => !l.startsWith('<!-- ai-draft:'))
        .join('\n').trim();
    return crypto.createHash('sha1').update(body).digest('hex').slice(0, 12);
}

/** 초안 메타 주석 파싱 → {model,date,reviewed,sha} (없는 필드는 undefined) */
function parseDraftMeta(text) {
    const m = String(text).match(/<!--\s*ai-draft:\s*(.*?)-->/);
    if (!m) return {};
    return Object.fromEntries(m[1].trim().split(/\s+/).map(kv => kv.split('=')));
}

/** 초안 파일 작성 — 상단에 ai-draft 메타 주석 부착 (설계 §4: reviewed=no 추적, 편입 시 제거).
 * name에 'examId/' 접두를 포함하면 시험별 하위 폴더로 저장한다 (tmp/ai_drafts/<exam>/). */
function writeDraft(name, bodyLines, meta = {}) {
    const sha = draftBodyHash(bodyLines.join('\n'));
    const header = [
        `<!-- ai-draft: model=${meta.model || 'none'} date=${new Date().toISOString()} reviewed=no sha=${sha} -->`,
        '',
    ];
    const out = draftPath(name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, header.concat(bodyLines).join('\n'), 'utf-8');
    return out;
}

/** tmp/ai_drafts 전체 .md 경로 재귀 수집 — 시험별 하위 폴더 포함 (프리픽스 필터용) */
function listDraftFiles() {
    const out = [];
    if (!fs.existsSync(DRAFT_DIR)) return out;
    (function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.md')) out.push(p);
        }
    })(DRAFT_DIR);
    return out;
}

/**
 * 배치 채택 기록 — --write 편입 1건(초안 파일 단위)마다 JSONL append (AI-23, 설계 §3.1 승격 지표)
 * @param {{ts,draft,kind,target,bank,generated,applied,skipped,replace,model,genDate,edited}} rec
 */
function logAdoption(rec) {
    fs.appendFileSync(ADOPTION_LOG, JSON.stringify(rec) + '\n', 'utf-8');
}

module.exports = {
    ROOT, DRAFT_DIR, ADOPTION_LOG,
    loadEnv, parseArgs, getTargets, listQbanks, draftPath, writeDraft,
    draftBodyHash, parseDraftMeta, logAdoption, listDraftFiles,
};
