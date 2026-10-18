const fs = require('fs');
const targets = {1:[24,88],2:[112],3:[112,178],4:[27,176,251]};
for (const [s, qs] of Object.entries(targets)) {
  const f = 'content/exams/cosmetic/문제은행/과목' + s + '_문제은행.md';
  const t = fs.readFileSync(f, 'utf-8');
  for (const qn of qs) {
    const re = new RegExp('\\*\\*Q' + qn + '\\.\\*\\*\\n([\\s\\S]*?)(?=\\*\\*Q\\d+\\.\\*\\*|$)');
    const m = t.match(re);
    if (!m) { console.log('=== 과목' + s + ' Q' + qn + ': 미발견'); continue; }
    const expl = (m[1].match(/\*\*해설\*\*:\s*([^\n]+)/) || [])[1] || '(없음)';
    console.log('=== 과목' + s + ' Q' + qn);
    console.log(expl.slice(0, 350));
  }
}
