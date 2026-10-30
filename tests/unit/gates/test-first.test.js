// tests/unit/test-first.test.js — 테스트 선행 게이트(tools/check/check_test_first.js) 분류 로직 검증
// @spec none (게이트 도구 — 정적 검증)
import test from 'node:test';
import assert from 'node:assert/strict';
import checker from '../../../tools/check/check_test_first.js';

const { isTrigger, isTest, analyze, parseStatusLine, stripJsComments, stripPyComments, isCommentOnlyDiff } = checker;

test('실행 로직 경로는 테스트 동반 트리거다', () => {
    for (const f of [
        'src/shell/app.js', 'src/views/quiz/quiz.js', 'src/router.js',
        'ref-pipeline/pdf2md.py', 'ref-pipeline/convert.py',
    ]) {
        assert.ok(isTrigger(f), f);
    }
});

test('테스트·마크업·설정·문서·도구는 트리거가 아니다', () => {
    for (const f of [
        'tests/unit/x.test.js', 'tests/dom/y.dom.test.js',
        'ref-pipeline/tests/test_pdf2md.py',
        'css/base.css', 'html/views/x.html', 'index.html',
        'tools/check/check_docs_paths.js',   // tools/ 체커 — docsync가 감시
        'package.json', 'vercel.json', '.github/workflows/ci.yml',
        'sw.js', 'data/version.js', 'content/exams/x.md',
        'docs/dev/CHANGES.md', 'AGENTS.md', 'ref-pipeline/README.md',
    ]) {
        assert.ok(!isTrigger(f), f);
    }
});

test('src/ 하위 빌드 생성물은 트리거가 아니다 (GENERATED_SRC)', () => {
    for (const f of checker.GENERATED_SRC) {
        assert.ok(!isTrigger(f), f);
    }
});

test('테스트 경로는 인정된다', () => {
    for (const f of [
        'tests/unit/x.test.js', 'tests/e2e/y.spec.js',
        'ref-pipeline/tests/test_md2doc.py',
    ]) {
        assert.ok(isTest(f), f);
    }
    assert.ok(!isTest('src/state.js'));
});

test('analyze: 로직만 변경 → 위반', () => {
    const r = analyze(['src/shell/app.js', 'docs/dev/CHANGES.md']);
    assert.equal(r.violated, true);
    assert.deepEqual(r.triggers, ['src/shell/app.js']);
    assert.deepEqual(r.tests, []);
});

test('analyze: 로직 + 테스트 동반 → 통과', () => {
    assert.equal(analyze(['src/shell/app.js', 'tests/dom/app.dom.test.js']).violated, false);
    assert.equal(analyze(['ref-pipeline/pdf2md.py', 'ref-pipeline/tests/test_pdf2md.py']).violated, false);
});

test('analyze: 문서만 변경 → 트리거 없음', () => {
    const r = analyze(['AGENTS.md', 'docs/dev/SPEC.md']);
    assert.equal(r.triggers.length, 0);
    assert.equal(r.violated, false);
});

test('parseStatusLine: porcelain 상태 열 처리', () => {
    assert.equal(parseStatusLine(' M src/shell/app.js'), 'src/shell/app.js');
    assert.equal(parseStatusLine('?? tools/check/new.js'), 'tools/check/new.js');
    assert.equal(parseStatusLine('R  old.py -> ref-pipeline/new.py'), 'ref-pipeline/new.py');
});

// ---------- 주석 전용 diff 면제 ----------

test('stripJsComments: 라인·블록 주석 제거, 줄 구조 유지', () => {
    assert.equal(stripJsComments('let a = 1; // note\nlet b = 2;'), 'let a = 1; \nlet b = 2;');
    assert.equal(stripJsComments('/* blk\n * mid\n */\nlet x = 1;'), '\n\n\nlet x = 1;');
    // 미종결 블록 — 파일 끝까지 제거
    assert.equal(stripJsComments('let a = 1;\n/* open'), 'let a = 1;\n');
});

test('stripJsComments: 문자열·템플릿 내부는 주석으로 오인하지 않는다', () => {
    assert.equal(stripJsComments('const s = "http://a/b"; // c'), 'const s = "http://a/b"; ');
    assert.equal(stripJsComments("const q = '/* not comment */';"), "const q = '/* not comment */';");
    assert.equal(stripJsComments('const t = `tpl ${x} // keep`;'), 'const t = `tpl ${x} // keep`;');
});

test('stripJsComments: 정규식 vs 나눗셈 구분', () => {
    assert.equal(stripJsComments('x = a / b / c; // c'), 'x = a / b / c; ');
    assert.equal(stripJsComments('const r = /a\\/\\/b/; // c'), 'const r = /a\\/\\/b/; ');
    assert.equal(stripJsComments('return /re/.test(s);'), 'return /re/.test(s);');
    assert.equal(stripJsComments('const cls = /[/]/;'), 'const cls = /[/]/;');
});

test('stripPyComments: # 주석 제거, 문자열·삼중따옴표 보존', () => {
    assert.equal(stripPyComments('x = 1  # note\ny = "#not"'), 'x = 1  \ny = "#not"');
    assert.equal(stripPyComments('s = """doc # str"""\nt = \'#x\''), 's = """doc # str"""\nt = \'#x\'');
});

test('isCommentOnlyDiff: 주석·공백만 바뀐 diff는 면제', () => {
    assert.equal(isCommentOnlyDiff('let a=1; // old\nlet b=2;', 'let a=1; // new\nlet b=2;', 'js'), true);
    assert.equal(isCommentOnlyDiff('let a=1;', 'let a=1;\n\n// tail\n', 'js'), true);      // 주석·빈줄 추가만
    assert.equal(isCommentOnlyDiff('x = 1 # a', 'x = 1 # b', 'py'), true);             // Python 동일 규칙
});

test('isCommentOnlyDiff: 코드 변경·코드 주석 처리는 여전히 트리거', () => {
    assert.equal(isCommentOnlyDiff('let a=1;', 'let a=1;\n// c\nlet c=3;', 'js'), false);
    assert.equal(isCommentOnlyDiff('let a=1;', '// let a=1;', 'js'), false);           // 주석 처리 = 동작 변경
    assert.equal(isCommentOnlyDiff('', 'x = 1; // n', 'js'), false);                  // 신규 코드
    assert.equal(isCommentOnlyDiff('x = "a"', 'x = "b"', 'js'), false);               // 문자열 내용 변경
});
