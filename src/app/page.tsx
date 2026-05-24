import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--surface-canvas)] px-6 focus-visible:outline-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[var(--surface-brand-soft)] to-transparent" />
        <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[color:var(--brand)]/8 blur-3xl" />
        <div className="absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-[color:var(--surface-brand-soft)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-muted)]">Nourish</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-[color:var(--brand-muted)] sm:text-5xl">
          Nourish your day.
        </h1>
        <p className="text-balance text-lg leading-relaxed text-muted-foreground">
          An AI health coach for Indian food, real routines, and steady progress.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/signup">Start your health setup</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Built for everyday Indian meals. No food scales required.</p>
      </div>
    </main>
  );
}
