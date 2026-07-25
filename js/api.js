/**
 * STOLEBOOKS – API Layer (Fixed for Local)
 * 
 * WHAT CHANGED:
 * Previously used Genspark's "tables" API (tables/books, tables/users, etc.)
 * That only works on Genspark's platform — NOT locally.
 * 
 * Now all calls go to your Node.js backend at CONFIG.BACKEND_URL
 * (http://localhost:4000 by default)
 */

const API = {

  // ── Internal Helper ────────────────────────────────────────────────────────

  /**
   * Get auth token from session
   */
  _getToken() {
    try {
      const session = JSON.parse(localStorage.getItem('stolebooks_session') || '{}');
      return session.token || null;
    } catch { return null; }
  },

  /**
   * Make an authenticated fetch request
   */
  async _fetch(path, options = {}) {
    const token = this._getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`${CONFIG.BACKEND_URL}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errMsg = `Request failed: ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    if (res.status === 204) return null; // No content
    return res.json();
  },

  // ── BOOKS ──────────────────────────────────────────────────────────────────

  async getBooks(opts = {}) {
    try {
      const params = new URLSearchParams();
      if (opts.page)         params.set('page', opts.page);
      if (opts.limit)        params.set('limit', opts.limit || 100);
      if (opts.search)       params.set('search', opts.search);
      if (opts.category && opts.category !== 'all') params.set('category', opts.category);
      if (opts.sort || opts.sortBy) params.set('sort', opts.sortBy || opts.sort);
      if (opts.isBestseller) params.set('is_bestseller', 'true');
      if (opts.isNewArrival) params.set('is_new_arrival', 'true');
      if (opts.isFeatured)   params.set('is_featured', 'true');
      if (opts.isTrending)   params.set('is_trending', 'true');

      const data = await this._fetch(`/api/books?${params.toString()}`);
      let books  = (data.books || []).map(b => ({ ...b, id: b._id || b.id }));

      // Client-side filters not supported by backend query params
      if (opts.category === 'deal') {
        books = books.filter(b => (b.discount_percent || 0) >= 30);
      }
      if (opts.maxPrice) books = books.filter(b => b.price <= opts.maxPrice);
      if (opts.minRating) books = books.filter(b => b.rating >= opts.minRating);

      return { books, total: data.total || books.length };
    } catch (err) {
      console.error('[API.getBooks]', err.message);
      return { books: [], total: 0 };
    }
  },

  async getBook(id) {
    try {
      const book = await this._fetch(`/api/books/${id}`);
      return book ? { ...book, id: book._id || book.id } : null;
    } catch (err) {
      console.error('[API.getBook]', err.message);
      return null;
    }
  },

  async createBook(bookData) {
    const book = await this._fetch('/api/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    });
    return { ...book, id: book._id || book.id };
  },

  async updateBook(id, bookData) {
    const book = await this._fetch(`/api/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookData),
    });
    return { ...book, id: book._id || book.id };
  },

  async deleteBook(id) {
    try {
      await this._fetch(`/api/books/${id}`, { method: 'DELETE' });
      return true;
    } catch { return false; }
  },

  // ── USERS ──────────────────────────────────────────────────────────────────

  async getUserByEmail(email) {
    // This is handled by the auth flow — not needed as a separate call
    // Kept for backwards compatibility
    return null;
  },

  async createUser(userData) {
    // Registration is handled by /api/auth/register
    // This method is kept for compatibility but should not be called directly
    throw new Error('Use AUTH.register() instead');
  },

  async updateUser(id, data) {
    try {
      const user = await this._fetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return { ...user, id: user._id || user.id };
    } catch (err) {
      console.error('[API.updateUser]', err.message);
      throw err;
    }
  },

  async getAllUsers() {
    try {
      const users = await this._fetch('/api/users');
      return (users || []).map(u => ({ ...u, id: u._id || u.id }));
    } catch (err) {
      console.error('[API.getAllUsers]', err.message);
      return [];
    }
  },

  // ── ORDERS ─────────────────────────────────────────────────────────────────

  async createOrder(orderData) {
    const order = await this._fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return { ...order, id: order._id || order.id };
  },

  async getUserOrders(userId) {
    try {
      const orders = await this._fetch('/api/orders/my');
      return (orders || []).map(o => ({ ...o, id: o._id || o.id }));
    } catch (err) {
      console.error('[API.getUserOrders]', err.message);
      return [];
    }
  },

  async getAllOrders() {
    try {
      const orders = await this._fetch('/api/orders');
      return (orders || []).map(o => ({ ...o, id: o._id || o.id }));
    } catch (err) {
      console.error('[API.getAllOrders]', err.message);
      return [];
    }
  },

  async updateOrderStatus(orderId, status) {
    const order = await this._fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order_status: status }),
    });
    return { ...order, id: order._id || order.id };
  },

  async markOrderPaid(orderId, paymentId) {
    const order = await this._fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        payment_status:      'paid',
        order_status:        'confirmed',
        razorpay_payment_id: paymentId,
      }),
    });
    return { ...order, id: order._id || order.id };
  },

  // ── CART ───────────────────────────────────────────────────────────────────

  async getCartItems(userId) {
    try {
      const items = await this._fetch('/api/cart');
      return (items || []).map(i => ({ ...i, id: i._id || i.id }));
    } catch (err) {
      console.error('[API.getCartItems]', err.message);
      return [];
    }
  },

  async addToCart(cartData) {
    const item = await this._fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify(cartData),
    });
    return { ...item, id: item._id || item.id };
  },

  async updateCartItem(id, data) {
    try {
      const item = await this._fetch(`/api/cart/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return item ? { ...item, id: item._id || item.id } : null;
    } catch { return null; }
  },

  async deleteCartItem(id) {
    try {
      await this._fetch(`/api/cart/${id}`, { method: 'DELETE' });
      return true;
    } catch { return false; }
  },

  async clearUserCart(userId) {
    try {
      await this._fetch('/api/cart', { method: 'DELETE' });
      return true;
    } catch { return false; }
  },

  // ── WISHLIST ───────────────────────────────────────────────────────────────

  async getWishlist(userId) {
    try {
      const items = await this._fetch('/api/wishlist');
      return (items || []).map(i => ({ ...i, id: i._id || i.id }));
    } catch (err) {
      console.error('[API.getWishlist]', err.message);
      return [];
    }
  },

  async addToWishlist(data) {
    const item = await this._fetch('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { ...item, id: item._id || item.id };
  },

  async removeFromWishlist(id) {
    try {
      await this._fetch(`/api/wishlist/${id}`, { method: 'DELETE' });
      return true;
    } catch { return false; }
  },
};

window.API = API;
