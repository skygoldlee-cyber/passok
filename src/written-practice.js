// src/written-practice.js — 주관식(서술·계산형) 연습 자기채점 뷰어
// @spec WP-01~06
// ============================================================
// manifest.written[] → registry.written → 시험 뷰 카드 → 이 오버레이.
// 문항 포맷(docs/2차_주관식_설계.md §3): 문제은행/*.md의 `### Sn.` 블록
//   - **유형**: X · **배점**: N점 · **근거**: Z
//   **문제**: … / **모범답안**: … / **답**: … / **채점기준**: (- [ ] 항목 (N점))
//   **흔한 오류**: … / ⚖️ [라벨](<ref경로#LNN>)
// 자기채점: 답안 서술 → 모범답안·rubric 대조 → 항목 체크 → 자기평가 완료.
// 진행은 STORAGE_KEYS.WRITTEN_PRACTICE(시험 스코프)에 문항 id(S번호) 기준 저장.
// ============================================================
import { escapeHTML } from './sanitize.js';
import { parseMarkdown } from './markdown-parser.js';
import { dataPath } from './exam-context.js';
import { getJSON, setJSON } from './storage.js';
import { STORAGE_KEYS } from './storage-keys.js';
import { fetchMd, injectBundleScript, createDocOverlay } from './doc-overlay.js';

/* =========================================================
   마크다운 ### Sn. 블록 파서 (순수 함수 — 단위 테스트 대상)
   ========================================================= */

/**
 * @typedef {Object} WrittenRef
 * @property {string}      label 인용 라벨 (⚖️ [라벨](...))
 * @property {string}      path  ref_md 상대 경로 (#LNN 앵커 제외)
 * @property {number|null} line  #LNN 라인 번호 (없으면 null)
 */
/**
 * @typedef {Object} WrittenRubricItem
 * @property {string} text   채점 항목
 * @property {number} points 항목 배점 (미표기 시 0)
 */
/**
 * @typedef {Object} WrittenQuestion
 * @property {string}              id          문항 id ('S'+번호)
 * @property {number}              num         문항 번호
 * @property {string}              title       제목
 * @property {string}              type        유형 (단답형·판정형·서술형·계산형·사례형)
 * @property {number|null}         points      배점
 * @property {string}              basis       근거 라벨
 * @property {string}              problem     문제 본문 (마크다운)
 * @property {string}              modelAnswer 모범답안 (마크다운)
 * @property {string}              finalAnswer 최종 답 ('**답**:' 한 줄)
 * @property {WrittenRubricItem[]} rubricItems rubric 체크리스트 항목 (- [ ] 형식)
 * @property {string}              rubricText  인라인 채점기준 (체크리스트 없을 때)
 * @property {string}              commonErrors 흔한 오류
 * @property {WrittenRef[]}        refs        ⚖️ 인용 링크
 */
/**
 * @typedef {Object} WrittenSection
 * @property {string}            title     ## 섹션 제목
 * @property {WrittenQuestion[]} questions
 */
/**
 * @typedef {Object} WrittenBank
 * @property {string}            title
 * @property {WrittenSection[]}  sections
 * @property {WrittenQuestion[]} questions 전체 문항 (평면)
 */

/** @param {WrittenQuestion} q @param {string} seg */
function _metaFromMetaLine(q, seg) {
    const s = seg.trim();
    const pm = s.match(/\*\*배점\*\*\s*[:：]?\s*([\d.]+)\s*점?/);
    if (pm) { q.points = parseFloat(pm[1]); return; }
    const bm = s.match(/\*\*근거\*\*\s*[:：]?\s*(.+)$/);
    if (bm) { q.basis = bm[1].trim(); return; }
    if (!s.includes('**') && s) q.type = s;
}

/** @param {number} num @param {string} title @param {string[]} block @returns {WrittenQuestion} */
function _parseBlock(num, title, block) {
    /** @type {WrittenQuestion} */
    const q = {
        id: 'S' + num, num, title, type: '', points: null, basis: '',
        problem: '', modelAnswer: '', finalAnswer: '',
        rubricItems: [], rubricText: '', commonErrors: '', refs: []
    };
    /** @type {{problem:string[], model:string[], rubric:string[], errors:string[]}} */
    const buf = { problem: [], model: [], rubric: [], errors: [] };
    let field = null;
    for (const line of block) {
        if (/^\s*-\s*\*\*유형\*\*/.test(line)) {
            const rest = line.replace(/^\s*-\s*\*\*유형\*\*\s*[:：]?\s*/, '');
            rest.split('·').forEach(seg => _metaFromMetaLine(q, seg));
            field = null; continue;
        }
        if (/^\*\*문제\*\*\s*[:：]?/.test(line)) {
            field = 'problem';
            buf.problem.push(line.replace(/^\*\*문제\*\*\s*[:：]?\s*/, ''));
            continue;
        }
        if (/^\*\*모범답안( 요지)?\*\*\s*[:：]?/.test(line)) {
            field = 'model';
            buf.model.push(line.replace(/^\*\*모범답안( 요지)?\*\*\s*[:：]?\s*/, ''));
            continue;
        }
        if (/^\*\*답\*\*\s*[:：]/.test(line)) {
            field = 'answer';
            q.finalAnswer = line.replace(/^\*\*답\*\*\s*[:：]\s*/, '').trim();
            continue;
        }
        if (/^\*\*채점기준\*\*\s*[:：]?/.test(line)) {
            field = 'rubric';
            const rest = line.replace(/^\*\*채점기준\*\*\s*[:：]?\s*/, '');
            if (rest.trim()) buf.rubric.push(rest);
            continue;
        }
        if (/^\*\*흔한 오류\*\*\s*[:：]?/.test(line)) {
            field = 'errors';
            buf.errors.push(line.replace(/^\*\*흔한 오류\*\*\s*[:：]?\s*/, ''));
            continue;
        }
        if (line.includes('⚖️')) {
            for (const m of line.matchAll(/⚖️\s*\[([^\]]+)\]\(<([^>]+)>\)/g)) {
                const href = m[2];
                const lm = href.match(/#L(\d+)$/i);
                q.refs.push({
                    label: m[1],
                    path: lm ? href.slice(0, -lm[0].length) : href,
                    line: lm ? parseInt(lm[1], 10) : null
                });
            }
            field = null; continue;
        }
        if (/^---+\s*$/.test(line)) { field = null; continue; }
        if (field === 'problem') buf.problem.push(line);
        else if (field === 'model') buf.model.push(line);
        else if (field === 'rubric') buf.rubric.push(line);
        else if (field === 'errors') buf.errors.push(line);
    }
    q.problem = buf.problem.join('\n').trim();
    q.modelAnswer = buf.model.join('\n').trim();
    for (const l of buf.rubric) {
        const im = l.match(/^\s*-\s*\[\s*\]\s*(.+)$/);
        if (im) {
            const pm = im[1].match(/\s*[(（]\s*([\d.]+)\s*점\s*[)）]\s*$/);
            q.rubricItems.push({
                text: pm ? im[1].slice(0, pm.index).trim() : im[1].trim(),
                points: pm ? parseFloat(pm[1]) : 0
            });
        }
    }
    if (!q.rubricItems.length) {
        q.rubricText = buf.rubric.join('\n').replace(/^\s*-\s*/gm, '').trim();
    }
    q.commonErrors = buf.errors.join('\n').trim();
    return q;
}

/**
 * 주관식 연습 MD → { title, sections:[{title, questions[]}], questions[] }
 * `### Sn. 제목` 블록 단위로 파싱. `##` 헤딩은 섹션 그룹으로 사용.
 * @param {string} mdText
 * @returns {WrittenBank}
 */
export function parseWrittenBank(mdText) {
    const lines = String(mdText || '').replace(/\r\n/g, '\n').split('\n');
    let title = '';
    /** @type {WrittenSection[]} */
    const sections = [];
    /** @type {WrittenQuestion[]} */
    const flat = [];
    /** @type {WrittenSection|null} */
    let curSec = null;
    let i = 0;
    while (i < lines.length) {
        const h1 = !title && lines[i].match(/^#\s+(.+)$/);
        if (h1) { title = h1[1].trim(); i++; continue; }
        const h2 = lines[i].match(/^##\s+(.+)$/);
        const h3 = lines[i].match(/^###\s+S(\d+)\.\s*(.+)$/);
        if (h3) {
            const num = parseInt(h3[1], 10);
            // 블록 끝: 다음 ###S·## ·EOF
            let j = i + 1;
            while (j < lines.length && !/^###?\s+/.test(lines[j])) j++;
            const q = _parseBlock(num, h3[2].trim(), lines.slice(i + 1, j));
            flat.push(q);
            if (curSec) curSec.questions.push(q);
            i = j; continue;
        }
        if (h2) {
            curSec = { title: h2[1].trim(), questions: [] };
            sections.push(curSec);
            i++; continue;
        }
        i++;
    }
    return { title, sections, questions: flat };
}

/* =========================================================
   뷰어 — 자기채점 오버레이
   ========================================================= */

const WP_CSS = `
#wp-overlay{position:fixed;inset:0;z-index:var(--z-modal-overlay);display:none;flex-direction:column;
  background:var(--bg-app);color:var(--color-text-main);}
#wp-overlay.open{display:flex;}
#wp-overlay .wp-bar{display:flex;align-items:center;gap:12px;flex:0 0 auto;
  padding:10px 16px;border-bottom:1px solid var(--border-color);
  background:var(--bg-card);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
#wp-overlay .wp-title{flex:1 1 auto;min-width:0;font-weight:700;font-size:.98rem;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#wp-overlay .wp-progress{font-size:.85rem;color:var(--color-text-muted);flex:0 0 auto;}
#wp-overlay .wp-btn{flex:0 0 auto;cursor:pointer;border:1px solid var(--border-color);
  background:var(--bg-card);color:inherit;border-radius:10px;padding:8px 14px;font-size:.9rem;
  display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:all .15s ease;}
#wp-overlay .wp-btn:hover{border-color:var(--border-color-active);color:var(--color-primary);}
#wp-overlay .wp-btn.primary{background:linear-gradient(135deg,var(--color-primary),#0891b2);
  border-color:transparent;color:#fff;}
#wp-overlay .wp-scroll{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;
  padding:20px clamp(16px,4vw,48px) 80px;}
#wp-overlay .wp-wrap{max-width:860px;margin:0 auto;}
#wp-overlay .wp-sec{font-size:1.05rem;font-weight:700;margin:1.6rem 0 .6rem;
  padding-left:.7rem;border-left:4px solid var(--color-primary);}
#wp-overlay .wpq{border:1px solid var(--border-color);border-radius:14px;
  background:var(--bg-card);padding:16px 18px;margin:0 0 16px;}
#wp-overlay .wpq.done{border-color:var(--color-primary);}
#wp-overlay .wpq-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
#wp-overlay .wpq-id{font-weight:800;color:var(--color-primary);}
#wp-overlay .wpq-title{font-weight:700;flex:1 1 auto;min-width:60%;}
#wp-overlay .wpq-chip{font-size:.75rem;padding:2px 8px;border-radius:999px;
  border:1px solid var(--border-color);color:var(--color-text-muted);white-space:nowrap;}
#wp-overlay .wpq-problem{margin:.7rem 0;line-height:1.75;font-size:.95rem;}
#wp-overlay .wpq-problem p{margin:.4rem 0;}
#wp-overlay .wpq-problem table{border-collapse:collapse;margin:.5rem 0;}
#wp-overlay .wpq-problem th,#wp-overlay .wpq-problem td{border:1px solid var(--border-color);
  padding:4px 10px;font-size:.9rem;}
#wp-overlay .wpq-answer{width:100%;min-height:110px;resize:vertical;border-radius:10px;
  border:1px solid var(--border-color);background:var(--bg-app);color:inherit;
  font-family:inherit;font-size:.95rem;line-height:1.6;padding:10px 12px;}
#wp-overlay .wpq-actions{display:flex;align-items:center;gap:10px;margin-top:.7rem;flex-wrap:wrap;}
#wp-overlay .wpq-score{font-size:.85rem;color:var(--color-text-muted);}
#wp-overlay .wpq-score strong{color:var(--color-primary);}
#wp-overlay .wpq-reveal{margin-top:.8rem;border-top:1px dashed var(--border-color);padding-top:.8rem;
  display:none;}
#wp-overlay .wpq-reveal.open{display:block;}
#wp-overlay .wpq-model{line-height:1.7;font-size:.93rem;background:rgba(34,197,94,.07);
  border-radius:10px;padding:10px 12px;}
#wp-overlay .wpq-model p{margin:.3rem 0;}
#wp-overlay .wpq-final{font-weight:700;color:var(--color-primary);margin:.5rem 0;}
#wp-overlay .wpq-rubric{margin:.6rem 0 0;}
#wp-overlay .wpq-rubric label{display:flex;gap:8px;align-items:flex-start;margin:.35rem 0;
  font-size:.92rem;cursor:pointer;}
#wp-overlay .wpq-rubric input{margin-top:3px;accent-color:var(--color-primary);}
#wp-overlay .wpq-errors{font-size:.88rem;color:var(--color-warning);margin-top:.5rem;}
#wp-overlay .wpq-refs{margin-top:.6rem;font-size:.82rem;}
#wp-overlay .wpq-refs a{color:var(--color-secondary);cursor:pointer;text-decoration:none;}
#wp-overlay .wpq-refs a:hover{text-decoration:underline;}
#wp-overlay .wp-loading,#wp-overlay .wp-error{text-align:center;padding:60px 20px;color:var(--color-text-muted);}
`;

const _overlay = createDocOverlay({
    id: 'wp-overlay',
    styleId: 'wp-overlay-style',
    css: WP_CSS,
    innerHTML: `<div class="wp-bar">
      <button class="wp-btn" data-wp-close aria-label="닫기"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> 목록으로</button>
      <div class="wp-title"></div>
      <div class="wp-progress"></div>
    </div>
    <div class="wp-scroll"><div class="wp-wrap"></div></div>`,
    ariaLabel: '주관식 연습',
    bodyClass: 'modal-open',
    historyMarker: 'wp-overlay',
    popstateGuardMs: 50,
    wire(el) { el.querySelector('[data-wp-close]')?.addEventListener('click', () => _overlay.close()); }
});

let _stem = '';
let _mdPath = '';
/** @type {WrittenQuestion[]} */
let _questions = [];

/* ---------- 저장 상태 ---------- */
function _all() { return getJSON(STORAGE_KEYS.WRITTEN_PRACTICE) || {}; }
function _entry(qid) { return ((_all()[_stem] || {})[qid]) || { a: '', c: [], d: null }; }
function _save(qid, patch) {
    const all = _all();
    if (!all[_stem]) all[_stem] = {};
    all[_stem][qid] = { ..._entry(qid), ...patch };
    setJSON(STORAGE_KEYS.WRITTEN_PRACTICE, all);
}
function _doneCount() { return _questions.filter(q => _entry(q.id).d).length; }
function _updateProgress() {
    const el = _overlay.el().querySelector('.wp-progress');
    if (el) el.textContent = `자기평가 완료 ${_doneCount()} / ${_questions.length}`;
}

/* ---------- 렌더링 ---------- */
function _mdHtml(md) { return md ? parseMarkdown(md) : ''; }

function _cardHtml(q) {
    const st = _entry(q.id);
    const chips = [
        q.type && `<span class="wpq-chip">${escapeHTML(q.type)}</span>`,
        q.points != null && `<span class="wpq-chip">${escapeHTML(String(q.points))}점</span>`,
        q.basis && `<span class="wpq-chip">${escapeHTML(q.basis)}</span>`
    ].filter(Boolean).join('');
    const rubricHtml = q.rubricItems.length
        ? `<div class="wpq-rubric">${q.rubricItems.map((r, i) =>
            `<label><input type="checkbox" data-wp-check="${i}"${st.c.includes(i) ? ' checked' : ''}>
             <span>${escapeHTML(r.text)} (${escapeHTML(String(r.points))}점)</span></label>`).join('')}</div>`
        : (q.rubricText ? `<div class="wpq-rubric"><p>${escapeHTML(q.rubricText)}</p></div>` : '');
    const refsHtml = q.refs.length
        ? `<div class="wpq-refs">${q.refs.map((r, i) =>
            `<a data-wp-ref="${i}">⚖️ ${escapeHTML(r.label)}</a>`).join(' · ')}</div>` : '';
    return `<div class="wpq${st.d ? ' done' : ''}" data-wpq="${q.id}">
      <div class="wpq-head"><span class="wpq-id">${escapeHTML(q.id)}</span>
        <span class="wpq-title">${escapeHTML(q.title)}</span>${chips}
        ${st.d ? '<span class="wpq-chip" style="color:var(--color-primary);border-color:var(--color-primary)">평가 완료</span>' : ''}
      </div>
      <div class="wpq-problem">${_mdHtml(q.problem)}</div>
      <textarea class="wpq-answer" data-wp-answer placeholder="답안을 서술하세요 (계산문제는 계산과정·답·단위 포함)">${escapeHTML(st.a)}</textarea>
      <div class="wpq-actions">
        <button class="wp-btn" data-wp-toggle>모범답안·채점기준</button>
        <span class="wpq-score" data-wp-score></span>
        <button class="wp-btn primary" data-wp-done>${st.d ? '완료 해제' : '자기평가 완료'}</button>
      </div>
      <div class="wpq-reveal" data-wp-reveal>
        <div class="wpq-model">${_mdHtml(q.modelAnswer)}</div>
        ${q.finalAnswer ? `<div class="wpq-final">답: ${escapeHTML(q.finalAnswer)}</div>` : ''}
        ${rubricHtml}
        ${q.commonErrors ? `<div class="wpq-errors">⚠ 흔한 오류: ${escapeHTML(q.commonErrors)}</div>` : ''}
        ${refsHtml}
      </div>
    </div>`;
}

function _renderBank(bank) {
    const wrap = _overlay.el().querySelector('.wp-wrap');
    const secHtml = bank.sections.length
        ? bank.sections.map(s =>
            `<div class="wp-sec">${escapeHTML(s.title)}</div>` + s.questions.map(_cardHtml).join('')).join('')
        : bank.questions.map(_cardHtml).join('');
    wrap.innerHTML = `<div class="wp-sec" style="border-left-color:var(--color-secondary)">
        자기채점 안내 — 답안을 서술한 뒤 모범답안·채점기준을 대조하고 항목을 체크하세요. 부분점수는 학습용 참고치입니다.
      </div>` + secHtml;
    _wireCards();
    _updateProgress();
}

function _wireCards() {
    const wrap = _overlay.el().querySelector('.wp-wrap');
    wrap.querySelectorAll('.wpq').forEach(card => {
        const qid = card.dataset.wpq;
        const q = _questions.find(x => x.id === qid);
        if (!q) return;
        const updateScore = () => {
            const st = _entry(qid);
            const sum = q.rubricItems.length
                ? st.c.reduce((acc, i) => acc + (q.rubricItems[i] ? q.rubricItems[i].points : 0), 0) : 0;
            const el = card.querySelector('[data-wp-score]');
            if (el) el.innerHTML = q.rubricItems.length
                ? `자기채점 <strong>${sum}</strong> / ${escapeHTML(String(q.points ?? '—'))}점`
                : (st.a.trim() ? '답안 작성됨' : '');
        };
        card.querySelector('[data-wp-answer]').addEventListener('input', (e) => {
            _save(qid, { a: e.target.value });
            updateScore();
        });
        card.querySelector('[data-wp-toggle]').addEventListener('click', () => {
            card.querySelector('[data-wp-reveal]').classList.toggle('open');
        });
        card.querySelectorAll('[data-wp-check]').forEach(cb => {
            cb.addEventListener('change', () => {
                const st = _entry(qid);
                const idx = parseInt(cb.dataset.wpCheck, 10);
                const c = new Set(st.c);
                if (cb.checked) c.add(idx); else c.delete(idx);
                _save(qid, { c: [...c].sort((a, b) => a - b) });
                updateScore();
            });
        });
        card.querySelector('[data-wp-done]').addEventListener('click', () => {
            const st = _entry(qid);
            _save(qid, { d: st.d ? null : Date.now() });
            // 카드만 갱신 — 입력 중이던 다른 답안 DOM을 보존하기 위해 해당 카드만 교체
            const fresh = _entry(qid);
            card.classList.toggle('done', !!fresh.d);
            const doneBtn = card.querySelector('[data-wp-done]');
            doneBtn.textContent = fresh.d ? '완료 해제' : '자기평가 완료';
            const chip = card.querySelector('.wpq-head .wpq-chip:last-child');
            if (fresh.d && chip && chip.textContent !== '평가 완료') {
                card.querySelector('.wpq-head').insertAdjacentHTML('beforeend',
                    '<span class="wpq-chip" style="color:var(--color-primary);border-color:var(--color-primary)">평가 완료</span>');
            } else if (!fresh.d && chip && chip.textContent === '평가 완료') {
                chip.remove();
            }
            _updateProgress();
        });
        card.querySelectorAll('[data-wp-ref]').forEach(a => {
            a.addEventListener('click', () => {
                const ref = q.refs[parseInt(a.dataset.wpRef, 10)];
                if (!ref) return;
                _openRef(ref);
            });
        });
        updateScore();
    });
}

/* ---------- 참조 링크 → ExamViewer ---------- */
async function _openRef(ref) {
    // '../참조자료/ref_md/…' 상대 경로를 현재 mdPath 기준으로 해석 후 문제집 뷰어로 연다.
    const baseDir = _mdPath.substring(0, _mdPath.lastIndexOf('/') + 1);
    let resolved = ref.path;
    try {
        resolved = decodeURIComponent(new URL(encodeURI(ref.path), new URL(encodeURI(baseDir), location.href)).pathname)
            .replace(/^\//, '');
    } catch (e) { resolved = ref.path.replace(/^\.\.\//, ''); }
    const mod = await import('./exam-viewer.js');
    _overlay.close();
    mod.ExamViewer.openExam(resolved, ref.line || undefined);
}

/* ---------- 로드 ---------- */
async function _loadMd(mdPath) {
    if (location.protocol === 'file:') {
        const stem = mdPath.split('/').pop().replace(/\.md$/i, '');
        await injectBundleScript(dataPath('exams_md/') + stem + '.js', 'data-exam-bundle');
        if (window.__EXAM_MD__ && typeof window.__EXAM_MD__[mdPath] === 'string') {
            return window.__EXAM_MD__[mdPath];
        }
        throw new Error('주관식 번들을 찾을 수 없습니다. `node tools/build/build_exam_bundles.js` 를 실행하세요.');
    }
    try {
        return await fetchMd(mdPath);
    } catch (err) {
        const stem = mdPath.split('/').pop().replace(/\.md$/i, '');
        try {
            await injectBundleScript(dataPath('exams_md/') + stem + '.js', 'data-exam-bundle');
            if (window.__EXAM_MD__ && typeof window.__EXAM_MD__[mdPath] === 'string') {
                return window.__EXAM_MD__[mdPath];
            }
        } catch (e) { /* noop — 원래 오류 노출 */ }
        throw err;
    }
}

export const WrittenPractice = {
    /** manifest.written[] 항목의 문제은행 MD를 자기채점 오버레이로 연다. */
    async openWritten(mdPath) {
        _mdPath = mdPath;
        _stem = mdPath.split('/').pop().replace(/\.md$/i, '');
        _overlay.ensure();
        _overlay.el().querySelector('.wp-title').textContent = '주관식 연습';
        _overlay.el().querySelector('.wp-wrap').innerHTML =
            '<div class="wp-loading"><div class="spinner"></div><p>문항을 불러오는 중…</p></div>';
        _overlay.open();
        try {
            const md = await _loadMd(mdPath);
            const bank = parseWrittenBank(md);
            if (!bank.questions.length) throw new Error('### S 문항이 없습니다 — 파일을 확인하세요.');
            _questions = bank.questions;
            _overlay.el().querySelector('.wp-title').textContent = bank.title || _stem;
            _renderBank(bank);
        } catch (e) {
            _overlay.el().querySelector('.wp-wrap').innerHTML =
                `<div class="wp-error"><p>문항을 불러올 수 없습니다.</p><p>${escapeHTML(e.message)}</p></div>`;
        }
    },
    /** 완료 문항 수 요약 — 카드 라벨용 */
    getProgress(fileStem) {
        const data = (_all()[fileStem]) || {};
        return { done: Object.values(data).filter(e => e && e.d).length };
    }
};
