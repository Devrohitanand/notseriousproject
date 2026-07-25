import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, BrainCircuit, Check, ChevronDown, ChevronRight, GraduationCap, IndianRupee, MapPin, PackageCheck, Search, ShieldCheck, Smartphone, Sparkles, Stethoscope, UserRoundPlus, Users, WalletCards } from 'lucide-react';
import api from '../lib/api';

// Premium curated images (Unsplash CDN, no auth required)
const HERO_IMG = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'; // students studying together
const HERO_FLOAT_1 = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=240&q=80'; // stacked books
const HERO_FLOAT_2 = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=240&q=80'; // open book
const PAGEHERO_IMG = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80'; // college students laptop

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hero pb-20 pt-10">
      <div className="absolute inset-0 bg-grid bg-[size:28px_28px] opacity-60" />
      <div className="container-shell relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="pill"><Sparkles className="h-4 w-4" /> Buy • Sell • Exchange Books</span>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.04] tracking-tight text-ink sm:text-6xl" data-testid="hero-title">
            Affordable Books <span className="text-primary">For Every Student</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Buy and sell used academic books from verified students across India. Secure checkout, campus-wide shipping, real reviews.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/browse" className="btn-primary gap-2" data-testid="hero-explore-btn">Explore Books <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/login" className="btn-secondary" data-testid="hero-getstarted-btn">Get Started</Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {['Student-friendly prices', 'Verified sellers', 'Fast shipping'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-card backdrop-blur">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-4 w-4" /></span>
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-6 rounded-[2.75rem] bg-gradient-to-br from-primary/20 via-transparent to-sage/20 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[2.25rem] shadow-soft">
            <img src={HERO_IMG} alt="Students studying together" loading="eager" className="h-[440px] w-full object-cover sm:h-[500px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="absolute -top-4 -right-4 hidden overflow-hidden rounded-2xl border-4 border-white shadow-soft sm:block">
            <img src={HERO_FLOAT_1} alt="Books" className="h-28 w-28 object-cover" />
          </motion.div>
          <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute -bottom-4 -left-4 hidden overflow-hidden rounded-2xl border-4 border-white shadow-soft sm:block">
            <img src={HERO_FLOAT_2} alt="Open book" className="h-28 w-28 object-cover" />
          </motion.div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-soft backdrop-blur sm:left-auto sm:right-6 sm:max-w-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white"><BookOpen className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Live now</p>
              <p className="text-sm font-bold text-ink">6,000+ books listed today</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [['6,000+', 'Books listed'], ['11+', 'Partner universities'], ['120+', 'Subjects covered'], ['500+', 'Books exchanged']];
  return (
    <section className="container-shell -mt-10 relative z-10">
      <div className="section-card grid gap-6 px-6 py-8 text-center sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        {stats.map(([v, l]) => <div key={l}><p className="text-4xl font-black text-primary">{v}</p><p className="mt-2 text-sm text-slate-500">{l}</p></div>)}
      </div>
    </section>
  );
}

export function FeaturesSection() {
  const features = [
    { title: 'Fast & Easy Book Discovery', description: 'Search by university, subject, semester, or title to instantly find affordable used books.', icon: Search, tone: 'bg-sky-50 text-sky-600' },
    { title: 'Quick Listing Process', description: 'Upload a book, set a price, and publish a verified listing in a few minutes.', icon: BookOpen, tone: 'bg-emerald-50 text-emerald-600' },
    { title: 'Verified Book Listings', description: 'Quality checks, seller verification, and clear condition labels create trustworthy transactions.', icon: ShieldCheck, tone: 'bg-amber-50 text-amber-600' },
    { title: 'Affordable Student Pricing', description: 'Compare prices from multiple student sellers and save significantly versus new copies.', icon: IndianRupee, tone: 'bg-rose-50 text-rose-600' },
    { title: 'Mobile-Friendly Platform', description: 'Optimized browsing, selling, and verification flows work beautifully on phone and desktop.', icon: Smartphone, tone: 'bg-fuchsia-50 text-fuchsia-600' },
    { title: 'Student Community', description: 'Exchange books within verified campus circles and build peer-to-peer academic support.', icon: Users, tone: 'bg-violet-50 text-violet-600' },
  ];
  return (
    <section id="why-join" className="container-shell py-24">
      <div className="text-center">
        <span className="eyebrow">Why choose us</span>
        <h2 className="mt-5 text-3xl font-black tracking-tight text-ink sm:text-5xl">Everything students need in one bookstore flow</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-600">Production-oriented auth, verified checkout, seller management, and connected support/legal routes.</p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {features.map((f) => { const I = f.icon; return (
          <motion.div key={f.title} whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="section-card p-7">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${f.tone}`}><I className="h-6 w-6" /></div>
            <h3 className="mt-6 text-xl font-bold text-ink">{f.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{f.description}</p>
          </motion.div>
        );})}
      </div>
    </section>
  );
}

export function CategorySection() {
  const cats = [
    { title: 'Engineering', count: '2,100+ books', icon: GraduationCap, description: 'Core textbooks, solved papers, lab manuals, and semester guides.' },
    { title: 'Medical', count: '1,400+ books', icon: Stethoscope, description: 'Anatomy, pharmacology, practical records, and entrance prep materials.', featured: true },
    { title: 'Entrance Exams', count: '900+ books', icon: BrainCircuit, description: 'JEE, NEET, GATE, CAT, and more with coaching notes and practice sets.' },
  ];
  return (
    <section className="bg-mist py-24">
      <div className="container-shell">
        <div className="text-center"><span className="eyebrow">Browse by subject</span><h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Popular academic categories</h2></div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {cats.map((c) => { const I = c.icon; return (
            <motion.div key={c.title} whileHover={{ y: -6 }} transition={{ duration: 0.2 }} className={`section-card p-8 text-center ${c.featured ? 'border-primary/20 shadow-soft' : ''}`}>
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] ${c.featured ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}><I className="h-9 w-9" /></div>
              <h3 className="mt-6 text-2xl font-bold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm font-semibold text-primary">{c.count}</p>
              <p className="mt-4 text-sm leading-7 text-slate-600">{c.description}</p>
              <Link to={`/browse?subject=${c.title}`} className={`mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${c.featured ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>View Books <ChevronRight className="h-4 w-4" /></Link>
            </motion.div>
          );})}
        </div>
      </div>
    </section>
  );
}

export function StepsSection() {
  const steps = [
    { title: 'Browse or Search', description: 'Explore books by university, subject, and semester.', icon: Search },
    { title: 'Create Account', description: 'Sign up with buyer or seller access for a trusted campus identity.', icon: UserRoundPlus },
    { title: 'Pay or List', description: 'Buy securely with Razorpay UPI/Card/Wallet or list your own books.', icon: WalletCards },
    { title: 'Get It Delivered', description: 'Track shipments, pickups, and delivery updates from one dashboard.', icon: PackageCheck },
  ];
  return (
    <section className="container-shell py-24">
      <div className="text-center"><span className="eyebrow">How it works</span><h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">4 simple steps to buy or sell books</h2></div>
      <div className="mt-14 grid gap-6 lg:grid-cols-4">
        {steps.map((s, i) => { const I = s.icon; return (
          <motion.div key={s.title} whileHover={{ y: -4 }} className="section-card p-7">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white">{i + 1}</span>
              <I className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-ink">{s.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{s.description}</p>
          </motion.div>
        );})}
      </div>
    </section>
  );
}

export function UniversitiesSection() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/universities').then((r) => setItems(r.data || [])).catch(() => {}); }, []);
  const loop = items.length ? [...items, ...items] : [];
  return (
    <section className="bg-mist py-24">
      <div className="container-shell">
        <div className="flex flex-col gap-4 text-center">
          <span className="eyebrow mx-auto">Connected universities</span>
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Partner campuses and active student circles</h2>
          <p className="mx-auto max-w-2xl text-base leading-8 text-slate-600">A smooth infinite marquee with admin-manageable data.</p>
        </div>
        <div className="relative mt-12 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#f7f7fb] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#f7f7fb] to-transparent" />
          <div className="flex min-w-max gap-4 animate-marquee hover:[animation-play-state:paused]">
            {loop.map((u, i) => (
              <div key={`${u.id}-${i}`} className="section-card flex min-w-[260px] items-center gap-4 p-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary/10 text-xl font-black text-primary">{u.logo_text}</div>
                <div><h3 className="text-lg font-bold text-ink">{u.name}</h3><p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><MapPin className="h-4 w-4 text-primary" /> {u.city}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  const faqs = [
    { question: 'How does STOLEBOOKS work?', answer: 'Students can buy and sell used academic books at affordable prices.' },
    { question: 'Do you offer Cash on Delivery?', answer: 'Yes, COD is available on eligible orders.' },
    { question: 'How are books verified?', answer: 'Every listing is reviewed before being published.' },
    { question: 'How do refunds work?', answer: 'Refunds are processed via Razorpay to the original payment method within 5-7 business days.' },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="container-shell py-24">
      <div className="text-center"><span className="eyebrow">Frequently asked questions</span><h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Answers for buyers, sellers, and campus partners</h2></div>
      <div className="mx-auto mt-14 max-w-4xl space-y-4">
        {faqs.map((f, idx) => {
          const active = open === idx;
          return (
            <button key={f.question} onClick={() => setOpen(active ? -1 : idx)} className="section-card w-full overflow-hidden p-0 text-left transition hover:shadow-soft" data-testid={`faq-${idx}`}>
              <div className="flex items-center justify-between gap-4 px-6 py-5 sm:px-8">
                <div>
                  <p className="text-lg font-semibold text-ink">{f.question}</p>
                  {active && <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{f.answer}</p>}
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition ${active ? 'rotate-180' : ''}`} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PageHero({ title, body, image = PAGEHERO_IMG }) {
  return (
    <section className="bg-hero py-20">
      <div className="container-shell grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <span className="eyebrow">StoleBooks</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-ink sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{body}</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
            <img src={image} alt="" loading="lazy" className="h-64 w-full object-cover sm:h-80" />
          </div>
        </div>
      </div>
    </section>
  );
}
