"use client";

import { FAQS } from "@/lib/archer-data";
import { whatsappLink } from "@/lib/archer-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, SectionHeading, WhatsAppIcon } from "@/components/archer/reveal";

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-24 border-t border-white/8 bg-[#0D0D0D] py-24 md:py-32"
      aria-label="Frequently asked questions"
    >
      <div className="archer-container">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Sticky heading */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                label="FAQ"
                title={
                  <>
                    Questions,
                    <br />
                    answered.
                  </>
                }
                description="Everything you need to know about booking, airports, vehicles, client car service and more."
              />
              <Reveal delay={0.15}>
                <div className="mt-8 border border-white/10 bg-black/30 p-5">
                  <p className="font-heading text-[10px] font-bold tracking-[0.28em] text-archer-orange uppercase">
                    Still have a question?
                  </p>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-archer-silver/75">
                    Dispatch is available 24/7 — message us on WhatsApp and a real person will
                    help.
                  </p>
                  <a
                    href={whatsappLink("Hello Archer — I have a question about your services.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-archer-outline mt-4 h-10 w-full px-5 text-[11px]"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    Message dispatch
                  </a>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Accordions */}
          <div className="space-y-10 lg:col-span-8">
            {FAQS.map((cat, ci) => (
              <Reveal key={cat.category} delay={0.04 * ci}>
                <div>
                  <p className="mb-3 font-heading text-[11px] font-extrabold tracking-[0.32em] text-archer-gray uppercase">
                    {cat.category}
                  </p>
                  <Accordion type="single" collapsible className="border-t border-white/8">
                    {cat.items.map((item) => (
                      <AccordionItem
                        key={item.question}
                        value={`${cat.category}-${item.question}`}
                        className="border-b border-white/8"
                      >
                        <AccordionTrigger className="py-5 text-left font-heading text-[13.5px] font-bold tracking-[0.08em] text-white uppercase no-underline transition-colors hover:text-archer-orange hover:no-underline [&[data-state=open]>svg]:text-archer-orange">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 text-[14px] leading-relaxed text-archer-silver/75">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
