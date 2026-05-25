import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-svh bg-[var(--surface-app-dark)] p-4 text-[var(--foreground-on-dark)] focus-visible:outline-none">
      <section className="mx-auto w-full max-w-xl space-y-6 pt-10">
        <div className="px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-on-dark-muted)]">Nourish</p>
          <h1 className="mt-2 text-4xl leading-tight text-[var(--foreground-on-dark-strong)]">Start your nutrition journey today.</h1>
          <p className="mt-2 text-lg text-[var(--foreground-on-dark-muted)]">Clear steps. Gentle guidance. Strong health foundations.</p>
        </div>
        {children}
      </section>
    </main>
  );
}
