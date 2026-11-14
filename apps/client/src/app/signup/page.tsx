"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Registration lives on the login screen; /signup is kept as a stable public entry point (QA BUG-007). */
export default function Signup() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login?mode=register");
  }, [router]);
  return <div className="center muted">Loading…</div>;
}
