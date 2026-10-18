const fs = require('fs');
const f = 'content/exams/cosmetic/문제은행/과목4_문제은행.md';
let t = fs.readFileSync(f, 'utf-8');
const DEL = 251;

// 1) 발문 블록 제거: '### Q251.' ~ 다음 '### Q' 직전(구분선 --- 포함)
const stemRe = /### Q251\.[\s\S]*?---\n/;
if (!stemRe.test(t)) { console.log('발문 블록 미발견'); process.exit(1); }
t = t.replace(stemRe, '');

// 2) 정답 블록 제거: '**Q251.**' ~ 다음 '**Q' 직전
const ansRe = /\*\*Q251\.\*\*\n[\s\S]*?(?=\*\*Q\d+\.\*\*|$)/;
if (!ansRe.test(t)) { console.log('정답 블록 미발견'); process.exit(1); }
t = t.replace(ansRe, '');

// 3) 번호 재정렬
t = t.replace(/### Q(\d+)\./g, (m, n) => +n > DEL ? '### Q' + (+n - 1) + '.' : m);
t = t.replace(/\*\*Q(\d+)\.\*\*/g, (m, n) => +n > DEL ? '**Q' + (+n - 1) + '.**' : m);

// 4) 헤더 문항수 갱신 (선다형 -1)
t = t.replace(/총 (\d+)제 \(선다형 (\d+)제 \+ 단답형 (\d+)제\)/,
  (m, a, b, c) => '총 ' + (+a - 1) + '제 (선다형 ' + (+b - 1) + '제 + 단답형 ' + c + '제)');
fs.writeFileSync(f, t);
console.log('과목4 Q' + DEL + ' 제거 + 재번호 완료');

// 5) manifest title + exams.json desc 동기화
const mf = 'content/exams/cosmetic/manifest.json';
let m = fs.readFileSync(mf, 'utf-8');
m = m.replace('맞춤형화장품의 이해 (574제)', '맞춤형화장품의 이해 (573제)');
fs.writeFileSync(mf, m);
const ej = 'content/exams.json';
let e = fs.readFileSync(ej, 'utf-8');
e = e.replace('문제은행 1,447문', '문제은행 1,446문');
fs.writeFileSync(ej, e);
console.log('manifest 574→573제, exams.json 1447→1446문');
