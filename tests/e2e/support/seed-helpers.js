// tests/e2e/support/seed-helpers.js — e2e 시드 스니펫 공용 생성기
// @spec none
// 지식DB(contentHash) 보유 팩에서 진도 키를 시드하면 앱이 "기존 사용자"로 판정해
// 부팅 시 "DB 갱신" 1회 알림(#app-confirm-overlay)을 띄운다 (app-shell.js checkIngredientsUpdate).
// 이 모달은 시험 카드 클릭을 가로막고 동기화 충돌 모달과 같은 오버레이를 공유해
// 충돌 단언을 깨뜨리므로, 진도 키를 시드하는 스펙은 이 헬퍼로 '이미 확인' 상태를 시드한다.
import fs from 'node:fs';
import path from 'node:path';

/** 지식DB 갱신 알림 '이미 확인' 시드 스니펫 — initScript 문자열에 삽입해 사용.
 *  registry.js에서 knowledge meta(version:contentHash)를 읽어 정확한 notifyKey를 심는다.
 *  @param {string} examId @returns {string} 지식DB가 없으면 빈 문자열 */
export function dbNotifiedSeed(examId) {
    try {
        const regPath = path.resolve('data', 'exams', examId, 'registry.js');
        const win = {};
        new Function('window', fs.readFileSync(regPath, 'utf8'))(win);
        const reg = win[`DATA_REGISTRY_${examId.toUpperCase()}`] || Object.values(win)[0];
        const key = (reg && reg.knowledge && reg.knowledge.registryKey) || 'ingredients';
        const meta = reg && reg[key];
        if (!meta || !meta.contentHash) return '';
        const notifyKey = `${meta.version || 'data'}:${meta.contentHash}`;
        return `localStorage.setItem('${examId}:ingredients_db_notified', ${JSON.stringify(notifyKey)});`;
    } catch (e) {
        return '';
    }
}
