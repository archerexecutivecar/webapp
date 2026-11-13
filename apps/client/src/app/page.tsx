"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { tokenStore } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(tokenStore.get() ? "/rides" : "/login");
  }, [router]);
  return <div className="center muted">Loading…</div>;
}
