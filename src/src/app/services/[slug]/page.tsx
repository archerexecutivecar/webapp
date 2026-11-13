import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServicePage } from "@/components/archer/v2/service-page";
import { SERVICES, bySlug } from "@/components/archer/v2/service-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = bySlug(slug);
  return { title: s ? `Archer ${s.name}` : "Archer" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const s = bySlug(slug);
  if (!s) notFound();
  return <ServicePage c={s} />;
}
