const fs = require('fs');
const f = 'content/exams/cosmetic/문제은행/과목2_문제은행.md';
let t = fs.readFileSync(f, 'utf8');
const pairs = [
  ['② 살리실릭애씨드로서 0.5%, 영유아·어린이용 표시 제품은 사용금지(샴푸 제외)',
   '② 살리실릭애씨드로서 0.5%, 영유아·어린이용은 사용금지(샴푸 제외)'],
  ['④ 노출량과 독성 반응의 정량적 인과관계로 최대무작용량(NOAEL)을 구한다.',
   '④ 노출량-독성 반응의 인과관계로 최대무작용량(NOAEL)을 구한다'],
  ['③ 위험·용량반응·노출 평가를 종합해 위해 가능성과 강도를 최종 판정하는 단계',
   '③ 위험·용량반응·노출 평가를 종합해 위해를 최종 판정하는 단계'],
];
for (const [a, b] of pairs) {
  if (!t.includes(a)) { console.log('MISS: ' + a.slice(0, 40)); continue; }
  t = t.split(a).join(b);
}
fs.writeFileSync(f, t);
console.log('done');
