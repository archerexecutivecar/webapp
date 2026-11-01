'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { Field } from '@/components/Field';
import { api, ApiError } from '@/lib/api';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      await api('/auth/password/reset', { method: 'POST', body: {
        email: params.get('email') ?? '', token: params.get('token') ?? '', password, password_confirmation: confirm,
      } });
      router.replace('/login');
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.details); setMessage(err.code === 'VALIDATION_FAILED' ? '' : err.message); }
    } finally { setBusy(false); }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <span className="label brand">Archer Executive Services</span>
      <h1>Choose a new password</h1>
      <p className="sub">At least 12 characters with upper and lower case letters and a number.</p>
      {message && <div className="alert" role="alert">{message}</div>}
      <Field id="password" label="New password" type="password" value={password} onChange={setPassword} error={errors.password?.[0]} autoComplete="new-password" />
      <Field id="confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button>
      <p className="links"><Link href="/login">Back to sign in</Link></p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return <div className="center"><Suspense><ResetForm /></Suspense></div>;
}
