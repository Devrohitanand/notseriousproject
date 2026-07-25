import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Mail, MessageCircle, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PageHero } from '../components/PageSections';
import { legalPages, contactInfo } from '../lib/legalContent';
import api from '../lib/api';

// Update <title> and meta description for SEO on legal / static pages
function useSeo({ title, description }) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · StoleBooks`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    const prevDesc = meta.content;
    meta.content = description || '';
    return () => { document.title = prev; meta.content = prevDesc; };
  }, [title, description]);
}

export function LegalPage({ pageKey }) {
  const page = legalPages[pageKey];
  useSeo({ title: page.title, description: page.seo });
  return (
    <>
      <PageHero title={page.title} body={page.intro} image={LEGAL_IMAGES[pageKey]} />
      <section className="container-shell py-16" data-testid={`legal-${pageKey}`}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="section-card mx-auto max-w-4xl p-8 sm:p-12">
          {page.updated && <p className="mb-8 text-xs font-semibold uppercase tracking-[0.24em] text-primary">{page.updated}</p>}
          <div className="space-y-8 text-sm leading-7 text-slate-600 sm:text-[15px] sm:leading-8">
            {page.sections.map((s, idx) => (
              <div key={idx}>
                {s.heading && <h2 className="text-xl font-black text-ink sm:text-2xl">{s.heading}</h2>}
                {s.text && <p className={s.heading ? 'mt-3' : ''}>{s.text}</p>}
                {s.list && (
                  <ul className="mt-3 space-y-2">
                    {s.list.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.footer && <p className="mt-3 text-slate-500">{s.footer}</p>}
              </div>
            ))}
            {page.tagline && (
              <p className="mt-6 border-t border-slate-100 pt-6 text-center text-lg font-bold italic text-primary">{page.tagline}</p>
            )}
            {page.contact && <ContactBlock note={page.contactNote} heading="Need Help?" />}
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6 text-sm text-slate-500">
            <p>Related: <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link> · <Link to="/shipping" className="text-primary hover:underline">Shipping Policy</Link> · <Link to="/privacy" className="text-primary hover:underline">Privacy</Link> · <Link to="/terms" className="text-primary hover:underline">Terms</Link> · <Link to="/contact" className="text-primary hover:underline">Contact</Link></p>
          </div>
        </motion.div>
      </section>
    </>
  );
}

function ContactBlock({ heading = 'Get in touch', note }) {
  return (
    <div className="mt-8 rounded-3xl border border-primary/10 bg-primary/5 p-6">
      <h3 className="text-lg font-black text-ink">{heading}</h3>
      <p className="mt-2 text-sm text-slate-600">We're here for you.</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> <strong>Email:</strong> {contactInfo.email}</li>
        <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> <strong>WhatsApp:</strong> {contactInfo.whatsapp}</li>
        <li className="flex items-center gap-2"><Instagram className="h-4 w-4 text-primary" /> <strong>Instagram:</strong> {contactInfo.instagram}</li>
      </ul>
      {note && <p className="mt-4 text-sm italic text-slate-500">{note}</p>}
    </div>
  );
}

const LEGAL_IMAGES = {
  refund: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80',
  shipping: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=900&q=80',
  about: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
  privacy: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80',
  terms: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80',
};

// ----- Sell / Universities / Verify unchanged (imported from separate file) -----
export function SellPage() {
  useSeo({ title: 'Sell Books', description: 'List your used academic books on StoleBooks. AI pricing, verified sellers, hassle-free shipping.' });
  const { SellPage: Real } = require('./StaticSell');
  return <Real />;
}
export function UniversitiesPage() {
  useSeo({ title: 'Universities', description: 'Discover partner campuses and active student communities on StoleBooks.' });
  const { UniversitiesPage: Real } = require('./StaticSell');
  return <Real />;
}
export function VerifyPage() {
  useSeo({ title: 'Verify', description: 'Seller verification, payment verification, and shipment tracking on StoleBooks.' });
  const { VerifyPage: Real } = require('./StaticSell');
  return <Real />;
}

// ----- Full ContactPage from PDF -----
export function ContactPage() {
  useSeo({ title: 'Contact Us', description: 'Reach the StoleBooks team via email, WhatsApp, or Instagram. Support Mon–Sat, 10am–7pm.' });
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api.post('/contact', data); setSent(true); toast.success('Message sent — we\'ll reply within 24 hours');
    e.currentTarget.reset();
  };
  return (
    <>
      <PageHero title="Contact Us" body="We're here to help and make your experience with Stolebooks smooth and hassle-free. Whether you have a question about your order, need support, or just want to connect, feel free to reach out anytime." image={LEGAL_IMAGES.refund} />
      <section className="container-shell py-16">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="section-card overflow-hidden">
            <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80" alt="" loading="lazy" className="h-56 w-full object-cover" />
            <div className="p-8">
              <h2 className="text-2xl font-black text-ink">Get in Touch</h2>
              <ul className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
                <li className="flex items-start gap-3"><Mail className="mt-1 h-4 w-4 text-primary" /><span><strong className="text-ink">Email</strong><br />{contactInfo.email}</span></li>
                <li className="flex items-start gap-3"><MessageCircle className="mt-1 h-4 w-4 text-primary" /><span><strong className="text-ink">WhatsApp</strong><br />{contactInfo.whatsapp}</span></li>
                <li className="flex items-start gap-3"><Instagram className="mt-1 h-4 w-4 text-primary" /><span><strong className="text-ink">Instagram</strong><br />{contactInfo.instagram}</span></li>
                <li className="flex items-start gap-3"><Clock className="mt-1 h-4 w-4 text-primary" /><span><strong className="text-ink">Support Hours</strong><br />{contactInfo.hours}</span></li>
              </ul>
              <div className="mt-6 rounded-2xl bg-primary/5 p-4 text-sm text-slate-600">
                <p><strong className="text-ink">Response Time:</strong> {contactInfo.responseTime}</p>
              </div>
              <p className="mt-6 text-sm italic text-slate-500">At Stolebooks, we're not just about buying and selling books — we're building a reliable, student-friendly, and sustainable platform. Every message matters to us, and we're always happy to help.</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="section-card p-8">
            <h3 className="text-2xl font-black text-ink">Send us a message</h3>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div><label className="field-label">Name</label><input className="field" name="name" required data-testid="contact-name" /></div>
              <div><label className="field-label">Email</label><input type="email" className="field" name="email" required data-testid="contact-email" /></div>
              <div><label className="field-label">Message</label><textarea rows={6} className="field" name="message" required data-testid="contact-message" placeholder="How can we help?" /></div>
              <button className="btn-primary w-full gap-2" data-testid="contact-submit"><Send className="h-4 w-4" /> Send Message</button>
              {sent && <p className="text-sm text-sage">Thanks — we'll get back to you within 24 hours.</p>}
            </form>
          </motion.div>
        </div>
      </section>
    </>
  );
}
