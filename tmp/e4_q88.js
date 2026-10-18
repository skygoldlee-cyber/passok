const fs = require('fs');
const t = fs.readFileSync('content/exams/cosmetic/문제은행/과목1_문제은행.md', 'utf-8');
for (const qn of [24, 88]) {
  const i = t.indexOf('**Q' + qn + '.**');
  const j = t.indexOf('**Q' + (qn + 1) + '.**', i);
  console.log('===Q' + qn + '===');
  console.log(t.slice(i, j > 0 ? j : i + 800));
}
const law = fs.readFileSync('content/exams/cosmetic/교재/law/1과목_화장품법의이해_표준형.md', 'utf-8').split(/\r?\n/);
console.log('=== 처분표 검색');
law.forEach((l, i) => {
  if (/품목.*업무정지|업무정지.*품목|허위|잘못 인식/.test(l) && i > 700 && i < 850)
    console.log('L' + (i + 1) + ': ' + l.trim().slice(0, 130));
});
