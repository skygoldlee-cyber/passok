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
    const ansM = text.match(new RegExp('\\*\\*Q' + qn + '\\.\\*\\*[\\s\\S]*?정답:\\s*([^\\n\\[>]+)'));
    const ans = ansM ? ansM[1].trim().replace(/\*\*/g, '') : '?';
    // find where in stem the answer appears
    const idx = stem.indexOf(ans);
    const ctx = idx >= 0 ? stem.slice(Math.max(0, idx - 15), idx + ans.length + 15) : '';
    console.log('--- ' + subj + ' Q' + qn + ' 정답="' + ans + '"');
    console.log('    발문: ' + stem.slice(0, 120));
    console.log('    출현 위치: ...' + ctx + '...');
  }
}
