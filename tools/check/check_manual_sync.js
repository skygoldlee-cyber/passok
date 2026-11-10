// check_manual_sync.js — 사용자 매뉴얼 도움말 표 ↔ 도움말 메뉴 구성 대조
// @spec none
// 앱 도움말 메뉴에 항목이 추가·제거됐는데 매뉴얼 표가 미갱신이면 실패 (문서 drift 감지)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const TPL = path.join(ROOT, 'index.template.html');
const MANUAL = path.join(ROOT, 'docs/user/user_manual.md');

// 앱 버튼 식별자(id 또는 data-click) → 매뉴얼 도움말 표 1열 라벨
const APP_TO_MANUAL = {
    'onboarding-btn': '시작 안내',
    'service-intro-btn': '서비스 소개',
    'showPlanCompare': '플랜 안내',
    'shortcut-help-btn': '단축키',
    'whats-new-btn': '변경 이력',
    'ManualViewer.openPrivacyPolicy': '개인정보 처리방침',
    'showUsageStats': '내 사용 통계',
    'feedback-btn': '의견 보내기',
    'community-btn': 'Discord 커뮤니티',
};

const tpl = fs.readFileSync(TPL, 'utf8');
const manual = fs.readFileSync(MANUAL, 'utf8');

const hp = tpl.indexOf('id="help-panel"');
if (hp < 0) { console.error('✗ index.template.html에 help-panel이 없습니다'); process.exit(1); }
const panel = tpl.slice(hp, hp + 6000);

// 패널 안 버튼 식별자 수집 — 매핑에 없는 식별자는 '?' 접두로 미등록 표시
const found = new Set();
for (const m of panel.matchAll(/<button[^>]*(?:id|data-click)="([A-Za-z][\w.-]*)"/g)) {
    found.add(APP_TO_MANUAL[m[1]] ? m[1] : '?' + m[1]);
}

// 매뉴얼 도움말 표 라벨 수집 — '**? 도움말 메뉴**' 직후 연속 표 줄만 (다른 표 흡수 방지)
const mi = manual.indexOf('**? 도움말 메뉴**');
if (mi < 0) { console.error('✗ user_manual.md에 도움말 메뉴 섹션이 없습니다'); process.exit(1); }
const labels = new Set();
let inTable = false;
for (const line of manual.slice(mi).split('\n').slice(0, 80)) {
    const row = line.match(/^\|\s*([^|]+?)\s*\|/);
    if (!row) { if (inTable) break; continue; }
    inTable = true;
    const l = row[1].trim();
    if (l !== '항목' && !/^-{2,}$/.test(l)) labels.add(l);
}

const problems = [];
for (const key of found) {
    if (key.startsWith('?')) {
        problems.push(`도움말 메뉴에 미등록 버튼: ${key.slice(1)} — APP_TO_MANUAL 매핑 추가 후 매뉴얼 행 확인`);
        continue;
    }
    if (!labels.has(APP_TO_MANUAL[key])) {
        problems.push(`앱 항목 ${key}에 대응하는 매뉴얼 행 없음: '${APP_TO_MANUAL[key]}'`);
    }
}
for (const [key, label] of Object.entries(APP_TO_MANUAL)) {
    if (!found.has(key)) problems.push(`앱에서 사라진 버튼(매핑/표 정리 필요): ${key} → '${label}'`);
}
for (const label of labels) {
    if (!Object.values(APP_TO_MANUAL).includes(label)) {
        problems.push(`매뉴얼 표에만 있는 항목: '${label}' — 앱 메뉴에 대응 항목이 없습니다`);
    }
}

if (problems.length) {
    problems.forEach((p) => console.error('✗', p));
    process.exit(1);
}
console.log(`✅ 도움말 메뉴 정합 — 앱 항목 ${[...found].filter(k => !k.startsWith('?')).length}개 ↔ 매뉴얼 ${labels.size}행`);
