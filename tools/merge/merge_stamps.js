#!/usr/bin/env node
/**
 * merge_stamps.js — 배포 스탬프 파일 전용 git 머지 드라이버
 *
 * deploy.js가 배포마다 스탬프하는 기계적 파일들은 양 머신에서 작업할 때
 * 같은 라인에 충돌한다 (CACHE_VERSION·APP_VERSION·릴리스 노트 항목).
 * 내용이 버전 토큰/버전 키 배열뿐이라 자동 병합 규칙을 둘 수 있다:
 *
 *   data/version.js         — APP_VERSION 큰 값 채택 (날짜 내림차)
 *   sw.js                   — 스탬프 라인 외 한쪽만 변경됐으면 그쪽 채택,
 *                             CACHE_VERSION은 양쪽 중 큰 값
 *   package.json            — version 필드 외 한쪽만 변경됐으면 그쪽 채택,
 *                             version은 큰 값 (CalVer 비교)
 *   data/release-notes.json — version 키 합집합 → date·version 내림차 정렬 →
 *                             최근 20건 트림 (stamp_release_notes.js writeNotes 규약)
 *   data/release-notes.js   — 위와 동일 병합 후 writeNotes 출력 형식 재생성
 *
 * 안전 규칙: 스탬프 외 내용이 양쪽에서 모두 바뀌었거나 파싱 실패면
 * 표준 충돌 마커를 써서 수동 해결로 넘긴다 (절대 조용히 한쪽을 버리지 않음).
 *
 * 등록 (clone마다 1회 — hooks:install이 함께 수행):
 *   git config merge.stamps.driver "node tools/merge/merge_stamps.js %O %A %B %P"
 *   .gitattributes가 대상 파일에 merge=stamps를 지정한다.
 *
 * git 호출 시그니처: <driver> %O(베이스) %A(우리측=출력 파일) %B(그들측) [%P(경로)]
 * %P를 지원하지 않는 구버전 git에서는 파일 내용으로 종류를 추정한다.
 */

// @spec none (merge driver 인프라)
'use strict';

const fs = require('fs');

const MAX_ENTRIES = 20; // stamp_release_notes.js와 동일 윈도우

/** 배포 버전 비교 — v<yyyymmdd>-<hash>는 날짜 부분이 정렬 키.
 *  같은 날짜의 해시는 순서를 알 수 없으므로 theirs(리모트)를 우선한다. */
function newerVersion(a, b) {
    if (!a) return b;
    if (!b) return a;
    const da = /^v?(\d{8})/.exec(a);
    const db = /^v?(\d{8})/.exec(b);
    if (da && db && da[1] !== db[1]) return da[1] > db[1] ? a : b;
    return b; // 동일 날짜·파싱 불가 — 리모트 우선
}

/** 릴리스 노트 항목 병합 — version 키 합집합, pending 항목은 최대 1개 (ours 우선) */
function mergeNotes(oursEntries, theirsEntries) {
    const byVersion = new Map();
    const rank = new Map(); // 같은 날짜 내 순서 — 각 파일의 기존 항목 순서 보존
    let pending = null;
    const push = (e, seq) => {
        if (!e || typeof e !== 'object') return;
        if (e.pending === true || !e.version) {
            if (!pending) pending = e;
            return;
        }
        if (!byVersion.has(e.version)) {
            byVersion.set(e.version, e);
            rank.set(e.version, seq);
        }
    };
    // theirs를 먼저 심는다 — 같은 날짜에서는 theirs 파일 순서가 우선.
    // APP_VERSION을 고르는 newerVersion의 same-date theirs 우선 규칙과
    // 맞춰야 check_release_notes의 "최신 노트 == APP_VERSION" 게이트가 정합한다.
    // (버전 해시는 시각 정보가 없어 같은 날짜의 진짜 순서를 알 수 없다)
    for (const e of theirsEntries || []) push(e, rank.size);
    for (const e of oursEntries || []) push(e, rank.size);
    // JSON(진실 소스)은 합집합을 보존한다 — 20건 트림은 표시용 .js 출력에만
    // 적용한다. writeNotes도 같은 규약이라 다음 배포 스탬프가 자연스럽게 정리.
    const stamped = [...byVersion.values()].sort((x, y) => {
        if (x.date !== y.date) return (y.date || '').localeCompare(x.date || '');
        return rank.get(x.version) - rank.get(y.version);
    });
    return pending ? [pending, ...stamped] : stamped;
}

/** "버전 토큰 1개" 파일 병합 — re의 첫 캡처를 자리표시자로 치환해 정규화 후
 *  한쪽만 바뀌었는지 판정. 양쪽 다 스탬프 외 변경이면 null(수동 해결). */
function mergeTokenFile(base, ours, theirs, re, pick) {
    if (ours === theirs) return ours;
    const PH = '\0V\0';
    const norm = (s) => s.replace(re, (m) => m.replace(re.exec(m)[1], PH));
    const ver = (s) => (re.exec(s) || [])[1] || '';
    const winner = pick(ver(ours), ver(theirs)) === ver(ours) ? ours : theirs;
    if (norm(ours) === norm(base)) return winner === ours ? ours : theirs;
    if (norm(theirs) === norm(base)) return winner === theirs ? theirs : ours;
    if (norm(ours) === norm(theirs)) return winner; // 스탬프만 다름
    return null;
}

/** package.json — version 필드만 스탬프로 취급 */
function mergePackageJson(base, ours, theirs) {
    if (ours === theirs) return ours;
    try {
        const b = JSON.parse(base), o = JSON.parse(ours), t = JSON.parse(theirs);
        const sansVer = (o2) => { const c = { ...o2 }; delete c.version; return JSON.stringify(c); };
        const v = newerVersion('v' + (o.version || ''), 'v' + (t.version || '')).slice(1);
        if (sansVer(o) === sansVer(b)) return JSON.stringify({ ...t, version: v }, null, 2) + '\n';
        if (sansVer(t) === sansVer(b)) return JSON.stringify({ ...o, version: v }, null, 2) + '\n';
        if (sansVer(o) === sansVer(t)) return JSON.stringify({ ...o, version: v }, null, 2) + '\n';
    } catch { /* 파싱 실패 → 수동 */ }
    return null;
}

/** release-notes.js — `window.RELEASE_NOTES = [...]` 래퍼 병합 */
function mergeNotesJs(base, ours, theirs) {
    if (ours === theirs) return ours;
    const extract = (s) => {
        const m = /RELEASE_NOTES\s*=\s*(\[[\s\S]*\])\s*;?/.exec(s);
        return m ? JSON.parse(m[1]) : null;
    };
    const o = extract(ours), t = extract(theirs);
    if (!o || !t) return null;
    const merged = mergeNotes(o, t).slice(0, MAX_ENTRIES); // writeNotes 표시 윈도우
    return '// data/release-notes.js — 생성 파일, 직접 편집 금지\n' +
        '// 진실 소스: data/release-notes.json — npm run notes:draft → JSON 편집 → deploy\n' +
        `window.RELEASE_NOTES = ${JSON.stringify(merged)};\n`;
}

function mergeNotesJson(base, ours, theirs) {
    if (ours === theirs) return ours;
    try {
        return JSON.stringify(mergeNotes(JSON.parse(ours), JSON.parse(theirs)), null, 2) + '\n';
    } catch { return null; }
}

const APPVER_RE = /window\.APP_VERSION\s*=\s*'([^']*)'/;
const CACHEVER_RE = /CACHE_VERSION\s*=\s*'([^']*)'/;

/** 파일 종류별 병합 디스패치 — 경로(%P) 우선, 미지원이면 내용으로 추정 */
function mergeStampFile(base, ours, theirs, filePath = '') {
    const name = (filePath || '').split(/[\\/]/).pop();
    if (name === 'release-notes.json') return mergeNotesJson(base, ours, theirs);
    if (name === 'release-notes.js') return mergeNotesJs(base, ours, theirs);
    if (name === 'version.js' || name === 'sw.js') {
        const re = name === 'sw.js' ? CACHEVER_RE : APPVER_RE;
        return mergeTokenFile(base, ours, theirs, re, newerVersion);
    }
    if (name === 'package.json') return mergePackageJson(base, ours, theirs);
    // %P 없는 환경 — 내용으로 추정
    if (/RELEASE_NOTES\s*=/.test(ours)) return mergeNotesJs(base, ours, theirs);
    if (CACHEVER_RE.test(ours)) return mergeTokenFile(base, ours, theirs, CACHEVER_RE, newerVersion);
    if (APPVER_RE.test(ours)) return mergeTokenFile(base, ours, theirs, APPVER_RE, newerVersion);
    if (/^\s*\[\s*\{/.test(ours) && /"version"\s*:\s*"v\d{8}-/.test(ours)) return mergeNotesJson(base, ours, theirs);
    return null;
}

function cliMain() {
    const [oPath, aPath, bPath, filePath] = process.argv.slice(2);
    if (!oPath || !aPath || !bPath) {
        console.error('사용법: merge_stamps.js <base> <ours> <theirs> [path] — git merge driver 전용');
        process.exit(2);
    }
    const base = fs.existsSync(oPath) ? fs.readFileSync(oPath, 'utf8') : '';
    const ours = fs.readFileSync(aPath, 'utf8');
    const theirs = fs.readFileSync(bPath, 'utf8');
    const merged = mergeStampFile(base, ours, theirs, filePath || '');
    if (merged !== null) {
        fs.writeFileSync(aPath, merged);
        process.exit(0);
    }
    // 자동 병합 불가 — 표준 충돌 마커로 남겨 수동 해결 경로를 유지한다
    fs.writeFileSync(aPath,
        `<<<<<<< HEAD\n${ours}${ours.endsWith('\n') ? '' : '\n'}=======\n` +
        `${theirs}${theirs.endsWith('\n') ? '' : '\n'}>>>>>>> merged\n`);
    process.exit(1);
}

module.exports = { mergeStampFile, mergeNotes, mergeTokenFile, mergePackageJson, mergeNotesJs, newerVersion };

if (require.main === module) cliMain();
