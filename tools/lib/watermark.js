// @spec DA-17
/**
 * watermark.js — 콘텐츠 provenance 지문 (결정적 워터마크)
 *
 * 번들 텍스트 끝에 `<!--pk:w<payload>-->` 주석을 삽입한다.
 * payload = b64( sha256(본문·파일경로·SALT).slice(0,16) + '|' + 콘텐츠해시8 )
 * — 콘텐츠 자체가 seed라 재빌드 결정적 (신선도 게이트 정합). 유출본은
 * extract로 출처·원문 버전을 역추적할 수 있다. 렌더·검색 인덱스 무영향.
 * 주석까지 제거하는 정교한 복제는 범위 외 (DA-16과 동일 기준).
 *
 * 사용: embed(text, filePath) — 빌드 시  |  extract(text) — 유출본 감정 시
 * CLI:  node tools/lib/watermark.js <번들.js> — pk1 디코드 후 지문 출력
 */
const crypto = require('crypto');

const SALT = 'passok-wm-2026';
const MARK_RE = /<!--pk:w([A-Za-z0-9+/=]+)-->/;

function fingerprint(text, filePath) {
  const h = crypto.createHash('sha256').update(`${filePath}|${text}|${SALT}`).digest('hex').slice(0, 16);
  const contentVer = crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);
  return Buffer.from(`${h}|${contentVer}`).toString('base64');
}

/** 본문 끝에 지문 주석 삽입 (pk1 인코딩 전 평문에 적용 — 결정적) */
function embed(text, filePath) {
  if (typeof text !== 'string' || MARK_RE.test(text)) return text;
  return text.replace(/\s*$/, '') + `\n\n<!--pk:w${fingerprint(text, filePath)}-->\n`;
}

/** 지문 추출 → { hash, contentVer } | null */
function extract(text) {
  const m = typeof text === 'string' && text.match(MARK_RE);
  if (!m) return null;
  const [hash, contentVer] = Buffer.from(m[1], 'base64').toString('utf8').split('|');
  return { hash, contentVer };
}

/** 지문이 기대 (본문, 파일경로) 조합의 것인지 검증 */
function verify(text, filePath) {
  const wm = extract(text);
  if (!wm) return false;
  const clean = text.replace(MARK_RE, '').replace(/\s*$/, '');
  return wm.hash === crypto.createHash('sha256').update(`${filePath}|${clean}|${SALT}`).digest('hex').slice(0, 16);
}

module.exports = { embed, extract, verify, MARK_RE };

// CLI — 유출 번들 지문 감정: node tools/lib/watermark.js <file>
if (require.main === module) {
  const fs = require('fs');
  const { decodeText } = require('./content_pack.js');
  const src = fs.readFileSync(process.argv[2], 'utf8');
  const hits = [...src.matchAll(/pk1:[A-Za-z0-9+/=]+/g)]
    .map(m => extract(decodeText(m[0]))).filter(Boolean);
  console.log(hits.length ? hits : '지문 없음');
}
