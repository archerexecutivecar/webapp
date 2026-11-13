import type { Metadata } from "next";
import { CONTACT, LegalPage } from "@/components/archer/v2/legal-page";

export const metadata: Metadata = { title: "Cancellation Policy | Archer" };

export default function Page() {
  return (
    <LegalPage
      title="Cancellation Policy"
      intro="We understand plans change. This policy explains how to cancel or change a booking with Archer."
      sections={[
        { title: "How to cancel or change", body: [
          "Contact Archer dispatch by phone at (848) 231-9997 or by email, quoting your booking reference. Changes and cancellations are effective only once dispatch acknowledges them.",
        ] },
        { title: "Cancellation terms", body: [
          "Any cancellation window, fee or non-refundable charge that applies to your booking is stated in your booking confirmation from Archer. Requests are subject to the terms confirmed for your specific service, vehicle and date.",
        ] },
        { title: "Archer cancellations", body: [
          "If Archer must cancel or cannot provide the confirmed service, we will notify you as soon as possible and arrange an equivalent alternative or refund amounts paid for the unperformed service.",
        ] },
        { title: "No-shows and changes on the day", body: [
          "If the passenger cannot be reached at the pickup time and place, the booking may be treated as a no-show under the terms in your confirmation. Waiting time and route changes on the day may affect the final price.",
        ] },
        { title: "Refunds", body: ["Approved refunds are returned to the original payment method."] },
        { title: "Contact", body: [CONTACT] },
      ]}
    />
  );
}
