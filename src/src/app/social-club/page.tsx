import type { Metadata } from "next";
import { SocialClubClient } from "@/components/archer/social-club-client";

export const metadata: Metadata = {
  title: "Archer Social Club | Events, Community & VIP Rides",
  description: "Join the Archer Social Club for upcoming events, influencer highlights, and advance VIP ride bookings.",
};

export default function SocialClubPage() {
  return <SocialClubClient />;
}
