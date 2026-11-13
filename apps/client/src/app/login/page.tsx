"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorText, SITE_URL, tokenStore, type Session } from "@/lib/api";
import { Brand } from "@/components/Shell";

type Mode = "code" | "set" | "password" | "register";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("code");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundEmail, setNotFoundEmail] = useState<string | null>(null);

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
    setNotFoundEmail(null);
    return run(async () => {
      try {
        await api("/customer/auth/code", { method: "POST", body: { email }, auth: false });
        setSent(true);
      } catch (err) {
        if (err instanceof ApiError && err.code === "ACCOUNT_NOT_FOUND") {
          setNotFoundEmail(email);
          return;
        }
        throw err;
      }
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      if (mode === "set" && newPassword !== confirm) throw new Error("The two passwords do not match.");
      const body = mode === "set" ? { email, code, password: newPassword, password_confirmation: confirm } : { email, code };
      const s = await api<Session>("/customer/auth/code/verify", { method: "POST", body, auth: false });
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

  const registerAccount = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      if (newPassword !== confirm) throw new Error("The two passwords do not match.");
      const s = await api<Session>("/customer/auth/register", {
        method: "POST",
        body: { name, email, phone: phone || null, password: newPassword, password_confirmation: confirm },
        auth: false,
      });
      tokenStore.set(s.token);
      router.replace("/rides");
    });
  };

  return (
    <main className="center">
      <div className="auth">
        <Brand />
        <div>
          <span className="eyebrow">{mode === "register" ? "GET STARTED" : "WELCOME BACK"}</span>
          <h1 className="title">{mode === "register" ? "Create your account" : "Sign in to see your rides"}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {mode === "register"
              ? "Create an Archer account to book and manage your private rides."
              : "Sign in to view your rides, or create a new Archer account."}
          </p>
        </div>

        {mode !== "password" && (
          <div className="seg" role="group" aria-label="Account options">
            {mode === "register" ? (
              <>
                <button type="button" aria-pressed={false} onClick={() => { setMode("code"); setError(null); setNotFoundEmail(null); }}>SIGN IN</button>
                <button type="button" aria-pressed={true}>CREATE ACCOUNT</button>
              </>
            ) : (
              <>
                <button type="button" aria-pressed={mode === "code"} onClick={() => { setMode("code"); setError(null); setNotFoundEmail(null); }}>EMAIL ME A CODE</button>
                <button type="button" aria-pressed={mode === "set"} onClick={() => { setMode("set"); setError(null); setNotFoundEmail(null); }}>SET A PASSWORD</button>
                <button type="button" aria-pressed={false} onClick={() => { setMode("register"); setError(null); setNotFoundEmail(null); }}>CREATE ACCOUNT</button>
              </>
            )}
          </div>
        )}

        {error && <div role="alert" className="alert">{error}</div>}

        {notFoundEmail && (
          <div className="alert" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>No Archer account was found for <strong>{notFoundEmail}</strong>.</div>
            <button
              type="button"
              className="btn block"
              onClick={() => {
                setMode("register");
                setNotFoundEmail(null);
                setError(null);
              }}
            >
              CREATE AN ACCOUNT WITH THIS EMAIL
            </button>
          </div>
        )}

        {mode === "register" && (
          <form className="stack" onSubmit={registerAccount}>
            <label className="field">Full Name<input className="input" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></label>
            <label className="field">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field">Mobile Phone <span style={{ fontSize: 12, opacity: 0.7 }}>(optional)</span><input className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(848) 555-0100" /></label>
            <label className="field">Password<input className="input" type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
            <label className="field">Confirm Password<input className="input" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>At least 10 characters, with letters and numbers.</p>
            <button className="btn block" disabled={busy}>{busy ? "Creating account…" : "CREATE ACCOUNT"}</button>
            <button type="button" className="link-btn" style={{ minHeight: 0, padding: 0 }} onClick={() => { setMode("code"); setError(null); }}>Already have an account? Sign in</button>
          </form>
        )}

        {mode !== "password" && mode !== "register" && !sent && (
          <form className="stack" onSubmit={sendCode}>
            <label className="field">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <button className="btn block" disabled={busy}>{busy ? "Sending…" : "EMAIL ME A CODE"}</button>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {mode === "set"
                ? "We'll email a 6-digit code to confirm it's you, then you choose your password."
                : "No password needed. We'll send a 6-digit code to your email."}
            </p>
          </form>
        )}

        {mode !== "password" && mode !== "register" && sent && (
          <form className="stack" onSubmit={verify}>
            <div className="alert ok">A 6-digit code was sent to <strong>{email}</strong>. It expires in 10 minutes.</div>
            <label className="field">6-digit code<input className="input code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            {mode === "set" && (
              <>
                <label className="field">New password<input className="input" type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
                <label className="field">Confirm password<input className="input" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>At least 10 characters, with letters and numbers.</p>
              </>
            )}
            <button className="btn block" disabled={busy || code.length !== 6}>{busy ? "Checking…" : mode === "set" ? "SET PASSWORD & SIGN IN" : "SIGN IN"}</button>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="link-btn" onClick={() => { setSent(false); setCode(""); setError(null); setNotFoundEmail(null); }}>Use a different email</button>
              <button type="button" className="link-btn" disabled={busy} onClick={() => sendCode()}>Send a new code</button>
            </div>
          </form>
        )}

        {mode === "password" && (
          <form className="stack" onSubmit={signInPassword}>
            <label className="field">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field">Password<input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="btn block" disabled={busy}>{busy ? "Signing in…" : "SIGN IN"}</button>
            <button type="button" className="link-btn" style={{ minHeight: 0, padding: 0 }} onClick={() => { setMode("code"); setError(null); }}>Back</button>
          </form>
        )}

        {mode !== "password" && mode !== "register" && (
          <button type="button" className="link-btn" style={{ minHeight: 0, padding: 0, textAlign: "left" }} onClick={() => { setMode("password"); setError(null); setSent(false); }}>Already set a password? Sign in with it</button>
        )}

        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          New to Archer? <button type="button" className="link-btn" style={{ minHeight: 0, padding: 0, textDecoration: "underline", color: "inherit" }} onClick={() => { setMode("register"); setError(null); setNotFoundEmail(null); }}>Create an account</button> or <a href={`${SITE_URL}/book`}>book a ride</a>.
        </p>
      </div>
    </main>
  );
}
