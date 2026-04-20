import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/20 px-6">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Nourish</h1>
        <p className="text-lg text-muted-foreground">
          Your AI health coach. Log meals in plain English, get calorie ranges you can trust, and real nutrition insights
          — built for Indian food and Indian bodies.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
