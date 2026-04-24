import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Me",
  description: "Your profile and what Nourish remembers about you.",
};

export default async function ProfilePage() {
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Hey, {firstName}.</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle as="h2">What I&apos;ll remember about you</CardTitle>
          <CardDescription>
            Your profile, your patterns, and the everyday terms you use — &ldquo;my usual chai&rdquo;, &ldquo;amma&apos;s
            sambar&rdquo;. You&apos;ll see and edit all of it here, and you can ask me to forget any of it at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            This page fills itself in as we chat. Start with your first meal and the details will show up — no forms,
            no friction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
