import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-svh bg-[#050706] text-[#eef2ed] focus-visible:outline-none">
      <section className="relative h-[36svh] min-h-[260px] w-full overflow-hidden sm:h-[42svh]">
        <picture>
          <source media="(max-width: 767px)" srcSet="/images/landing-hero-mobile.svg" />
          <img src="/images/landing-hero-desktop.svg" alt="Fresh produce illustration" className="h-full w-full object-cover" />
        </picture>
      </section>

      <section className="mx-auto w-full max-w-3xl bg-[#050706] px-6 pb-10 pt-8 sm:px-10 sm:pt-10">
        <div className="space-y-6">
          <h1 className="text-balance text-5xl leading-tight text-[#f4f6f3] sm:text-6xl">Your personal nutrition coach</h1>
          <p className="text-pretty text-lg leading-relaxed text-[#9cac9f] sm:text-[1.9rem] sm:leading-relaxed">
            Chat naturally about what you eat. Nourish understands Indian food and gives you personalised guidance — without the clinic.
          </p>
          <ul className="space-y-3 text-lg text-[#d7ded9]">
            <li>✓ <span className="font-semibold text-[#ebf1ec]">Chat-first logging</span> — Just say what you ate</li>
            <li>✓ <span className="font-semibold text-[#ebf1ec]">Indian food library</span> — Accurate estimates</li>
            <li>✓ <span className="font-semibold text-[#ebf1ec]">Personalised to you</span> — Based on your health profile</li>
          </ul>
          <div className="flex w-full flex-col gap-3">
            <Button asChild className="w-full text-lg">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-[#9db9a8] hover:bg-[#0f1713]">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="text-center text-sm text-[#6f7a73]">By continuing you agree to our Terms and Privacy Policy.</p>
        </div>
      </section>
    </main>
  );
}
