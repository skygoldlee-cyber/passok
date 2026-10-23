// admin-bot — Discord 슬래시 명령 → 운영 조회 응답 (읽기 전용)
// @spec AD-11
// ------------------------------------------------------------
// Discord Interactions Endpoint로 등록해 관리자가 DM/서버에서
// /status /user /pro /errors /feedback 조회를 실행한다.
// 로컬 report:* CLI(service role)의 Discord 표면 — 쓰기 명령은 의도적으로 없다.
//
// 환경변수 (supabase secrets set):
//   DISCORD_PUBLIC_KEY   — Discord 앱의 Public Key (서명 검증, 필수)
//   ADMIN_DISCORD_ID     — 허용할 관리자 Discord user id (필수, 단일)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — Edge Runtime 자동 주입
//
// 명령 등록·엔드포인트 설정: docs/dev/runbooks/DISCORD_ADMIN.md
// ------------------------------------------------------------

const DISCORD_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY') ?? '';
const ADMIN_DISCORD_ID = Deno.env.get('ADMIN_DISCORD_ID') ?? '';
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// ── Discord 상호작용 상수 ─────────────────────────────────────
const INTERACTION_PING = 1;
const INTERACTION_COMMAND = 2;
const CALLBACK_PONG = 1;
const CALLBACK_MESSAGE = 4;
const FLAG_EPHEMERAL = 64;

const DAY_MS = 24 * 60 * 60 * 1000;

// ── ed25519 서명 검증 (Discord Interactions 계약) ─────────────
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return b;
}

let _pubKey: Promise<CryptoKey> | null = null;
function publicKey(): Promise<CryptoKey> {
  _pubKey ??= crypto.subtle.importKey(
    'raw', hexToBytes(DISCORD_PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify']);
  return _pubKey;
}

async function verifyRequest(req: Request): Promise<{ ok: boolean; body: string }> {
  const sig = req.headers.get('x-signature-ed25519');
  const ts = req.headers.get('x-signature-timestamp');
  const body = await req.text();
  if (!sig || !ts) return { ok: false, body };
  try {
    const key = await publicKey();
    const ok = await crypto.subtle.verify(
      'Ed25519', key, hexToBytes(sig), new TextEncoder().encode(ts + body));
    return { ok, body };
  } catch {
    return { ok: false, body };
  }
}

// ── Supabase 조회 헬퍼 (service role — supabase_ops.js의 Deno판) ──
async function restGet(table: string, query: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`${table} 조회 실패 HTTP ${res.status}`);
  return res.json();
}

async function restCount(table: string, query: string): Promise<number | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'HEAD',
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, prefer: 'count=exact' },
  });
  if (!res.ok) return null;
  const m = /\/(\d+)/.exec(res.headers.get('content-range') ?? '');
  return m ? parseInt(m[1], 10) : null;
}

async function findUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } });
    if (!res.ok) throw new Error(`admin/users HTTP ${res.status}`);
    const data = await res.json();
    const users = Array.isArray(data) ? data : (data.users || []);
    const hit = users.find((u: { email?: string }) =>
      String(u.email ?? '').toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 200) return null;
  }
  return null;
}

// ── 명령 핸들러 — Discord 임베드 객체 반환 ─────────────────────
interface Embed {
  title: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  description?: string;
}

const GREEN = 0x22c55e, RED = 0xef4444, CYAN = 0x06b6d4;
const clip = (s: string, n = 1024) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function cmdStatus(): Promise<Embed> {
  const since = iso(new Date(Date.now() - 7 * DAY_MS));
  const [users, pro, feedback7d, errors7d] = await Promise.all([
    restCount('profiles', 'select=id'),
    restCount('profiles', "select=id&plan=eq.pro"),
    restCount('feedback', `select=id&created_at=gte.${since}`),
    restCount('client_errors', `select=id&created_at=gte.${since}`),
  ]);
  return {
    title: '📊 서비스 현황', color: CYAN,
    fields: [
      { name: '사용자', value: `${users ?? '?'}명 (Pro ${pro ?? '?'})`, inline: true },
      { name: '피드백 7일', value: `${feedback7d ?? '?'}건`, inline: true },
      { name: '오류 7일', value: `${errors7d ?? '?'}건`, inline: true },
    ],
  };
}

async function cmdUser(email: string): Promise<Embed> {
  const user = await findUserByEmail(email);
  if (!user) return { title: `사용자 없음 — ${clip(email, 200)}`, color: RED };
  const id = user.id;
  const [profiles, codes, snaps] = await Promise.all([
    restGet('profiles', `select=plan,pro_since,pro_expires_at&id=eq.${id}`),
    restGet('pro_codes', `select=code,valid_days,redeemed_at&redeemed_by=eq.${id}`),
    restGet('sync_snapshots', `select=exam_id,device_id,updated_at&user_id=eq.${id}`),
  ]);
  const p = (profiles[0] ?? {}) as Record<string, unknown>;
  const providers = (user.app_metadata?.providers ?? []).join(', ') || 'unknown';
  const expires = p.pro_expires_at
    ? `${String(p.pro_expires_at).slice(0, 10)} (D${Math.ceil((Date.parse(String(p.pro_expires_at)) - Date.now()) / DAY_MS) >= 0 ? '-' : '+'}${Math.abs(Math.ceil((Date.parse(String(p.pro_expires_at)) - Date.now()) / DAY_MS))})`
    : (p.plan === 'pro' ? '무기한' : '—');
  return {
    title: `👤 ${clip(email, 200)}`, color: p.plan === 'pro' ? GREEN : CYAN,
    fields: [
      { name: 'plan', value: `${String(p.plan ?? 'free')} · 만료 ${expires}`, inline: true },
      { name: '가입', value: `${String(user.created_at ?? '').slice(0, 10)} (${providers})`, inline: true },
      { name: '사용 코드', value: clip((codes as Record<string, unknown>[])
        .map((c) => `${c.code}(${c.valid_days}d)`).join(', ') || '없음'), inline: false },
      { name: '동기화 메타', value: clip((snaps as Record<string, unknown>[])
        .map((s) => `${s.exam_id} · ${String(s.updated_at ?? '').slice(0, 10)}`).join('\n') || '없음'), inline: false },
    ],
  };
}

async function cmdPro(): Promise<Embed> {
  const [codes, proRows] = await Promise.all([
    restGet('pro_codes', 'select=code,valid_days,redeemed_by'),
    restGet('profiles', 'select=pro_expires_at&plan=eq.pro'),
  ]);
  const all = codes as { code: string; valid_days: number; redeemed_by: string | null }[];
  const byTier = new Map<number, { total: number; used: number }>();
  for (const c of all) {
    const t = byTier.get(c.valid_days) ?? { total: 0, used: 0 };
    t.total++; if (c.redeemed_by) t.used++;
    byTier.set(c.valid_days, t);
  }
  const now = Date.now();
  const buckets = { active: 0, soon: 0, expired: 0, infinite: 0 };
  for (const p of proRows as { pro_expires_at: string | null }[]) {
    if (!p.pro_expires_at) buckets.infinite++;
    else {
      const d = (Date.parse(p.pro_expires_at) - now) / DAY_MS;
      if (d < 0) buckets.expired++; else if (d <= 7) buckets.soon++; else buckets.active++;
    }
  }
  return {
    title: '💳 Pro 현황', color: GREEN,
    fields: [
      { name: '코드 재고', value: clip([...byTier.entries()].sort((a, b) => a[0] - b[0])
        .map(([d, t]) => `${d}일권 ${t.used}/${t.total} 사용`).join('\n') || '코드 없음') },
      { name: 'Pro 만료 버킷', value: clip(`활성 ${buckets.active} · 임박 D-7 ${buckets.soon} · 만료 미갱신 ${buckets.expired} · 무기한 ${buckets.infinite}`) },
    ],
  };
}

async function cmdErrors(days: number): Promise<Embed> {
  const since = iso(new Date(Date.now() - days * DAY_MS));
  const rows = await restGet('client_errors',
    `select=message,created_at&created_at=gte.${since}&order=created_at.desc&limit=500`);
  const top = new Map<string, number>();
  for (const r of rows as { message?: string }[]) {
    const k = String(r.message ?? '?').slice(0, 80);
    top.set(k, (top.get(k) ?? 0) + 1);
  }
  const lines = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([m, n]) => `${n}× ${m}`);
  return {
    title: `🐞 최근 ${days}일 오류 — ${rows.length}건`,
    color: rows.length ? RED : GREEN,
    description: clip(lines.join('\n') || '오류 없음', 4000),
  };
}

async function cmdFeedback(days: number): Promise<Embed> {
  const since = iso(new Date(Date.now() - days * DAY_MS));
  const rows = await restGet('feedback',
    `select=kind,rating,body,view,created_at&created_at=gte.${since}&order=created_at.desc&limit=10`);
  const KIND: Record<string, string> = { praise: '칭찬', improve: '개선', bug: '오류', idea: '제안' };
  const lines = (rows as Record<string, unknown>[]).map((r) =>
    `· [${KIND[String(r.kind)] ?? r.kind}${typeof r.rating === 'number' ? ` ★${r.rating}` : ''}] ` +
    `${String(r.body ?? '').slice(0, 60)} — ${String(r.view ?? '?')}`);
  return {
    title: `💬 최근 ${days}일 피드백 — ${rows.length}건`,
    color: CYAN,
    description: clip(lines.join('\n') || '없음', 4000),
  };
}

// ── 엔드포인트 ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  // 시크릿 미설정 시 fail-closed
  if (!DISCORD_PUBLIC_KEY || !ADMIN_DISCORD_ID || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response('not configured', { status: 500 });
  }

  const { ok, body } = await verifyRequest(req);
  if (!ok) return new Response('invalid signature', { status: 401 });

  const msg = (data: unknown) => new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });

  let it: Record<string, unknown>;
  try { it = JSON.parse(body); } catch { return new Response('bad request', { status: 400 }); }

  if (it.type === INTERACTION_PING) return msg({ type: CALLBACK_PONG });
  if (it.type !== INTERACTION_COMMAND) return msg({ type: CALLBACK_MESSAGE, data: { content: '지원하지 않는 상호작용', flags: FLAG_EPHEMERAL } });

  // 단일 관리자만 허용 — 서버 멤버·DM 양쪽 경로 모두 검사
  const member = it.member as { user?: { id?: string } } | undefined;
  const user = (member?.user ?? (it.user as { id?: string } | undefined));
  if (user?.id !== ADMIN_DISCORD_ID) {
    return msg({ type: CALLBACK_MESSAGE, data: { content: '⛔ 관리자 전용 명령입니다', flags: FLAG_EPHEMERAL } });
  }

  const data = it.data as { name?: string; options?: { name: string; value: unknown }[] };
  const opt = (name: string) => data.options?.find((o) => o.name === name)?.value;

  try {
    let embed: Embed;
    switch (data.name) {
      case 'status': embed = await cmdStatus(); break;
      case 'user': embed = await cmdUser(String(opt('email') ?? '')); break;
      case 'pro': embed = await cmdPro(); break;
      case 'errors': embed = await cmdErrors(Math.min(Number(opt('days') ?? 7), 90)); break;
      case 'feedback': embed = await cmdFeedback(Math.min(Number(opt('days') ?? 7), 90)); break;
      default: return msg({ type: CALLBACK_MESSAGE, data: { content: '알 수 없는 명령', flags: FLAG_EPHEMERAL } });
    }
    return msg({ type: CALLBACK_MESSAGE, data: { embeds: [embed], allowed_mentions: { parse: [] } } });
  } catch (e) {
    return msg({ type: CALLBACK_MESSAGE, data: { content: `⚠️ 조회 실패: ${String(e).slice(0, 300)}`, flags: FLAG_EPHEMERAL } });
  }
});
