import { api } from "@/lib/api";

/** Chauffeur services the client book form can submit. Keyed by the public site slug. */
const BOOK_SERVICE: Record<string, string> = {
  hourly: "hourly",
  airport: "airport",
  "point-to-point": "p2p",
  "client-car": "client",
};

type OptService = { slug: string; name: string; tagline?: string | null };
type OptTier = { tier: number; label: string; title: string; call_only: boolean };
type HomeCard = { name?: string; blurb?: string; href?: string };
type HomeSlide = { head?: string; line?: string };
type SiteHome = { services?: HomeCard[]; security?: { name?: string }[]; slides?: HomeSlide[] };

export type PortalAction = { href: string; name: string; detail: string; lane: "ride" | "security" };
export type HomeFeed = { actions: PortalAction[]; feature: { head: string; line: string } | null };
export type SecurityTier = { tier: number; label: string; title: string; callOnly: boolean };
export type SecurityOffering = { name: string };
export type SecurityRequest = { title: string; detail: string; offerings: SecurityOffering[]; tiers: SecurityTier[] };

type Catalog = {
  home: SiteHome | null;
  services: OptService[];
  securityTiers: OptTier[];
};

async function catalog(): Promise<Catalog> {
  const [site, options] = await Promise.all([
    api<{ home?: SiteHome | null }>("/site", { auth: false }),
    api<{ services?: OptService[]; security_addons?: OptTier[] }>("/booking-options", { auth: false }),
  ]);
  return {
    home: site.home ?? null,
    services: options.services ?? [],
    securityTiers: options.security_addons ?? [],
  };
}

function siteSlug(href: string | undefined): string {
  return href?.split("/").filter(Boolean).pop() ?? "";
}

function portalActions(src: Catalog): PortalAction[] {
  const { home, services } = src;
  const active = new Set(services.map((s) => s.slug));
  const actions: PortalAction[] = [];

  for (const card of home?.services ?? []) {
    const bookId = BOOK_SERVICE[siteSlug(card.href)];
    if (!bookId || !active.has(bookId) || !card.name) continue;
    const opt = services.find((s) => s.slug === bookId);
    actions.push({
      href: `/book?service=${bookId}`,
      name: card.name,
      detail: card.blurb?.trim() || opt?.tagline?.trim() || "",
      lane: "ride",
    });
  }

  for (const id of Object.values(BOOK_SERVICE)) {
    if (!active.has(id) || actions.some((a) => a.href === `/book?service=${id}`)) continue;
    const opt = services.find((s) => s.slug === id);
    if (!opt?.name) continue;
    actions.push({ href: `/book?service=${id}`, name: opt.name, detail: opt.tagline?.trim() || "", lane: "ride" });
  }

  const security = securityRequest(src);
  if (security) {
    actions.push({ href: "/security", name: security.title, detail: security.detail, lane: "security" });
  }
  return actions;
}

/** Home and Services screens: active services plus the first published home line. */
export async function loadHomeFeed(): Promise<HomeFeed> {
  const src = await catalog();
  const slide = src.home?.slides?.find((s) => s.head?.trim());
  return {
    actions: portalActions(src),
    feature: slide?.head ? { head: slide.head.trim(), line: slide.line?.trim() || "" } : null,
  };
}

/** Home actions: one card per active bookable service, plus security when Admin offers it. */
export async function loadPortalActions(): Promise<PortalAction[]> {
  return portalActions(await catalog());
}

/** Copy and tiers for the security request screen. Null when Admin has not published security. */
export async function loadSecurityRequest(): Promise<SecurityRequest | null> {
  return securityRequest(await catalog());
}

function securityRequest(src: Catalog): SecurityRequest | null {
  const names = (src.home?.security ?? []).map((s) => s.name?.trim()).filter((n): n is string => !!n);
  const opt = src.services.find((s) => s.slug === "security");
  const tiers = src.securityTiers
    .filter((t) => t.label)
    .map((t) => ({ tier: t.tier, label: t.label, title: t.title, callOnly: t.call_only }));
  const title = names[0] || opt?.name || tiers[0]?.label || "";
  if (!title) return null;
  return {
    title,
    detail: opt?.tagline?.trim() || "",
    offerings: names.map((name) => ({ name })),
    tiers,
  };
}
