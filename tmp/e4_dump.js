const fs = require('fs');
const targets = {2:[151],3:[6,49,53,72,101],4:[54,65,98,218,322]};
for (const [s, qs] of Object.entries(targets)) {
  const f = 'content/exams/cosmetic/문제은행/과목' + s + '_문제은행.md';
  const t = fs.readFileSync(f, 'utf-8');
  for (const qn of qs) {
    const re = new RegExp('\\*\\*Q' + qn + '\\.\\*\\*\\n([\\s\\S]*?)(?=\\*\\*Q\\d+\\.\\*\\*|$)');
    const m = t.match(re);
    console.log('===== 과목' + s + ' Q' + qn + ' =====');
    console.log(m ? m[1].slice(0, 900) : '미발견');
  }
}
