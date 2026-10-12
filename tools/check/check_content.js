#!/usr/bin/env node
/**
 * check_content.js — 콘텐츠 변경(교재 교체 등) 후 의존성 통합 검증
 *
 * run.js --preset content 호환 진입점 (ci.yml·npm 스크립트·문서 참조 유지용 심).
 * 단계 테이블은 tools/check/steps.js, 실행기는 tools/check/run.js에 있다.
 *
 * 사용법:
 *   npm.cmd run check:content            # 검증만 (읽기 전용 단계)
 *   npm.cmd run check:content -- --build # build:data 선실행 후 검증 (교재 교체 시 권장)
 *   npm.cmd run check:content -- --quick # DOM 테스트 생략 (빠른 확인)
 *   npm.cmd run check:content -- --content-only # 콘텐츠 추적 단계만 (CI용 — 파서·임포트·테스트 등 별도 게이트 제외)
 *
 * 종료코드: 실패 단계가 있으면 1
 */

// @spec none (run.js 호환 심)
const path = require('path');
process.argv.splice(1, 1, path.resolve(__dirname, 'run.js'), '--preset', 'content');
require('./run.js');
