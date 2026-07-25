import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';

export default function AdminDash() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    const [s, u, b, o, c, a, cm] = await Promise.all([
      api.get('/admin/stats'), api.get('/admin/users'), api.get('/admin/books'), api.get('/admin/orders'),
      api.get('/admin/coupons'), api.get('/announcements'), api.get('/admin/complaints'),
    ]);
    setStats(s.data); setUsers(u.data); setBooks(b.data); setOrders(o.data);
    setCoupons(c.data); setAnnouncements(a.data); setComplaints(cm.data);
  };
  useEffect(() => { load(); }, []);

  const approve = async (uid) => { await api.post(`/admin/users/${uid}/approve-seller`); await load(); toast.success('Approved'); };
  const approveBook = async (bid) => { await api.post(`/admin/books/${bid}/approve`); await load(); toast.success('Book activated'); };
  const ship = async (oid) => {
    try { const r = await api.post(`/shiprocket/create/${oid}`); toast.success(`Shipped · AWB: ${r.data.awb}`); await load(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api.post('/admin/coupons', { code: d.code, type: d.type, value: parseInt(d.value), min_order: parseInt(d.min_order || 0), active: true });
    e.currentTarget.reset(); await load(); toast.success('Coupon created');
  };
  const deleteCoupon = async (id) => { await api.delete(`/admin/coupons/${id}`); await load(); toast.success('Deleted'); };

  const createAnnouncement = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api.post('/admin/announcements', d);
    e.currentTarget.reset(); await load(); toast.success('Announcement created');
  };
  const deleteAnnouncement = async (id) => { await api.delete(`/admin/announcements/${id}`); await load(); toast.success('Deleted'); };

  const tabs = [
    ['overview', 'Overview'], ['users', 'Users'], ['books', 'Books'], ['orders', 'Orders'],
    ['coupons', 'Coupons'], ['announcements', 'Announcements'], ['complaints', 'Complaints'],
  ];

  return (
    <section className="container-shell py-16">
      <h1 className="text-4xl font-black text-ink">Admin Dashboard</h1>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === k ? 'bg-primary text-white' : 'text-slate-600 hover:bg-primary/5'}`} data-testid={`admin-tab-${k}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="mt-8 grid gap-6 md:grid-cols-5">
          {[['Users', stats.users], ['Books', stats.books], ['Orders', stats.orders], ['Universities', stats.universities], ['Revenue', `₹${stats.revenue || 0}`]].map(([l, v]) => (
            <div key={l} className="section-card p-6"><p className="text-sm uppercase tracking-[0.2em] text-slate-500">{l}</p><p className="mt-4 text-3xl font-black text-primary">{v}</p></div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <section className="section-card mt-8 p-8 overflow-x-auto">
          <h2 className="text-2xl font-black text-ink">Users ({users.length})</h2>
          <table className="mt-6 min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="pb-3">Name</th><th>Email</th><th>Role</th><th>Seller Status</th><th></th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-3">{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.seller_status}</td>
                <td>{u.role === 'SELLER' && u.seller_status === 'PENDING' && <button onClick={() => approve(u.id)} className="text-primary hover:underline text-xs">Approve</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}

      {tab === 'books' && (
        <section className="section-card mt-8 p-8 overflow-x-auto">
          <h2 className="text-2xl font-black text-ink">Books ({books.length})</h2>
          <table className="mt-6 min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="pb-3">Title</th><th>Author</th><th>Price</th><th>Status</th><th></th></tr></thead>
            <tbody>{books.slice(0, 60).map((b) => (
              <tr key={b.id} className="border-b border-slate-100">
                <td className="py-3">{b.title}</td><td>{b.author}</td><td>₹{b.price}</td><td>{b.status}</td>
                <td>{b.status === 'PENDING' && <button onClick={() => approveBook(b.id)} className="text-primary hover:underline text-xs">Approve</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}

      {tab === 'orders' && (
        <section className="section-card mt-8 p-8 overflow-x-auto">
          <h2 className="text-2xl font-black text-ink">Orders ({orders.length})</h2>
          <table className="mt-6 min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="pb-3">ID</th><th>Total</th><th>Payment</th><th>Status</th><th>Shipment</th><th>Date</th><th></th></tr></thead>
            <tbody>{orders.slice(0, 60).map((o) => (
              <tr key={o.id} className="border-b border-slate-100">
                <td className="py-3">#{o.id.slice(0, 8)}</td><td>₹{o.total}</td><td>{o.payment_status}</td><td>{o.status}</td><td>{o.shipment_status}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td>{o.payment_status === 'PAID' && o.shipment_status === 'PROCESSING' && <button onClick={() => ship(o.id)} className="text-primary hover:underline text-xs">Ship</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}

      {tab === 'coupons' && (
        <section className="section-card mt-8 p-8">
          <h2 className="text-2xl font-black text-ink">Coupons</h2>
          <form onSubmit={createCoupon} className="mt-6 grid gap-4 sm:grid-cols-5">
            <input className="field" name="code" placeholder="CODE" required />
            <select className="field" name="type" required><option value="PERCENT">%</option><option value="FLAT">Flat ₹</option></select>
            <input className="field" name="value" type="number" placeholder="Value" required />
            <input className="field" name="min_order" type="number" placeholder="Min order (₹)" />
            <button className="btn-primary" data-testid="admin-coupon-add">Add</button>
          </form>
          <div className="mt-6 grid gap-3">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div><p className="font-bold text-ink">{c.code}</p><p className="text-xs text-slate-500">{c.type} · {c.value}{c.type === 'PERCENT' ? '%' : '₹'} · min ₹{c.min_order}</p></div>
                <button onClick={() => deleteCoupon(c.id)} className="text-xs text-rose-500 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'announcements' && (
        <section className="section-card mt-8 p-8">
          <h2 className="text-2xl font-black text-ink">Announcements</h2>
          <form onSubmit={createAnnouncement} className="mt-6 grid gap-4">
            <input className="field" name="title" placeholder="Title" required />
            <textarea className="field" name="body" rows={3} placeholder="Body" required />
            <button className="btn-primary self-start">Post</button>
          </form>
          <div className="mt-6 grid gap-3">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-2xl border border-slate-200 p-4">
                <div><p className="font-bold text-ink">{a.title}</p><p className="text-sm text-slate-500">{a.body}</p></div>
                <button onClick={() => deleteAnnouncement(a.id)} className="text-xs text-rose-500 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'complaints' && (
        <section className="section-card mt-8 p-8">
          <h2 className="text-2xl font-black text-ink">Support Messages ({complaints.length})</h2>
          <div className="mt-6 space-y-3">
            {complaints.length === 0 ? <p className="text-slate-500">No messages yet.</p> : complaints.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between text-sm"><p className="font-bold text-ink">{c.name}</p><p className="text-slate-400">{new Date(c.created_at).toLocaleString()}</p></div>
                <p className="text-xs text-slate-500">{c.email}</p>
                <p className="mt-2 text-sm text-slate-700">{c.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
