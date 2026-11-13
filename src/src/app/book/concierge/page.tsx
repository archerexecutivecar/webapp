import type { Metadata } from "next";
import { ConciergeForm } from "@/components/archer/v2/forms/concierge-form";

export const metadata: Metadata = { title: "Archer Concierge Request" };

export default function Page() {
  return <ConciergeForm />;
}
