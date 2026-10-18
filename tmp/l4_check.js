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
  for (const m of t.matchAll(/\*\*Q(\d+)\*\* — [^\n]*L4/g)) (flagged[subj] ||= []).push(+m[1]);
}
for (const [subj, f] of Object.entries(files)) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const qn of (flagged[subj] || []).sort((a, b) => a - b)) {
    const i = lines.findIndex(l => l.startsWith('### Q' + qn + '.'));
    if (i < 0) continue;
    const stem = lines[i].replace(/^### Q\d+\.\s*/, '');
    const opts = [];
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      const m = lines[j].match(/^\s*[①②③④⑤]\s*(.+)/);
      if (m) opts.push(m[1].trim());
      else if (opts.length && lines[j].trim() === '---') break;
    }
    const ansM = text.match(new RegExp('\\*\\*Q' + qn + '\\.\\*\\*[\\s\\S]{0,200}?정답:\\s*([①②③④⑤\\d]+)'));
    const ans = ansM ? ansM[1] : '?';
    const marks = ['①', '②', '③', '④', '⑤'];
    const ansIdx = marks.indexOf(ans);
    const lens = opts.map(o => o.length);
    const maxIdx = lens.indexOf(Math.max(...lens));
    const isAnsLongest = ansIdx === maxIdx;
    console.log((isAnsLongest ? '!!!' : ' - ') + ' ' + subj + ' Q' + qn + ' 정답=' + ans + (isAnsLongest ? ' ← 최장 선지가 정답' : ''));
    opts.forEach((o, k) => console.log('    ' + marks[k] + ' (' + o.length + '자) ' + o.slice(0, 70)));
  }
}
