import type { Metadata } from "next";
import { TiersPage } from "@/components/archer/v2/tiers-page";

export const metadata: Metadata = { title: "Archer Tiers of Service" };

export default function Page() {
  return <TiersPage />;
}
