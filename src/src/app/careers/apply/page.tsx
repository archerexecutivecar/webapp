import type { Metadata } from "next";
import { Suspense } from "react";
import { CareersApplyClient } from "@/components/archer/careers-apply-client";

export const metadata: Metadata = {
  title: "Apply to Archer | Archer Executive Services",
  description: "Apply in three steps for Professional Chauffeur, Military & Law Enforcement Chauffeur, or Social Media & Marketing roles.",
};

export default function CareersApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}>
      <CareersApplyClient />
    </Suspense>
  );
}
