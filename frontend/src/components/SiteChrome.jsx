import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingCart, User, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/sell', label: 'Sell' },
  { href: '/universities', label: 'Universities' },
  { href: '/verify', label: 'Verify' },
  { href: '/contact', label: 'Contact' },
];

const roleRoute = { ADMIN: '/admin', SELLER: '/seller', BUYER: '/buyer' };

export function SiteHeader() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setCartCount(0); return; }
    api.get('/cart').then((r) => setCartCount((r.data.items || []).reduce((s, i) => s + i.qty, 0))).catch(() => {});
  }, [user]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/92 backdrop-blur-xl">
      {!user && (
        <Link to="/login" className="group relative block overflow-hidden bg-gradient-to-r from-primaryDark via-primary to-[#7E4CB0] px-4 py-2 text-center text-xs font-medium text-white sm:text-sm" data-testid="site-banner">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="font-semibold">New here?</span>
            <span className="hidden sm:inline">Create your FREE StoleBooks account —</span>
            <span className="inline-flex items-center gap-1 font-bold underline-offset-4 group-hover:underline">
              Login Now
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </span>
        </Link>
      )}
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link to="/" className="flex flex-col leading-tight" data-testid="logo-link">
          <p className="text-lg font-black tracking-[0.22em] text-primary sm:text-xl">STOLEBOOKS</p>
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 sm:text-xs">Academic Marketplace</p>
        </Link>
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navLinks.map((item) => (
            <Link key={item.href} to={item.href} className="relative transition hover:text-primary" data-testid={`nav-${item.label.toLowerCase()}`}>{item.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user && (
            <Link to="/cart" className="relative rounded-full border border-slate-200 p-2.5 text-slate-600 hover:border-primary hover:text-primary transition" data-testid="cart-icon">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{cartCount}</span>}
            </Link>
          )}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to={roleRoute[user.role]} className="btn-primary px-4 py-2" data-testid="dashboard-btn"><User className="mr-2 h-4 w-4" /> Dashboard</Link>
                <button onClick={() => { logout(); nav('/'); }} className="btn-secondary gap-2" data-testid="logout-btn"><LogOut className="h-4 w-4" /> Logout</button>
              </>
            ) : (
              <Link to="/login" className="btn-secondary gap-2" data-testid="login-link">Login <ArrowRight className="h-4 w-4" /></Link>
            )}
          </div>
          <button onClick={() => setOpen(!open)} className="lg:hidden rounded-full border border-slate-200 p-2.5 text-slate-700 hover:border-primary hover:text-primary transition" data-testid="mobile-menu-toggle" aria-label="Menu">
            <AnimatePresence mode="wait" initial={false}>
              {open ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="h-5 w-5" /></motion.span>
                : <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="h-5 w-5" /></motion.span>}
            </AnimatePresence>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="lg:hidden overflow-hidden border-t border-slate-200/70 bg-white">
            <div className="container-shell flex flex-col gap-1 py-3">
              {navLinks.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary transition" data-testid={`m-nav-${item.label.toLowerCase()}`}>{item.label}</Link>
              ))}
              <div className="mt-2 grid gap-2 border-t border-slate-100 pt-3">
                {user ? (
                  <>
                    <Link to={roleRoute[user.role]} onClick={() => setOpen(false)} className="btn-primary w-full">Dashboard</Link>
                    <button onClick={() => { logout(); setOpen(false); nav('/'); }} className="btn-secondary w-full">Logout</button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-primary w-full">Login / Sign Up</Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function SiteFooter() {
  const groups = [
    { title: 'Marketplace', links: [['Browse Books', '/browse'], ['Sell Books', '/sell'], ['Universities', '/universities'], ['FAQ', '/#faq']] },
    { title: 'Company', links: [['About Us', '/about'], ['Contact Us', '/contact'], ['Privacy Policy', '/privacy'], ['Terms & Conditions', '/terms']] },
    { title: 'Policies', links: [['Refund Policy', '/refund'], ['Shipping Policy', '/shipping'], ['Verify', '/verify'], ['Login', '/login']] },
  ];
  return (
    <footer className="pt-24">
      <div className="container-shell">
        <div className="overflow-hidden rounded-[2.5rem] bg-cta px-6 py-12 text-white shadow-soft sm:px-10 lg:px-14 lg:py-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="pill border-white/20 bg-white/10 text-white">Verified student marketplace</span>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Buy, sell, and exchange affordable books with verified students.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">Fast checkout with Razorpay UPI / Cards / Wallets, and connected campus-wide shipping.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/browse" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:-translate-y-0.5">Explore Books</Link>
              <Link to="/sell" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">Sell Books <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </div>
      <div className="container-shell mt-10 rounded-t-[2rem] border border-b-0 border-slate-200 bg-mist px-6 py-10 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div>
            <p className="text-base font-black tracking-[0.22em] text-primary">STOLEBOOKS</p>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mt-1">Academic Marketplace</p>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">A student-first marketplace to buy, sell, and exchange used academic books at affordable prices.</p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">{g.title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {g.links.map(([label, href]) => (<li key={label}><Link to={href} className="transition hover:text-primary">{label}</Link></li>))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} StoleBooks. Made for students, by students.</p>
      </div>
    </footer>
  );
}
