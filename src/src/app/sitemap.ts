import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://archerexecutivecar.com";
const PATHS = ["/", "/fleet", "/tiers", "/book", "/book/point-to-point", "/book/airport", "/book/client-car", "/book/concierge", "/book/assistants/profile", "/book/assistants/week",
  "/services/hourly", "/services/airport", "/services/point-to-point", "/services/client-car", "/services/concierge", "/services/assistants",
  "/privacy", "/terms", "/cancellation", "/cookies", "/accessibility"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "monthly", priority: p === "/" ? 1 : 0.6 }));
}
