const fs = require('fs');
const p = 'content/exams/cosmetic/문제은행/과목2_문제은행.md';
let t = fs.readFileSync(p, 'utf8');
const pairs = [
  ['화장품에 유기농 원료를 10% 이상 처방하고 천연 원료를 95% 이상 사용할 경우 이를 **[  (A)  ]**화장품이라고 표시·광고할 수 있다.',
   '화장품에 유기농 원료를 10% 이상 처방하고 천연 원료를 95% 이상 사용할 경우 이를 **[  (A)  ]**이라고 표시·광고할 수 있다.'],
  ['> **정답: 유기농** [교재: L2334]',
   '> **정답: 유기농화장품** [교재: L2334]'],
];
for (const [a, b] of pairs) {
  if (!t.includes(a)) { console.log('MISS: ' + a.slice(0, 50)); continue; }
  t = t.split(a).join(b);
}
fs.writeFileSync(p, t);
console.log('done');
