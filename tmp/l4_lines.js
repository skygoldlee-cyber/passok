const fs = require('fs');
const files = {
  subject1: 'content/exams/cosmetic/문제은행/과목1_문제은행.md',
  subject2: 'content/exams/cosmetic/문제은행/과목2_문제은행.md',
  subject3: 'content/exams/cosmetic/문제은행/과목3_문제은행.md',
  subject4: 'content/exams/cosmetic/문제은행/과목4_문제은행.md',
};
const targets = {
  subject2: [8, 33, 72, 78, 89, 90, 94, 96, 99, 101, 107, 113, 117, 239],
  subject3: [3, 23, 30, 36, 46, 152, 153, 154, 155, 157, 163, 164, 165, 166, 167],
  subject4: [19, 20, 33, 64, 65, 80, 92, 106, 113, 117],
};
for (const [subj, f] of Object.entries(files)) {
  if (!targets[subj]) continue;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  for (const qn of targets[subj]) {
    const i = lines.findIndex(l => l.startsWith('### Q' + qn + '.'));
    if (i < 0) continue;
    console.log('=== ' + subj + ' Q' + qn + ' (line ' + (i + 1) + ')');
    for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
      if (/^\s*[①②③④⑤]/.test(lines[j])) console.log('    ' + JSON.stringify(lines[j]));
      else if (lines[j].trim() === '---') break;
    }
  }
}
