/** git status --porcelain 파싱 + diff 노이즈 라인 공용 유틸.
 * 체커 간 복제 금지 — 파싱 불일치가 실제 장애를 일으킨 이력이 있다
 * (출력 trim으로 첫 줄 상태 컬럼 선행 공백이 제거돼 slice(3)이 파일명을 깨뜨림:
 *  ' M sw.js' → 'M sw.js' → 'w.js', 2026-10-21 deploy 차단 사고).
 */
// @spec none (체커 공용 — porcelain 파싱·diff 노이즈 규칙)
'use strict';

/** git status --porcelain 한 줄에서 파일 경로를 추출한다.
 * 상태 열은 1~2글자+공백 — 정규식으로 제거해 trim 여부와 무관하게 동작한다. */
function parseStatusLine(line) {
    const path = line.replace(/^[A-Z?! ]{1,2} /, '').split(' -> ').pop();
    return path.replace(/^"|"$/g, '');
}

/** porcelain 출력 전체 → 경로 목록 (빈 줄 제외) */
function parseStatus(output) {
    return output.split('\n').filter(Boolean).map(parseStatusLine);
}

// 생성물 diff에서 드리프트로 간주하지 않는 라인 — 생성 시각·HEAD 스탬프
// (빌드가 매번 갱신하는 값이라 내용 드리프트가 아님)
const NOISE_LINE = /"generatedAt"\s*:|^\/\/ 생성:.*\|\s*\d{4}-|CACHE_VERSION\s*=\s*['"]/;

/** diff 텍스트가 노이즈 라인만으로 구성됐는지 순수 판정.
 * 변경 라인이 하나도 없으면 false — 목록에 잡힌 파일에 diff가 없다는 것은
 * untracked 신규 산출물이거나 파싱 오류라 드리프트 취급이 안전하다. */
function isNoiseOnlyDiff(diff) {
    const changed = String(diff).split('\n').filter((l) =>
        (l.startsWith('+') && !l.startsWith('+++')) ||
        (l.startsWith('-') && !l.startsWith('---')));
    return changed.length > 0 && changed.every((l) => NOISE_LINE.test(l.slice(1)));
}

module.exports = { parseStatusLine, parseStatus, NOISE_LINE, isNoiseOnlyDiff };
