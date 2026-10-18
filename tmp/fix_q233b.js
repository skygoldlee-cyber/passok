const fs = require('fs');
const p = 'content/exams/cosmetic/문제은행/과목2_문제은행.md';
let t = fs.readFileSync(p, 'utf8');
const from = '> **정답: 유기농화장품** [교재: L2334](<../교재/manufacturing/2과목_제조및품질관리_표준형.md#L2334>)\n>';
const to = '> **정답: 유기농화장품** [교재: L2334](<../교재/manufacturing/2과목_제조및품질관리_표준형.md#L2334>)\n>\n> **허용 정답:** 유기농\n>';
if (!t.includes(from)) { console.log('MISS'); process.exit(1); }
t = t.split(from).join(to);
fs.writeFileSync(p, t);
console.log('done');
