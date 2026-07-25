import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [method, setMethod] = useState('RAZORPAY');
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/cart').then((r) => setCart(r.data)); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const address = { name: form.name, phone: form.phone, email: form.email, line1: form.line1, line2: form.line2 || '', city: form.city, state: form.state, pincode: form.pincode, country: 'India' };
      const r = await api.post('/checkout', { address, payment_method: method, coupon_code: coupon || null });
      if (method === 'COD') { toast.success('Order placed with COD'); nav('/buyer'); return; }
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Razorpay SDK failed to load');
      const opts = {
        key: r.data.razorpay_key_id,
        amount: r.data.total * 100,
        currency: 'INR',
        name: 'StoleBooks',
        description: 'Textbook purchase',
        order_id: r.data.razorpay_order_id,
        prefill: { name: user.name, email: user.email, contact: form.phone },
        theme: { color: '#5A2C81' },
        // Enable ALL payment methods: Card, NetBanking, Wallet, UPI (Intent+Collect+QR), EMI
        method: {
          card: true,
          netbanking: true,
          wallet: true,
          upi: true,
          emi: true,
          paylater: true,
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay with UPI',
                instruments: [
                  { method: 'upi', flows: ['qr', 'intent', 'collect'], apps: ['google_pay', 'phonepe', 'paytm', 'bhim'] },
                ],
              },
              other: {
                name: 'Cards, Wallets & Netbanking',
                instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }, { method: 'emi' }],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (resp) => {
          try {
            await api.post('/payments/verify', {
              order_id: r.data.order_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success('Payment successful!');
            nav('/buyer');
          } catch (e2) { toast.error('Payment verification failed'); }
        },
        modal: { ondismiss: () => setLoading(false) },
      };
      new window.Razorpay(opts).open();
    } catch (e2) { toast.error(e2?.response?.data?.detail || e2.message || 'Checkout failed'); }
    finally { setLoading(false); }
  };

  const total = cart.total + (cart.total >= 500 ? 0 : 40);

  return (
    <section className="container-shell py-16">
      <h1 className="text-4xl font-black text-ink">Checkout</h1>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.45fr]">
        <div className="section-card p-8">
          <h2 className="text-xl font-black text-ink">Shipping Address</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><label className="field-label">Full Name</label><input className="field" name="name" required defaultValue={user?.name} data-testid="chk-name" /></div>
            <div><label className="field-label">Phone</label><input className="field" name="phone" required data-testid="chk-phone" /></div>
            <div className="sm:col-span-2"><label className="field-label">Email</label><input className="field" name="email" type="email" required defaultValue={user?.email} data-testid="chk-email" /></div>
            <div className="sm:col-span-2"><label className="field-label">Address Line 1</label><input className="field" name="line1" required data-testid="chk-line1" /></div>
            <div className="sm:col-span-2"><label className="field-label">Address Line 2 (optional)</label><input className="field" name="line2" /></div>
            <div><label className="field-label">City</label><input className="field" name="city" required data-testid="chk-city" /></div>
            <div><label className="field-label">State</label><input className="field" name="state" required data-testid="chk-state" /></div>
            <div><label className="field-label">Pincode</label><input className="field" name="pincode" required data-testid="chk-pincode" /></div>
          </div>
          <h2 className="mt-8 text-xl font-black text-ink">Payment Method</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[['RAZORPAY', 'Razorpay — UPI · QR · Card · Netbanking · Wallet'], ['COD', 'Cash on Delivery']].map(([v, l]) => (
              <label key={v} className={`cursor-pointer rounded-2xl border-2 p-4 transition ${method === v ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
                <input type="radio" name="pm" checked={method === v} onChange={() => setMethod(v)} className="mr-2" data-testid={`pm-${v.toLowerCase()}`} /> {l}
              </label>
            ))}
          </div>
          {method === 'RAZORPAY' && (
            <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-xs text-slate-600">
              <strong className="text-primary">Supported UPI apps:</strong> Google Pay · PhonePe · Paytm · BHIM · Any UPI app via QR Scan & Pay
            </div>
          )}
        </div>
        <div className="section-card h-fit p-6">
          <h3 className="text-xl font-black text-ink">Order Summary</h3>
          <div className="mt-6 space-y-2 text-sm text-slate-600">
            {cart.items.map(({ book, qty }) => (<div key={book.id} className="flex justify-between"><span className="truncate pr-2">{book.title} × {qty}</span><span>₹{book.price * qty}</span></div>))}
            <div className="pt-3 border-t border-slate-100 flex justify-between"><span>Shipping</span><span>{cart.total >= 500 ? 'Free' : '₹40'}</span></div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-lg font-black text-ink"><span>Total</span><span>₹{total}</span></div>
          </div>
          <div className="mt-6">
            <label className="field-label">Coupon (optional)</label>
            <input className="field" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="WELCOME50 or SAVE10" data-testid="chk-coupon" />
          </div>
          <button type="submit" disabled={loading || cart.items.length === 0} className="btn-primary mt-6 w-full" data-testid="chk-submit">{loading ? 'Processing...' : method === 'RAZORPAY' ? `Pay ₹${total}` : 'Place Order'}</button>
        </div>
      </form>
    </section>
  );
}
