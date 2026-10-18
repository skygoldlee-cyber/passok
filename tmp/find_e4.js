const fs = require('fs');
const targets = {1:[3],2:[28,135,151],3:[6,49,53,72,94,101],4:[54,65,98,218,322]};
for (const [s, qs] of Object.entries(targets)) {
  const f = 'content/exams/cosmetic/문제은행/과목' + s + '_문제은행.md';
  const t = fs.readFileSync(f, 'utf-8');
  const blocks = t.split(/^### /m);
  for (const qn of qs) {
    const b = blocks.find(x => x.startsWith('Q' + qn + '.'));
    if (!b) { console.log('=== 과목' + s + ' Q' + qn + ': 미발견'); continue; }
    const head = b.split('\n')[0];
    const ans = (b.match(/\*\*정답\*\*:\s*(\S+)/) || [])[1] || '?';
    const cite = (b.match(/📖[^\n]*L(\d+)[^\n]*/) || [])[0] || '?';
    const quote = (b.match(/>\s*["'「]?([^>\n]{10,150})/) || [])[1] || '?';
    const expl = (b.match(/>\s*\*\*해설\*\*:\s*([^\n]+)/) || [])[1] || '';
    console.log('=== 과목' + s + ' Q' + qn + ' | 정답 ' + ans + ' | ' + cite);
    console.log('  발문: ' + head.slice(0, 120));
    console.log('  인용문: ' + quote.slice(0, 100));
    console.log('  해설: ' + expl.slice(0, 100));
  }
}
