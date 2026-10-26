// tools/lib/generated_files.js — 빌드 체인이 생성하는 src/ 하위 산출물 경로 (단일 소스)
//
// src/ 아래에 두는 생성물은 git 추적 대상이면서도 사람이 편집하지 않는다.
// 게이트(check_test_first·check_doc_sync)가 이 파일들의 변경을 로직 변경으로
// 오인하지 않도록 이 목록을 단일 소스로 사용한다.
// 새로운 src/ 생성물이 생기면 여기에 등록하고, 생성 스크립트를 주석으로 병기한다.
const GENERATED_SRC = [
    'src/keyword-index.js',   // tools/build/build_keyword_index.js
    'src/law-links.js',       // tools/build/build_pdf_registry.js (lawdb 연동)
    'src/pdf-registry.js',    // tools/build/build_pdf_registry.js
];

module.exports = { GENERATED_SRC };
