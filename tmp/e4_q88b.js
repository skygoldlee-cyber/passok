const fs = require('fs');
const path = require('path');
function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, o);
    else if (e.name.endsWith('.md')) o.push(p);
  }
  return o;
}
for (const f of walk('content/exams/cosmetic/참조자료')) {
  const ls = fs.readFileSync(f, 'utf-8').split(/\r?\n/);
  ls.forEach((l, i) => {
    if (/의약품으로 잘못 인식|의약품으로 오인|기능성화장품으로 잘못 인식/.test(l) && /정지|개월/.test(l))
      console.log(path.basename(f) + ' L' + (i + 1) + ': ' + l.trim().slice(0, 160));
  });
}
