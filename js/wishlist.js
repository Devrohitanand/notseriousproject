/**
 * STOLEBOOKS – Wishlist Module
 */

const WISHLIST = {
  _items: [],

  async load() {
    const user = AUTH.getUser();
    if (user) {
      this._items = await API.getWishlist(user.id);
    } else {
      const stored = localStorage.getItem('stolebooks_wishlist_guest');
      this._items = stored ? JSON.parse(stored) : [];
    }
    this._updateUI();
  },

  getItems() { return this._items; },

  isWishlisted(bookId) {
    return this._items.some(i => i.book_id === bookId);
  },

  async toggle(book, btnEl = null) {
    const user  = AUTH.getUser();
    const existing = this._items.find(i => i.book_id === book.id);

    if (existing) {
      // Remove from wishlist
      if (user && !existing.id.startsWith('guest_')) {
        await API.removeFromWishlist(existing.id);
      }
      this._items = this._items.filter(i => i.book_id !== book.id);
      if (!user) this._saveGuest();
      this._updateUI();

      // Update button
      if (btnEl) { btnEl.classList.remove('active'); btnEl.title = 'Add to Wishlist'; }
      showToast('Removed from Wishlist', `"${book.title}" removed.`, 'info');
    } else {
      // Add to wishlist
      const item = {
        user_id:    user ? user.id : 'guest',
        book_id:    book.id,
        book_title: book.title,
        book_image: book.cover_image,
        price:      book.price,
        author:     book.author,
        rating:     book.rating,
      };

      if (user) {
        const saved = await API.addToWishlist(item);
        this._items.push(saved);
      } else {
        item.id = 'guest_wl_' + Date.now();
        this._items.push(item);
        this._saveGuest();
      }

      this._updateUI();

      if (btnEl) {
        btnEl.classList.add('active', 'heartbeat');
        btnEl.title = 'Remove from Wishlist';
        setTimeout(() => btnEl.classList.remove('heartbeat'), 500);
      }
      showToast('Added to Wishlist! ❤️', `"${book.title}" saved to your wishlist.`, 'success');
    }
  },

  _updateUI() {
    const count = this._items.length;
    const el = document.getElementById('wishlistCount');
    if (el) el.textContent = count;

    // Update all wishlist buttons on page
    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
      const bookId = btn.getAttribute('data-book-id');
      if (bookId) {
        if (this.isWishlisted(bookId)) {
          btn.classList.add('active');
          btn.title = 'Remove from Wishlist';
        } else {
          btn.classList.remove('active');
          btn.title = 'Add to Wishlist';
        }
      }
    });
  },

  _saveGuest() {
    localStorage.setItem('stolebooks_wishlist_guest', JSON.stringify(this._items));
  },
};

window.WISHLIST = WISHLIST;

function handleWishlistNav() {
  if (!AUTH.isLoggedIn()) {
    showToast('Please sign in', 'Sign in to view your wishlist.', 'info');
    navigateTo('login');
    return;
  }
  navigateTo('wishlist');
}
