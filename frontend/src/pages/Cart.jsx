import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

export default function CartPage() {
  const nav = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const load = () => api.get('/cart').then((r) => setCart(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => { await api.post('/cart/remove', { book_id: id, qty: 1 }); await load(); toast.success('Removed'); };

  return (
    <section className="container-shell py-16">
      <h1 className="text-4xl font-black text-ink">Your Cart</h1>
      {cart.items.length === 0 ? (
        <div className="section-card mt-8 p-10 text-center">
          <p className="text-slate-500">Your cart is empty.</p>
          <Link to="/browse" className="btn-primary mt-6">Browse Books</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.4fr]">
          <div className="space-y-4">
            {cart.items.map(({ book, qty }) => (
              <div key={book.id} className="section-card flex items-center gap-4 p-4" data-testid={`cart-item-${book.id}`}>
                <div className="h-24 w-24 shrink-0 rounded-2xl bg-lilac p-2">{book.images?.[0] ? <img src={book.images[0]} alt="" className="h-full w-full rounded-xl object-cover" /> : <div className="h-full w-full rounded-xl bg-primary/20" />}</div>
                <div className="flex-1">
                  <p className="font-bold text-ink">{book.title}</p>
                  <p className="text-sm text-slate-500">{book.author}</p>
                  <p className="mt-2 font-black text-primary">₹{book.price} × {qty}</p>
                </div>
                <button onClick={() => remove(book.id)} className="text-slate-400 hover:text-rose-500" data-testid={`remove-${book.id}`}><Trash2 className="h-5 w-5" /></button>
              </div>
            ))}
          </div>
          <div className="section-card h-fit p-6">
            <h3 className="text-xl font-black text-ink">Order Summary</h3>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{cart.total}</span></div>
              <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{cart.total >= 500 ? 'Free' : '₹40'}</span></div>
              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-lg font-black text-ink"><span>Total</span><span>₹{cart.total + (cart.total >= 500 ? 0 : 40)}</span></div>
            </div>
            <button onClick={() => nav('/checkout')} className="btn-primary mt-6 w-full" data-testid="checkout-btn">Proceed to Checkout</button>
          </div>
        </div>
      )}
    </section>
  );
}
