import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { setTokenAndFetch } = useAuth();
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('No token found. Redirecting...'); setTimeout(() => nav('/login'), 800); return; }
    setTokenAndFetch(token).then((u) => {
      toast.success(`Welcome, ${u.name || u.email}!`);
      nav({ ADMIN: '/admin', SELLER: '/seller', BUYER: '/buyer' }[u.role] || '/');
    }).catch(() => {
      setStatus('Authentication failed');
      setTimeout(() => nav('/login?google_error=session'), 800);
    });
  }, [params, nav, setTokenAndFetch]);

  return (
    <section className="container-shell py-32 text-center">
      <div className="section-card mx-auto max-w-md p-10">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="mt-6 font-semibold text-ink">{status}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait while we complete your Google sign-in.</p>
      </div>
    </section>
  );
}
