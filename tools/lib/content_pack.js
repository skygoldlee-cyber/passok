// @spec DA-16
/**
 * content_pack.js — 번들 콘텐츠 비평문화 (빌드 인코딩 ↔ 런타임 디코딩)
 *
 * 목적: 배포 자산의 교재 원문을 평문 그대로 노출하지 않아 캐주얼 스크레이핑
 * (curl + jq 수준)을 차단한다. 키는 클라이언트에 내장되므로 결정적 역공학은
 * 가능 — 암호화가 아닌 비용 상승 장치다 (DA-16 범위 명기).
 *
 * 포맷: "pk1:<base64>" — 값이 pk1 접두로 시작하면 XOR-디코드, 아니면 평문 통과.
 */
const { embed: _wmEmbed } = require('./watermark.js');
const PK_KEY = 'passok-pk1-5f3a';
const PREFIX = 'pk1:';

function xor(buf, key) {
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key.charCodeAt(i % key.length);
  return out;
}

/** 평문 문자열 → pk1 인코딩 문자열 (Node 빌드용). filePath 전달 시 DA-17 지문 삽입 */
function encodeText(text, filePath) {
  if (filePath) text = _wmEmbed(text, filePath);
  return PREFIX + xor(Buffer.from(text, 'utf8'), PK_KEY).toString('base64');
}

/** pk1 인코딩 문자열 → 평문. 접두 없으면 원본 그대로 (Node 검증·테스트용) */
function decodeText(value) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  return xor(Buffer.from(value.slice(PREFIX.length), 'base64'), PK_KEY).toString('utf8');
}

/** 번들 내 {path: text} 맵의 값 전체 인코딩 — 경로가 지문 seed가 된다 (DA-17) */
function encodeFiles(files) {
  const out = {};
  for (const [k, v] of Object.entries(files)) out[k] = typeof v === 'string' ? encodeText(v, k) : v;
  return out;
}

module.exports = { encodeText, decodeText, encodeFiles, PREFIX, PK_KEY };
