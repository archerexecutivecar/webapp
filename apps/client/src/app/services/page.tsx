"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScreenTitle } from "@/components/ScreenTitle";
import { ServiceMark } from "@/components/ServiceMark";
import { Shell } from "@/components/Shell";
import { errorText } from "@/lib/api";
import { loadHomeFeed, type HomeFeed } from "@/lib/portal";

function ServicesScreen() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadHomeFeed()
      .then((row) => { if (alive) setFeed(row); })
      .catch((e) => { if (alive) setError(errorText(e)); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="discover">
      <ScreenTitle title="Services" line={feed?.feature?.line} mark="hourly" />
      {error && <div role="alert" className="alert">{error}</div>}
      {feed === null && !error && <p className="muted">Loading services…</p>}
      {feed && feed.actions.length === 0 && <p className="muted">No services are available to book right now.</p>}
      <div className="service-mosaic">
        {feed?.actions.map((a, i) => (
          <Link key={a.href + a.name} href={a.href} className={i === 0 ? "service-tile wide" : "service-tile"}>
            <ServiceMark href={a.href} />
            <strong>{a.name}</strong>
            {a.detail && <span>{a.detail}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return <Shell><ServicesScreen /></Shell>;
}
