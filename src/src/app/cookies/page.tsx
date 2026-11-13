import type { Metadata } from "next";
import { CONTACT, LegalPage } from "@/components/archer/v2/legal-page";

export const metadata: Metadata = { title: "Cookie Policy | Archer" };

export default function Page() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="This policy explains how the Archer website and customer portal use cookies and similar technologies, and how you can control them."
      sections={[
        { title: "What are cookies", body: ["Cookies and similar technologies (such as local storage) are small pieces of data stored on your device by a website."] },
        { title: "Essential cookies", body: [
          "We use essential cookies and local storage to keep you signed in to the customer portal, protect forms against abuse, remember your cookie choice and keep the site secure. These are required for the site to work and cannot be switched off.",
        ] },
        { title: "Optional cookies", body: [
          "Analytics, marketing or other optional cookies are only set if you choose “Accept all” and only where we have enabled them. If none are enabled, choosing “Accept all” does not add any cookies.",
        ] },
        { title: "Managing your choice", body: [
          "Use “Cookie settings” in the page footer at any time to change your choice. You can also block or delete cookies in your browser settings, though parts of the site may then stop working.",
        ] },
        { title: "Contact", body: [CONTACT] },
      ]}
    />
  );
}
