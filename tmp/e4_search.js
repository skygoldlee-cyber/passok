const fs = require('fs');
const path = 'content/exams/cosmetic/교재/';
const files = {
  law: 'law/1과목_화장품법의이해_표준형.md',
  manufacturing: 'manufacturing/2과목_제조및품질관리_표준형.md',
  safety: 'safety/3과목_유통화장품안전관리_표준형.md',
  understanding: 'understanding/4과목_맞춤형화장품의이해_표준형.md',
};
const targets = [
  { s: 2, q: 151, kws: ['보존제'] },
  { s: 3, q: 6, kws: ['선입선출'] },
  { s: 3, q: 49, kws: ['부적합'] },
  { s: 3, q: 53, kws: ['위생모', '두발'] },
  { s: 3, q: 72, kws: ['회수계획'] },
  { s: 3, q: 101, kws: ['정제수', '제조용수', '제조용 물'] },
  { s: 4, q: 54, kws: ['유리전극', '염화칼륨', 'KCl'] },
  { s: 4, q: 65, kws: ['다점 교정', '교정', '완충용액', '캘리브레이션'] },
  { s: 4, q: 98, kws: ['메니스커스'] },
  { s: 4, q: 218, kws: ['아토피', '피부 상태'] },
  { s: 4, q: 322, kws: ['에탄올', '70%'] },
];
const subjFile = { 1: 'law', 2: 'manufacturing', 3: 'safety', 4: 'understanding' };
for (const t of targets) {
  const fl = fs.readFileSync(path + files[subjFile[t.s]], 'utf-8').split(/\r?\n/);
  console.log('===== 과목' + t.s + ' Q' + t.q + ' — ' + t.kws.join('/'));
  const hits = [];
  fl.forEach((l, i) => {
    if (t.kws.some(k => l.includes(k)) && l.trim()) hits.push('  L' + (i + 1) + ': ' + l.trim().slice(0, 90));
  });
  hits.slice(0, 12).forEach(h => console.log(h));
  if (!hits.length) console.log('  (해당 과목 파일에 키워드 없음 — 다른 과목/참조자료 검색 필요)');
}
