"use client";

import {
  DISPATCH_EMAIL,
  DISPATCH_PHONE_DISPLAY,
  DISPATCH_PHONE_TEL,
  WHATSAPP_DISPLAY,
  whatsappLink,
} from "@/lib/archer-data";
import { useArcherStore } from "@/lib/archer-store";
import { WhatsAppIcon } from "@/components/archer/reveal";
import { Headset, Mail, Phone } from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const SERVICE_LINKS = [
  { label: "Driver Tiers", target: "tiers" },
  { label: "Black Car Fleet", target: "fleet" },
  { label: "Executive Protection", target: "security" },
  { label: "Hourly Chauffeur", target: "services" },
  { label: "Airport Transfers", target: "services" },
  { label: "Special Events", target: "services" },
];

const EXPLORE_LINKS = [
  { label: "Tiers of Service", target: "tiers" },
  { label: "Fleet", target: "fleet" },
  { label: "Security", target: "security" },
  { label: "The Archer Standard", target: "about" },
  { label: "Chauffeur Experience", target: "experience" },
  { label: "FAQs", target: "faq" },
];

export function Footer() {
  const openBooking = useArcherStore((s) => s.openBooking);
  const setCityOpen = useArcherStore((s) => s.setCityOpen);

  return (
    <footer id="contact" className="mt-auto scroll-mt-24 border-t border-white/8 bg-[#080808]">
      <div className="archer-container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-3">
            <p className="font-heading text-2xl font-extrabold tracking-[0.32em] text-white">
              ARCHER
            </p>
            <p className="mt-3 font-heading text-[9.5px] font-bold tracking-[0.3em] text-archer-gray uppercase">
              On time ~ In style ~ Every time
            </p>
            <p className="mt-6 max-w-xs text-[13px] leading-relaxed text-archer-gray">
              Premium executive transportation and professional mobility services — managed with
              precision from booking to arrival.
            </p>
            <button onClick={() => openBooking(undefined, 1)} className="btn-archer mt-7 h-10 px-6 text-[11px]">
              Book a ride
            </button>
          </div>

          {/* Services */}
          <nav className="lg:col-span-2" aria-label="Services">
            <p className="font-heading text-[10px] font-extrabold tracking-[0.32em] text-white uppercase">
              Services
            </p>
            <ul className="mt-5 space-y-3">
              {SERVICE_LINKS.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => scrollToId(l.target)}
                    className="text-[13px] text-archer-gray transition-colors hover:text-archer-orange"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Explore */}
          <nav className="lg:col-span-2" aria-label="Explore">
            <p className="font-heading text-[10px] font-extrabold tracking-[0.32em] text-white uppercase">
              Explore
            </p>
            <ul className="mt-5 space-y-3">
              {EXPLORE_LINKS.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => scrollToId(l.target)}
                    className="text-[13px] text-archer-gray transition-colors hover:text-archer-orange"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setCityOpen(true)}
                  className="text-[13px] text-archer-gray transition-colors hover:text-archer-orange"
                >
                  Choose City
                </button>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div className="lg:col-span-3">
            <p className="font-heading text-[10px] font-extrabold tracking-[0.32em] text-white uppercase">
              Contact
            </p>
            <ul className="mt-5 space-y-4">
              <li>
                <a
                  href={`tel:${DISPATCH_PHONE_TEL}`}
                  className="flex items-center gap-3 text-[13px] text-archer-gray transition-colors hover:text-archer-orange"
                >
                  <Headset className="h-3.5 w-3.5 text-archer-orange" aria-hidden="true" />
                  Dispatch · {DISPATCH_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink("Hello Archer — I'd like to arrange transportation.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[13px] text-archer-gray transition-colors hover:text-archer-orange"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-archer-orange" />
                  WhatsApp · {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${DISPATCH_EMAIL}`}
                  className="flex items-center gap-3 text-[13px] text-archer-gray transition-colors hover:text-archer-orange"
                >
                  <Mail className="h-3.5 w-3.5 text-archer-orange" aria-hidden="true" />
                  {DISPATCH_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-3 text-[13px] text-archer-gray">
                <Phone className="h-3.5 w-3.5 text-archer-orange" aria-hidden="true" />
                24/7 · Every day of the year
              </li>
            </ul>
          </div>

          {/* Legal */}
          <nav className="lg:col-span-2" aria-label="Legal">
            <p className="font-heading text-[10px] font-extrabold tracking-[0.32em] text-white uppercase">
              Legal
            </p>
            <ul className="mt-5 space-y-3">
              {["Privacy", "Terms", "Booking Terms", "Cancellation Policy"].map((l) => (
                <li key={l}>
                  <button
                    onClick={() =>
                      document
                        .getElementById("faq")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="text-[13px] text-archer-gray transition-colors hover:text-archer-orange"
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 sm:flex-row">
          <p className="text-[12px] text-archer-gray">
            © Archer. All rights reserved.
          </p>
          <p className="font-heading text-[9.5px] font-bold tracking-[0.28em] text-archer-gray/70 uppercase">
            On time ~ In style ~ Every time
          </p>
        </div>
      </div>
    </footer>
  );
}
