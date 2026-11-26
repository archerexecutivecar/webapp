import type { Metadata } from "next";
import { InfluencerApplyClient } from "@/components/archer/influencer-apply-client";

export const metadata: Metadata = {
  title: "Influencer Marketing Applications | Archer Executive Services",
  description: "Apply to partner with Archer Executive Services as an Influencer Marketing creator or brand ambassador.",
};

export default function InfluencerMarketingCareersPage() {
  return <InfluencerApplyClient />;
}
