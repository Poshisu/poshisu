"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required").max(72, "Password too long"),
});

function redirectWithError(pathname: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${pathname}?${params.toString()}`);
}

export async function loginAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/login", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.warn("[login] sign-in failed", { code: error.code, status: error.status });
    redirectWithError("/login", "Invalid email or password");
  }

  redirect("/chat");
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL!;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/callback`,
    },
  });

  if (error || !data.url) {
    console.warn("[login] google oauth start failed", { code: error?.code, status: error?.status });
    redirectWithError("/login", "Could not start Google sign-in");
  }

  redirect(data.url);
}
