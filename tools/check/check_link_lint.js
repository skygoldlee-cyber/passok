// tools/check/check_link_lint.js — 렌더 출력 기준 사용자 노출 링크 린트
// @spec RR-13
//
// 콘텐츠 md를 각 표면의 실제 렌더러로 통과시킨 뒤 출력 HTML을 검사한다.
// 소스 텍스트가 아니라 렌더 결과를 보기 때문에 포맷터·인터셉터 회귀까지 잡는다.
//
// 탐지 규칙:
//   LL-01 원시 상대경로 href — 클릭 시 404 + 저장소 경로 노출
//   LL-02 href="&lt;…" 또는 잘린 URL — ]() 파서 절단 잔재
//   LL-03 라벨이 L#### 좌표·*.md/*.pdf 파일명 — 내부 좌표/파일명 노출
//   LL-04 미승인 외부 도메인 — allowlist 밖의 http(s) 링크
//   LL-05 본문 텍스트에 경로 조각 누출 (../, ref_md/, .md#L 등)
//   LL-06 본문에 '최종 확인' QA 스탬프 잔존 (교재 표면만)
//   LL-07 스테이징 경로 누출 (ref_md_v2/, _archive/)
//
// 표면별 허용:
//   교재(reader-format): <a>는 data-* 액션 또는 # 또는 허용 외부 링크만
//   문서(exam/manual/html-viewer): .md/.pdf/subj:/doc:/#/허용 외부 링크만
//
// 사용: node tools/check/check_link_lint.js [--verbose]
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { getExamTargets } = require('../build/exam_targets.js');

const ROOT = path.resolve(__dirname, '..', '..');
const VERBOSE = process.argv.includes('--verbose');

const ALLOWED_HOSTS = new Set([
    'law.go.kr', 'www.law.go.kr', 'law.mfds.go.kr', 'www.mfds.go.kr',
    'mfds.go.kr', 'aistudio.google.com', 'fonts.googleapis.com',
    'fonts.gstatic.com', 'passory.vercel.app'
]);

// 스캔 대상 — 렌더 표면에 오르는 md만. 스테이징·패치 소스·아카이브 제외.
const SKIP_DIRS = new Set(['_archive', 'ref_md_v2', 'story', 'images', 'fonts']);

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

/** HTML에서 태그 제거 후 본문 텍스트 */
function textOnly(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

const issues = [];
function flag(file, rule, detail) {
    issues.push({ file, rule, detail });
}

function lintHtml(file, html, surface) {
    // <a href="...">label</a> 전수 검사
    for (const m of html.matchAll(/<a\s+([^>]*?)>([\s\S]*?)<\/a>/g)) {
        const attrs = m[1];
        const label = m[2].replace(/<[^>]+>/g, '').trim();
        const hrefM = attrs.match(/href="([^"]*)"/);
        if (!hrefM) continue;
        const href = hrefM[1];

        // LL-02 파서 절단 잔재
        if (/&lt;|&gt;/.test(href)) flag(file, 'LL-02', `절단된 href: ${href.slice(0, 90)}`);

        // LL-07 스테이징 경로
        if (/ref_md_v2|_archive/.test(href)) flag(file, 'LL-07', `스테이징 경로: ${href.slice(0, 90)}`);

        // LL-04 외부 링크 allowlist
        if (/^https?:\/\//.test(href)) {
            try {
                const host = new URL(href).hostname;
                if (!ALLOWED_HOSTS.has(host)) flag(file, 'LL-04', `미승인 외부 링크: ${host}`);
            } catch { flag(file, 'LL-04', `파싱 불가 외부 링크: ${href.slice(0, 80)}`); }
            continue;
        }

        // 표면별 허용 여부
        if (surface === 'reader') {
            // 리더 출력: data-* 액션 또는 순수 '#' 또는 허용 외부만 남아야 함
            if (href === '#' || /data-ref-|data-exam-md|data-toc-jump|data-glossary/.test(attrs)) {
                // OK
            } else if (/^\.\.|^[^a-z#]|\.(md|pdf|html)($|[#?])/i.test(href)) {
                flag(file, 'LL-01', `원시 경로 href: ${href.slice(0, 90)} (label: ${label.slice(0, 40)})`);
            }
        } else {
            // 문서 표면: .md/.pdf/subj:/doc:/# → 뷰어가 인터셉트
            const ok = href === '#'
                || /^#/.test(href)
                || /^(subj|doc):/.test(href)
                || /\.(md|pdf|html?)($|[#?])/i.test(href);
            if (!ok) flag(file, 'LL-01', `미처리 href: ${href.slice(0, 90)} (label: ${label.slice(0, 40)})`);
        }

        // LL-03 라벨 — .md/.pdf 링크는 friendly 라벨 정리 후 평가
        let effLabel = label;
        if (/\.(md|pdf)($|[#?])/i.test(href) && ExamViewerRef && surface !== 'reader') {
            effLabel = ExamViewerRef._friendlyLinkLabel(label, href.split('/').pop() || '');
        }
        if (/^L\d+$/.test(effLabel) || /:\s*L\d+/.test(effLabel))
            flag(file, 'LL-03', `좌표 라벨: "${effLabel.slice(0, 50)}"`);
        else if (/\.(md|pdf)$/i.test(effLabel))
            flag(file, 'LL-03', `파일명 라벨: "${effLabel.slice(0, 50)}"`);
    }

    // LL-05 본문 텍스트 경로 누출 — 태그 제거 후 경로 조각이 남아있으면 절단 파손
    const text = textOnly(html);
    const textLeaks = [
        [/\.\.\//, '상대경로 ../ 누출'],
        [/ref_md\//, 'ref_md/ 경로 누출'],
        [/\.md#L\d+/, '.md#L 좌표 누출'],
        [/content\/exams\//, 'content/exams/ 경로 누출'],
        [/참조자료\/[^\s]+\.(md|pdf)/, '참조자료 파일 경로 누출'],
        [/교재\/[a-z]+\//, '교재 디렉토리 경로 누출'],
    ];
    for (const [re, msg] of textLeaks) {
        const mm = text.match(re);
        if (mm) {
            const i = mm.index;
            flag(file, 'LL-05', `${msg}: "…${text.slice(Math.max(0, i - 30), i + 60).trim()}…"`);
        }
    }

    // LL-06 QA 스탬프 (교재 표면만 — reader-format이 제거해야 함)
    if (surface === 'reader' && /최종 확인\s*[:：]/.test(text))
        flag(file, 'LL-06', '최종 확인 스탬프 렌더 잔존');
}

let ExamViewerRef = null;

async function main() {
    const base = pathToFileURL(path.join(ROOT, 'src')).href + '/';
    const { ExamViewer } = await import(base + 'exam-viewer.js');
    const { formatSectionContentForReader } = await import(base + 'reader-format.js');
    ExamViewerRef = ExamViewer;

    let files = 0;
    for (const target of getExamTargets(ROOT)) {
        const contentDir = path.join(ROOT, target.contentRoot);
        for (const f of mdFiles(contentDir)) {
            files++;
            const rel = path.relative(ROOT, f).replace(/\\/g, '/');
            const md = fs.readFileSync(f, 'utf-8');
            const isTextbook = /[/\\]교재[/\\]/.test(f) && !f.includes(`${path.sep}story${path.sep}`);
            try {
                if (isTextbook) {
                    lintHtml(rel, formatSectionContentForReader(md, rel.replace(/^content\//, '')), 'reader');
                } else {
                    lintHtml(rel, ExamViewer._mdToHtml(md, rel.replace(/^content\//, '')), 'doc');
                }
            } catch (e) {
                flag(rel, 'ERROR', `렌더 실패: ${e.message}`);
            }
        }
    }

    if (issues.length === 0) {
        console.log(`✅ 링크 린트 통과 — ${files}개 문서, 노출 링크 위반 0건`);
        return;
    }
    console.log(`❌ 링크 린트 위반 ${issues.length}건 (${files}개 문서 검사)`);
    const byRule = {};
    for (const i of issues) (byRule[i.rule] = byRule[i.rule] || []).push(i);
    for (const [rule, list] of Object.entries(byRule)) {
        console.log(`\n[${rule}] ${list.length}건`);
        const shown = VERBOSE ? list : list.slice(0, 15);
        shown.forEach(i => console.log(`  - ${i.file}: ${i.detail}`));
        if (list.length > shown.length) console.log(`  … ${list.length - shown.length}건 더 (--verbose)`);
    }
    process.exit(1);
}

main().catch(e => { console.error('링크 린트 실행 실패:', e); process.exit(1); });
