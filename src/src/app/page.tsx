import { HomeV2 } from "@/components/archer/v2/home-v2";
import { WhatsAppDock } from "@/components/archer/whatsapp-dock";
import { SiteChrome } from "@/components/archer/site-chrome";
import { BookingFlow } from "@/components/archer/booking-flow";

export default function Home() {
  return (
    <>
      <HomeV2 />
      <WhatsAppDock />
      <SiteChrome />
      <BookingFlow />
    </>
  );
}
