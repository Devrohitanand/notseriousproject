import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { PageHero } from '../components/PageSections';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(new Set());

  const q = params.get('q') || '';
  const subject = params.get('subject') || '';
  const sort = params.get('sort') || 'newest';
  const condition = params.get('condition') || '';

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set('q', q); if (subject) p.set('subject', subject); if (condition) p.set('condition', condition); p.set('sort', sort);
    api.get('/books?' + p.toString()).then((r) => setBooks(r.data || [])).finally(() => setLoading(false));
    if (user) api.get('/wishlist').then((r) => setWishlist(new Set((r.data || []).map(b => b.id)))).catch(() => {});
  }, [q, subject, sort, condition, user]);

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params); if (val) next.set(key, val); else next.delete(key); setParams(next);
  };

  const toggleWish = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { toast.error('Login to save favourites'); return; }
    const r = await api.post('/wishlist/toggle', { book_id: id });
    setWishlist((prev) => { const s = new Set(prev); r.data.in_wishlist ? s.add(id) : s.delete(id); return s; });
    toast.success(r.data.in_wishlist ? 'Saved to wishlist' : 'Removed from wishlist');
  };

  return (<>
    <PageHero title="Browse affordable books across campuses" body="Filter by subject, university, and condition to discover verified used books from fellow students." image="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80" />
    <section className="container-shell py-16">
      <div className="grid gap-6 lg:grid-cols-[0.3fr_1fr]">
        <aside className="section-card h-fit p-6 lg:sticky lg:top-32">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">Filters</p>
          <div className="mt-5">
            <input className="field" placeholder="Search books..." value={q} onChange={(e) => setFilter('q', e.target.value)} data-testid="browse-search" />
          </div>
          <div className="mt-6">
            <p className="mb-2 font-semibold text-slate-700">Subject</p>
            <div className="space-y-2 text-sm text-slate-600">
              {['Engineering', 'Medical', 'Entrance Exams'].map((s) => (
                <label key={s} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="subject" checked={subject === s} onChange={() => setFilter('subject', subject === s ? '' : s)} className="h-4 w-4 border-slate-300 text-primary focus:ring-primary" /> {s}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="mb-2 font-semibold text-slate-700">Condition</p>
            <div className="space-y-2 text-sm text-slate-600">
              {['Like New', 'Good', 'Fair', 'Verified Seller', 'Quality Checked'].map((c) => (
                <label key={c} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="condition" checked={condition === c} onChange={() => setFilter('condition', condition === c ? '' : c)} className="h-4 w-4 border-slate-300 text-primary focus:ring-primary" /> {c}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="mb-2 font-semibold text-slate-700">Sort</p>
            <select className="field" value={sort} onChange={(e) => setFilter('sort', e.target.value)} data-testid="browse-sort">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </aside>
        <div>
          <p className="mb-4 text-sm text-slate-500">{loading ? 'Loading...' : `${books.length} books available`}</p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="section-card animate-pulse p-6">
                  <div className="h-40 rounded-2xl bg-slate-100" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                </div>
              ))
            ) : books.length === 0 ? (
              <p className="text-slate-500 col-span-full text-center py-12">No books found. Try clearing filters.</p>
            ) : books.map((book) => {
              const orig = book.original_price || Math.round(book.price * 2);
              const discount = orig > book.price ? Math.round(((orig - book.price) / orig) * 100) : 0;
              const inWish = wishlist.has(book.id);
              return (
                <motion.div key={book.id} whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
                  <Link to={`/book/${book.id}`} className="section-card block p-4 hover:shadow-soft transition h-full" data-testid={`book-card-${book.id}`}>
                    <div className="relative rounded-[1.25rem] bg-lilac p-3">
                      {book.images?.[0] ? (
                        <img src={book.images[0]} alt={book.title} loading="lazy" className="h-44 w-full rounded-xl object-cover" />
                      ) : (
                        <div className="h-44 rounded-xl bg-[linear-gradient(135deg,#5A2C81,#8D68B7)]" />
                      )}
                      {discount > 0 && (
                        <span className="absolute top-5 left-5 rounded-full bg-sage px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">{discount}% OFF</span>
                      )}
                      <button onClick={(e) => toggleWish(e, book.id)} className="absolute top-5 right-5 rounded-full bg-white p-2 shadow hover:scale-110 transition" data-testid={`wish-${book.id}`} aria-label="Wishlist">
                        <Heart className={`h-4 w-4 ${inWish ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                      </button>
                    </div>
                    <div className="mt-4">
                      <p className="text-base font-bold text-ink line-clamp-2 min-h-[3rem]">{book.title}</p>
                      <p className="mt-1 text-xs text-slate-500">by {book.author}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">{book.condition}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sage"><BadgeCheck className="h-3 w-3" /> Verified</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xl font-black text-primary">₹{book.price}</p>
                        {orig > book.price && <p className="text-xs text-slate-400 line-through">₹{orig}</p>}
                      </div>
                      <span className="text-xs font-semibold text-primary hover:underline">View →</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  </>);
}
