// tests/unit/refmd-syllabus-flat.test.js
// @spec CS-03,CS-09
// 출제기준 문서 저장 규약 — 전 시험 팩 통일:
//   참조자료/ref_md/{시험명} 출제기준({발급기관})({연도}).md  (평탄형, 과목 공통)
// 과목 문서만 ref_md/과목N/{문서}/{문서}.md 구조를 따른다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const exams = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'exams.json'), 'utf8')).exams;

function syllabusFiles(root) {
    const refMd = path.join(root, '참조자료', 'ref_md');
    if (!fs.existsSync(refMd)) return { flat: [], nested: [] };
    const flat = [], nested = [];
    for (const e of fs.readdirSync(refMd, { withFileTypes: true })) {
        if (e.isFile() && e.name.includes('출제기준') && e.name.endsWith('.md')) flat.push(e.name);
        else if (e.isDirectory() && /^과목\d$/.test(e.name)) {
            for (const d of fs.readdirSync(path.join(refMd, e.name), { withFileTypes: true })) {
                if (d.isDirectory() && d.name.includes('출제기준')) nested.push(`${e.name}/${d.name}`);
            }
        }
    }
    return { flat, nested };
}

test('출제기준은 ref_md/ 직하 평탄 파일 (전 팩)', () => {
    for (const x of exams) {
        const { flat, nested } = syllabusFiles(path.join(ROOT, x.contentRoot));
        assert.equal(nested.length, 0, `${x.id}: 과목N/ 중첩 출제기준 잔존 — ${nested.join(', ')}`);
        assert.equal(flat.length, 1, `${x.id}: ref_md/ 직하 출제기준 1건 필요 — 실제 ${flat.length}건`);
    }
});
