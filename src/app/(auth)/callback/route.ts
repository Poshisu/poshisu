import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = new Set(["/chat", "/onboarding", "/today", "/trends", "/profile"]);

function safeNext(raw: string | null): string {
  if (!raw) return "/chat";
  return ALLOWED_NEXT.has(raw) ? raw : "/chat";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Sign-in link invalid")}`, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn("[callback] code exchange failed", { code: error.code, status: error.status });
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Sign-in failed. Please try again.")}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
