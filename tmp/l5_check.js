const fs = require('fs');
const files = {
  subject1: 'content/exams/cosmetic/문제은행/과목1_문제은행.md',
  subject2: 'content/exams/cosmetic/문제은행/과목2_문제은행.md',
  subject3: 'content/exams/cosmetic/문제은행/과목3_문제은행.md',
  subject4: 'content/exams/cosmetic/문제은행/과목4_문제은행.md',
};
const flagged = {};
for (const f of fs.readdirSync('tmp/ai_drafts').filter(x => x.startsWith('lint_subject'))) {
  const t = fs.readFileSync('tmp/ai_drafts/' + f, 'utf8');
  const subj = f.match(/lint_(subject\d)/)[1];
  for (const m of t.matchAll(/\*\*Q(\d+)\*\* — L5/g)) (flagged[subj] ||= []).push(+m[1]);
}
for (const [subj, f] of Object.entries(files)) {
  const text = fs.readFileSync(f, 'utf8');
  for (const qn of (flagged[subj] || []).sort((a, b) => a - b)) {
    const stem = (text.match(new RegExp('### Q' + qn + '\\. (.*)')) || [])[1] || '?';
    const ansM = text.match(new RegExp('\\*\\*Q' + qn + '\\.\\*\\*[\\s\\S]*?정답:\\s*([^\\s\\[>]+)'));
    const ans = ansM ? ansM[1].replace(/\*\*/g, '') : '?';
    const real = ans !== '?' && stem.includes(ans);
    console.log(subj + ' Q' + qn + ': 정답="' + ans + '" (' + ans.length + '자) 실포함=' + real);
  }
}
