import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Truck } from 'lucide-react';
import api, { API } from '../lib/api';

export default function BuyerDash() {
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const load = async () => {
    const [o, w] = await Promise.all([api.get('/orders'), api.get('/wishlist')]);
    setOrders(o.data); setWishlist(w.data);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id) => { await api.post(`/orders/${id}/cancel`); await load(); toast.success('Order cancelled'); };
  const resell = async (bid) => {
    try { await api.post(`/resell/${bid}`); toast.success('Prefilled resell draft in Seller dashboard'); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const downloadInvoice = (id) => {
    const token = localStorage.getItem('sb_token');
    const w = window.open(`${API}/orders/${id}/invoice`, '_blank');
    // token is required — pass via query for simplicity in preview. In prod, use signed URL.
    // Since backend expects Authorization header, we open a data URL via fetch:
    if (w) w.close();
    fetch(`${API}/orders/${id}/invoice`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.text()).then(html => { const nw = window.open('', '_blank'); nw.document.write(html); nw.document.close(); });
  };

  const stats = { total: orders.length, paid: orders.filter(o => o.payment_status === 'PAID').length, pending: orders.filter(o => o.status !== 'CANCELLED' && o.payment_status !== 'PAID').length };

  return (
    <section className="container-shell py-16">
      <h1 className="text-4xl font-black text-ink">Buyer Dashboard</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-4">
        {[['Total Orders', stats.total], ['Paid Orders', stats.paid], ['Pending', stats.pending], ['Wishlist', wishlist.length]].map(([l, v]) => (
          <div key={l} className="section-card p-6"><p className="text-sm uppercase tracking-[0.2em] text-slate-500">{l}</p><p className="mt-4 text-4xl font-black text-primary">{v}</p></div>
        ))}
      </div>
      <section className="section-card mt-8 p-8">
        <h2 className="text-2xl font-black text-ink">Order history</h2>
        <div className="mt-6 space-y-4">
          {orders.length === 0 ? <p className="text-slate-500">No orders yet.</p> : orders.map((o) => (
            <div key={o.id} className="rounded-3xl border border-slate-200 p-5" data-testid={`order-${o.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-ink">Order #{o.id.slice(0, 8)}</p>
                  <p className="text-sm text-slate-500">{o.payment_method_detail || o.payment_method} · {o.payment_status} · {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-primary">₹{o.total}</p>
                  <p className="text-sm text-slate-500">Shipment: {o.shipment_status}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {o.items.map((it) => (<div key={it.book_id} className="flex justify-between"><span>{it.title} × {it.qty}</span><span>₹{it.price * it.qty}</span></div>))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {o.payment_status === 'PAID' && <button onClick={() => downloadInvoice(o.id)} className="btn-secondary text-xs gap-1"><FileText className="h-3 w-3" /> Invoice</button>}
                {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs gap-1"><Truck className="h-3 w-3" /> Track</a>}
                {o.status !== 'CANCELLED' && o.payment_status !== 'PAID' && <button onClick={() => cancel(o.id)} className="btn-secondary text-xs">Cancel</button>}
                {o.payment_status === 'PAID' && o.items.map((it) => <button key={it.book_id} onClick={() => resell(it.book_id)} className="btn-secondary text-xs">Resell "{it.title.slice(0, 24)}..."</button>)}
              </div>
            </div>
          ))}
        </div>
      </section>
      {wishlist.length > 0 && (
        <section className="section-card mt-8 p-8">
          <h2 className="text-2xl font-black text-ink">Wishlist</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wishlist.map((b) => (
              <a key={b.id} href={`/book/${b.id}`} className="rounded-3xl border border-slate-200 p-4 hover:shadow-card transition">
                {b.images?.[0] && <img src={b.images[0]} alt="" className="h-32 w-full rounded-xl object-cover" />}
                <p className="mt-3 font-bold text-ink line-clamp-1">{b.title}</p>
                <p className="mt-1 font-black text-primary">₹{b.price}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
