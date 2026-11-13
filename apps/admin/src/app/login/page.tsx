'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Field } from '@/components/Field';
import { api, ApiError, tokenStore } from '@/lib/api';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const res = await api<{ token: string; user?: { roles?: string[] } }>('/auth/login', { method: 'POST', body: { email, password } });
      tokenStore.set(res.token);

      // If user is exclusively a Driver, redirect directly to Driver Portal (/my-rides)
      const isDriver = res.user?.roles?.includes('driver') && !res.user?.roles?.includes('super_admin') && !res.user?.roles?.includes('operations_manager');
      if (isDriver) {
        router.replace('/my-rides');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setMessage(err.code === 'VALIDATION_FAILED' ? '' : err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-viewport">
      <div className="login-card-wrapper">
        {/* Official Archer Brand Card */}
        <div className="login-card">
          {/* Logo & Header */}
          <div className="login-header">
            <div className="logo-box">
              <Image
                src="/archer-logo.png"
                alt="Archer Executive Services Logo"
                width={76}
                height={76}
                priority
                className="logo-img"
              />
            </div>
            <h1 className="brand-title">ARCHER EXECUTIVE</h1>
            <span className="brand-subtitle">Black Car Service · Operations Portal</span>
          </div>

          <div className="divider-line" />

          {/* Form */}
          <form onSubmit={submit} noValidate className="login-form">
            <div className="form-heading">
              <h2>Staff & Driver Sign In</h2>
              <p>Enter your authorized credentials to access dispatch and operations.</p>
            </div>

            {message && (
              <div className="login-alert" role="alert">
                <span>{message}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email" className="input-label">
                Email / Username
              </label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@archer.com"
                  autoComplete="username"
                  required
                  className={errors.email?.[0] ? 'has-error' : ''}
                />
              </div>
              {errors.email?.[0] && <p className="field-error">{errors.email[0]}</p>}
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <Link href="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className={errors.password?.[0] ? 'has-error' : ''}
                />
              </div>
              {errors.password?.[0] && <p className="field-error">{errors.password[0]}</p>}
            </div>

            <button type="submit" disabled={busy} className="submit-btn">
              {busy ? (
                <>
                  <div className="btn-spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="login-footer">
            <ShieldCheck size={14} className="shield-icon" />
            <span>End-to-end encrypted dispatch & operational authorization</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-viewport {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #090c10;
          background-image: 
            radial-gradient(at 50% 0%, rgba(232, 119, 34, 0.12) 0px, transparent 55%),
            radial-gradient(at 100% 100%, rgba(20, 24, 33, 0.8) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(14, 17, 23, 0.8) 0px, transparent 50%);
          padding: 20px 16px;
        }
        .login-card-wrapper {
          width: 100%;
          max-width: 440px;
        }
        .login-card {
          background: #141820;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
        }
        .logo-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 84px;
          height: 84px;
          margin-bottom: 4px;
          filter: drop-shadow(0 4px 12px rgba(232, 119, 34, 0.25));
        }
        .logo-img {
          object-fit: contain;
          width: 100%;
          height: 100%;
        }
        .brand-title {
          font-family: var(--font-zoho-heading), 'Playfair Display', serif;
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #ffffff;
          margin: 0;
          text-transform: uppercase;
        }
        .brand-subtitle {
          font-size: 0.72rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
          margin: 2px 0;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .form-heading h2 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 4px;
        }
        .form-heading p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }
        .login-alert {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 0.8125rem;
          display: flex;
          align-items: center;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .input-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #cbd5e1;
          letter-spacing: 0.02em;
        }
        .forgot-link {
          font-size: 0.75rem;
          color: #e87722;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }
        .forgot-link:hover {
          color: #ff9f43;
          text-decoration: underline;
        }
        .input-wrapper input {
          width: 100%;
          height: 42px;
          background: #0d1017;
          border: 1px solid #2d3748;
          border-radius: 6px;
          padding: 0 14px;
          font-size: 0.875rem;
          color: #f8fafc;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .input-wrapper input:hover {
          border-color: #4a5568;
        }
        .input-wrapper input:focus {
          border-color: #e87722;
          box-shadow: 0 0 0 3px rgba(232, 119, 34, 0.2);
        }
        .input-wrapper input.has-error {
          border-color: #ef4444;
        }
        .field-error {
          font-size: 0.75rem;
          color: #ef4444;
          margin: 2px 0 0;
        }
        .submit-btn {
          width: 100%;
          height: 44px;
          margin-top: 6px;
          background: #e87722;
          border: 1px solid #e87722;
          color: #ffffff;
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 4px 14px rgba(232, 119, 34, 0.35);
        }
        .submit-btn:hover:not(:disabled) {
          background: #d46b1c;
          border-color: #d46b1c;
          box-shadow: 0 6px 18px rgba(232, 119, 34, 0.45);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.72rem;
          color: #64748b;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 16px;
        }
        .shield-icon {
          color: #e87722;
          flex-shrink: 0;
        }

        /* Mobile Adjustments */
        @media (max-width: 480px) {
          .login-card {
            padding: 28px 20px;
            border-radius: 10px;
          }
          .logo-box {
            width: 70px;
            height: 70px;
          }
          .brand-title {
            font-size: 1.18rem;
          }
        }
      `}</style>
    </div>
  );
}
