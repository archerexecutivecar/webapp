"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Service deep links used by the public site (e.g. /book/client-car, QA BUG-011).
 * Maps the public slug to the booking form's service id; unknown slugs fall back to plain /book.
 */
const SLUG_TO_SERVICE: Record<string, string> = {
  hourly: "hourly",
  airport: "airport",
  "point-to-point": "p2p",
  p2p: "p2p",
  "client-car": "client",
  security: "security",
};

export default function BookService() {
  const router = useRouter();
  const { service } = useParams<{ service: string }>();
  useEffect(() => {
    const id = SLUG_TO_SERVICE[service];
    router.replace(id ? `/book?service=${id}` : "/book");
  }, [router, service]);
  return <div className="center muted">Loading…</div>;
}
