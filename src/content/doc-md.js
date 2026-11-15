// src/content/doc-md.js — 내보내기 문서 마크다운 초안 공용 빌더·미리보기 팩토리 (CO-13, DA-24)
// @spec CO-13,DA-24 — 생성 문서는 MD를 표준 초안으로 삼아 docx·xlsx·html 미리보기·pdf를 파생한다.
//   스타일·양식(공문서 헤더·결재란·서명란·표)은 이 모듈과 docx-utils가 단일 정본으로 제공하고,
//   시험 팩은 내용(MD 초안)과 기관명·서명 공급자만 주입한다 (createDocIssueStore와 동일 패턴).
// 사용: const docMd = createDocMd({ org: getOrgName, sign: getDocSign });
import { todayKey } from '../core/utils.js';
import { parseCsv } from './csv-utils.js';
import { docWmText, docWmHtml } from './doc-wm.js';
import { apprRoles as _apprRoles, imgLineKey, RE_NOTE, RE_INL_IMG, RE_INL_BOLD, RE_INL_CODE, RE_INL_EM, RE_INL_DEL, RE_INL_LINK, RE_SAFE_URL } from './md-tokens.js';

/**
 * 문서 MD 빌더 생성 — 시험 팩은 기관명·서명 설정·이미지 공급자만 넘긴다
 * @param {{org?: function():string, sign?: function():{author?:string, confirmer?:string, receiver?:string, signImage?:string, wm?:boolean}, images?: function():Object<string,string>}} cfg
 *   org: 기관·조직명 공급자 · sign: 서명자 설정 공급자(없으면 수기 공란만 출력)
 *   · images: {{img:key}} 토큰용 이미지 소스(data URL) 맵 공급자 — 'author' 키는 sign().signImage 폴백
 * @returns {{docMdHead:function, docMdSign:function, mdTable:function, csvToMdTable:function, mdToHtml:function, pinDocSignBottom:function}}
 */
export const createDocMd = ({ org = () => '', sign = () => ({}), images = () => ({}) } = {}) => {

    /** 이미지 키 → 소스 해석 — images 맵 우선, 'author'는 sign().signImage 폴백 (기존 계약) */
    /** @param {string} key */
    const _imgSrc = key => ((images() || {})[key]) || (key === 'author' ? sign().signImage : '');

    /** 문서 헤더 — # 제목 + 기관명·출력일 메타 (모든 내보내기 문서 공통 머리) */
    /** @param {string} title */
    const docMdHead = title => {
        const o = org();
        return `# ${title}\n\n${o ? o + ' · ' : ''}${todayKey()} 출력\n`;
    };

    /** 표 — 헤더 + --- 구분행 + 데이터 행 */
    /** @param {string[]} headers @param {Array<*[]>} rows */
    const mdTable = (headers, rows) =>
        ['| ' + headers.join(' | ') + ' |',
            '|' + headers.map(() => '---').join('|') + '|',
            ...rows.map((/** @type {*[]} */ r) => '| ' + r.map((/** @type {*} */ c) => String(c ?? '')).join(' | ') + ' |')].join('\n');

    /** 문서 서명란 — items: [[라벨, 'author'|'confirmer'|'receiver'|'']] — docSignHtml의 MD 대응.
     *  설정 성명은 기입되고, 미설정·빈키(날짜) 슬롯은 수기 서명용 공란 유지.
     *  :::sign 블록 마커로 감싼다 — docx에서는 페이지 하단 우측 부동 표(tblpPr)로,
     *  미리보기에서는 우측 정렬 서명 박스로 렌더된다 (본문 바로 아래가 아닌 문서 하단 배치).
     *  approve: 결재란 역할 배열 또는 'none' — 기본(미지정) 담당·팀장·시설장. 재가기관 문서는
     *  ['사회복지사','센터장'] 등 기관 결재선에 맞게 지정한다. */
    /** @param {Array<[string,string]>} items @param {string[] | 'none'} [approve] */
    const docMdSign = (items, approve) => {
        const s = sign();
        const nm = (/** @type {string} */ k) => (k === 'author' ? s.author : k === 'confirmer' ? s.confirmer : k === 'receiver' ? s.receiver : '');
        // author 슬롯에 등록 서명 이미지가 있으면 이름 뒤에 {{img:author}} 토큰 병기 — (인) 위 날인 표식이며
        // 성명 텍스트는 그대로 유지 (토큰이 이름 자리를 대체하면 서명란에 성명이 누락됨)
        const roles = approve ? `\n:::approve ${approve === 'none' ? 'none' : approve.join('|')}` : '';
        return `${roles}\n\n:::sign\n` + items.map(([label, k]) => `${label}: ${nm(k) || '＿＿＿＿＿＿＿＿'}${k === 'author' && s.signImage ? ' {{img:author}}' : ''}`).join('\n') + '\n:::end';
    };

    /** 기존 CSV 직렬화 재사용 → MD 표 (BOM·인용 처리는 parseCsv 위임) */
    /** @param {string} csv */
    const csvToMdTable = csv => {
        const rows = parseCsv(String(csv || '').replace(/^﻿/, ''));
        return rows.length > 1 ? mdTable(rows[0] || [], rows.slice(1)) : '';
    };

    /** @param {*} s */
    const _esc = s => String(s).replace(/[&<>"]/g, (/** @type {string} */ c) => (/** @type {Object.<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }))[c] || c);

    /** 결재란 역할 해석 — :::sign 있고 :::approve none 아니면 역할 배열 (미지정 시 담당·팀장·시설장)
     *  규약 정본은 md-tokens.js — docx-utils와 동일 판정 공유 */

    /** 결재란 HTML — docx _approve와 동일 구조. 결재하지 않은 문서에 서명 미삽입 — (인) 빈칸 유지 */
    /** @param {string[] | null} roles */
    const _apprHtml = roles => !roles ? '' :
        `<div class="doc-approve-wrap"><table class="doc-approve"><tr><td rowspan="2">결 재</td>${roles.map(r => `<td>${_esc(r)}</td>`).join('')}</tr><tr>${roles.map(() => '<td><span class="doc-sign-spot">(인)</span></td>').join('')}</tr></table></div>`;

    /** 표 HTML — 2열 표는 첫 열 레이블 음영(doc-kv) */
    /** @param {string[][]} tbl */
    const _tblHtml = tbl => {
        const head = tbl[0] || [];
        const th = head.map(c => `<th>${_inl(c.trim())}</th>`).join('');
        const rows = tbl.slice(1).map(r => `<tr>${r.map(c => `<td>${_inl(c.trim())}</td>`).join('')}</tr>`).join('');
        return `<table${head.length === 2 ? ' class="doc-kv"' : ''}><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
    };

    /** 서명란 한 줄 — {{img:key}} 토큰은 (인) 위 날인 이미지로, 나머지는 성명+(인).
     *  미등록 키는 수기 공란(밑줄) — docx _sigRuns와 동일 정책 */
    /** @param {string} l */
    const _signLineHtml = l => {
        const m = l.match(/^(.*)\{\{img:([\w-]+)\}\}\s*$/);
        if (m) {
            const src = _imgSrc(m[2] || '');
            const txt = (m[1] || '').trim();
            if (src) return `<div>${_esc(txt)} <span class="doc-sign-spot">(인)<img class="care-doc-signimg" alt="${_esc(sign().author || '서명')}" src="${src}"></span></div>`;
            return `<div>${_esc(txt)} ＿＿＿＿＿＿＿＿ (인)</div>`;
        }
        return `<div>${_esc(l)}${/\(인\)\s*$/.test(l) ? '' : ' (인)'}</div>`;
    };

    /** 서명 블록 HTML — 당일 날짜 + 서명란 줄들 */
    /** @param {string[]} signLines */
    const _signHtml = signLines => {
        const d = new Date();
        const date = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
        return `<div class="doc-sign"><div class="doc-sign-date">${date}</div>${signLines.map(_signLineHtml).join('')}</div>`;
    };

    /** 이미지 src 해석 — images 맵 키 → data URL, data:/http(s): URL은 직접 사용, 그 외는 '' (누수 방지 표기로 폴백) */
    /** @param {string} k */
    const _mdImgSrc = k => ((images() || {})[k]) || (k === 'author' ? sign().signImage : '') ||
        (/^(data:image\/|https?:)/.test(k) ? k : '');

    /** 인라인 서식 — esc 후 **굵게**→strong · `코드`→code · *기울임*→em · ~~취소~~→del · [텍스트](url)→a · ![alt](src|key)→img
     * (마커 문자는 esc 비대상이라 안전. URL은 http(s)·mailto·data:image·#/만 허용 — javascript: 등은 리터럴 유지) */
    /** @param {RegExp} r */
    const _G = r => new RegExp(r.source, 'g');
    /** @param {string} s */
    const _inl = s => _esc(s)
        .replace(_G(RE_INL_IMG), (m, alt, /** @type {string} */ src) => { const r = _mdImgSrc(src); return r ? `<img class="doc-img-inline" alt="${alt}" src="${r}">` : '(이미지)'; })
        .replace(_G(RE_INL_LINK), (m, /** @type {string} */ txt, /** @type {string} */ u) => RE_SAFE_URL.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${txt}</a>` : m)
        .replace(_G(RE_INL_BOLD), '<strong>$1</strong>')
        .replace(_G(RE_INL_CODE), '<code>$1</code>')
        .replace(_G(RE_INL_EM), '<em>$1</em>')
        .replace(_G(RE_INL_DEL), '<del>$1</del>');

    /** 일반 텍스트 줄 → HTML — 문서 설정 마커는 '', :::page·:::closing·---·본문 이미지·각주·본문 순 */
    /** @param {string} t */
    const _textHtml = t => {
        if (t.startsWith(':::approve') || t === ':::landscape') return ''; // 문서 설정 마커 — 출력 없음
        if (t === ':::page') return '<div class="doc-pagebreak"></div>'; // 인쇄 시 쪽 나눔 — docx의 :::page와 동일 마커
        if (t.startsWith(':::closing')) return `<p class="doc-closing">${_inl(t.slice(10).trim())}</p>`; // 종결 문구
        if (t === '---') return '<hr>';
        const imL = imgLineKey(t); // 본문 이미지 — {{img:key}}·![alt](src|key) 단독 줄 (docx _imgP와 정합)
        if (imL) { const src = _mdImgSrc(imL.key || ''); return src ? `<div class="doc-img-wrap"><img class="doc-img" src="${src}" alt="${_esc(imL.alt)}"></div>` : '<p class="doc-note">(이미지)</p>'; }
        const txt = t.replace(/\{\{img:[\w-]+\}\}/g, '(이미지)'); // 행 중간 토큰 — 인라인 이미지 미지원, 텍스트 표기
        if (RE_NOTE.test(txt)) return `<p class="doc-note">${_inl(txt)}</p>`; // 각주성 소자 회색 — docx _note와 동일 규칙
        return `<p>${_inl(txt)}</p>`;
    };

    /** 코드 펜스 상태 — ```열림/닫힘 토글, 내부 줄은 원문 보존(trim 안 함). 처리했으면 true */
    /** @param {string} line @param {string} t @param {*} st @param {*} cx */
    const _mdCode = (line, t, st, cx) => {
        if (st.code) { if (t.startsWith('```')) { cx.flush(false); cx.out.push(`<pre class="doc-code">${_esc(st.code.join('\n'))}</pre>`); st.code = null; } else st.code.push(line); return true; }
        if (t.startsWith('```')) { cx.flush(false); st.code = []; st.meta = false; return true; }
        return false;
    };

    /** 서명란 블록 상태 — :::sign~:::end 구간 수집·종결. 처리했으면 true */
    /** @param {string} t @param {*} st @param {*} cx */
    const _mdSign = (t, st, cx) => {
        if (t === ':::sign') { cx.flush(false); st.sign = []; st.meta = false; return true; }
        if (t === ':::end') { if (st.sign) { cx.out.push(_signHtml(st.sign)); st.sign = null; } return true; }
        if (st.sign) { if (t) st.sign.push(t); return true; }
        return false;
    };

    /** 표·목록 구조 줄 — 소비했으면 true */
    /** @param {string} t @param {*} st @param {*} cx */
    const _mdStruct = (t, st, cx) => {
        if (/^\|[\s:|-]+\|$/.test(t)) return true;
        if (t.startsWith('|') && t.endsWith('|')) { cx.flush(true); st.meta = false; (st.tbl = st.tbl || []).push(t.slice(1, -1).split('|')); return true; }
        if (t.startsWith('- ')) { st.meta = false; (st.list = st.list || []).push(t.slice(2)); return true; }
        return false;
    };

    /** 헤딩 줄 → HTML + 메타 플래그. 헤딩이면 true */
    /** @param {string} t @param {*} st @param {*} cx */
    const _mdHead = (t, st, cx) => {
        const h = t.match(/^(#{1,3})\s+(.+)/);
        if (!h) return false;
        cx.out.push(`<h${+(h[1] || '').length + 2}>${_esc(h[2])}</h${+(h[1] || '').length + 2}>`);
        st.meta = (h[1] || '').length === 1;
        return true;
    };

    /** 워터마크 문구 — sign().wm 켜짐 + 기관명 있을 때만.
     *  문구 자체는 공용 docWmText — docx 회전 상자·PDF 캔버스 스탬프와 동일 */
    const _wmText = () => (sign().wm ? docWmText(org()) : '');

    /** MD 서브셋 → HTML — 미리보기·PDF 렌더 원본 (docx-utils의 _mdBody와 동일 서브셋) */
    /** @param {string} md */
    const mdToHtml = md => {
        /** @type {string[]} */
        const out = [];
        // 서명 문서는 공문서 결재란 부여 — :::approve 마커로 역할 지정 (docx _approve와 동일 구조)
        const st = { apprHtml: _apprHtml(_apprRoles(md)), tbl: /** @type {string[][] | null} */ (null), list: /** @type {string[] | null} */ (null), sign: /** @type {string[] | null} */ (null), code: /** @type {string[] | null} */ (null), meta: false };
        const cx = { out, flush: (/** @type {boolean} */ listOnly) => {
            if (st.tbl && !listOnly) { out.push(_tblHtml(st.tbl)); st.tbl = null; }
            if (st.list) { out.push(`<ul>${st.list.map(i => `<li>${_inl(i)}</li>`).join('')}</ul>`); st.list = null; }
        } };
        for (const line of String(md || '').split('\n')) {
            const t = line.trim();
            if (_mdCode(line, t, st, cx) || _mdSign(t, st, cx) || _mdStruct(t, st, cx)) continue;
            cx.flush(false);
            if (_mdHead(t, st, cx)) continue;
            if (!t) continue; // 빈 줄 — meta 플래그 유지
            const firstMeta = st.meta; st.meta = false;
            if (t.startsWith(':::approve') || t === ':::landscape') continue; // 문서 설정 마커 — 출력 없음
            if (firstMeta) out.push(`<p class="doc-meta">${_inl(t.replace(/\{\{img:[\w-]+\}\}/g, '(이미지)'))}</p>`); // 제목 직후 메타줄 — 인라인·토큰도 본문과 동일 처리
            if (st.apprHtml) { out.push(st.apprHtml); st.apprHtml = ''; } // 메타 없는 문서 폴백 — 첫 비마커 줄 앞
            if (!firstMeta) { const html = _textHtml(t); if (html) out.push(html); }
        }
        cx.flush(false);
        if (st.code) out.push(`<pre class="doc-code">${_esc(st.code.join('\n'))}</pre>`); // 미닫힘 펜스 — 수집분 그대로 출력
        out.push('<p class="doc-end">끝.</p>'); // 공문서 종결 표기
        return `<div class="doc-md${/^:::landscape\s*$/m.test(String(md)) ? ' doc-landscape' : ''}">${docWmHtml(_wmText())}${out.join('')}</div>`;
    };

    /**
     * 서명란을 문서 하단 우측에 고정 — docx 출력의 부동 표(tblpPr, 페이지 하단 우측 앵커)와
     * 같은 위치를 PDF 캡처용 DOM에서 재현한다. root는 position이 지정된 래퍼여야 한다
     * (서명란 absolute의 containing block). root 높이를 한 페이지 분량으로 채워 서명란이
     * 본문 직후가 아니라 페이지 하단에 오게 한다.
     * @param {HTMLElement} root - positioned 래퍼 (.doc-md를 자신 또는 자손으로 포함)
     * @param {{minHeight?: string, innerPad?: string, right?: string}} [o]
     * @returns {boolean} 서명란을 찾아 고정했으면 true
     */
    const pinDocSignBottom = (root, { minHeight = '986px', innerPad = '64px', right = '88px' } = {}) => {
        if (!(root instanceof HTMLElement)) return false;
        const md = root.classList.contains('doc-md') ? root : root.querySelector('.doc-md');
        const signEl = /** @type {HTMLElement|null} */ (md && /** @type {HTMLElement} */ (md).querySelector('.doc-sign'));
        if (!(md instanceof HTMLElement) || !signEl) return false;
        md.style.padding = `0 ${innerPad}`; // 본문 폭을 docx 좌우 25mm에 근사
        signEl.style.position = 'absolute';
        signEl.style.right = right; // 래퍼 여백(24px) + innerPad — 표 우측선과 정합
        signEl.style.bottom = '0';
        root.style.boxSizing = 'border-box';
        root.style.minHeight = minHeight;
        return true;
    };

    return { docMdHead, docMdSign, mdTable, csvToMdTable, mdToHtml, pinDocSignBottom };
};
