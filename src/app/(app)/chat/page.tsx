import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatMealLogger } from "./ChatMealLogger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat with your Nourish coach.",
};

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ChatMealLogger />;
}
