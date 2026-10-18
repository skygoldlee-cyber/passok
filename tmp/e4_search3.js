const fs = require('fs');
const L = f => fs.readFileSync(f, 'utf-8').split(/\r?\n/);
const mfg = L('content/exams/cosmetic/교재/manufacturing/2과목_제조및품질관리_표준형.md');
const saf = L('content/exams/cosmetic/교재/safety/3과목_유통화장품안전관리_표준형.md');
const und = L('content/exams/cosmetic/교재/understanding/4과목_맞춤형화장품의이해_표준형.md');
const law = L('content/exams/cosmetic/교재/law/1과목_화장품법의이해_표준형.md');

function show(arr, name, kw, span = 0) {
  console.log('===== ' + name + ' — ' + kw);
  arr.forEach((l, i) => {
    if (l.includes(kw)) {
      for (let j = Math.max(0, i - span); j <= Math.min(arr.length - 1, i + span); j++)
        if (arr[j].trim()) console.log('  L' + (j + 1) + ': ' + arr[j].trim().slice(0, 110));
      console.log('  ---');
    }
  });
}

show(mfg, 'mfg', '미생물 번식');
show(mfg, 'mfg', '파라벤');
show(saf, 'saf', '머리카락', 1);
show(saf, 'saf', '에탄올');
show(und, 'und', '전극', 0);
show(und, 'und', 'pH 측정기', 0);
show(und, 'und', '교정', 0);
show(und, 'und', '의약품', 0);
show(law, 'law', '회수계획', 1);
// Q72 선지
const qb3 = fs.readFileSync('content/exams/cosmetic/문제은행/과목3_문제은행.md', 'utf-8');
const i = qb3.indexOf('### Q72.');
console.log('===== 과목3 Q72 선지 =====');
console.log(qb3.slice(i, i + 700).split('---')[0]);
