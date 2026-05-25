import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-svh bg-[var(--surface-app-dark)] text-[var(--foreground-on-dark)] focus-visible:outline-none">
      <section className="relative h-[36svh] min-h-[260px] w-full overflow-hidden sm:h-[42svh]">
        <picture>
          <source media="(max-width: 767px)" srcSet="/images/landing-hero-mobile.svg" />
          <img src="/images/landing-hero-desktop.svg" alt="Fresh produce illustration" className="h-full w-full object-cover" />
        </picture>
      </section>

      <section className="mx-auto w-full max-w-3xl bg-[var(--surface-app-dark)] px-6 pb-10 pt-8 sm:px-10 sm:pt-10">
        <div className="space-y-6">
          <h1 className="text-balance text-5xl leading-tight text-[var(--foreground-on-dark-strong)] sm:text-6xl">Your personal nutrition coach</h1>
          <p className="text-pretty text-lg leading-relaxed text-[var(--foreground-on-dark-muted)] sm:text-[1.9rem] sm:leading-relaxed">
            Chat naturally about what you eat. Nourish understands Indian food and gives you personalised guidance — without the clinic.
          </p>
          <ul className="space-y-3 text-lg text-[var(--foreground-on-dark)]">
            <li>✓ <span className="font-semibold text-[var(--foreground-on-dark-strong)]">Chat-first logging</span> — Just say what you ate</li>
            <li>✓ <span className="font-semibold text-[var(--foreground-on-dark-strong)]">Indian food library</span> — Accurate estimates</li>
            <li>✓ <span className="font-semibold text-[var(--foreground-on-dark-strong)]">Personalised to you</span> — Based on your health profile</li>
          </ul>
          <div className="flex w-full flex-col gap-3">
            <Button asChild className="w-full text-lg">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-[var(--brand-muted)] hover:bg-[var(--surface-panel-dark)]">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="text-center text-sm text-[#6f7a73]">By continuing you agree to our Terms and Privacy Policy.</p>
        </div>
      </section>
    </main>
  );
}
