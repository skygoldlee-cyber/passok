const fs = require('fs');
const path = require('path');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
const corpus = walk('content/exams/cosmetic/교재').concat(walk('content/exams/cosmetic/참조자료'));
const cache = {};
const linesOf = f => (cache[f] ||= fs.readFileSync(f, 'utf-8').split(/\r?\n/));

const searches = [
  { tag: 's1Q24 정신질환자 결격', kws: ['정신질환', '결격사유'] },
  { tag: 's1Q88 의약품 오인 처분', kws: ['의약품으로 잘못', '의약품으로 오인'] },
  { tag: 's2Q112 적합 라벨 색상', kws: ['적합 라벨', '청색', '녹색 라벨', '라벨 색상'] },
  { tag: 's3Q112 폐기 규정', kws: ['폐기 승인', '폐기 절차', '폐기해야'] },
  { tag: 's4Q27 캘리브레이션', kws: ['캘리브레이션', '교정', '분동'] },
  { tag: 's4Q176 알칼리 피부', kws: ['알칼리'] },
  { tag: 's4Q251 기저층 분열', kws: ['기저층', '턴오버', '각화'] },
];
for (const s of searches) {
  console.log('===== ' + s.tag);
  let n = 0;
  for (const f of corpus) {
    if (n >= 8) break;
    linesOf(f).forEach((l, i) => {
      if (n < 8 && s.kws.some(k => l.includes(k)) && l.trim()) {
        n++;
        console.log('  ' + f.split(/\\/).slice(-2).join('/') + ' L' + (i + 1) + ': ' + l.trim().slice(0, 85));
      }
    });
  }
  if (!n) console.log('  (없음)');
}
const qb = {};
[1,2,3,4].forEach(s => qb[s] = fs.readFileSync('content/exams/cosmetic/문제은행/과목' + s + '_문제은행.md', 'utf-8'));
for (const [s, qn] of [[1,24],[1,88],[2,112],[3,112],[4,27],[4,176],[4,251]]) {
  const i = qb[s].indexOf('### Q' + qn + '.');
  console.log('===== 과목' + s + ' Q' + qn + ' 선지');
  console.log(qb[s].slice(i, i + 550).split('---')[0]);
}
