import type { Metadata } from "next";
import { BookForm } from "@/components/archer/v2/forms/book-form";

export const metadata: Metadata = { title: "Book your ride" };

export default function Page() {
  return <BookForm />;
}
