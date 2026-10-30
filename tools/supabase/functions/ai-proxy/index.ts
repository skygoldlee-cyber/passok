// tools/supabase/functions/ai-proxy/index.ts — 런타임 AI 프록시 (AI-25~30)
// 설계: docs/dev/design/AI_COACH_DESIGN.md §3
//
// 흐름: 로그인 JWT 검증(미로그인 401) → ai_usage 일일 쿼터(Free 한도·Pro 무제한,
// 초과 429) → kind별 고정 템플릿 조립(서버측 — 자유 입력 채널 없음, AI-30)
// → Gemini generateContent(JSON 스키마 강제) → 정규화 응답.
//
// 배포:
//   supabase functions deploy ai-proxy --no-verify-jwt
//   (--no-verify-jwt는 게이트웨이 선검증만 끈다 — JWT는 본문에서 수동 검증)
// 시크릿:
//   supabase secrets set GOOGLE_API_KEY=...        # 필수 (Gemini)
//   supabase secrets set GEMINI_MODEL=gemini-3.8-flash  # 선택 — 모델 교체는 재배포 없이
//   supabase secrets set AI_FREE_DAILY=10          # 선택 — Free 일일 쿼터
// 환경: SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY는 Edge 런타임이 자동 주입.
//   신형 시크릿 키 체계에서는 SUPABASE_SECRET_KEY로 주입될 수 있어 둘 다 본다.
//
// 프라이버시 (설계 §4): 프롬프트·응답 본문을 로그하지 않는다 — ai_usage는 카운터만.

// @ts-ignore — jsr: specifier는 Deno 런타임 전용이라 tsc가 해석하지 못한다 (실행에는 영향 없음)
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
const AI_FREE_DAILY = Math.max(1, parseInt(Deno.env.get("AI_FREE_DAILY") ?? "10", 10) || 10);
const MAX_OUTPUT_TOKENS = 400;   // 비용 상한 — 출력 1~2문장 계약에 충분한 양만 허용

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, "Content-Type": "application/json" },
    });
}

/* ============================================================
   kind별 프롬프트 계약 (AI-30 — 고정 템플릿 + 구조화 인자만)
   자유 사용자 입력 필드는 받지 않고, 각 인자는 길이 상한이 있다.
   ⚠️ 템플릿 변경 시 클라이언트 BYOK 폴백의 미러(src/ai/ai-client.js
   buildWrongFeedbackPrompt)도 함께 바꿀 것 — 두 경로가 같은 계약을 쓴다.
   ============================================================ */

const LIMITS = {
    question: 3000,   // 문항 본문
    selected: 600,    // 사용자 오답 (단답형은 입력값 — 길이 제한된 구조화 인자)
    correct: 600,     // 정답 진술
    item: 300,        // 선지·오판 진술 한 건
    list: 8,          // 선지·오판 진술 최대 건수
    citation: 600,    // 인용 근거
};

const SYSTEM_PROMPT = `당신은 자격시험 학습 코치입니다. 수험생이 틀린 문항을 보내면 왜 틀렸는지 분석합니다.
- 해설은 1~2문장으로 짧게, 오답을 고른 이유(혼동 포인트)에 집중합니다.
- 정답을 다시 나열하지 말고, 혼동 개념(confused_concept)은 1어절로 짚습니다.
- 교재 근거가 주어지면 그 범위 안에서만 설명하고, 근거에 없는 사실은 단정하지 않습니다.
- 출력은 지정된 JSON 스키마만 따릅니다.`;

type WrongFeedbackInput = {
    question?: unknown;
    selected?: unknown;
    correct?: unknown;
    options?: unknown;
    citation?: unknown;
    misjudged?: unknown;
};

function clip(v: unknown, max: number): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    if (!s || s.length > max) return null;
    return s;
}

function clipList(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, LIMITS.list)
        .map((x) => (typeof x === "string" ? x.trim().slice(0, LIMITS.item) : ""))
        .filter(Boolean);
}

/** 구조화 인자 검증 + 프롬프트 조립 — 불충분하면 null */
function buildWrongFeedbackPrompt(input: WrongFeedbackInput): string | null {
    const question = clip(input?.question, LIMITS.question);
    const selected = clip(input?.selected, LIMITS.selected);
    const correct = clip(input?.correct, LIMITS.correct);
    if (!question || !selected || !correct) return null;
    const options = clipList(input?.options);
    const misjudged = clipList(input?.misjudged);
    const citation = clip(input?.citation, LIMITS.citation);
    return `## 문항
${question}
${options.length ? `\n## 선지\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n` : ""}
## 수험생이 고른 오답
${selected}

## 정답
${correct}
${misjudged.length ? `\n## 수험생이 오판한 진술\n${misjudged.map((s) => `- ${s}`).join("\n")}\n` : ""}${citation ? `\n## 교재 근거\n${citation}\n` : ""}
응답 형식(JSON만): {"explain":"오답 원인 해설 1~2문장","confused_concept":"혼동 개념 1어절"}`;
}

const KIND_BUILDERS: Record<string, (i: WrongFeedbackInput) => string | null> = {
    wrong_feedback: buildWrongFeedbackPrompt,
};

/* ============================================================
   Gemini 호출 — responseSchema로 JSON 출력 강제
   ============================================================ */

const OUTPUT_SCHEMA = {
    type: "OBJECT",
    properties: {
        explain: { type: "STRING" },
        confused_concept: { type: "STRING" },
    },
    required: ["explain", "confused_concept"],
};

async function callGemini(prompt: string): Promise<{ explain: string; confused: string } | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": GOOGLE_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: OUTPUT_SCHEMA,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                temperature: 0.2,
            },
        }),
    });
    if (!res.ok) return null; // 업스트림 오류 본문은 로그하지 않는다
    const data = await res.json();
    const text = ((data?.candidates?.[0]?.content?.parts) ?? [])
        .map((p: { text?: string }) => p.text ?? "").join("");
    try {
        const parsed = JSON.parse(text);
        const explain = String(parsed?.explain ?? "").trim().slice(0, 500);
        const confused = String(parsed?.confused_concept ?? "").trim().slice(0, 60);
        if (!explain) return null;
        return { explain, confused };
    } catch {
        return null;
    }
}

/* ============================================================
   메인 핸들러
   ============================================================ */

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return json({ ok: false, code: "method" }, 405);
    if (!GOOGLE_API_KEY || !SERVICE_KEY) return json({ ok: false, code: "misconfigured" }, 500);

    // 1) JWT 검증 — 익명 호출 차단 (AI-26 인증 게이트)
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ ok: false, code: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: userData, error: authErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (authErr || !user) return json({ ok: false, code: "unauthorized" }, 401);

    // 2) 본문 파싱 + kind 라우팅 — 고정 템플릿만 (AI-30)
    let body: { kind?: unknown; input?: unknown };
    try { body = await req.json(); } catch { return json({ ok: false, code: "invalid" }, 400); }
    const kind = typeof body?.kind === "string" ? body.kind.slice(0, 40) : "";
    const build = KIND_BUILDERS[kind];
    if (!build) return json({ ok: false, code: "unknown_kind" }, 400);
    const prompt = build((body.input ?? {}) as WrongFeedbackInput);
    if (!prompt) return json({ ok: false, code: "invalid" }, 400);

    // 3) Pro 자격 — profiles.plan이 정본 (redeem_code RPC가 기간권까지 반영해 갱신)
    const { data: profile } = await admin
        .from("profiles")
        .select("plan, pro_expires_at")
        .eq("id", user.id)
        .maybeSingle();
    const isPro = profile?.plan === "pro"
        && (!profile.pro_expires_at || new Date(profile.pro_expires_at).getTime() > Date.now());

    // 4) 일일 쿼터 — 원자 증가 후 판정 (Free 한도, Pro 무제한이지만 계측은 유지)
    const { data: used, error: quotaErr } = await admin.rpc("ai_usage_consume", {
        p_user_id: user.id,
        p_kind: kind,
    });
    if (quotaErr) return json({ ok: false, code: "upstream" }, 502);
    const count = typeof used === "number" ? used : Number(used);
    const remaining = Math.max(0, AI_FREE_DAILY - count);
    if (!isPro && count > AI_FREE_DAILY) {
        return json({ ok: false, code: "quota", remaining: 0 }, 429);
    }

    // 5) Gemini 호출 → 정규화 응답
    const result = await callGemini(prompt);
    if (!result) return json({ ok: false, code: "upstream" }, 502);
    return json({ ok: true, ...result, remaining: isPro ? null : remaining });
});
