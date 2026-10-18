const fs = require('fs');
const targets = {1:[3],2:[28,135,151],3:[6,49,53,72,94,101],4:[54,65,98,218,322]};
for (const [s, qs] of Object.entries(targets)) {
  const f = 'content/exams/cosmetic/문제은행/과목' + s + '_문제은행.md';
  const t = fs.readFileSync(f, 'utf-8');
  // 정답 섹션: **Qn.** 블록
  for (const qn of qs) {
    const re = new RegExp('\\*\\*Q' + qn + '\\.\\*\\*\\n([\\s\\S]*?)(?=\\*\\*Q\\d+\\.\\*\\*|$)');
    const m = t.match(re);
    if (!m) { console.log('=== 과목' + s + ' Q' + qn + ': 정답블록 미발견'); continue; }
    const b = m[1];
    const ans = (b.match(/정답:\s*([^\s*]+)/) || [])[1] || '?';
    const expl = (b.match(/\*\*해설\*\*:\s*([^\n]+)/) || [])[1] || '(해설 없음)';
    const link = (b.match(/\((<[^>]+>|[^)]+)#L(\d+)\)/) || []);
    console.log('=== 과목' + s + ' Q' + qn + ' | 정답 ' + ans + ' | L' + (link[2] || '?'));
    console.log(expl.slice(0, 300));
  }
}
