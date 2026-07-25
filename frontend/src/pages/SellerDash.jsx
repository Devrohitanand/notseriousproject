import React, { useEffect, useState } from 'react';
import { Sparkles, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

async function uploadToCloudinary(file) {
  const sign = await api.post('/cloudinary/sign');
  const { timestamp, signature, folder, cloud_name, api_key } = sign.data;
  const form = new FormData();
  form.append('file', file); form.append('timestamp', timestamp); form.append('signature', signature);
  form.append('folder', folder); form.append('api_key', api_key);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).secure_url;
}

const initial = { title: '', author: '', subject: 'Engineering', edition: '', condition: 'Good', price: '', original_price: '', description: '', notes: '', branch: '', semester: '', university: '', publication: '', purchase_year: '', binding: '' };

export default function SellerDash() {
  const [stats, setStats] = useState({ listings: 0, active: 0, sold: 0, revenue: 0, orders: 0 });
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState([]);
  const [aiSug, setAiSug] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, l, o] = await Promise.all([api.get('/seller/stats'), api.get('/seller/books'), api.get('/seller/orders')]);
    setStats(s.data); setListings(l.data); setOrders(o.data);
  };
  useEffect(() => { load(); }, []);

  const uploadFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (images.length >= 6) { toast.error('Max 6 images'); return; }
    try { const url = await uploadToCloudinary(file); setImages([...images, url]); toast.success('Uploaded'); }
    catch { toast.error('Upload failed'); }
  };

  const getAI = async () => {
    if (!form.title || !form.author) { toast.error('Fill title & author first'); return; }
    setAiLoading(true);
    try {
      const r = await api.post('/ai/suggest', { title: form.title, author: form.author, subject: form.subject, edition: form.edition, condition: form.condition, original_price: parseInt(form.original_price) || 0, notes: form.notes });
      setAiSug(r.data);
      if (!form.price) setForm({ ...form, price: String(r.data.recommended_price) });
    } catch { toast.error('AI unavailable, using fallback'); }
    finally { setAiLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (images.length < 1) { toast.error('Upload at least 1 image (up to 6 recommended)'); return; }
    setSaving(true);
    try {
      await api.post('/books', {
        ...form,
        price: parseInt(form.price),
        original_price: form.original_price ? parseInt(form.original_price) : undefined,
        purchase_year: form.purchase_year ? parseInt(form.purchase_year) : undefined,
        images,
        status: 'ACTIVE',
      });
      toast.success('Listing published');
      setForm(initial); setImages([]); setAiSug(null); await load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => { await api.delete(`/books/${id}`); await load(); toast.success('Deleted'); };
  const pause = async (id, cur) => { await api.put(`/books/${id}`, { status: cur === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }); await load(); };

  return (
    <section className="container-shell py-16">
      <h1 className="text-4xl font-black text-ink">Seller Dashboard</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-5">
        {[['Listings', stats.listings], ['Active', stats.active], ['Sold', stats.sold], ['Orders', stats.orders], ['Revenue', `₹${stats.revenue}`]].map(([l, v]) => (
          <div key={l} className="section-card p-6"><p className="text-sm uppercase tracking-[0.2em] text-slate-500">{l}</p><p className="mt-4 text-3xl font-black text-primary">{v}</p></div>
        ))}
      </div>

      <section className="section-card mt-8 p-8">
        <h2 className="text-2xl font-black text-ink">Create new listing</h2>
        <p className="mt-1 text-sm text-slate-500">Upload up to 6 images and complete all fields for best AI recommendations.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><label className="field-label">Book Title *</label><input className="field" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="sf-title" /></div>
          <div><label className="field-label">Author *</label><input className="field" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} data-testid="sf-author" /></div>
          <div><label className="field-label">Subject</label>
            <select className="field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option>Engineering</option><option>Medical</option><option>Entrance Exams</option><option>Arts</option><option>Commerce</option>
            </select>
          </div>
          <div><label className="field-label">Edition</label><input className="field" value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} /></div>
          <div><label className="field-label">Branch</label><input className="field" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="CSE, ECE, Mech..." /></div>
          <div><label className="field-label">Semester</label><input className="field" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="1-8" /></div>
          <div><label className="field-label">University</label><input className="field" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} placeholder="SRM / MIT / LPU..." /></div>
          <div><label className="field-label">Publication</label><input className="field" value={form.publication} onChange={(e) => setForm({ ...form, publication: e.target.value })} /></div>
          <div><label className="field-label">Purchase Year</label><input className="field" type="number" value={form.purchase_year} onChange={(e) => setForm({ ...form, purchase_year: e.target.value })} /></div>
          <div><label className="field-label">Binding</label>
            <select className="field" value={form.binding} onChange={(e) => setForm({ ...form, binding: e.target.value })}>
              <option value="">Select</option><option>Paperback</option><option>Hardcover</option><option>Spiral</option>
            </select>
          </div>
          <div><label className="field-label">Condition</label>
            <select className="field" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              <option>Like New</option><option>Good</option><option>Fair</option><option>Verified Seller</option><option>Quality Checked</option>
            </select>
          </div>
          <div><label className="field-label">Missing Pages / Notes</label><input className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div><label className="field-label">Original Price (₹)</label><input className="field" type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} /></div>
          <div><label className="field-label">Selling Price (₹) *</label><input className="field" type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="sf-price" /></div>
          <div className="sm:col-span-2"><label className="field-label">Description</label><textarea rows={3} className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div className="sm:col-span-2">
            <label className="field-label">Images ({images.length}/6)</label>
            <div className="flex flex-wrap gap-3">
              {images.map((u, i) => (<div key={i} className="relative h-24 w-24 rounded-xl bg-lilac"><img src={u} className="h-full w-full rounded-xl object-cover" alt="" /><button type="button" onClick={() => setImages(images.filter((_, x) => x !== i))} className="absolute -top-2 -right-2 rounded-full bg-white p-1 shadow"><X className="h-3 w-3" /></button></div>))}
              {images.length < 6 && (<label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary"><Upload className="h-5 w-5" /><input type="file" accept="image/*" className="hidden" onChange={uploadFile} data-testid="sf-image" /></label>)}
            </div>
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={getAI} disabled={aiLoading} className="btn-secondary gap-2" data-testid="sf-ai"><Sparkles className="h-4 w-4" /> {aiLoading ? 'Thinking...' : 'AI: Suggest price & SEO'}</button>
            <button type="submit" disabled={saving} className="btn-primary" data-testid="sf-submit">{saving ? 'Saving...' : 'Publish Listing'}</button>
          </div>

          {aiSug && (
            <div className="sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-bold text-primary">AI Suggestions</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <p><strong>Recommended Price:</strong> ₹{aiSug.recommended_price}</p>
                <p><strong>Condition Score:</strong> {aiSug.condition_score}/100</p>
                <p><strong>Demand Score:</strong> {aiSug.demand_score}/100</p>
                <p className="sm:col-span-3"><strong>SEO Title:</strong> {aiSug.seo_title}</p>
                <p className="sm:col-span-3"><strong>SEO Desc:</strong> {aiSug.seo_description}</p>
                <p><strong>Est. Days to Sell:</strong> {aiSug.estimated_days}</p>
              </div>
            </div>
          )}
        </form>
      </section>

      <section className="section-card mt-8 p-8">
        <h2 className="text-2xl font-black text-ink">Your listings</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {listings.length === 0 ? <p className="text-slate-500">No listings yet.</p> : listings.map((p) => (
            <div key={p.id} className="rounded-3xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-4">
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                  <div>
                    <p className="text-lg font-bold text-ink">{p.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{p.subject} · {p.condition}</p>
                    <p className="mt-3 font-black text-primary">₹{p.price}</p>
                    <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${p.status === 'ACTIVE' ? 'bg-sage/10 text-sage' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => pause(p.id, p.status)} className="btn-secondary text-xs">{p.status === 'ACTIVE' ? 'Pause' : 'Activate'}</button>
                  <button onClick={() => del(p.id)} className="text-xs text-rose-500 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card mt-8 p-8">
        <h2 className="text-2xl font-black text-ink">Your orders ({orders.length})</h2>
        <div className="mt-6 space-y-3">
          {orders.length === 0 ? <p className="text-slate-500">No orders yet.</p> : orders.map((o) => (
            <div key={o.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex justify-between text-sm">
                <div>#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()} · {o.payment_status}</div>
                <div className="font-bold text-primary">₹{o.total}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
