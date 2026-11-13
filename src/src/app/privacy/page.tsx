import type { Metadata } from "next";
import { CONTACT, LegalPage } from "@/components/archer/v2/legal-page";

export const metadata: Metadata = { title: "Privacy Policy | Archer" };

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Archer Enterprises LLC (“Archer”, “we”) respects your privacy. This policy explains what personal information we collect when you use our website, customer portal and apps, how we use it, and the choices you have."
      sections={[
        { title: "Information we collect", body: [
          "Booking and account details you give us: name, email, phone number, pickup and drop-off addresses, travel dates and times, flight details, passenger preferences and any notes you add.",
          "Assistant profile details when an executive or personal assistant books on someone else's behalf.",
          "Technical data such as device type, browser, IP address and pages visited, collected through essential cookies and server logs to keep the service secure and working.",
        ] },
        { title: "How we use it", body: [
          "To quote, confirm, dispatch and complete your rides and services; to contact you about a booking; to provide customer-portal sign-in and ride tracking; to keep records required for safety, insurance, accounting and legal compliance; and to prevent fraud and abuse.",
          "We do not sell your personal information.",
        ] },
        { title: "Who we share it with", body: [
          "Chauffeurs and dispatch staff who need trip details to serve you; payment, email and hosting providers acting on our instructions; and authorities where the law requires it. Service providers may only use your data to provide services to us.",
        ] },
        { title: "Retention and security", body: [
          "We keep booking and financial records for as long as needed for the purposes above and as the law requires. We protect data with access controls, encrypted connections and audit logging of operational changes. No system is perfectly secure, and we cannot guarantee absolute security.",
        ] },
        { title: "Your choices and rights", body: [
          "You may ask us to access, correct or delete your personal information, or to stop marketing messages, subject to legal and operational record-keeping requirements. Depending on where you live, you may have additional rights under state privacy laws. Contact us using the details below.",
        ] },
        { title: "Cookies", body: ["See our Cookie Policy for the cookies we use and how to manage them."] },
        { title: "Children", body: ["Our services are not directed to children under 13 and we do not knowingly collect their information."] },
        { title: "Changes to this policy", body: ["We may update this policy. The “last updated” date above shows the current version."] },
        { title: "Contact", body: [CONTACT] },
      ]}
    />
  );
}
