import type { Metadata } from "next";
import { P2PForm } from "@/components/archer/v2/forms/p2p-form";

export const metadata: Metadata = { title: "Book Point to Point" };

export default function Page() {
  return <P2PForm />;
}
