import { getSite } from "@/lib/site-api";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServicePage } from "@/components/archer/v2/service-page";
import { SERVICES, bySlug, type ServiceConfig } from "@/components/archer/v2/service-data";

export const revalidate = 60;

async function load(slug: string) {
  const site = await getSite();
  const live = site?.services?.find((d: { slug?: string }) => d?.slug === slug);
  return (live as ServiceConfig | undefined) ?? bySlug(slug);
}

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await load(slug);
  return { title: s ? `Archer ${s.name}` : "Archer" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) notFound();
  return <ServicePage c={s} />;
}
