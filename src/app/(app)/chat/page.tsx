import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "../actions";

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

  const firstName =
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6 focus:outline-none"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hey, {firstName}.</h1>
          <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" data-testid="logout-button">
            Sign out
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Your coach is getting ready</CardTitle>
          <CardDescription>
            Soon you&apos;ll be able to log meals in plain English — &ldquo;2 rotis and a bowl of dal for lunch&rdquo; — snap
            a photo of your plate, or ask what to eat next. We&apos;re putting the finishing touches on the chat now.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            In the meantime, your account is set up and your profile is saved. Check back soon, or sign out if you need
            to switch accounts.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
