// src/content/doc-issues.js — 문서 발행 대장 팩토리 (문서 추적성 공용)
// @spec CO-22 — 모든 발행 문서의 공용 추적 계층: docNo별 발행 이력을 로컬 우선으로 누적한다.
// 시험 팩은 자신의 저장 키·기관명 공급자만 넘기면 된다 — DA-13 격리는 키 선택으로 유지.
// docNo는 내용 해시 기반(docStamp)이라 동일 내용 재발행은 같은 행에 rev 누적 —
// "몇 번째 발행인가"를 파일의 core.xml revision과 대조할 수 있다.
// 실패한 발행은 기록하지 않는다 — 호출부에서 산출 성공 후 호출.
import { createEntityStore } from '../core/entity-store.js';
import { localDateTimeNow } from '../core/utils.js';

/**
 * 발행 대장 스토어 생성
 * @param {{key:string, org?:function():string, idPrefix?:string}} cfg
 *   key: localStorage 키(STORAGE_KEYS) · org: 발행 기관명 공급자(없으면 '') · idPrefix: 행 id 접두어
 * @returns {{list:function, findDocIssue:function, nextDocRev:function, recordDocIssue:function}}
 */
export const createDocIssueStore = ({ key, org = () => '', idPrefix = 'issue' }) => {
    const _store = createEntityStore({ key, idPrefix });

    const list = _store.list;

    /** @param {string} docNo @returns {*|undefined} 발행 기록 (없으면 undefined) */
    const findDocIssue = docNo => _store.list().find((/** @type {*} */ x) => x.docNo === docNo);

    /** 다음 발행 차수 — 발행 전 조회 (docx core.xml revision 선기입용) */
    const nextDocRev = (/** @type {string} */ docNo) => ((findDocIssue(docNo) || {}).rev || 0) + 1;

    /**
     * 발행 기록 — 같은 문서번호 재발행이면 rev+1·파일명·형식 누적, 신규면 등록.
     * @param {{docNo:string, tool:string, kind:string, filenames?:string[], hash?:string}} it
     *   docNo: docStamp 결과 · tool: 문서 제목 · kind: docx|pdf|xlsx|share|print ·
     *   filenames: 산출 파일명들 · hash: 본문 fnv1a 전체 해시(번호의 6자리 축약원본 — 변조 대조용)
     * @returns {{docNo:string, rev:number}}
     */
    const recordDocIssue = ({ docNo, tool, kind, filenames = [], hash = '' }) => {
        if (!docNo) return { docNo: '', rev: 0 };
        const ex = findDocIssue(docNo);
        const rev = ((ex && ex.rev) || 0) + 1;
        const entry = {
            docNo, tool, kind, hash: hash || (ex && ex.hash) || '', org: org() || '', rev, issuedAt: localDateTimeNow(),
            files: [...new Set([...(ex ? ex.files || [] : []), ...filenames])].slice(-30),
            kinds: [...new Set([...(ex ? ex.kinds || [] : []), kind].filter(Boolean))],
        };
        _store.add(entry, ex && ex.id);
        return { docNo, rev };
    };

    return { list, findDocIssue, nextDocRev, recordDocIssue };
};
