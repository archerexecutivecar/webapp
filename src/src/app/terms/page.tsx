import type { Metadata } from "next";
import { CONTACT, LegalPage } from "@/components/archer/v2/legal-page";

export const metadata: Metadata = { title: "Terms of Service | Archer" };

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of the Archer website, customer portal and apps and the transportation and related services provided by Archer Enterprises LLC. By submitting a request or using our services you agree to them."
      sections={[
        { title: "Our services", body: [
          "Archer provides chauffeured ground transportation, airport transfers, hourly service, Client Car service, concierge and, where requested, security services. Submitting an online request is not a confirmed reservation: a booking is confirmed only when Archer dispatch confirms it to you.",
        ] },
        { title: "Pricing and payment", body: [
          "The final price is confirmed by Archer for your specific request. Prices shown online are estimates until dispatch confirms them. Taxes, tolls, parking, waiting time and gratuity may apply as stated in your confirmation. Payment is processed through our payment provider.",
        ] },
        { title: "Your responsibilities", body: [
          "You agree to provide accurate trip and contact information, to be ready at the agreed time and place, to behave lawfully and respectfully toward chauffeurs and vehicles, and to use seat belts. You are responsible for damage or cleaning costs caused by you or your guests beyond normal use.",
        ] },
        { title: "Chauffeurs and vehicles", body: [
          "Vehicles and chauffeurs may be substituted with equivalent or better service where necessary. Chauffeurs may refuse or end service where there is a safety concern, unlawful conduct or the vehicle capacity would be exceeded.",
        ] },
        { title: "Delays and events beyond our control", body: [
          "Archer is not liable for delays or failure to perform caused by traffic, weather, road closures, airline or airport operations, government action or other events outside our reasonable control. We track flights on airport pickups to adjust where we can.",
        ] },
        { title: "Cancellations", body: ["Cancellations and changes are governed by our Cancellation Policy and the terms in your booking confirmation."] },
        { title: "Limitation of liability", body: [
          "To the fullest extent permitted by law, Archer is not liable for indirect, incidental or consequential damages, and our total liability for any claim relating to a service is limited to the amount you paid for that service. Nothing in these terms excludes liability that cannot be excluded by law.",
        ] },
        { title: "Accounts and acceptable use", body: [
          "Keep your sign-in details secure and tell us promptly of any misuse. You may not misuse the site, attempt unauthorized access, or interfere with its operation.",
        ] },
        { title: "Governing law", body: ["These terms are governed by the laws of the State of New Jersey, without regard to conflict-of-law rules."] },
        { title: "Changes and contact", body: ["We may update these terms; the version in effect when you book applies to that booking.", CONTACT] },
      ]}
    />
  );
}
