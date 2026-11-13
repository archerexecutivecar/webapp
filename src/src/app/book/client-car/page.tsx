import type { Metadata } from "next";
import { ClientCarForm } from "@/components/archer/v2/forms/client-car-form";

export const metadata: Metadata = { title: "Book Client Car Service" };

export default function Page() {
  return <ClientCarForm />;
}
