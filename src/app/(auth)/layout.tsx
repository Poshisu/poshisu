import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-svh items-center justify-center bg-muted/30 p-4 focus-visible:outline-none"
    >
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
