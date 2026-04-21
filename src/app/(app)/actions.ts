"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    // signOut still clears local cookies even on server errors; we still redirect
    // the user home, but we surface the failure in logs so it isn't silent.
    console.warn("[logout] signOut returned error", { code: error.code, status: error.status });
  }
  redirect("/");
}
