import { getSite } from "@/lib/site-api";
import { HomeV2 } from "@/components/archer/v2/home-v2";
import { WhatsAppDock } from "@/components/archer/whatsapp-dock";
import { SiteChrome } from "@/components/archer/site-chrome";
import { BookingFlow } from "@/components/archer/booking-flow";

export const revalidate = 60;

export default async function Home() {
  const site = await getSite();
  return (
    <>
      <HomeV2 site={site} />
      <WhatsAppDock />
      <SiteChrome />
      <BookingFlow />
    </>
  );
}
