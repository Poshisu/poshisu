"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { trustedAppOrigin } from "@/lib/auth/origin";
import { withServerActionLogging } from "@/lib/errors/serverAction";
import { createClient } from "@/lib/supabase/server";
import type { AuthErrorCode } from "../errors";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

function redirectWithError(pathname: string, code: AuthErrorCode): never {
  const params = new URLSearchParams({ error: code });
  redirect(`${pathname}?${params.toString()}`);
}

export const loginAction = withServerActionLogging("login", async (formData: FormData) => {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/login", "invalid_input");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.warn("[login] sign-in failed", { code: error.code, status: error.status });
    redirectWithError("/login", "invalid_credentials");
  }

  redirect("/chat");
});

export const signInWithGoogleAction = withServerActionLogging("oauth_google_start", async () => {
  const supabase = await createClient();
  const origin = trustedAppOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/callback`,
    },
  });

  if (error || !data.url) {
    console.warn("[login] google oauth start failed", { code: error?.code, status: error?.status });
    redirectWithError("/login", "oauth_start_failed");
  }

  redirect(data.url);
});
