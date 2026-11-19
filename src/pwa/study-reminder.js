// src/pwa/study-reminder.js — 학습 리마인더 (로컬 알림)
// @spec P-19
// 설정 '학습 알림' 토글 ON 시 알림 권한을 요청하고, 부여되면 부팅 후 지연 시점에
// 복습 대기 카드(getDueCount)가 있을 때 SW 경유 로컬 알림을 보낸다 (하루 1회).
// 한계: 앱이 닫힌 상태의 예약 발송은 웹 표준에 없음 — Web Push(Supabase)는 별도 검토.

import { STORAGE_KEYS } from '../core/storage-keys.js';
import { safeGetItem, safeSetItem } from '../core/state.js';
import { showToast } from '../ui-utils.js';
import { setTextById } from '../core/dom.js';
import { getDueCount } from '../study/spaced-repetition.js';
import { todayKey } from '../core/utils.js';

const REMINDER_TAG = 'passok-study-reminder';
const BOOT_DELAY_MS = 45 * 1000; // 부팅 직후 모달·배너와 겹치지 않게 지연

/** 알림 가능 환경 — Notification + SW 등록이 둘 다 필요 (showNotification 경유) */
export function reminderSupported() {
    return typeof Notification !== 'undefined'
        && !!(globalThis.navigator?.serviceWorker?.getRegistration);
}

export function isReminderOn() {
    return safeGetItem(STORAGE_KEYS.STUDY_REMINDER) === 'on';
}

function syncLabel() {
    const perm = reminderSupported() ? Notification.permission : 'unsupported';
    const text = perm === 'denied' ? '차단됨' : isReminderOn() ? '켜짐' : '꺼짐';
    setTextById('reminder-label', text);
}

/**
 * 발송 판정 — 순수 함수 (테스트용). enabled·권한·대기 카드·하루 1회 상한.
 * @param {{enabled:boolean, permission:string, dueCount:number, lastSent:string|null, today:string}} s
 */
export function shouldSendReminder(s) {
    return s.enabled === true
        && s.permission === 'granted'
        && s.dueCount > 0
        && s.lastSent !== s.today;
}

/** 설정 토글 핸들러 — ON은 권한 요청 경유, 거부 시 '차단됨' 표시 */
export async function toggleStudyReminder() {
    if (!reminderSupported()) {
        showToast('이 브라우저는 알림을 지원하지 않습니다', 'info');
        return;
    }
    if (isReminderOn()) {
        safeSetItem(STORAGE_KEYS.STUDY_REMINDER, '');
        syncLabel();
        showToast('학습 알림을 껐습니다', 'info');
        return;
    }
    const perm = await Notification.requestPermission().catch(() => 'denied');
    if (perm !== 'granted') {
        syncLabel();
        showToast('알림이 차단되었습니다 — 브라우저/기기 설정에서 알림을 허용해 주세요', 'info');
        return;
    }
    safeSetItem(STORAGE_KEYS.STUDY_REMINDER, 'on');
    syncLabel();
    showToast('학습 알림을 켰습니다 — 복습할 카드가 있으면 하루 1회 알려드립니다', 'info');
}

/** 부팅 반영 — 켜져 있으면 지연 후 대기 복습 카드 알림 1회 */
export function initStudyReminder() {
    syncLabel();
    if (!isReminderOn() || !reminderSupported()) return;
    if (Notification.permission !== 'granted') { syncLabel(); return; }
    setTimeout(async () => {
        try {
            const dueCount = getDueCount();
            const today = todayKey();
            if (!shouldSendReminder({
                enabled: isReminderOn(),
                permission: Notification.permission,
                dueCount,
                lastSent: safeGetItem(STORAGE_KEYS.REMINDER_LAST_SENT),
                today,
            })) return;
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return;
            await reg.showNotification('PassOK 학습 알림', {
                body: `오늘 복습할 카드가 ${dueCount}장 있습니다`,
                tag: REMINDER_TAG,
                icon: './icons/passok-icon-192.png',
            });
            safeSetItem(STORAGE_KEYS.REMINDER_LAST_SENT, today);
        } catch (e) { /* 알림 실패는 앱을 깨지 않음 */ }
    }, BOOT_DELAY_MS);
}
