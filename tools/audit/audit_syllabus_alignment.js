// tools/audit/audit_syllabus_alignment.js — 교재 과목·챕터 구조 ↔ 출제기준 문서 정합성 감사
// 각 시험 팩의 manifest subjects[].chapters(표준형 교재) 챕터 헤딩(## N. 제목)과
// 참조자료/ref_md/*출제기준*.md 표의 주요항목(N.M 항목명)을 비교한다.
// 과목 매칭은 출제기준 표의 과목 그룹 출현 순서 ↔ manifest subjects 순서 기반 (이름 유사도 폴백).
// 산출: 과목별 커버리지 + 미매칭 챕터 + 출제기준 미반영 항목 — advisory 감사 (게이트 아님)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXAMS_DIR = 'content/exams';
const norm = s => (s || '').replace(/[\s,.·()\[\]【】'"'"'`~\-_]|\.+/g, '').toLowerCase();
const stripNum = s => (s || '').replace(/^\d+(\.\d+)*\.?\s*/, '').trim();

// 출제기준 표 파싱 — | 과목 | 주요항목 | 세부내용 | (열 순서는 고정 가정, 헤더는 스킵)
function parseSyllabus(md) {
    const rows = [];
    let curSubject = '';
    for (const line of md.split(/\r?\n/)) {
        if (!line.trim().startsWith('|')) continue;
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (cells.length < 3 || /^-+/.test(cells[0]) || cells[0] === '과목') continue;
        if (cells[0]) curSubject = stripNum(cells[0]);
        const m = cells[1].match(/^(\d+)\.(\d+(?:\.\d+)*)\.?\s*(.+)$/);
        rows.push({
            subject: curSubject,
            itemNum: m ? m[1] + '.' + m[2] : '',
            item: stripNum(cells[1]),
            details: (cells[2] || '').split(/<br\s*\/?>/i).map(d => d.trim()).filter(Boolean),
        });
    }
    return rows;
}

// 교재 표준형 — ## N. 제목 (챕터) 추출. ## 번호 부재 시 ### N. 로 폴백
function extractUnits(file) {
    if (!fs.existsSync(file)) return [];
    const units = [];
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^(#{2,3})\s+(\d+)\.?\s+(.+)$/);
        if (m && !m[3].includes('Chapter')) units.push({ lvl: m[1].length, title: m[3].replace(/[#*_`🎯].*$/, '').trim() });
    }
    const lvl2 = units.filter(u => u.lvl === 2);
    return lvl2.length ? lvl2 : units;
}

const bigrams = s => { const n = norm(s), g = new Set(); for (let i = 0; i < n.length - 1; i++) g.add(n.slice(i, i + 2)); return g; };
function similar(a, b) {
    const na = norm(a), nb = norm(b);
    if (!na || !nb) return false;
    if (na.includes(nb) || nb.includes(na)) return true;
    const A = bigrams(a), B = bigrams(b);
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    return inter / (A.size + B.size - inter) >= 0.5;
}

// Q-net 텍스트 형식 파싱 — '주요항목' 헤더 이후, 비번호 행=과목명, 'N. ' 행 중
// 다음 번호 행이 '1.'로 재시작하면 주요항목(새 세부 블록 시작), 아니면 세부항목
function parseQnet(md) {
    const lines = md.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const start = lines.findIndex(l => l.includes('주요항목'));
    if (start < 0) return [];
    const rows = [];
    let cur = null;
    const isNum = l => /^\d+\.\s/.test(l);
    for (let i = start + 1; i < lines.length; i++) {
        const l = lines[i];
        if (!isNum(l)) { cur = { name: l.replace(/[()]/g, ''), items: [] }; rows.push(cur); continue; }
        if (!cur) continue;
        const next = lines[i + 1];
        if (next && /^1\.\s/.test(next)) cur.items.push({ item: stripNum(l), details: [] });
        else if (cur.items.length) cur.items[cur.items.length - 1].details.push(stripNum(l));
    }
    // rows → sylRows 호환 형태로 평탄화 (과목 그룹당 주요항목 행)
    const out = [];
    for (const g of rows) for (const it of g.items) out.push({ subject: g.name, itemNum: '', item: it.item, details: it.details });
    return out;
}

function findSyllabusDocs(examDir) {
    const refRoot = path.join(examDir, '참조자료', 'ref_md');
    const docs = [];
    if (!fs.existsSync(refRoot)) return docs;
    const seen = new Set();
    const walk = d => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.md') && e.name.includes('출제기준')) {
                const md = fs.readFileSync(p, 'utf8');
                const h = crypto.createHash('sha1').update(md).digest('hex');
                if (!seen.has(h)) { seen.add(h); docs.push(p); }
            }
        }
    };
    walk(refRoot);
    return docs;
}

const report = [];
let grandSubjects = 0, grandUnits = 0, grandUnmatched = 0, grandNoSyll = 0, grandNoTable = 0;

for (const examId of fs.readdirSync(EXAMS_DIR)) {
    const dir = path.join(EXAMS_DIR, examId);
    const manPath = path.join(dir, 'manifest.json');
    if (!fs.existsSync(manPath)) continue;
    const subjects = (JSON.parse(fs.readFileSync(manPath, 'utf8')).subjects || []);
    const sylDocs = findSyllabusDocs(dir);
    const sylRows = sylDocs.flatMap(p => {
        const md = fs.readFileSync(p, 'utf8');
        const r = parseSyllabus(md);
        return r.length ? r : parseQnet(md);
    });

    report.push(`\n## ${examId} — 출제기준 ${sylDocs.length}종 / 과목 ${subjects.length}개`);
    if (!sylDocs.length) { report.push('- ⚠ 출제기준 문서 부재'); grandNoSyll += subjects.length; continue; }
    if (!sylRows.length) { report.push('- ⚠ 표 형식 아님 (수동 대조 필요)'); grandNoTable += subjects.length; continue; }

    // 과목 그룹 출현 순서로 분할 → manifest 순서와 대응
    const groups = [];
    for (const r of sylRows) {
        const g = groups.find(x => x.name === r.subject);
        if (g) g.rows.push(r); else groups.push({ name: r.subject, rows: [r] });
    }

    subjects.forEach((subj, i) => {
        grandSubjects++;
        const chapFiles = (subj.chapters || []).map(c => path.join(dir, subj.dir || '', c.file));
        const units = chapFiles.flatMap(extractUnits);
        grandUnits += units.length;
        if (!units.length) {
            report.push(`- ${subj.name}: ⚠ 교재 챕터 부재 또는 헤딩 형식 다름`);
            return;
        }
        const grp = groups.find(g => similar(g.name, subj.name)) || groups[i];
        const rows = grp ? grp.rows : [];

        // 교재 본문 전체 텍스트 (세부내용 커버리지 판정용)
        const body = chapFiles.filter(f => fs.existsSync(f)).map(f => norm(fs.readFileSync(f, 'utf8'))).join(' ');
        const bodyHas = d => { const n = norm(d); return n.length >= 4 && body.includes(n); };

        const unmatched = units.filter(u => !rows.some(r => similar(u.title, r.item) || r.details.some(d => similar(u.title, d))));
        // 미반영 = 항목명도 세부내용도 교재 본문에서 발견되지 않는 출제기준 항목 (실질 공백)
        const unref = rows.filter(r =>
            !units.some(u => similar(u.title, r.item) || r.details.some(d => similar(u.title, d)))
            && !bodyHas(r.item)
            && r.details.filter(bodyHas).length < Math.ceil(r.details.length * 0.5));
        grandUnmatched += unmatched.length;
        report.push(`- ${subj.name}: 챕터 ${units.length} · 기준 항목 ${rows.length}` +
            ` | 미매칭 ${unmatched.length}${unmatched.length ? ': ' + unmatched.slice(0, 4).map(u => u.title).join(' | ') : ''}` +
            ` | 미반영 ${unref.length}${unref.length ? ': ' + unref.slice(0, 4).map(r => r.itemNum + ' ' + r.item).join(' | ') : ''}`);
    });
}

console.log('# 교재 ↔ 출제기준 정합 감사\n');
console.log(`과목 ${grandSubjects}개 · 챕터 총 ${grandUnits} · 미매칭 ${grandUnmatched} · 문서부재 ${grandNoSyll} · 비표형식 ${grandNoTable}`);
console.log(report.join('\n'));
