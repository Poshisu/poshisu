"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long"),
});

function redirectWithError(pathname: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${pathname}?${params.toString()}`);
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/signup", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL!;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/callback?next=/onboarding`,
    },
  });

  if (error) {
    console.warn("[signup] failed", { code: error.code, status: error.status, message: error.message });
    // TEMP DEBUG: surface error details until signup is verified working end-to-end.
    redirectWithError(
      "/signup",
      `Signup failed [${error.status ?? "?"} ${error.code ?? "no-code"}]: ${error.message}`,
    );
  }

  // Supabase returns data.user with empty identities[] when the email is already
  // registered. Do not reveal that — always show the "check your email" state so
  // an attacker can't probe for account existence.
  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    redirect("/signup?check-email=1");
  }

  // If email confirmation is disabled the user is signed in immediately.
  if (data.session) {
    redirect("/onboarding");
  }

  redirect("/signup?check-email=1");
}
