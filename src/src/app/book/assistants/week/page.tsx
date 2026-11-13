import type { Metadata } from "next";
import { AssistantsWeek } from "@/components/archer/v2/forms/assistants-week";

export const metadata: Metadata = { title: "Plan your executive's week" };

export default function Page() {
  return <AssistantsWeek />;
}
