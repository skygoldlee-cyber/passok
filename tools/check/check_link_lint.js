// tools/check/check_link_lint.js — 렌더 출력 기준 사용자 노출 링크 린트
// @spec RR-13
//
// 콘텐츠 md를 각 표면의 실제 렌더러로 통과시킨 뒤 출력 HTML을 검사하고,
// data/ 생성 번들의 문자열 필드까지 순회해 표시층 누출을 탐지한다.
// 소스 텍스트가 아니라 렌더·번들 결과물을 보기 때문에 포맷터·인터셉터·
// 빌드 정제 회귀까지 잡는다.
//
// 탐지 규칙:
//   LL-01 원시 상대경로 href — 클릭 시 404 + 저장소 경로 노출
//   LL-02 href="&lt;…" 또는 잘린 URL — ](<url>) 파서 절단 잔재
//   LL-03 라벨이 L#### 좌표·*.md/*.pdf 파일명 — 내부 좌표/파일명 노출
//   LL-04 미승인 외부 도메인 — allowlist 밖의 http(s) 링크
//   LL-05 본문 텍스트에 경로/좌표 조각 누출 (<code>/<pre> 본문은 제외)
//   LL-06 본문에 '최종 확인' QA 스탬프 잔존
//   LL-07 스테이징 경로 누출 (ref_md_v2/, _archive/)
//   LL-08 위험 스킴 href (javascript:/data:/vbscript:)
//   LL-09 title/alt/aria-label 속성에 경로·파일명 노출 (호버 툴팁 누출)
//
// 표면별 허용:
//   교재(reader-format): <a>는 data-* 액션 또는 # 또는 허용 외부 링크만
//   문서(exam/manual/html-viewer): .md/.pdf/subj:/#/허용 외부 링크만
//   doc: 링크 — manual-viewer만 인터셉트하므로 docs/ 계열 파일에서만 허용
//
// 사용: node tools/check/check_link_lint.js [--verbose]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const VERBOSE = process.argv.includes('--verbose');

const ALLOWED_HOSTS = new Set([
    'law.go.kr', 'www.law.go.kr', 'law.mfds.go.kr', 'www.mfds.go.kr',
    'mfds.go.kr', 'aistudio.google.com', 'fonts.googleapis.com',
    'fonts.gstatic.com', 'passok.vercel.app',
    // manifest externalLinks에 선언된 큐레이션 외부 자료 (강의 채널·시험 주관기관)
    'www.youtube.com', 'youtube.com', 'license.korcham.net'
]);

// 스캔 대상 — 렌더 표면에 오르는 md만. 스테이징·패치 소스·아카이브 제외.
const SKIP_DIRS = new Set(['_archive', 'ref_md_v2', 'story', 'images', 'fonts']);
// 번들 스캔 제외 — 임베딩 벡터는 문자열 필드가 아닌 수치 데이터
const BUNDLE_SKIP_DIRS = new Set(['embeddings']);

/** dir 안의 .md 파일 재귀 수집 */
function mdFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (!SKIP_DIRS.has(e.name)) out.push(...mdFiles(p));
        } else if (e.name.endsWith('.md')) out.push(p);
    }
    return out;
}

/** dir 안의 번들(.js/.json) 재귀 수집 */
function bundleFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (!BUNDLE_SKIP_DIRS.has(e.name)) out.push(...bundleFiles(p));
        } else if (/\.(js|json)$/.test(e.name)) out.push(p);
    }
    return out;
}

/** 소스 텍스트에서 needle이 처음 나타나는 라인(1-based). 미발견 시 0 */
function findLine(source, needle) {
    if (!source || !needle) return 0;
    const i = source.indexOf(needle);
    return i < 0 ? 0 : source.slice(0, i).split('\n').length;
}

/** 태그 제거 후 본문 텍스트 — <code>/<pre> 블록은 경로 예시 표기 가능으로 제외 */
function textOnly(html) {
    return html
        .replace(/<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
}

/**
 * 앵커 라벨을 표시 라벨로 치환한 텍스트 추출.
 * doc 표면의 .md/.pdf 링크 라벨은 exam-viewer의 _friendlyLinkLabel로
 * 정리된 뒤 표시되므로 동일 정리를 적용해야 좌표 라벨 오탐이 없다.
 */
function visibleText(html, surface, ExamViewer) {
    const normalized = html.replace(
        /<a\s+([^>]*?)>([\s\S]*?)<\/a>/g,
        (m, attrs, label) => {
            const href = (attrs.match(/href="([^"]*)"/) || [])[1] || '';
            const text = label.replace(/<[^>]+>/g, '').trim();
            if (surface !== 'reader' && ExamViewer && /\.(md|pdf)($|[#?])/i.test(href)) {
                return ` ${ExamViewer._friendlyLinkLabel(text, href.split('/').pop() || '')} `;
            }
            return ` ${text} `;
        }
    );
    return textOnly(normalized);
}

/**
 * 렌더 HTML 검사.
 * @param {string} file    진단 표기용 경로
 * @param {string} html    렌더 출력
 * @param {'reader'|'doc'} surface
 * @param {{source?: string, ExamViewer?: object, out?: Array}} opts
 *   source — 원본 md (라인 역추적용), out — 이슈 수집 배열
 */
function lintHtml(file, html, surface, opts = {}) {
    const { source = '', ExamViewer = null, out } = opts;
    const issues = out || [];
    const flag = (rule, detail, needle) => {
        issues.push({ file, rule, detail, line: findLine(source, needle) });
    };
    // docs/ 계열 원본·번들만 doc: 링크 인터셉트 표면(manual-viewer)에 대응
    const docsSurface = /[/\\](docs|docs_md)[/\\]/.test(file);

    for (const m of html.matchAll(/<a\s+([^>]*?)>([\s\S]*?)<\/a>/g)) {
        const attrs = m[1];
        const label = m[2].replace(/<[^>]+>/g, '').trim();
        const href = (attrs.match(/href="([^"]*)"/) || [])[1];
        if (href === undefined) continue;
        const needle = label || href.split('/').pop() || href;

        if (/&lt;|&gt;/.test(href)) flag('LL-02', `절단된 href: ${href.slice(0, 90)}`, needle);
        if (/^\s*(javascript|data|vbscript)\s*:/i.test(href))
            flag('LL-08', `위험 스킴 href: ${href.slice(0, 60)}`, needle);
        if (/ref_md_v2|_archive/.test(href)) flag('LL-07', `스테이징 경로: ${href.slice(0, 90)}`, needle);

        if (/^https?:\/\//.test(href)) {
            try {
                const host = new URL(href).hostname;
                if (!ALLOWED_HOSTS.has(host)) flag('LL-04', `미승인 외부 링크: ${host}`, needle);
            } catch { flag('LL-04', `파싱 불가 외부 링크: ${href.slice(0, 80)}`, needle); }
            continue;
        }

        if (surface === 'reader') {
            // 리더 출력: data-* 액션 또는 순수 '#' 또는 허용 외부만 남아야 함
            const isAction = href === '#'
                || /data-ref-|data-exam-md|data-toc-jump|data-glossary|data-search-goto/.test(attrs);
            if (!isAction) flag('LL-01', `원시 href: ${href.slice(0, 90)} (label: ${label.slice(0, 40)})`, needle);
        } else {
            // 문서 표면: .md/.pdf/subj:/#/doc:(docs 계열 한정) → 뷰어가 인터셉트
            const ok = /^#/.test(href)
                || /^subj:/.test(href)
                || (/^doc:/.test(href) && docsSurface)
                || /\.(md|pdf|html?)($|[#?])/i.test(href);
            if (!ok) flag('LL-01', `미처리 href: ${href.slice(0, 90)} (label: ${label.slice(0, 40)})`, needle);
        }

        // LL-03 라벨 — .md/.pdf 링크는 표시 라벨 정리 후 평가
        let effLabel = label;
        if (surface !== 'reader' && ExamViewer && /\.(md|pdf)($|[#?])/i.test(href)) {
            effLabel = ExamViewer._friendlyLinkLabel(label, href.split('/').pop() || '');
        }
        if (/^L\d+$/.test(effLabel) || /:\s*L\d+/.test(effLabel))
            flag('LL-03', `좌표 라벨: "${effLabel.slice(0, 50)}"`, needle);
        else if (/\.(md|pdf)$/i.test(effLabel))
            flag('LL-03', `파일명 라벨: "${effLabel.slice(0, 50)}"`, needle);
    }

    // LL-09 속성 노출 — title/alt/aria-label에 경로·파일명이 남으면 호버 툴팁으로 표시됨
    for (const m of html.matchAll(/(?:title|alt|aria-label)="([^"]*)"/g)) {
        const v = m[1];
        const attrLeaks = [
            [/\.\.\//, '상대경로'],
            [/ref_md_v2|_archive/, '스테이징 경로'],
            [/content\/exams\//, '저장소 경로'],
            [/ref_md\//, 'ref_md/ 경로'],
            [/참조자료\/[^\s]+\.(md|pdf)/, '참조자료 파일 경로'],
            [/교재\/[a-z]+\/|문제은행\/[^\s]+\.md/, '내부 디렉토리 경로'],
            [/[^\s/]+\.(md|pdf)\b/, '파일명(.md/.pdf)'],
        ];
        for (const [re, msg] of attrLeaks) {
            if (re.test(v)) { flag('LL-09', `${msg} 속성 노출: "${v.slice(0, 80)}"`, v); break; }
        }
    }

    // LL-05 본문 텍스트 누출 — 앵커 라벨 정규화 + 코드블록 제외 후 검사
    const text = visibleText(html, surface, ExamViewer);
    const textLeaks = [
        [/\.\.\//, '상대경로 ../ 누출'],
        [/ref_md\//, 'ref_md/ 경로 누출'],
        [/\.md#L\d+/, '.md#L 좌표 누출'],
        [/content\/exams\//, 'content/exams/ 경로 누출'],
        [/참조자료\/[^\s]+\.(md|pdf)/, '참조자료 파일 경로 누출'],
        [/문제은행\/[^\s]+\.md/, '문제은행 파일 경로 누출'],
        [/교재\/[a-z]+\//, '교재 디렉토리 경로 누출'],
        [/[가-힣A-Za-z·]+\s*:\s*L\d{3,}\b/, '좌표 라벨 텍스트 누출 (예: 교재: L237)'],
    ];
    for (const [re, msg] of textLeaks) {
        const mm = text.match(re);
        if (mm) {
            const i = mm.index;
            flag('LL-05', `${msg}: "…${text.slice(Math.max(0, i - 30), i + 60).trim()}…"`, mm[0]);
        }
    }

    // LL-06 QA 스탬프 — 소스에 남는 유지보수 기록이 표시층까지 새면 안 됨
    if (/최종 확인\s*[:：]/.test(text)) flag('LL-06', '최종 확인 스탬프 렌더 잔존', '최종 확인');

    return issues;
}

/**
 * 번들 문자열 값 검사 — 평문 필드(citation·explain 등)에 남는 사용자 노출 잔재.
 * md 링크 문법이 포함된 문자열은 표면별 렌더 경로(lintHtml)로 위임한다.
 * @param {string} file @param {string} value
 * @param {{ExamViewer?: object, surface?: string, renderer?: function, out?: Array}} opts
 *   surface/renderer — 번들의 소비 표면 (study_md→reader, 그 외→doc)
 */
function lintBundleValue(file, value, opts = {}) {
    const { surface = 'doc', renderer = null, out } = opts;
    const issues = out || [];
    const flag = (rule, detail) => issues.push({ file, rule, detail, line: 0 });

    if (/\]\(|!\[|\n#{1,6}\s/.test(value)) {
        // md 본문 — 해당 번들의 실제 소비 렌더러와 동일 경로로 검사
        lintHtml(file, renderer ? renderer(value) : '', surface, opts);
        return;
    }
    const plainLeaks = [
        [/[가-힣A-Za-z·]+\s*:\s*L\d{3,}\b/, '좌표 라벨 텍스트'],
        [/최종 확인\s*[:：]/, '최종 확인 스탬프'],
        [/ref_md_v2|_archive/, '스테이징 경로'],
    ];
    for (const [re, msg] of plainLeaks) {
        const mm = value.match(re);
        if (mm) flag(ruleOf(re), `${msg}: "…${value.slice(Math.max(0, mm.index - 30), mm.index + 60).trim()}…"`);
    }
    for (const m of value.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
        if (!ALLOWED_HOSTS.has(m[1])) flag('LL-04', `미승인 외부 링크: ${m[1]}`);
    }
}

function ruleOf(re) {
    if (/최종 확인/.test(re.source)) return 'LL-06';
    if (/ref_md_v2|_archive/.test(re.source)) return 'LL-07';
    return 'LL-05';
}

/** 객체 트리의 모든 문자열 값 순회 */
function walkStrings(v, cb) {
    if (typeof v === 'string') return cb(v);
    if (Array.isArray(v)) return v.forEach(x => walkStrings(x, cb));
    if (v && typeof v === 'object') Object.values(v).forEach(x => walkStrings(x, cb));
}

/** 번들 .js를 샌드박스 평가해 노출 객체 수집 (var 전역·window.__X__·module.exports) */
function evalBundle(file) {
    const code = fs.readFileSync(file, 'utf-8');
    const sandbox = { window: {}, module: { exports: {} }, exports: {} };
    sandbox.exports = sandbox.module.exports;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { timeout: 10000 });
    const values = [];
    for (const [k, v] of Object.entries(sandbox)) {
        if (k !== 'window' && k !== 'module' && k !== 'exports' && k !== 'globalThis') values.push(v);
    }
    for (const v of Object.values(sandbox.window)) values.push(v);
    if (sandbox.module.exports && Object.keys(sandbox.module.exports).length) values.push(sandbox.module.exports);
    return values;
}

async function main() {
    const base = pathToFileURL(path.join(ROOT, 'src', 'reader')).href + '/';
    const { ExamViewer } = await import(base + 'exam-viewer.js');
    const { formatSectionContentForReader } = await import(base + 'reader-format.js');

    const issues = [];
    let docs = 0, bundles = 0;

    for (const target of getExamTargets(ROOT)) {
        const contentDir = path.join(ROOT, target.contentRoot);
        for (const f of mdFiles(contentDir)) {
            docs++;
            const rel = path.relative(ROOT, f).replace(/\\/g, '/');
            const md = fs.readFileSync(f, 'utf-8');
            const isTextbook = /[/\\]교재[/\\]/.test(f) && !f.includes(`${path.sep}story${path.sep}`);
            try {
                if (isTextbook) {
                    lintHtml(rel, formatSectionContentForReader(md, rel), 'reader', { source: md, ExamViewer, out: issues });
                } else {
                    lintHtml(rel, ExamViewer._mdToHtml(md, rel), 'doc', { source: md, ExamViewer, out: issues });
                }
            } catch (e) {
                issues.push({ file: rel, rule: 'ERROR', detail: `렌더 실패: ${e.message}`, line: 0 });
            }
        }

        // 생성 번들 — 표시 문자열 필드의 잔여 노출 탐지
        const dataDir = path.join(ROOT, target.dataRoot);
        for (const f of bundleFiles(dataDir)) {
            bundles++;
            const rel = path.relative(ROOT, f).replace(/\\/g, '/');
            try {
                let values;
                if (f.endsWith('.json')) {
                    values = [JSON.parse(fs.readFileSync(f, 'utf-8'))];
                } else {
                    values = evalBundle(f);
                }
                // 번들의 실제 소비 표면에 맞춰 렌더러 선택 — study_md는 리더 표면
                const isStudy = /[/\\]study_md[/\\]/.test(rel);
                const bundleOpts = {
                    ExamViewer, out: issues,
                    surface: isStudy ? 'reader' : 'doc',
                    renderer: isStudy
                        ? (m) => formatSectionContentForReader(m, rel)
                        : (m) => ExamViewer._mdToHtml(m, rel),
                };
                for (const v of values) {
                    walkStrings(v, s => lintBundleValue(rel, s, bundleOpts));
                }
            } catch (e) {
                issues.push({ file: rel, rule: 'ERROR', detail: `번들 평가 실패: ${e.message}`, line: 0 });
            }
        }
    }

    if (issues.length === 0) {
        console.log(`✅ 링크 린트 통과 — 문서 ${docs}개 · 번들 ${bundles}개, 노출 링크 위반 0건`);
        return;
    }
    console.log(`❌ 링크 린트 위반 ${issues.length}건 (문서 ${docs}개 · 번들 ${bundles}개 검사)`);
    const byRule = {};
    for (const i of issues) (byRule[i.rule] = byRule[i.rule] || []).push(i);
    for (const [rule, list] of Object.entries(byRule)) {
        console.log(`\n[${rule}] ${list.length}건`);
        const shown = VERBOSE ? list : list.slice(0, 15);
        shown.forEach(i => console.log(`  - ${i.file}${i.line ? `:${i.line}` : ''}: ${i.detail}`));
        if (list.length > shown.length) console.log(`  … ${list.length - shown.length}건 더 (--verbose)`);
    }
    process.exit(1);
}

module.exports = { lintHtml, lintBundleValue, visibleText, textOnly, findLine, ALLOWED_HOSTS };

if (require.main === module) {
    main().catch(e => { console.error('링크 린트 실행 실패:', e); process.exit(1); });
}
