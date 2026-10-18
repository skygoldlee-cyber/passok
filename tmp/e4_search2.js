const fs = require('fs');
const path = require('path');

// 코퍼스 전체 파일 목록
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
function linesOf(f) { if (!cache[f]) cache[f] = fs.readFileSync(f, 'utf-8').split(/\r?\n/); return cache[f]; }

const searches = [
  { tag: 'Q54 유리전극', kws: ['유리전극'] },
  { tag: 'Q54 KCl', kws: ['염화칼륨', 'KCl'] },
  { tag: 'Q65 교정', kws: ['다점 교정', '다점교정', '점 교정'] },
  { tag: 'Q65 완충', kws: ['완충용액', '표준완충액'] },
  { tag: 'Q98 메니스커스', kws: ['메니스커스', '피벳'] },
  { tag: 'Q72 회수계획서 기한', kws: ['회수계획서'] },
  { tag: 'Q322 에탄올70', kws: ['70% 에탄올', '에탄올 70', '소독용 에탄올', '70%(v/v)', '70 %'] },
  { tag: 'Q151 보존제 역할', kws: ['보존제는', '보존제의', '미생물 번식', '미생물의 번식'] },
  { tag: 'Q49 부적합품 보관', kws: ['부적합품 보관', '부적합품 구역', '구획된 장소'] },
];
for (const s of searches) {
  console.log('===== ' + s.tag + ' =====');
  let n = 0;
  for (const f of corpus) {
    linesOf(f).forEach((l, i) => {
      if (s.kws.some(k => l.includes(k)) && l.trim() && n < 8) {
        n++;
        console.log('  ' + f.replace(/content\\exams\\cosmetic\\/, '').slice(0, 60) + ' L' + (i + 1) + ': ' + l.trim().slice(0, 80));
      }
    });
  }
  if (!n) console.log('  (코퍼스 전체에 없음)');
}

// 문항 선지 확인
const qbank = {
  3: fs.readFileSync('content/exams/cosmetic/문제은행/과목3_문제은행.md', 'utf-8'),
  4: fs.readFileSync('content/exams/cosmetic/문제은행/과목4_문제은행.md', 'utf-8'),
  2: fs.readFileSync('content/exams/cosmetic/문제은행/과목2_문제은행.md', 'utf-8'),
};
for (const [s, qn] of [[3, 49], [4, 218], [2, 151]]) {
  const t = qbank[s];
  const i = t.indexOf('### Q' + qn + '.');
  console.log('===== 과목' + s + ' Q' + qn + ' 선지 =====');
  console.log(t.slice(i, i + 600).split('---')[0]);
}
