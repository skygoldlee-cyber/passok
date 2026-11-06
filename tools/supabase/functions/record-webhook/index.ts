// record-webhook — facility_records INSERT → 기관 자체 서버로 수출 (CO-16, 조건부 선구축)
// @spec none — 조건부 미개통 인프라 (facility 플래그 비활성 동안 실행 경로 없음)
// ------------------------------------------------------------
// facility_records에 행이 INSERT되면 Database Webhook이 이 함수를 호출하고,
// 해당 시설의 facilities.doc_webhook_url이 설정돼 있으면 레코드를 그 URL로 POST한다.
// doc_webhook_url NULL = 외부 전송 없음 (L2는 manager 명시 설정 시에만 개통).
//
// 환경변수 (supabase secrets set):
//   WEBHOOK_SECRET            — Database Webhook 헤더에 넣은 임의 문자열 (무단 호출 차단)
//   SUPABASE_URL              — 프로젝트 URL (Edge 런타임 기본 제공)
//   SUPABASE_SERVICE_ROLE_KEY — service role (시설 조회는 RLS 우회 필요, Edge 기본 제공)
//
// 운영 절차: 대시보드 → Database → Webhooks에서 facility_records INSERT에 대해
//   이 함수를 등록하고 x-webhook-secret 헤더에 WEBHOOK_SECRET 값을 넣는다.
// ------------------------------------------------------------
// Deno 전역 타입은 동일 디렉터리의 deno.d.ts가 제공한다 — jsr:/npm: specifier는
// Deno 확장 없는 IDE tsc가 해석하지 못해 오류를 내므로 사용하지 않는다.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';

async function facilityWebhookUrl(facilityId: string): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/facilities?id=eq.${encodeURIComponent(facilityId)}&select=doc_webhook_url`,
    { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!res.ok) return '';
  const rows = await res.json();
  return typeof rows?.[0]?.doc_webhook_url === 'string' ? rows[0].doc_webhook_url : '';
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  // 시크릿 미설정 시 fail-closed — 공개 엔드포인트가 무방비로 열리는 것을 차단
  if (!WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response('not configured', { status: 500 });
  }
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }

  let record: Record<string, unknown>;
  try {
    const payload = await req.json();
    // Database Webhook 페이로드: { type:'INSERT', table, schema, record, old_record }
    if (payload.type !== 'INSERT' || payload.table !== 'facility_records') {
      return new Response('ignored', { status: 200 });
    }
    record = payload.record;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return new Response('bad request', { status: 400 });
    }
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const facilityId = String(record.facility_id ?? '');
  if (!facilityId) return new Response('bad request', { status: 400 });

  const url = await facilityWebhookUrl(facilityId).catch(() => '');
  if (!url) return new Response('no webhook configured', { status: 200 });

  // 수출 페이로드 — 서버에 이미 있는 구조화 필드만 전달 (L0 자유서술은 DB에 없음)
  const out = JSON.stringify({
    id: record.id, facility_id: record.facility_id, doc_type: record.doc_type,
    client: record.client, record_date: record.record_date,
    payload: record.payload, local_id: record.local_id, created_at: record.created_at,
  });
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: out,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    return new Response(`webhook unreachable: ${String(e)}`, { status: 502 });
  }
  return new Response(`forwarded (${res.status})`, { status: res.ok ? 200 : 502 });
});
