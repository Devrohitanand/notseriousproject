import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

const GOOGLE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.5-1.13 2.77-2.4 3.62v3h3.89c2.28-2.1 3.56-5.19 3.56-8.86z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3c-1.08.73-2.46 1.17-4.04 1.17-3.11 0-5.75-2.1-6.69-4.93H1.31v3.09C3.29 21.3 7.31 24 12 24z"/>
    <path fill="#FBBC05" d="M5.31 14.33a7.24 7.24 0 010-4.65V6.59H1.31a11.98 11.98 0 000 10.82l4-3.08z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.29 2.7 1.31 6.59l4 3.09C6.25 6.85 8.89 4.75 12 4.75z"/>
  </svg>
);

function GoogleButton({ role }) {
  const url = `${api.defaults.baseURL}/auth/google/login${role ? `?role=${role}` : ''}`;
  return (
    <a href={url} className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card" data-testid="google-signin-btn">
      {GOOGLE_ICON}
      Continue with Google
    </a>
  );
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [role, setRole] = useState('BUYER');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [forgot, setForgot] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetStep, setResetStep] = useState('request');

  useEffect(() => {
    const gerr = params.get('google_error');
    if (gerr) {
      const map = {
        token_exchange: 'We couldn\'t verify your Google account. Please try again.',
        userinfo: 'Google couldn\'t share your profile. Please try again.',
        email_unverified: 'Please use a Google account with a verified email address.',
        network: 'Network error while contacting Google. Please retry.',
      };
      setErr(map[gerr] || 'Google sign-in failed. Please try again.');
    }
  }, [params]);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const user = mode === 'login' ? await login(data.email, data.password) : await register({ ...data, role });
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      nav({ ADMIN: '/admin', SELLER: '/seller', BUYER: '/buyer' }[user.role] || '/');
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const requestReset = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    const email = new FormData(e.currentTarget).get('email');
    try {
      const r = await api.post('/auth/forgot-password', { email });
      if (r.data.token) {
        setResetToken(r.data.token);
        setResetStep('complete');
        toast.info('Enter your new password below.');
      } else {
        toast.success('If the email exists, a reset link has been sent to your inbox.');
      }
    } catch (e2) { setErr(e2?.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  const completeReset = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      await api.post('/auth/reset-password', { token: data.token, password: data.password });
      toast.success('Password updated. Please log in.');
      setForgot(false); setResetStep('request'); setResetToken('');
    } catch (e2) { setErr(e2?.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <section className="container-shell py-20">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="section-card overflow-hidden p-8">
          <div className="rounded-[1.75rem] bg-cta p-8 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/70">Student access</p>
            <h2 className="mt-4 text-3xl font-black">Build your verified campus profile</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/80">Secure authentication with buyer, seller, and admin-aware access control. Sign in with email or Google.</p>
            <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80" alt="" loading="lazy" className="mt-6 h-40 w-full rounded-2xl object-cover opacity-90" />
          </div>
        </div>

        <div className="section-card p-8">
          {!forgot ? (<>
            <div className="mb-6 flex gap-3">
              <button className={mode === 'login' ? 'btn-primary px-5 py-2.5' : 'btn-secondary px-5 py-2.5'} onClick={() => setMode('login')} type="button" data-testid="mode-login">Login</button>
              <button className={mode === 'register' ? 'btn-primary px-5 py-2.5' : 'btn-secondary px-5 py-2.5'} onClick={() => setMode('register')} type="button" data-testid="mode-register">Create Account</button>
            </div>

            <GoogleButton role={mode === 'register' ? role : ''} />
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or continue with email <span className="h-px flex-1 bg-slate-200" />
            </div>

            {err && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600" data-testid="auth-error">{err}</p>}
            <form className="space-y-5" onSubmit={submit}>
              {mode === 'register' && (<div><label className="field-label">Full Name</label><input className="field" name="name" placeholder="Enter your full name" required data-testid="input-name" /></div>)}
              <div><label className="field-label">Email address</label><input className="field" type="email" name="email" placeholder="you@example.com" required data-testid="input-email" /></div>
              <div><label className="field-label">Password</label><input className="field" type="password" name="password" placeholder="Minimum 8 characters" required minLength={8} data-testid="input-password" /></div>
              {mode === 'register' && (<>
                <div><label className="field-label">Account Type</label>
                  <select className="field" value={role} onChange={(e) => setRole(e.target.value)} data-testid="input-role">
                    <option value="BUYER">Buyer</option><option value="SELLER">Seller</option>
                  </select>
                </div>
                {role === 'SELLER' && (<div><label className="field-label">Store Name</label><input className="field" name="store_name" placeholder="Campus Book Store" required data-testid="input-store" /></div>)}
              </>)}
              <button className="btn-primary w-full" disabled={loading} type="submit" data-testid="submit-auth">{loading ? 'Please wait...' : mode === 'login' ? 'Login Securely' : 'Create Account'}</button>
              {mode === 'login' && (<button type="button" onClick={() => setForgot(true)} className="w-full text-center text-sm text-primary hover:underline" data-testid="forgot-link">Forgot password?</button>)}
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs uppercase tracking-[0.22em] text-slate-400" data-testid="secure-auth-note">
              <ShieldCheck className="h-4 w-4 text-primary/70" /> Secure Authentication
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">Secure authentication and seamless access to your StoleBooks account.</p>
          </>) : (<>
            <button onClick={() => { setForgot(false); setResetStep('request'); setErr(''); }} className="text-sm text-primary hover:underline">← Back to login</button>
            <h3 className="mt-4 text-2xl font-black text-ink">Reset password</h3>
            {err && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{err}</p>}
            {resetStep === 'request' ? (
              <form onSubmit={requestReset} className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">Enter your email and we'll send a secure reset link.</p>
                <div><label className="field-label">Email address</label><input className="field" type="email" name="email" required data-testid="forgot-email" /></div>
                <button className="btn-primary w-full" disabled={loading} data-testid="forgot-submit">{loading ? 'Please wait...' : 'Send reset link'}</button>
              </form>
            ) : (
              <form onSubmit={completeReset} className="mt-4 space-y-4">
                <p className="rounded-2xl bg-sage/10 px-4 py-3 text-xs text-sage">Enter your new password. The reset token below is filled automatically.</p>
                <div><label className="field-label">Reset Token</label><input className="field" name="token" defaultValue={resetToken} required data-testid="reset-token" /></div>
                <div><label className="field-label">New Password</label><input className="field" name="password" type="password" required minLength={8} data-testid="reset-password" /></div>
                <button className="btn-primary w-full" disabled={loading} data-testid="reset-submit">{loading ? 'Please wait...' : 'Set new password'}</button>
              </form>
            )}
          </>)}
        </div>
      </div>
    </section>
  );
}
