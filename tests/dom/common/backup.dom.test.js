// @spec B-01~04,S-06,UX-FB-10
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { getBackupKeys, exportData, triggerImport, importData } from '../../../src/views/backup.js';
import { scopedKey } from '../../../src/core/exam-context.js';

// showToast만 모킹 — showChoiceModal 등 나머지는 실 구현으로 UX-FB-10 모달 흐름 검증
vi.mock('../../../src/ui-utils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, showToast: vi.fn() };
});

import { showToast } from '../../../src/ui-utils.js';

/** importData 실행 → 요약 모달 표시 대기 → 선택지 클릭 → 적용 대기 */
async function runImport(file, choiceValue) {
    const event = { target: { files: [file] } };
    importData(event);
    await new Promise(r => setTimeout(r, 50));
    const overlay = document.getElementById('app-confirm-overlay');
    if (choiceValue === null || !overlay) return overlay;
    const btn = overlay.querySelector(`[data-choice="${choiceValue}"]`) || overlay.querySelector('.app-confirm-cancel');
    btn?.click();
    await new Promise(r => setTimeout(r, 50));
    return overlay;
}

describe('backup.js — DOM 테스트', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    describe('getBackupKeys', () => {
        it('정적 키만 있을 때 모든 정적 키를 반환', () => {
            const keys = getBackupKeys();
            expect(keys).toContain('fc_memorized');
            expect(keys).toContain('fc_weak');
            expect(keys).toContain('quiz_results');
            expect(keys).toContain('sim_results_history');
            expect(keys).toContain('study_streak');
            expect(keys).toContain('calc_history');
        });

        it('daily_completed_ 동적 키를 포함', () => {
            // 진도 키는 시험 네임스페이스(<examId>:key)로 저장된다
            localStorage.setItem(scopedKey('daily_completed_2025-01-01'), '5');
            localStorage.setItem(scopedKey('daily_completed_2025-01-02'), '3');
            const keys = getBackupKeys();
            expect(keys).toContain('daily_completed_2025-01-01');
            expect(keys).toContain('daily_completed_2025-01-02');
        });

        it('관련 없는 키는 제외', () => {
            localStorage.setItem('random_key', 'value');
            localStorage.setItem('another_random', 'data');
            const keys = getBackupKeys();
            expect(keys).not.toContain('random_key');
            expect(keys).not.toContain('another_random');
        });
    });

    describe('exportData', () => {
        it('localStorage 데이터를 기반으로 다운로드 링크를 생성', () => {
            localStorage.setItem('fc_memorized', JSON.stringify(['card1', 'card2']));
            localStorage.setItem('study_streak', '5');

            // createElement('a')의 click 호출을 추적
            const clickSpy = vi.fn();
            const originalCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                const el = originalCreateElement(tag);
                if (tag === 'a') {
                    el.click = clickSpy;
                }
                return el;
            });

            // showToast 모킹
            vi.spyOn(window, 'alert').mockImplementation(() => {});
            const showToastSpy = vi.mocked(showToast);
            showToastSpy.mockClear();

            exportData();

            expect(clickSpy).toHaveBeenCalledOnce();
            expect(showToastSpy).toHaveBeenCalledOnce();

            vi.restoreAllMocks();
        });
    });

    describe('triggerImport', () => {
        it('import-file-input 요소가 있으면 click 호출', () => {
            const input = document.createElement('input');
            input.id = 'import-file-input';
            input.type = 'file';
            document.body.appendChild(input);

            const clickSpy = vi.spyOn(input, 'click');
            triggerImport();

            expect(clickSpy).toHaveBeenCalledOnce();
        });

        it('import-file-input 요소가 없으면 에러 없이 반환', () => {
            expect(() => triggerImport()).not.toThrow();
        });
    });

    describe('importData', () => {
        it('UX-FB-10 — 변경 요약 모달 후 덮어쓰기 선택 시 복원', async () => {
            const backupData = {
                fc_memorized: JSON.stringify(['card1']),
                fc_weak: JSON.stringify(['card2']),
                quiz_results: JSON.stringify({ q1: { correct: true } }),
                study_streak: '3',
            };
            const file = new File([JSON.stringify(backupData)], 'backup.json', { type: 'application/json' });
            delete window.location;
            window.location = { reload: vi.fn() };

            const overlay = await runImport(file, 'overwrite');
            expect(overlay).not.toBeNull(); // 요약 모달이 표시됨
            expect(overlay.textContent).toContain('4개 항목');

            expect(localStorage.getItem(scopedKey('fc_memorized'))).toBe(JSON.stringify(['card1']));
            expect(localStorage.getItem(scopedKey('fc_weak'))).toBe(JSON.stringify(['card2']));
            expect(localStorage.getItem(scopedKey('study_streak'))).toBe('3');
            expect(window.location.reload).toHaveBeenCalled();
        });

        it('UX-FB-10 — 병합 선택 시 기존 값 보존·빈 키만 채움', async () => {
            localStorage.setItem(scopedKey('fc_memorized'), JSON.stringify(['existing']));
            const backupData = {
                fc_memorized: JSON.stringify(['card1']),
                fc_weak: JSON.stringify(['card2']),
            };
            const file = new File([JSON.stringify(backupData)], 'backup.json', { type: 'application/json' });
            delete window.location;
            window.location = { reload: vi.fn() };

            await runImport(file, 'merge');
            expect(localStorage.getItem(scopedKey('fc_memorized'))).toBe(JSON.stringify(['existing']));
            expect(localStorage.getItem(scopedKey('fc_weak'))).toBe(JSON.stringify(['card2']));
        });

        it('UX-FB-10 — 취소 시 아무것도 쓰지 않음', async () => {
            const file = new File([JSON.stringify({ fc_memorized: '["x"]' })], 'backup.json', { type: 'application/json' });
            delete window.location;
            window.location = { reload: vi.fn() };

            await runImport(file, 'cancel');
            expect(localStorage.getItem(scopedKey('fc_memorized'))).toBeNull();
            expect(window.location.reload).not.toHaveBeenCalled();
        });

        it('화이트리스트에 없는 키는 복원하지 않음', async () => {
            const backupData = {
                fc_memorized: JSON.stringify(['card1']),
                malicious_key: 'evil_data',
            };
            const file = new File([JSON.stringify(backupData)], 'backup.json', { type: 'application/json' });
            delete window.location;
            window.location = { reload: vi.fn() };

            await runImport(file, 'overwrite');
            expect(localStorage.getItem(scopedKey('fc_memorized'))).toBe(JSON.stringify(['card1']));
            expect(localStorage.getItem(scopedKey('malicious_key'))).toBeNull();
            expect(localStorage.getItem('malicious_key')).toBeNull();
        });

        it('유효하지 않은 JSON 파일은 에러 메시지 표시', () => {
            const file = new File(['not valid json', ''], 'bad.json', {
                type: 'application/json',
            });

            const showToastSpy = vi.mocked(showToast);
            showToastSpy.mockClear();

            const event = { target: { files: [file] } };

            return new Promise((resolve) => {
                importData(event);

                setTimeout(() => {
                    expect(showToastSpy).toHaveBeenCalledWith(
                        expect.stringContaining('유효하지 않은 백업 파일'),
                        'error'
                    );
                    resolve();
                }, 100);
            });
        });

        it('빈 파일 선택 시 아무 동작 없음', () => {
            const event = { target: { files: [] } };
            expect(() => importData(event)).not.toThrow();
        });
    });
});
