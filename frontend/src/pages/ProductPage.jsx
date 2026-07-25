import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BadgeCheck, Heart, Star, Truck } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    api.get(`/books/${id}`).then((r) => { setBook(r.data); setImgIdx(0); });
    api.get('/books?limit=4').then((r) => setRelated(r.data));
  }, [id]);

  if (!book) return <div className="container-shell py-20 text-slate-500">Loading...</div>;
  const imgs = book.images && book.images.length ? book.images : [null];
  const orig = book.original_price || Math.round(book.price * 2);
  const savings = Math.max(0, orig - book.price);

  const addToCart = async () => {
    if (!user) { nav('/login'); return; }
    await api.post('/cart/add', { book_id: book.id, qty: 1 });
    toast.success('Added to cart');
  };
  const buyNow = async () => { await addToCart(); nav('/checkout'); };
  const wish = async () => {
    if (!user) { nav('/login'); return; }
    await api.post('/wishlist/toggle', { book_id: book.id });
    toast.success('Wishlist updated');
  };

  return (
    <section className="container-shell py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="section-card overflow-hidden p-4">
            <div className="rounded-[1.75rem] bg-lilac p-6">
              {imgs[imgIdx] ? <img src={imgs[imgIdx]} alt={book.title} className="h-96 w-full rounded-[1.25rem] object-cover" /> : <div className="h-96 rounded-[1.25rem] bg-[linear-gradient(135deg,#5A2C81,#8D68B7)]" />}
            </div>
            {imgs.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {imgs.map((u, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`h-16 w-16 rounded-xl border-2 shrink-0 ${imgIdx === i ? 'border-primary' : 'border-slate-200'}`}>
                    {u ? <img src={u} className="h-full w-full rounded-lg object-cover" alt="" /> : <div className="h-full w-full rounded-lg bg-primary/20" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <span className="eyebrow">{book.subject}</span>
          <h1 className="mt-4 text-4xl font-black text-ink" data-testid="product-title">{book.title}</h1>
          <p className="mt-2 text-lg text-slate-500">by {book.author}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(book.avg_rating || 0) ? 'fill-current' : ''}`} />)}</div>
            <span className="text-sm text-slate-500">{book.reviews?.length || 0} reviews</span>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{book.condition}</span>
          </div>
          <div className="mt-6 flex items-end gap-3">
            <p className="text-4xl font-black text-primary">₹{book.price}</p>
            <p className="text-lg text-slate-400 line-through">₹{orig}</p>
            {savings > 0 && <p className="text-sm font-semibold text-sage">You save ₹{savings}</p>}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Seller</p>
              <p className="mt-2 flex items-center gap-2 font-bold text-ink"><BadgeCheck className="h-4 w-4 text-sage" /> {book.seller?.store_name || book.seller?.name || 'Verified Seller'}</p>
            </div>
            <div className="rounded-2xl bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Shipping</p>
              <p className="mt-2 flex items-center gap-2 font-bold text-ink"><Truck className="h-4 w-4 text-primary" /> Free above ₹500</p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-600">{book.description || 'A verified used textbook from a fellow student. Great condition, student-friendly price.'}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={buyNow} className="btn-primary" data-testid="buy-now-btn">Buy Now</button>
            <button onClick={addToCart} className="btn-secondary" data-testid="add-cart-btn">Add to Cart</button>
            <button onClick={wish} className="btn-secondary" data-testid="wishlist-btn"><Heart className="mr-2 h-4 w-4" /> Wishlist</button>
          </div>
        </div>
      </div>
      <section className="mt-16">
        <h2 className="text-2xl font-black text-ink">Recently viewed</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.filter(r => r.id !== book.id).slice(0, 4).map((r) => (
            <Link key={r.id} to={`/book/${r.id}`} className="section-card p-4 hover:shadow-soft transition">
              <div className="rounded-2xl bg-lilac p-3">{r.images?.[0] ? <img src={r.images[0]} className="h-28 w-full rounded-xl object-cover" alt="" /> : <div className="h-28 rounded-xl bg-primary/20" />}</div>
              <p className="mt-3 font-bold text-ink line-clamp-1">{r.title}</p>
              <p className="text-sm text-slate-500">{r.author}</p>
              <p className="mt-2 font-black text-primary">₹{r.price}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
