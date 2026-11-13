"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorText, tokenStore, type Session } from "@/lib/api";
import { Brand } from "@/components/Shell";

type Mode = "code" | "password" | "register";

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
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
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
      const s = await api<Session>("/customer/auth/code/verify", {
        method: "POST",
        body: { email, code },
        auth: false,
      });
      tokenStore.set(s.token);
      router.replace("/rides");
    });
  };

  const signInPassword = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const s = await api<Session & { user: { roles: string[] } }>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      if (!s.user.roles.includes("customer")) {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${s.token}`, Accept: "application/json" },
        }).catch(() => undefined);
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
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            {mode === "register"
              ? "Create an Archer account to book and manage your private rides."
              : "Sign in to access your itinerary, vehicle tracking, and chauffeur details."}
          </p>
        </div>

        {/* 2-tab main switcher (100% mobile responsive, never overflows) */}
        <div className="seg" role="group" aria-label="Sign in or register">
          <button
            type="button"
            aria-pressed={mode !== "register"}
            onClick={() => {
              setMode("code");
              setError(null);
              setNotFoundEmail(null);
            }}
          >
            SIGN IN
          </button>
          <button
            type="button"
            aria-pressed={mode === "register"}
            onClick={() => {
              setMode("register");
              setError(null);
              setNotFoundEmail(null);
            }}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Sub-selector inside Sign In */}
        {mode !== "register" && !sent && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "2px 0 6px" }}>
            <button
              type="button"
              className="link-btn"
              style={{
                fontSize: 13,
                minHeight: 32,
                padding: "4px 10px",
                borderRadius: 9999,
                fontWeight: mode === "code" ? 700 : 500,
                color: mode === "code" ? "#000" : "var(--muted)",
                background: mode === "code" ? "var(--accent)" : "rgba(255,255,255,0.06)",
              }}
              onClick={() => { setMode("code"); setError(null); }}
            >
              Email One-Time Code
            </button>
            <button
              type="button"
              className="link-btn"
              style={{
                fontSize: 13,
                minHeight: 32,
                padding: "4px 10px",
                borderRadius: 9999,
                fontWeight: mode === "password" ? 700 : 500,
                color: mode === "password" ? "#000" : "var(--muted)",
                background: mode === "password" ? "var(--accent)" : "rgba(255,255,255,0.06)",
              }}
              onClick={() => { setMode("password"); setError(null); }}
            >
              Password
            </button>
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

        {/* Mode: Register */}
        {mode === "register" && (
          <form className="stack" onSubmit={registerAccount}>
            <label className="field">
              Full Name
              <input
                className="input"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </label>
            <label className="field">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              Mobile Phone <span style={{ fontSize: 12, opacity: 0.7 }}>(optional)</span>
              <input
                className="input"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(848) 555-0100"
              />
            </label>
            <label className="field">
              Password
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label className="field">
              Confirm Password
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>At least 10 characters, with letters and numbers.</p>
            <button className="btn block" disabled={busy}>
              {busy ? "Creating account…" : "CREATE ACCOUNT"}
            </button>
          </form>
        )}

        {/* Mode: Email Code - Step 1 Request */}
        {mode === "code" && !sent && (
          <form className="stack" onSubmit={sendCode}>
            <label className="field">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <button className="btn block" disabled={busy}>
              {busy ? "Sending code…" : "EMAIL ME A CODE"}
            </button>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              No password needed. We&apos;ll email a 6-digit one-time code to sign you in.
            </p>
          </form>
        )}

        {/* Mode: Email Code - Step 2 Verify */}
        {mode === "code" && sent && (
          <form className="stack" onSubmit={verify}>
            <div className="alert ok">
              A 6-digit code was sent to <strong>{email}</strong>. It expires in 10 minutes.
            </div>
            <label className="field">
              <span>6-Digit Verification Code</span>
              <input
                className="input code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
              />
            </label>
            <button className="btn block" disabled={busy || code.length !== 6}>
              {busy ? "Signing in…" : "SIGN IN"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
              <button
                type="button"
                className="link-btn"
                onClick={() => { setSent(false); setCode(""); setError(null); setNotFoundEmail(null); }}
              >
                Use different email
              </button>
              <button type="button" className="link-btn" disabled={busy} onClick={() => sendCode()}>
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* Mode: Password Sign In */}
        {mode === "password" && (
          <form className="stack" onSubmit={signInPassword}>
            <label className="field">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              Password
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="btn block" disabled={busy}>
              {busy ? "Signing in…" : "SIGN IN"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            New to Archer?{" "}
            <button
              type="button"
              className="link-btn"
              style={{ minHeight: 0, padding: 0, textDecoration: "underline", color: "inherit" }}
              onClick={() => { setMode("register"); setError(null); setNotFoundEmail(null); }}
            >
              Create an account
            </button>{" "}
            or{" "}
            <a href="/book" style={{ textDecoration: "underline" }}>
              book a ride
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
