import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) setErr('Missing reset token. Please request a new reset link.');
  }, [token]);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data.password !== data.confirm) { setErr('Passwords do not match'); setLoading(false); return; }
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      toast.success('Password updated. Please log in.');
      nav('/login');
    } catch (e2) { setErr(e2?.response?.data?.detail || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <section className="container-shell py-20">
      <div className="section-card mx-auto max-w-md p-10">
        <h1 className="text-3xl font-black text-ink">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-500">Choose a strong password with at least 8 characters.</p>
        {err && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{err}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="field-label">New password</label><input type="password" name="password" required minLength={8} className="field" data-testid="rp-password" /></div>
          <div><label className="field-label">Confirm password</label><input type="password" name="confirm" required minLength={8} className="field" data-testid="rp-confirm" /></div>
          <button className="btn-primary w-full" disabled={loading || !token} data-testid="rp-submit">{loading ? 'Saving...' : 'Update password'}</button>
          <Link to="/login" className="block text-center text-sm text-primary hover:underline">Back to login</Link>
        </form>
      </div>
    </section>
  );
}
