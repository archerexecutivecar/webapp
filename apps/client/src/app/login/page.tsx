"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorText, SITE_URL, tokenStore, type Session } from "@/lib/api";
import { Brand } from "@/components/Shell";

type Mode = "code" | "password";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenStore.get()) router.replace("/rides");
  }, [router]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    return run(async () => {
      await api("/customer/auth/code", { method: "POST", body: { email }, auth: false });
      setSent(true);
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const s = await api<Session>("/customer/auth/code/verify", { method: "POST", body: { email, code }, auth: false });
      tokenStore.set(s.token);
      router.replace("/rides");
    });
  };

  const signInPassword = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const s = await api<Session & { user: { roles: string[] } }>("/auth/login", { method: "POST", body: { email, password }, auth: false });
      if (!s.user.roles.includes("customer")) {
        // A staff credential must never open the customer app: revoke the token we were just handed.
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${s.token}`, Accept: "application/json" } }).catch(() => undefined);
        throw new Error("This app is for Archer customers.");
      }
      tokenStore.set(s.token);
      router.replace("/rides");
    });
  };

  return (
    <main className="center">
      <div className="auth">
        <Brand />
        <div>
          <span className="eyebrow">WELCOME BACK</span>
          <h1 className="title">Sign in to see your rides</h1>
          <p className="muted" style={{ margin: 0 }}>Your account is created automatically the first time you book with Archer.</p>
        </div>

        <div className="seg" role="group" aria-label="Sign-in method">
          <button type="button" aria-pressed={mode === "code"} onClick={() => { setMode("code"); setError(null); }}>EMAIL CODE</button>
          <button type="button" aria-pressed={mode === "password"} onClick={() => { setMode("password"); setError(null); }}>PASSWORD</button>
        </div>

        {error && <div role="alert" className="alert">{error}</div>}

        {mode === "code" && !sent && (
          <form className="stack" onSubmit={sendCode}>
            <label className="field">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <button className="btn block" disabled={busy}>{busy ? "Sending…" : "EMAIL ME A CODE"}</button>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>No password needed. We&apos;ll send a 6-digit code to the email you booked with.</p>
          </form>
        )}

        {mode === "code" && sent && (
          <form className="stack" onSubmit={verify}>
            <div className="alert ok">If an account exists for <strong>{email}</strong>, a code is on its way. It expires in 10 minutes.</div>
            <label className="field">6-digit code<input className="input code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            <button className="btn block" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "SIGN IN"}</button>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="link-btn" onClick={() => { setSent(false); setCode(""); setError(null); }}>Use a different email</button>
              <button type="button" className="link-btn" disabled={busy} onClick={() => sendCode()}>Send a new code</button>
            </div>
          </form>
        )}

        {mode === "password" && (
          <form className="stack" onSubmit={signInPassword}>
            <label className="field">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field">Password<input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="btn block" disabled={busy}>{busy ? "Signing in…" : "SIGN IN"}</button>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>No password yet, or forgot it? Use <button type="button" className="link-btn" style={{ minHeight: 0, padding: 0 }} onClick={() => setMode("code")}>an email code</button> instead, then set a password in Account.</p>
          </form>
        )}

        <p className="muted" style={{ margin: 0, fontSize: 14 }}>New to Archer? <a href={`${SITE_URL}/book`}>Book a ride</a> and your account is ready.</p>
      </div>
    </main>
  );
}
