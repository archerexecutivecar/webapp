import type { Metadata } from "next";
import { MiniFooter, PageShell, SiteHeader } from "@/components/archer/v2/shared";
import { CareersClient } from "@/components/archer/careers-client";

export const metadata: Metadata = {
  title: "Careers & Opportunities | Archer Executive Services",
  description:
    "Join the distinguished team at Archer Executive Services. Explore openings for Executive Chauffeurs, Security Detail Specialists, and Logistics Dispatchers.",
};

export const revalidate = 0; // Dynamic to immediately reflect toggle updates

export default function CareersPage() {
  return (
    <PageShell>
      <SiteHeader active="/careers" />
      <main>
        <CareersClient />
      </main>
      <MiniFooter />
    </PageShell>
  );
}
