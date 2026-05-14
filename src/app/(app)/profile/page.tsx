import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileMemoryDashboard } from "./ProfileMemoryDashboard";
import { loadProfileMemoryInspector } from "@/lib/memory/inspector";

export const metadata: Metadata = {
  title: "Me",
  description: "Your profile and what Nourish remembers about you.",
};

export default async function ProfilePage() {
  const data = await loadProfileMemoryInspector();

  if (!data.user) {
    redirect("/login");
  }

  return <ProfileMemoryDashboard data={data} />;
}
