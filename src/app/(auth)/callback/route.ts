import { NextResponse, type NextRequest } from "next/server";
import { trustedAppOrigin } from "@/lib/auth/origin";
import { createClient } from "@/lib/supabase/server";
import type { AuthErrorCode } from "../errors";

const ALLOWED_NEXT = new Set(["/chat", "/onboarding", "/today", "/trends", "/profile"]);

function safeNext(raw: string | null): string {
  if (!raw) return "/chat";
  return ALLOWED_NEXT.has(raw) ? raw : "/chat";
}

function loginRedirect(origin: string, code: AuthErrorCode): NextResponse {
  const params = new URLSearchParams({ error: code });
  return NextResponse.redirect(new URL(`/login?${params.toString()}`, origin));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const origin = trustedAppOrigin();

  if (!code) {
    return loginRedirect(origin, "oauth_callback_invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn("[callback] code exchange failed", { code: error.code, status: error.status });
    return loginRedirect(origin, "oauth_callback_failed");
  }

  return NextResponse.redirect(new URL(next, origin));
}
