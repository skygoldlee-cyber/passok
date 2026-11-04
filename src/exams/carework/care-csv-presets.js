// src/exams/carework/care-csv-presets.js — ERP 수급자 명부 가져오기 프리셋 (순수 로직)
// @spec CO-07 — 시험 전용 도메인 로직 (DA-13)
// 롱텀 수급자목록·이지케어·케어포 등 외부 엑셀의 컬럼 alias → 정식 헤더로 정규화 후 기존 파서 위임
import { csvToClients } from './care-client-csv.js';

/** 외부 헤더 → 정식 컬럼 (성명,상태,호실,생년월일,비상연락처,알레르기,주의사항,메모) */
const ALIAS = {
    성명: '성명', 수급자명: '성명', '수급자 성명': '성명', 어르신명: '성명', 대상자: '성명', 이름: '성명',
    상태: '상태', 이용상태: '상태',
    호실: '호실', 생활실: '호실', 방: '호실', 방번호: '호실',
    생년월일: '생년월일', 생일: '생년월일', 생년: '생년월일',
    비상연락처: '비상연락처', 연락처: '비상연락처', 보호자연락처: '비상연락처', '보호자 연락처': '비상연락처', 전화번호: '비상연락처',
    알레르기: '알레르기',
    주의사항: '주의사항', 특이사항: '주의사항', 유의사항: '주의사항',
    메모: '메모', 비고: '메모',
};

/**
 * 외부 CSV/엑셀 텍스트 → 수급자 레코드 배열
 * 첫 행(헤더)의 alias를 정식 헤더로 치환 후 csvToClients 위임 — 매칭 안 되는 열은 서류 열 규칙 그대로
 * @param {string} text
 * @returns {Array}
 */
export function csvToClientsAny(text) {
    const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
    if (!lines.length) return [];
    const head = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    if (!head.some(h => ALIAS[h])) return csvToClients(text); // 외부 형식 아님 — 기존 파서 그대로
    lines[0] = head.map(h => ALIAS[h] || h).join(',');
    return csvToClients(lines.join('\n'));
}
