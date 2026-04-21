import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nourish — Your AI health coach",
    short_name: "Nourish",
    description:
      "Log meals in plain English, get honest calorie ranges, and nutrition insights built for Indian food and Indian bodies.",
    start_url: "/chat",
    id: "/chat",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#0a0a0a",
    categories: ["health", "lifestyle", "food"],
    lang: "en-IN",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log a meal", short_name: "Log", url: "/chat", description: "Open chat to log a meal" },
      { name: "Today", short_name: "Today", url: "/today", description: "See today's meals and totals" },
    ],
  };
}
