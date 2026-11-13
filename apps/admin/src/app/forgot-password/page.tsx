'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      await api('/auth/password/forgot', { method: 'POST', body: { email } });
      setSent(true);
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
        <div className="login-card">
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

          <form onSubmit={submit} noValidate className="login-form">
            <div className="form-heading">
              <h2>Reset Password</h2>
              <p>Enter your staff or driver email to receive secure recovery instructions.</p>
            </div>

            {sent && (
              <div className="login-notice" role="status">
                <CheckCircle2 size={16} />
                <span>If the account exists, a secure reset link has been dispatched to your email.</span>
              </div>
            )}

            {message && (
              <div className="login-alert" role="alert">
                <span>{message}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email" className="input-label">
                Authorized Email Address
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

            <button type="submit" disabled={busy} className="submit-btn">
              {busy ? (
                <>
                  <div className="btn-spinner" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="back-box">
              <Link href="/login" className="back-link">
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>

          <div className="login-footer">
            <ShieldCheck size={14} className="shield-icon" />
            <span>Authorized Operations Security Access</span>
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
        .login-notice {
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #4ade80;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 0.8125rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .login-alert {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 0.8125rem;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #cbd5e1;
          letter-spacing: 0.02em;
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
        .back-box {
          display: flex;
          justify-content: center;
          margin-top: 4px;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.15s;
        }
        .back-link:hover {
          color: #e87722;
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

        @media (max-width: 480px) {
          .login-card {
            padding: 28px 20px;
            border-radius: 10px;
          }
          .logo-box {
            width: 70px;
            height: 70px;
          }
        }
      `}</style>
    </div>
  );
}
