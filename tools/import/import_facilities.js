// tools/import/import_facilities.js — 공공데이터 CSV → facilities.json 임포트
// @spec none — 데이터 임포트 유틸리티 (DA-13 시험 데이터 생성)
// 사용: node tools/import/import_facilities.js <csv파일> [--region=대전]
// 대상: content/exams/carework/실무/facilities.json
// CSV 컬럼: 시도명, 시군구명, 시설명, 시설종류, 시설소재지, 전화번호 (대전 공공데이터 형식)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [,, file, ...flags] = process.argv;
const regionFlag = (flags.find(f => f.startsWith('--region=')) || '').slice(9);
if (!file) { console.error('사용: node tools/import/import_facilities.js <csv> [--region=시도]'); process.exit(1); }

const TARGET = path.resolve('content/exams/carework/실무/facilities.json');
const SRC_TARGET = '공공데이터포털 국민건강보험공단·지자체 장기요양기관 현황 — tools/import/import_facilities.js 임포트';

function parseCsvLine(line) {
    const out = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
        else if (c === '"') inQ = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
    }
    out.push(cur);
    return out;
}

const raw = readFileSync(file, 'utf8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter(l => l.trim());
// 헤더 행 탐색 — 첫 행에 출처·메타 행이 있을 수 있으므로 시설명 컬럼이 보이는 행을 헤더로 인식
let hi = 0;
while (hi < lines.length && !parseCsvLine(lines[hi]).some(h => ['시설명', '상호', '기관명'].includes(h.trim()))) hi++;
const header = parseCsvLine(lines[hi]).map(h => h.trim());
const idx = (names) => header.findIndex(h => names.includes(h));
const ci = {
    sido: idx(['시도명', '시도']),
    gungu: idx(['시군구명', '시군구']),
    name: idx(['시설명', '상호', '기관명']),
    type: idx(['시설종류', '시설유형', '기관유형']),
    addr: idx(['시설소재지', '주소']),
    phone: idx(['전화번호', '연락처']),
};
if (ci.name < 0) { console.error('시설명 컬럼을 찾지 못함 — 헤더:', header.join(',')); process.exit(1); }

const items = [];
for (const line of lines.slice(hi + 1)) {
    const c = parseCsvLine(line).map(s => s.trim());
    const region = regionFlag || c[ci.sido] || '';
    const name = c[ci.name];
    if (!name) continue;
    items.push({
        region,
        name,
        type: c[ci.type] || '노인요양시설',
        address: c[ci.addr] || '',
        phone: c[ci.phone] || '',
        gu: c[ci.gungu] || undefined,
    });
}

const db = JSON.parse(readFileSync(TARGET, 'utf8'));
db.source = SRC_TARGET;
const seen = new Set();
db.items = db.items.filter(x => x.type !== '안내');
for (const it of [...db.items, ...items]) {
    const k = it.region + '|' + it.name;
    if (!seen.has(k)) { seen.add(k); }
}
const merged = [];
const keys = new Set();
for (const it of [...db.items, ...items]) {
    const k = it.region + '|' + it.name + '|' + it.address;
    if (!keys.has(k)) { keys.add(k); merged.push(it); }
}
db.items = merged;
db.regions = [...new Set(merged.map(i => i.region).filter(Boolean))].sort();
writeFileSync(TARGET, JSON.stringify(db, null, 2) + '\n', 'utf8');
console.log(`✅ 임포트 ${items.length}건 → 총 ${merged.length}건, 지역 ${db.regions.length}개`);
