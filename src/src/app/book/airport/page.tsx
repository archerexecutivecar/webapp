import type { Metadata } from "next";
import { AirportForm } from "@/components/archer/v2/forms/airport-form";

export const metadata: Metadata = { title: "Book Airport Transportation" };

export default function Page() {
  return <AirportForm />;
}
