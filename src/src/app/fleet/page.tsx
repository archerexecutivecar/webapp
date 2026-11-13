import { getSite } from "@/lib/site-api";
import type { Metadata } from "next";
import { FleetPage } from "@/components/archer/v2/fleet-page";

export const metadata: Metadata = { title: "Archer's Fleet" };

export const revalidate = 60;

export default async function Page() {
  return <FleetPage site={await getSite()} />;
}
