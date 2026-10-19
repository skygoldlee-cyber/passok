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
const { getExamTargets } = require('../../build/exam_targets');
const { loadEnv } = require('../../lib/env');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DRAFT_DIR = path.join(ROOT, 'tmp', 'ai_drafts');

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

/** 초안 파일 작성 — 상단에 ai-draft 메타 주석 부착 (설계 §4: reviewed=no 추적, 편입 시 제거) */
function writeDraft(name, bodyLines, meta = {}) {
    const header = [
        `<!-- ai-draft: model=${meta.model || 'none'} date=${new Date().toISOString()} reviewed=no -->`,
        '',
    ];
    const out = draftPath(name);
    fs.writeFileSync(out, header.concat(bodyLines).join('\n'), 'utf-8');
    return out;
}

module.exports = {
    ROOT, DRAFT_DIR,
    loadEnv, parseArgs, getTargets, listQbanks, draftPath, writeDraft,
};
