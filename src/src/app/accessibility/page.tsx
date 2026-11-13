import type { Metadata } from "next";
import { CONTACT, LegalPage } from "@/components/archer/v2/legal-page";

export const metadata: Metadata = { title: "Accessibility | Archer" };

export default function Page() {
  return (
    <LegalPage
      title="Accessibility Statement"
      intro="Archer is committed to making our website and services usable by everyone, including people with disabilities."
      sections={[
        { title: "Our approach", body: ["We aim to follow the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and continue to improve keyboard navigation, contrast, labelling and screen-reader support."] },
        { title: "Accessible transportation", body: ["Tell us about mobility, service-animal or other needs when you book and dispatch will arrange suitable vehicles and assistance where available."] },
        { title: "Feedback", body: ["If you have difficulty using any part of our site, or need information in another format, please contact us and we will help promptly.", CONTACT] },
      ]}
    />
  );
}
