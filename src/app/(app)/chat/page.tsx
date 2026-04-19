import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "../actions";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Signed in as {user.email}</h1>
      <p className="text-muted-foreground">Chat UI is coming in Phase 1.</p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" data-testid="logout-button">
          Sign out
        </Button>
      </form>
    </main>
  );
}
