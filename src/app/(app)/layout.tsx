import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SideNav, TabBar } from "@/components/app/AppShellNav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="hidden border-r border-border bg-card/40 md:flex md:w-60 md:flex-col">
        <div className="flex h-14 items-center border-b border-border px-5">
          <WordmarkLink />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SideNav />
        </div>
        <form action={logoutAction} className="border-t border-border p-3">
          <Button type="submit" variant="ghost" className="w-full justify-start gap-3">
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </Button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <WordmarkLink />
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="gap-1.5 px-3" data-testid="logout-button">
              <LogOut aria-hidden="true" className="size-4" />
              <span>Sign out</span>
            </Button>
          </form>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] focus-visible:outline-none md:pb-0"
        >
          {children}
        </main>
      </div>

      <TabBar />
      <ServiceWorkerRegister />
    </div>
  );
}

function WordmarkLink() {
  return (
    <Link
      href="/chat"
      className="inline-flex items-center gap-2 rounded-sm text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-md bg-foreground font-mono text-sm font-semibold text-background"
      >
        n
      </span>
      <span>Nourish</span>
    </Link>
  );
}
