// tools/import/enrich_facility_phones.js — 공단 상세조회 API로 facilities.json 전화번호 보강
// @spec none — 데이터 임포트 유틸리티 (DA-13 시험 데이터 생성)
// 사용: node tools/import/enrich_facility_phones.js [제한건수] — .env의 DATA_GO_KR_SERVICE_KEY 사용
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TARGET = path.resolve('content/exams/carework/실무/facilities.json');
const ENDPOINT = 'https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02/getGeneralSttusDetailInfoItem02';

let KEY = process.env.DATA_GO_KR_SERVICE_KEY;
if (!KEY) {
    try { KEY = (readFileSync('.env', 'utf8').match(/^DATA_GO_KR_SERVICE_KEY=(.+)$/m) || [])[1]?.trim(); } catch { /* .env 없음 */ }
}
if (!KEY) { console.error('DATA_GO_KR_SERVICE_KEY 필요 (.env 또는 환경변수)'); process.exit(1); }

const data = JSON.parse(readFileSync(TARGET, 'utf8'));
const LIMIT = Number(process.argv[2]) || 0;
const items = data.items.filter(i => i.code && i.typeCode && !i.phone);
console.log(`대상 ${items.length}건 (전화번호 미보유)${LIMIT ? ` — 제한 ${LIMIT}건` : ''}`);

const save = () => writeFileSync(TARGET, JSON.stringify(data, null, 1) + '\n');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let done = 0, fail = 0;
for (const it of items.slice(0, LIMIT || items.length)) {
    try {
        const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(KEY)}&longTermAdminSym=${encodeURIComponent(it.code)}&adminPttnCd=${encodeURIComponent(it.typeCode)}`;
        const xml = await (await fetch(url)).text();
        const p = [1, 2, 3].map(n => (xml.match(new RegExp(`<locTelNo_${n}>([^<]*)`)) || [])[1] || '');
        if (p[0] && p[1] && p[2]) it.phone = `${p[0]}-${p[1]}-${p[2]}`;
        if (xml.includes('SERVICE_ERROR') || xml.includes('errMsg')) fail++;
        done++;
        if (done % 200 === 0) { console.log(`${done}/${items.length} 처리…`); save(); }
        await sleep(120);
    } catch (e) {
        if (++fail > 20) { console.error('연속 오류 — 중단:', e.message); break; }
        await sleep(500);
    }
}
save();
console.log(`✅ ${done}건 처리 — 전화번호 보강 ${data.items.filter(i => i.phone).length}건, 오류 ${fail}건`);
