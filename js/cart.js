/**
 * STOLEBOOKS – Cart Module
 * 
 * Handles add-to-cart, remove, update quantity, fly animation, and sidebar.
 */

const CART = {
  _items: [], // Array of cart items

  /**
   * Load cart from DB for logged-in user, else from localStorage
   */
async loadFromDB() {
    const user = AUTH.getUser();
    if (user) {
      const items = await API.getCartItems(user.id);
      this._items = items;
    } else {
      // Load from localStorage for guest
      const stored = localStorage.getItem('stolebooks_cart_guest');
      this._items = stored ? JSON.parse(stored) : [];
    }
    this._updateUI();
  },
  /**
   * Get all cart items
   */
  getItems() { return this._items; },

  /**
   * Get cart total quantity
   */
  getTotalQty() {
    return this._items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  },

  /**
   * Get cart subtotal
   */
  getSubtotal() {
    return this._items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
  },

  /**
   * Add book to cart with fly animation
   * @param {Object} book - Book object
   * @param {HTMLElement} triggerEl - Button that was clicked (for animation)
   */

 async addItem(book, triggerEl = null) {
    const user = AUTH.getUser();
    const token = user ? JSON.parse(localStorage.getItem('stolebooks_session'))?.token : null;

    // Check if already in cart
    const existing = this._items.find(i => i.book_id === (book._id || book.id));

    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
      if (user && token) {
        try {
          await fetch(`${CONFIG.BACKEND_URL}/api/cart/${existing.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity: existing.quantity })
          });
        } catch(e) { console.warn('Cart update failed:', e); }
      } else {
        this._saveGuestCart();
      }
    } else {
      const cartItem = {
        book_id:    book._id || book.id,
        book_title: book.title,
        book_image: book.cover_image,
        price:      book.price,
        quantity:   1,
        author:     book.author,
        user_id:    user ? user.id : 'guest'
      };

      if (user && token) {
        try {
          const res = await fetch(`${CONFIG.BACKEND_URL}/api/cart`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cartItem)
          });
          if (!res.ok) {
            showToast('Error', 'Could not add to cart. Please try again.', 'error');
            return;
          }
          const saved = await res.json();
          this._items.push({ ...saved, id: saved._id || saved.id });
        } catch(e) {
          showToast('Error', 'Could not add to cart.', 'error');
          return;
        }
      } else {
        cartItem.id = 'guest_' + Date.now();
        this._items.push(cartItem);
        this._saveGuestCart();
      }
    }

    this._updateUI();

    if (triggerEl) {
      triggerEl.innerHTML = '<i class="fas fa-check"></i> Added!';
      triggerEl.classList.add('added');
      setTimeout(() => {
        triggerEl.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
        triggerEl.classList.remove('added');
      }, 1800);
      this._flyAnimation(book, triggerEl);
    }

    showToast('Added to Cart! 🛒', `"${book.title}" has been added to your cart.`, 'success');
  },

  /**
   * Remove item from cart
   */
  async removeItem(itemId) {
    const user = AUTH.getUser();
    const idx  = this._items.findIndex(i => i.id === itemId);
    if (idx === -1) return;

    if (user && !itemId.startsWith('guest_')) {
      await API.deleteCartItem(itemId);
    }
    this._items.splice(idx, 1);
    if (!user) this._saveGuestCart();
    this._updateUI();
    renderCartSidebar();
  },

  /**
   * Update quantity of a cart item
   */
  async updateQty(itemId, delta) {
    const item = this._items.find(i => i.id === itemId);
    if (!item) return;

    item.quantity = Math.max(1, (item.quantity || 1) + delta);

    const user = AUTH.getUser();
    if (user && !itemId.startsWith('guest_')) {
      await API.updateCartItem(itemId, { quantity: item.quantity });
    } else {
      this._saveGuestCart();
    }
    this._updateUI();
    renderCartSidebar();
  },

  /**
   * Clear entire cart (after order placed)
   */
  async clearCart() {
    const user = AUTH.getUser();
    if (user) {
      await API.clearUserCart(user.id);
    } else {
      localStorage.removeItem('stolebooks_cart_guest');
    }
    this._items = [];
    this._updateUI();
  },

  /**
   * Update cart count in navbar
   */
  _updateUI() {
    const count = this.getTotalQty();
    const cartCountEl  = document.getElementById('cartCount');
    const fabCountEl   = document.getElementById('fabCartCount');
    if (cartCountEl) {
      cartCountEl.textContent = count;
      if (count > 0) cartCountEl.classList.add('bounce');
      setTimeout(() => cartCountEl.classList.remove('bounce'), 400);
    }
    if (fabCountEl) fabCountEl.textContent = count;
  },

  _saveGuestCart() {
    localStorage.setItem('stolebooks_cart_guest', JSON.stringify(this._items));
  },

  /**
   * Book fly-to-cart animation
   */
  _flyAnimation(book, triggerEl) {
    try {
      const img = document.createElement('img');
      img.src = book.cover_image;
      img.className = 'cart-fly-item';

      const rect = triggerEl.getBoundingClientRect();
      img.style.left = `${rect.left + rect.width / 2 - 25}px`;
      img.style.top  = `${rect.top  + rect.height / 2 - 35}px`;

      document.body.appendChild(img);

      // Target is cart icon in navbar
      const cartBtn = document.querySelector('.cart-btn');
      const cartRect = cartBtn ? cartBtn.getBoundingClientRect() : { left: window.innerWidth - 80, top: 20 };

      const dx = cartRect.left - rect.left;
      const dy = cartRect.top  - rect.top;

      img.animate([
        { transform: 'scale(1) translate(0, 0)',                opacity: 1 },
        { transform: `scale(0.5) translate(${dx * 0.5}px, ${dy * 0.5}px)`, opacity: 0.8, offset: 0.4 },
        { transform: `scale(0.15) translate(${dx}px, ${dy}px)`, opacity: 0 }
      ], { duration: 700, easing: 'cubic-bezier(0.4,0,0.2,1)', fill: 'forwards' });

      setTimeout(() => img.remove(), 750);
    } catch (e) {
      // Animation failed silently
    }
  },
};

window.CART = CART;

// ── Cart Sidebar ─────────────────────────────────────────────────────────────

function openCartSidebar() {
  renderCartSidebar();
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function renderCartSidebar() {
  const items   = CART.getItems();
  const listEl  = document.getElementById('cartItemsList');
  const footerEl = document.getElementById('cartSidebarFooter');

  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-shopping-cart"></i>
        <h4>Your cart is empty</h4>
        <p>Browse our collection and add some books!</p>
        <button class="btn btn-primary mt-4" onclick="closeCartSidebar();navigateTo('books')">
          <i class="fas fa-book"></i> Browse Books
        </button>
      </div>`;
    footerEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = items.map(item => `
    <div class="cart-item" id="cart-item-${item.id}">
      <img src="${item.book_image}" alt="${item.book_title}" class="cart-item-img" 
           onerror="this.src='https://via.placeholder.com/60x82/f3f0ff/7c3aed?text=📚'" />
      <div class="cart-item-info">
        <div class="cart-item-title">${item.book_title}</div>
        <div class="cart-item-author">${item.author || ''}</div>
        <div class="cart-item-price">${CONFIG.CURRENCY_SYMBOL}${(item.price * (item.quantity || 1)).toFixed(0)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="CART.updateQty('${item.id}', -1)"><i class="fas fa-minus"></i></button>
          <span class="qty-value">${item.quantity || 1}</span>
          <button class="qty-btn" onclick="CART.updateQty('${item.id}', +1)"><i class="fas fa-plus"></i></button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="CART.removeItem('${item.id}')"><i class="fas fa-times"></i></button>
    </div>
  `).join('');

  const subtotal  = CART.getSubtotal();
  const shipping  = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_COST;
  const total     = subtotal + shipping;

  footerEl.innerHTML = `
    <div class="cart-summary">
      <div class="cart-summary-row">
        <span>Subtotal (${CART.getTotalQty()} items)</span>
        <span>${CONFIG.CURRENCY_SYMBOL}${subtotal.toFixed(0)}</span>
      </div>
      <div class="cart-summary-row ${shipping === 0 ? 'free-ship' : ''}">
        <span>Shipping</span>
        <span>${shipping === 0 ? '<i class="fas fa-check-circle"></i> FREE' : CONFIG.CURRENCY_SYMBOL + shipping}</span>
      </div>
      ${shipping > 0 ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
        Add ${CONFIG.CURRENCY_SYMBOL}${CONFIG.FREE_SHIPPING_THRESHOLD - subtotal} more for free shipping
      </div>` : ''}
      <div class="cart-summary-row total">
        <span>Total</span>
        <span>${CONFIG.CURRENCY_SYMBOL}${total.toFixed(0)}</span>
      </div>
    </div>
    <button class="cart-checkout-btn" onclick="closeCartSidebar();navigateTo('checkout')">
      <i class="fas fa-lock"></i> Proceed to Checkout
    </button>
    <button class="btn btn-full" style="margin-top:8px;color:var(--text-muted);font-size:0.875rem;" onclick="closeCartSidebar();navigateTo('books')">
      <i class="fas fa-arrow-left"></i> Continue Shopping
    </button>
  `;
}
