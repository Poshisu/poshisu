import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[var(--surface-canvas)] p-4 focus-visible:outline-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[var(--surface-brand-soft)] to-transparent" />
        <div className="absolute -right-16 top-20 h-52 w-52 rounded-full bg-[color:var(--brand)]/10 blur-3xl" />
        <div className="absolute -left-20 bottom-8 h-64 w-64 rounded-full bg-[color:var(--surface-brand-soft)] blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-sm space-y-4">
        <div className="px-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-muted)]">Nourish</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--brand-muted)]">Your coach is ready when you are.</h1>
        </div>
        {children}
      </section>
    </main>
  );
}
