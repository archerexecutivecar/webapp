import type { Metadata } from "next";
import { FleetPage } from "@/components/archer/v2/fleet-page";

export const metadata: Metadata = { title: "Archer's Fleet" };

export default function Page() {
  return <FleetPage />;
}
