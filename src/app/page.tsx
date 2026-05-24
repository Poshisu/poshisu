import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-svh bg-[#050706] text-[#eef2ed] focus-visible:outline-none">
      <section className="relative h-[38svh] min-h-[280px] w-full overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1920&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </section>
      <section className="mx-auto -mt-2 w-full max-w-2xl rounded-t-3xl border border-[var(--border-soft)] bg-[#050706] px-6 pb-10 pt-8 sm:px-10">
        <div className="space-y-6">
          <h1 className="text-5xl leading-tight text-[#f2f5f1]">Your personal nutrition coach</h1>
          <p className="text-lg leading-relaxed text-[#a0aca4]">
            Chat naturally about what you eat. Nourish understands Indian food and gives you personalised guidance —
            without the clinic.
          </p>
          <ul className="space-y-3 text-base text-[#d3ddd5]">
            <li>✓ Chat-first logging — Just say what you ate</li>
            <li>✓ Indian food library — Accurate estimates</li>
            <li>✓ Personalised to you — Based on your health profile</li>
          </ul>
          <div className="flex w-full flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-[#9db9a8] hover:bg-[#0f1713]">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="text-center text-sm text-[#6f7a73]">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
}
