"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorText, safeNext, tokenStore, type SessionUser } from "@/lib/api";
import { usePublicBrand } from "@/lib/brand";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => safeNext(new URLSearchParams(window.location.search).get("next"));

  useEffect(() => {
    if (tokenStore.get()) router.replace(next());
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await api<{ token: string; user: SessionUser }>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      if (!s.user.roles.includes("driver")) {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${s.token}`, Accept: "application/json" },
        }).catch(() => undefined);
        throw new Error("This app is for Archer drivers. Use your driver account.");
      }
      tokenStore.set(s.token);
      router.replace(next());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError("Those credentials were not recognized.");
      else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const brand = usePublicBrand();

  return (
    <div className="center">
      <div className="auth stack">
        <div className="signin-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.logo_url || "/brand-mark.png"} alt="" />
          <div className="signin-name">{brand.brand_name}</div>
          {brand.tagline ? <p className="muted" style={{ margin: 0, letterSpacing: "0.16em", fontSize: 11, textTransform: "uppercase" }}>{brand.tagline}</p> : null}
        </div>
        <h1 className="title">Sign in</h1>
        <p className="muted" style={{ margin: 0 }}>Use the email and password on your driver account. Offers and pay come live from dispatch.</p>
        {error && <div role="alert" className="alert">{error}</div>}
        <form className="stack" onSubmit={submit}>
          <label className="field">
            Email
            <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            Password
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
