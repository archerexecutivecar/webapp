'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Field } from '@/components/Field';
import { api, ApiError, tokenStore } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      const res = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email, password } });
      tokenStore.set(res.token);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setMessage(err.code === 'VALIDATION_FAILED' ? '' : err.message);
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="center">
      <form className="panel" onSubmit={submit} noValidate>
        <span className="label brand">Archer Executive Services</span>
        <h1>Admin sign in</h1>
        <p className="sub">Authorized staff only.</p>
        {message && <div className="alert" role="alert">{message}</div>}
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} error={errors.email?.[0]} autoComplete="username" />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} error={errors.password?.[0]} autoComplete="current-password" />
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="links"><Link href="/forgot-password">Forgot password?</Link></p>
      </form>
    </div>
  );
}
