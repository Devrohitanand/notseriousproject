import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Camera, IndianRupee, Sparkles, Truck, Upload } from 'lucide-react';
import { PageHero, UniversitiesSection } from '../components/PageSections';

const IMG_SHOWCASE = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80';
const IMG_STEP1 = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80';
const IMG_STEP2 = 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=800&q=80';
const IMG_STEP3 = 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=800&q=80';

export function SellPage() {
  const steps = [
    { title: 'Upload Book', desc: 'Add 6 high-quality photos, condition, edition and price.', icon: Camera, img: IMG_STEP1 },
    { title: 'AI Pricing', desc: 'Our AI recommends the ideal selling price and SEO metadata.', icon: Sparkles, img: IMG_STEP2 },
    { title: 'Ship & Get Paid', desc: 'We handle shipping and pay you after delivery.', icon: Truck, img: IMG_STEP3 },
  ];
  return (<>
    <PageHero title="List your books in minutes" body="Turn used books into cash. Every listing is verified and AI-priced so you always get a fair deal." image={IMG_SHOWCASE} />
    <section className="container-shell py-16">
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => { const I = s.icon; return (
          <motion.div key={s.title} whileHover={{ y: -6 }} className="section-card overflow-hidden">
            <img src={s.img} alt="" loading="lazy" className="h-48 w-full object-cover" />
            <div className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white font-black">{i + 1}</span>
                <I className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{s.desc}</p>
            </div>
          </motion.div>
        );})}
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_1fr] items-center">
        <div>
          <span className="eyebrow">Why sellers love it</span>
          <h2 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Faster listings. Better prices. More conversions.</h2>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            {[
              ['AI-recommended pricing so you never underprice', IndianRupee],
              ['Verified seller badge boosts buyer trust', BadgeCheck],
              ['Automatic shipping labels — we handle logistics', Truck],
              ['Upload up to 6 photos with fast CDN delivery', Upload],
            ].map(([t, I]) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><I className="h-4 w-4" /></span>
                {t}
              </li>
            ))}
          </ul>
          <Link to="/login?mode=register" className="btn-primary mt-8">Start Selling Free</Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80" alt="" loading="lazy" className="h-48 w-full rounded-3xl object-cover shadow-card sm:h-64" />
          <img src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=600&q=80" alt="" loading="lazy" className="h-48 w-full rounded-3xl object-cover shadow-card sm:h-64 mt-6" />
          <img src="https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=80" alt="" loading="lazy" className="h-48 w-full rounded-3xl object-cover shadow-card sm:h-64" />
          <img src="https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=600&q=80" alt="" loading="lazy" className="h-48 w-full rounded-3xl object-cover shadow-card sm:h-64 mt-6" />
        </div>
      </div>
    </section>
  </>);
}

export function UniversitiesPage() {
  return (<>
    <PageHero title="Connected university communities" body="Explore partner campuses and active student sellers across India." image="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80" />
    <UniversitiesSection />
  </>);
}

export function VerifyPage() {
  const items = [
    ['Seller verification', 'Admin-restricted approval keeps seller onboarding controlled and auditable.', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'],
    ['Payment verification', 'Razorpay signature validation is used before marking orders as paid.', 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80'],
    ['Shipment synchronization', 'Shiprocket-ready payloads for AWB, tracking, delivery, and RTO state.', 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=800&q=80'],
  ];
  return (<>
    <PageHero title="Trust through visible verification" body="Seller approval, payment verification, and shipping visibility strengthen every transaction." image="https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=900&q=80" />
    <section className="container-shell py-16">
      <div className="grid gap-6 lg:grid-cols-3">
        {items.map(([t, d, img], i) => (
          <motion.div key={t} whileHover={{ y: -4 }} className="section-card overflow-hidden">
            <img src={img} alt="" loading="lazy" className="h-40 w-full object-cover" />
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white">{i + 1}</div>
              <h3 className="mt-4 text-xl font-bold text-ink">{t}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{d}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  </>);
}
