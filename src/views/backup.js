// views/backup.js - 로컬 데이터 백업 및 복원 (Data Backup & Restore)
// @spec B-01~04,S-06
//
// [멀티시험] 백업 파일은 비접두사 "논리 키"를 사용한다 (예: fc_memorized).
//   -보내기: 현재 시험 네임스페이스(<examId>:key)에서 읽어 논리 키로 저장
//   - 가져오기: 논리 키를 현재 시험 네임스페이스에 기록
//   → 시험이 달라도 같은 백업 포맷이며, 복원은 항상 "현재 활성 시험"에 귀속된다.
import { showToast, showChoiceModal } from '../ui-utils.js';
import { todayKey, localDateTimeNow } from '../core/utils.js';
import { BACKUP_KEYS, STORAGE_KEYS, isDailyCompletedKey } from '../core/storage-keys.js';
import { safeGetItem, safeSetItem, listScopedKeys } from '../core/state.js';
import { unscopedKey, getActiveExamId } from '../core/exam-context.js';

export function getBackupKeys() {
    // 정적 키 목록 + 날짜 기반 동적 키(daily_completed_YYYY-MM-DD)를 모두 수집
    // listScopedKeys는 현재 시험의 실제 저장키(<id>:daily_completed_...)를 반환하므로
    // 백업 포맷용 논리 키로 되돌린다.
    const dynamicKeys = /** @type {string[]} */ (listScopedKeys(isDailyCompletedKey).map(unscopedKey));
    return [...BACKUP_KEYS, ...dynamicKeys];
}

export function exportData() {
    const keys = getBackupKeys();
    const backupObj = {};

    keys.forEach(k => {
        const v = safeGetItem(k);
        if (v !== null) backupObj[k] = v;
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${getActiveExamId()}_backup_${todayKey()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // FO-65 — 증적 백업 리마인더의 기준 시각. 백업 키 자체는 백업 대상이 아니다
    // (복원 시 파일의 과거 시각이 아니라 '이 기기에서 마지막으로 보낸 시각'이어야 하므로 로컬 전용).
    safeSetItem(STORAGE_KEYS.LAST_BACKUP_AT, localDateTimeNow());

    showToast('학습 데이터 백업 파일 다운로드가 완료되었습니다!', 'success');
}

export function triggerImport() {
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
        fileInput.click();
    }
}

export function setupImportListener() {
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', importData);
    }
}

export function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const ALLOWED_KEYS = BACKUP_KEYS;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const result = /** @type {FileReader|null} */ (e.target)?.result;
            const data = JSON.parse(typeof result === 'string' ? result : 'null');
            if (!data || typeof data !== 'object') {
                showToast('유효하지 않은 백업 파일입니다.', 'error');
                return;
            }

            // 화이트리스트 필터 — 유효 키만 추린 뒤 변경 요약을 먼저 보여준다
            const entries = Object.keys(data).filter(k =>
                (ALLOWED_KEYS.includes(k) || isDailyCompletedKey(k))
                && data[k] !== null && typeof data[k] === 'string'
            );
            if (!entries.length) {
                showToast('가져올 유효한 학습 데이터 키가 존재하지 않습니다.', 'warning');
                return;
            }

            // UX-FB-10 — 변경 요약: 덮어쓰기 대상(이미 값이 있는 키)과 신규 키를 구분해 고지
            const overwriteCount = entries.filter(k => safeGetItem(k) !== null).length;
            const newCount = entries.length - overwriteCount;
            const summary = `총 ${entries.length}개 항목을 가져옵니다.\n` +
                (overwriteCount ? `기존 데이터 ${overwriteCount}개가 덮어씌워집니다. ` : '') +
                (newCount ? `새 데이터 ${newCount}개가 추가됩니다.` : '');

            const choice = await showChoiceModal(summary.trim(), '백업 복원 방식', [
                { label: '병합 (비어있는 항목만 채움)', value: 'merge' },
                { label: '덮어쓰기 (모든 항목 교체)', value: 'overwrite', danger: true },
            ]);
            if (choice === null) return;

            // 데이터 검증 및 복원 — 현재 활성 시험의 네임스페이스에 기록된다
            let restoredCount = 0;
            let skippedCount = 0;
            entries.forEach(k => {
                // 병합: 기존 값이 있으면 건너뜀 / 덮어쓰기: 무조건 기록
                if (choice === 'merge' && safeGetItem(k) !== null) { skippedCount++; return; }
                if (safeSetItem(k, data[k])) restoredCount++;
            });

            if (restoredCount > 0) {
                const doneMsg = `복원 완료 — ${restoredCount}개 항목을 가져왔습니다` +
                    (skippedCount ? ` (기존 데이터 보존 ${skippedCount}개 건너뜀)` : '') +
                    '. 페이지를 새로고침하여 적용합니다.';
                showToast(doneMsg, 'success');
                location.reload();
            } else {
                showToast('가져올 데이터가 없습니다 — 모든 항목이 이미 존재합니다.', 'warning');
            }
        } catch (err) {
            showToast('유효하지 않은 백업 파일입니다. 백업 데이터 복원 실패.', 'error');
        }
    };
    reader.readAsText(file);
}
