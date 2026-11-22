'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, ApiError, tokenStore } from '@/lib/api';
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const res = await api<{ token: string; user?: { roles?: string[] } }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      tokenStore.set(res.token);

      // If user is exclusively a Driver, redirect directly to Driver Portal (/my-rides)
      const isDriver =
        res.user?.roles?.includes('driver') &&
        !res.user?.roles?.includes('super_admin') &&
        !res.user?.roles?.includes('operations_manager');
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
          {/* Subtle Top Gold Accent Line */}
          <div className="card-top-accent" />

          {/* Logo & Header */}
          <div className="login-header">
            <div className="logo-box">
              <Image
                src="/archer-logo.png"
                alt="Archer Executive Services Logo"
                width={84}
                height={84}
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
                <span className="input-icon-left">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@archerexecutivecar.com"
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
                <span className="input-icon-left">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className={errors.password?.[0] ? 'has-error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
            <span>256-bit encrypted operational authorization</span>
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
          background: #080a0f;
          background-image: 
            radial-gradient(ellipse at 50% 0%, rgba(232, 119, 34, 0.16) 0%, transparent 60%),
            radial-gradient(ellipse at 85% 90%, rgba(30, 41, 59, 0.45) 0%, transparent 60%),
            radial-gradient(ellipse at 15% 90%, rgba(15, 23, 42, 0.55) 0%, transparent 60%);
          padding: 24px 16px;
        }

        .login-card-wrapper {
          width: 100%;
          max-width: 440px;
        }

        .login-card {
          position: relative;
          background: #0f131a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          box-shadow: 
            0 24px 50px -12px rgba(0, 0, 0, 0.75), 
            0 0 1px 1px rgba(255, 255, 255, 0.06),
            0 0 30px rgba(232, 119, 34, 0.06);
          overflow: hidden;
          padding: 38px 34px 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card-top-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, #e87722 35%, #f59e0b 50%, #e87722 65%, transparent 100%);
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
          width: 88px;
          height: 88px;
          margin-bottom: 4px;
          filter: drop-shadow(0 4px 16px rgba(232, 119, 34, 0.35));
        }

        .logo-img {
          object-fit: contain;
          width: 100%;
          height: 100%;
        }

        .brand-title {
          font-family: var(--font-zoho-heading), 'Playfair Display', Georgia, serif;
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: 0.12em;
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
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
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
          letter-spacing: -0.01em;
        }

        .form-heading p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          line-height: 1.45;
        }

        .login-alert {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          padding: 10px 14px;
          border-radius: 8px;
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

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon-left {
          position: absolute;
          left: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
          pointer-events: none;
          transition: color 0.15s;
        }

        .input-wrapper:focus-within .input-icon-left {
          color: #e87722;
        }

        .input-wrapper input {
          width: 100%;
          height: 44px;
          background: #090c12 !important;
          border: 1px solid #1e293b !important;
          border-radius: 8px !important;
          padding: 0 38px 0 38px !important;
          font-size: 0.875rem !important;
          color: #f8fafc !important;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }

        .input-wrapper input:hover {
          border-color: #334155 !important;
        }

        .input-wrapper input:focus {
          border-color: #e87722 !important;
          box-shadow: 0 0 0 3px rgba(232, 119, 34, 0.22) !important;
        }

        .input-wrapper input.has-error {
          border-color: #ef4444 !important;
        }

        .password-toggle-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent !important;
          border: none !important;
          color: #64748b !important;
          cursor: pointer;
          padding: 6px !important;
          min-height: auto !important;
          height: auto !important;
          width: auto !important;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s;
        }

        .password-toggle-btn:hover {
          color: #cbd5e1 !important;
        }

        .field-error {
          font-size: 0.75rem;
          color: #ef4444;
          margin: 2px 0 0;
        }

        .submit-btn {
          width: 100%;
          height: 46px;
          margin-top: 6px;
          background: linear-gradient(135deg, #e87722 0%, #c86314 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
          font-size: 0.875rem !important;
          font-weight: 700 !important;
          letter-spacing: 0.03em !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s !important;
          box-shadow: 0 4px 18px rgba(232, 119, 34, 0.35) !important;
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #f28535 0%, #d66c18 100%) !important;
          box-shadow: 0 6px 24px rgba(232, 119, 34, 0.5) !important;
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .submit-btn:disabled {
          opacity: 0.65;
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
          padding-top: 18px;
        }

        .shield-icon {
          color: #e87722;
          flex-shrink: 0;
        }

        /* Mobile Adjustments */
        @media (max-width: 480px) {
          .login-card {
            padding: 28px 20px;
            border-radius: 12px;
          }
          .logo-box {
            width: 72px;
            height: 72px;
          }
          .brand-title {
            font-size: 1.18rem;
          }
        }
      `}</style>
    </div>
  );
}
