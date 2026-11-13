import { getSite } from "@/lib/site-api";
import type { Metadata } from "next";
import { TiersPage } from "@/components/archer/v2/tiers-page";

export const metadata: Metadata = { title: "Archer Tiers of Service" };

export const revalidate = 60;

export default async function Page() {
  return <TiersPage site={await getSite()} />;
}
