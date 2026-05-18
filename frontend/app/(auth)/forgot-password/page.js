'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { auth as authApi } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [devUrl, setDevUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email.trim());
      setSuccess(true);
      // Show dev reset URL if backend returns it (non-production only)
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{backgroundColor:'#0f1117'}}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border shadow-2xl p-8" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:'#6366f1'}}>
                <BookOpen size={16} style={{color:'white'}} />
              </div>
              <span className="text-xl font-bold tracking-tight" style={{color:'#f0f0f5'}}>Folio</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" style={{color:'#f0f0f5'}}>Reset Your Password</h1>
            <p className="text-sm mt-1" style={{color:'#8b8fa8'}}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{backgroundColor:'rgba(34,197,94,0.1)'}}>
                <CheckCircle className="w-7 h-7" style={{color:'#4ade80'}} />
              </div>
              <h2 className="text-base font-bold mb-2" style={{color:'#f0f0f5'}}>Check Your Inbox</h2>
              <p className="text-sm leading-relaxed mb-6" style={{color:'#8b8fa8'}}>
                If an account with <span className="font-medium" style={{color:'#f0f0f5'}}>{email}</span> exists,
                a password reset link has been sent. Check your inbox and <span className="font-medium" style={{color:'#f0f0f5'}}>spam folder</span>.
              </p>

              {/* Dev mode: show reset URL directly */}
              {devUrl && (
                <div className="rounded-xl border p-4 mb-6 text-left" style={{backgroundColor:'rgba(99,102,241,0.08)', borderColor:'rgba(99,102,241,0.3)'}}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:'#818cf8'}}>
                    Dev Mode — Reset Link
                  </p>
                  <a
                    href={devUrl}
                    className="text-xs break-all hover:text-indigo-300 transition-colors"
                    style={{color:'#818cf8'}}
                  >
                    {devUrl}
                  </a>
                </div>
              )}

              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                style={{backgroundColor:'#6366f1'}}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-6 text-sm" style={{backgroundColor:'rgba(239,68,68,0.08)', borderColor:'rgba(239,68,68,0.3)', color:'#ef4444'}}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{color:'#8b8fa8'}}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:'#4a4d62'}} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full border rounded-xl pl-11 pr-4 py-3 outline-none transition-all focus:border-indigo-500 text-sm"
                      style={{backgroundColor:'#0f1117', borderColor:'#2a2d3e', color:'#f0f0f5'}}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{backgroundColor:'#6366f1'}}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{color:'#8b8fa8'}}>
          <Link href="/login" className="inline-flex items-center gap-1.5 hover:text-indigo-400 transition-colors" style={{color:'#8b8fa8'}}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
