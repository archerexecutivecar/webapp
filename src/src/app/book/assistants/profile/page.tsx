import type { Metadata } from "next";
import { AssistantsProfile } from "@/components/archer/v2/forms/assistants-profile";

export const metadata: Metadata = { title: "Your assistant profile" };

export default function Page() {
  return <AssistantsProfile />;
}
