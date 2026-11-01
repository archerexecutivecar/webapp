'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Field } from '@/components/Field';
import { api, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      await api('/auth/password/forgot', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.details); setMessage(err.code === 'VALIDATION_FAILED' ? '' : err.message); }
    } finally { setBusy(false); }
  }

  return (
    <div className="center">
      <form className="panel" onSubmit={submit} noValidate>
        <span className="label brand">Archer Executive Services</span>
        <h1>Reset password</h1>
        <p className="sub">Enter your email and we will send a reset link if the account exists.</p>
        {sent && <div className="notice" role="status">If the account exists, a reset link has been sent.</div>}
        {message && <div className="alert" role="alert">{message}</div>}
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} error={errors.email?.[0]} autoComplete="username" />
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        <p className="links"><Link href="/login">Back to sign in</Link></p>
      </form>
    </div>
  );
}
