// tools/import/enrich_facility_stats.js — 공단 XLSX 입소인원·인력현황 → facilities.json 정원·요양보호사 보강
// @spec none — 데이터 임포트 유틸리티 (DA-13 시험 데이터 생성)
// 사용: node tools/import/enrich_facility_stats.js
// 원천: content/exams/carework/실무/국민건강보험공단_장기요양기관 시설별 현황_*.xlsx (입소인원·인력현황 시트)
// 매칭: 장기요양기관코드+기관유형코드 → 없으면 기관코드 합산 폴백
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('../../vendor/xlsx/xlsx.full.min.js');

const DIR = path.resolve('content/exams/carework/실무');
const TARGET = path.join(DIR, 'facilities.json');
const xlsx = readdirSync(DIR).find(f => f.endsWith('.xlsx') && f.includes('현황'));
if (!xlsx) { console.error('현황 xlsx 없음'); process.exit(1); }
const wb = XLSX.read(readFileSync(path.join(DIR, xlsx)), { type: 'buffer' });
const rows = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name]);

// code|type → 정원 합산 / 요양보호사
const cap = new Map(), care = new Map();
const capByCode = new Map(), careByCode = new Map();
const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
for (const r of rows('입소인원')) {
    const k = `${r['장기요양기관코드']}|${r['기관유형코드']}`, n = Number(r['정원']) || 0;
    add(cap, k, n); add(capByCode, r['장기요양기관코드'], n);
}
for (const r of rows('인력현황')) {
    const k = `${r['장기요양기관코드']}|${r['기관유형코드']}`, n = Number(r['요양보호사']) || 0;
    add(care, k, n); add(careByCode, r['장기요양기관코드'], n);
}

const data = JSON.parse(readFileSync(TARGET, 'utf8'));
let hit = 0;
for (const it of data.items) {
    const k = `${it.code}|${it.typeCode}`;
    it.capacity = cap.get(k) ?? capByCode.get(it.code) ?? null;
    it.careWorkers = care.get(k) ?? careByCode.get(it.code) ?? null;
    if (it.capacity != null || it.careWorkers != null) hit++;
}
data.source = data.source.replace(' (A계열 시설급여 필터, 전화번호는 상세조회 API로 별도 보강)',
    ' (A계열 시설급여 필터, 전화번호는 상세조회 API·정원·인력은 현황 시트로 보강)');
writeFileSync(TARGET, JSON.stringify(data, null, 1) + '\n');
console.log(`✅ ${hit}/${data.items.length}건 보강 — 정원 ${data.items.filter(i => i.capacity != null).length} · 요양보호사 ${data.items.filter(i => i.careWorkers != null).length}`);
