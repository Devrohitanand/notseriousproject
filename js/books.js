/**
 * STOLEBOOKS – Books Module
 * 
 * Handles rendering book cards, grids, search, and filters.
 */

const BOOKS = {
  _allBooks: [],
  _currentCategory: 'all',
  _currentSearch: '',

  /**
   * Fetch all books from API and cache them
   */
  async fetchAll() {
    const result = await API.getBooks({ limit: 200 });
    this._allBooks = result.books || [];
    return this._allBooks;
  },

  /**
   * Get cached books or fetch if empty
   */
  async getAll() {
    if (this._allBooks.length === 0) await this.fetchAll();
    return this._allBooks;
  },

  // ── Render Helpers ─────────────────────────────────────────────────────────

  /**
   * Render a single book card HTML
   */
  renderCard(book) {
    const wishlistedClass = WISHLIST.isWishlisted(book.id) ? 'active' : '';
    const stars = this._renderStars(book.rating || 4);
    const discountPct = book.discount_percent || Math.round(((book.original_price - book.price) / book.original_price) * 100) || 0;

    const badges = [];
    if (book.is_bestseller) badges.push('<span class="badge badge-bestseller"><i class="fas fa-crown"></i> Bestseller</span>');
    if (book.is_new_arrival)badges.push('<span class="badge badge-new"><i class="fas fa-sparkles"></i> New</span>');
    if (book.is_trending)   badges.push('<span class="badge badge-trending"><i class="fas fa-fire"></i> Trending</span>');
    if (book.is_featured && !book.is_bestseller && !book.is_new_arrival) badges.push('<span class="badge badge-featured"><i class="fas fa-star"></i> Featured</span>');

    return `
      <div class="book-card" id="book-${book.id}">
        <div class="book-card-img-wrap" onclick="openBookDetail('${book.id}')">
          <img 
            src="${book.cover_image}" 
            alt="${book.title}" 
            class="book-card-img img-lazy"
            onerror="this.src='https://via.placeholder.com/200x280/f3f0ff/7c3aed?text=📚'"
            onload="this.classList.add('loaded')"
          />
          ${badges.length ? `<div class="book-card-badges">${badges.slice(0,2).join('')}</div>` : ''}
          <button 
            class="book-card-wishlist ${wishlistedClass}" 
            data-wishlist-btn 
            data-book-id="${book.id}"
            title="${wishlistedClass ? 'Remove from Wishlist' : 'Add to Wishlist'}"
            onclick="event.stopPropagation(); WISHLIST.toggle(${JSON.stringify(book).replace(/"/g, '&quot;')}, this)"
          >
            <i class="fas fa-heart"></i>
          </button>
        </div>
        <div class="book-card-body">
          <div class="book-category-tag">${book.category || ''}</div>
          <div class="book-title" onclick="openBookDetail('${book.id}')">${book.title}</div>
          <div class="book-author">by ${book.author}</div>
          <div class="book-rating">
            <div class="stars">${stars}</div>
            <span class="rating-val">${(book.rating || 4).toFixed(1)}</span>
            <span class="rating-count">(${(book.reviews_count || 0).toLocaleString()})</span>
          </div>
          <div class="book-price-row">
            <span class="price-current">${CONFIG.CURRENCY_SYMBOL}${book.price}</span>
            ${book.original_price && book.original_price > book.price ? 
              `<span class="price-original">${CONFIG.CURRENCY_SYMBOL}${book.original_price}</span>
               <span class="price-discount">${discountPct}% OFF</span>` : ''}
          </div>
          <div class="book-card-actions">
            <button 
              class="add-cart-btn" 
              onclick="event.stopPropagation(); CART.addItem(${JSON.stringify(book).replace(/"/g, '&quot;')}, this)"
            >
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
            <button class="view-btn" onclick="openBookDetail('${book.id}')" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>`;
  },

  /**
   *Render a skeleton loader card
   */
  renderSkeleton() {
    return `
      <div class="book-card-skeleton">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line skeleton-title"></div>
          <div class="skeleton skeleton-line skeleton-author"></div>
          <div class="skeleton skeleton-line skeleton-price"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>`;
  },

  /**
   * Render N skeleton loaders
   */
  renderSkeletons(n = 8) {
    return Array(n).fill(this.renderSkeleton()).join('');
  },

  /**
   * Render star icons based on rating
   */
  _renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return `
      ${'<i class="fas fa-star"></i>'.repeat(full)}
      ${'<i class="fas fa-star-half-alt"></i>'.repeat(half)}
      ${'<i class="far fa-star"></i>'.repeat(empty)}
    `;
  },

  /**
   * Filter books by search query (client-side)
   */
  filterBySearch(books, query) {
    if (!query) return books;
    const q = query.toLowerCase();
    return books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.category || '').toLowerCase().includes(q) ||
      (b.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (b.publisher || '').toLowerCase().includes(q)
    );
  },
};

window.BOOKS = BOOKS;

// ── Global Search ────────────────────────────────────────────────────────────

let _searchTimer = null;
let _allBooksCache = [];

async function handleGlobalSearch(query) {
  const clearBtn = document.getElementById('searchClearBtn');
  const suggestions = document.getElementById('searchSuggestions');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

  if (!query.trim()) {
    if (suggestions) { suggestions.innerHTML = ''; suggestions.classList.remove('active'); }
    return;
  }

  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(async () => {
    if (_allBooksCache.length === 0) _allBooksCache = await BOOKS.getAll();
    const results = BOOKS.filterBySearch(_allBooksCache, query).slice(0, 6);

    if (!suggestions) return;
    if (results.length === 0) {
      suggestions.innerHTML = `<div class="suggestion-item" style="color:var(--text-muted)">No results for "${query}"</div>`;
    } else {
      suggestions.innerHTML = results.map(b => `
        <div class="suggestion-item" onclick="openBookDetail('${b.id}');clearSearch()">
          <img src="${b.cover_image}" alt="${b.title}" class="suggestion-img" onerror="this.src='https://via.placeholder.com/36x50/f3f0ff/7c3aed?text=📚'" />
          <div class="suggestion-info">
            <div class="suggestion-title">${b.title}</div>
            <div class="suggestion-meta">${b.author} · ${b.category}</div>
          </div>
          <span class="suggestion-price">${CONFIG.CURRENCY_SYMBOL}${b.price}</span>
        </div>
      `).join('') + `
        <div class="suggestion-item" style="border-top:1px solid var(--border-light)" onclick="navigateTo('books','${encodeURIComponent(query)}');clearSearch()">
          <i class="fas fa-search" style="color:var(--primary);width:36px;text-align:center"></i>
          <div class="suggestion-info">
            <div class="suggestion-title">See all results for "${query}"</div>
          </div>
        </div>
      `;
    }
    suggestions.classList.add('active');
  }, 300);
}

let _selectedSuggestion = -1;

function handleSearchKeydown(e) {
  const suggestions = document.getElementById('searchSuggestions');
  const items = suggestions?.querySelectorAll('.suggestion-item');
  if (!items || items.length === 0) {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) { navigateTo('books', encodeURIComponent(query)); clearSearch(); }
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    // Mouse highlight hatao
    items.forEach(item => item.style.background = '');
    _selectedSuggestion = Math.min(_selectedSuggestion + 1, items.length - 1);
    items[_selectedSuggestion].style.background = 'var(--bg-lavender)';
    items[_selectedSuggestion].scrollIntoView({ block: 'nearest' });

  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    items.forEach(item => item.style.background = '');
    _selectedSuggestion = Math.max(_selectedSuggestion - 1, 0);
    items[_selectedSuggestion].style.background = 'var(--bg-lavender)';
    items[_selectedSuggestion].scrollIntoView({ block: 'nearest' });

  } else if (e.key === 'Enter') {
    if (_selectedSuggestion >= 0 && items[_selectedSuggestion]) {
      items[_selectedSuggestion].click();
    } else {
      const query = e.target.value.trim();
      if (query) { navigateTo('books', encodeURIComponent(query)); clearSearch(); }
    }
    _selectedSuggestion = -1;
    suggestions?.classList.remove('active');

  } else if (e.key === 'Escape') {
    clearSearch();
    e.target.blur();
    _selectedSuggestion = -1;
  }
}

function clearSearch() {
  const input = document.getElementById('globalSearchInput');
  if (input) input.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  const suggestions = document.getElementById('searchSuggestions');
  if (suggestions) { suggestions.innerHTML = ''; suggestions.classList.remove('active'); }
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  const suggestions = document.getElementById('searchSuggestions');
  const searchWrap  = document.querySelector('.nav-search');
  if (suggestions && searchWrap && !searchWrap.contains(e.target)) {
    suggestions.classList.remove('active');
  }
});

// ── Category Filter (from header bar) ────────────────────────────────────────

function filterByCategory(cat, btnEl = null) {
  // Update active button in category bar
  if (btnEl) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  // Navigate to books page with category
  navigateTo('books', cat);
}

// ── Book Detail Modal ─────────────────────────────────────────────────────────

let _bookDetailCache = {};

async function openBookDetail(bookId) {
  const overlay = document.getElementById('bookDetailOverlay');
  const content = document.getElementById('bookDetailContent');
  if (!overlay || !content) return;

  // Show modal with loading
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  content.innerHTML = `
    <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;padding:60px">
      <div class="loading-spinner" style="border-color:var(--primary-light);border-top-color:var(--primary);width:40px;height:40px;border-width:3px"></div>
    </div>`;

  // Get book data
  let book = _bookDetailCache[bookId];
  if (!book) {
    const allBooks = await BOOKS.getAll();
    book = allBooks.find(b => b.id === bookId) || await API.getBook(bookId);
    if (book) _bookDetailCache[bookId] = book;
  }

  if (!book) {
    content.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:12px;display:block"></i>Book not found</div>`;
    return;
  }

  const stars      = BOOKS._renderStars(book.rating || 4);
  const discountPct = book.discount_percent || Math.round(((book.original_price - book.price) / book.original_price) * 100) || 0;
  const inWishlist  = WISHLIST.isWishlisted(book.id);
  const shareUrl    = encodeURIComponent(window.location.href + `#book-${book.id}`);
  const shareText   = encodeURIComponent(`Check out "${book.title}" by ${book.author} on STOLEBOOKS!`);

  content.innerHTML = `
    <div class="detail-img-col">
      <img src="${book.cover_image}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/240x336/f3f0ff/7c3aed?text=📚'" />
      <div class="detail-price">${CONFIG.CURRENCY_SYMBOL}${book.price}</div>
      ${book.original_price && book.original_price > book.price ? 
        `<div class="detail-mrp">MRP: ${CONFIG.CURRENCY_SYMBOL}${book.original_price}</div>
         <div class="detail-save">You save ${CONFIG.CURRENCY_SYMBOL}${book.original_price - book.price} (${discountPct}% off)</div>` : ''}
      <div class="detail-actions" style="margin-top:4px">
        <button class="btn btn-primary btn-full" onclick="CART.addItem(${JSON.stringify(book).replace(/"/g,'&quot;')},this)">
          <i class="fas fa-shopping-cart"></i> Add to Cart
        </button>
        <button class="btn btn-outline btn-full" id="detailWishlistBtn" style="margin-top:8px"
          onclick="toggleDetailWishlist('${book.id}')">
          <i class="fas fa-heart"></i> ${inWishlist ? 'Wishlisted' : 'Add to Wishlist'}
        </button>
      </div>
      <div class="share-btns">
        <a href="https://wa.me/?text=${shareText}" target="_blank" class="share-btn whatsapp">
          <i class="fab fa-whatsapp"></i> Share
        </a>
        <a href="https://twitter.com/intent/tweet?text=${shareText}" target="_blank" class="share-btn twitter">
          <i class="fab fa-x-twitter"></i> Tweet
        </a>
        <button class="share-btn copy" onclick="copyBookLink('${book.id}')">
          <i class="fas fa-link"></i> Copy
        </button>
      </div>
    </div>
    <div class="detail-info-col">
      <div class="detail-category">${book.category}</div>
      <div class="detail-title">${book.title}</div>
      <div class="detail-author">by <strong>${book.author}</strong></div>
      <div class="detail-rating">
        <div class="stars">${stars}</div>
        <span class="rating-val">${(book.rating || 4).toFixed(1)}</span>
        <span class="rating-count">(${(book.reviews_count || 0).toLocaleString()} reviews)</span>
      </div>
      <p class="detail-desc">${book.description || 'No description available.'}</p>
      <div class="detail-meta">
        <div class="meta-item"><div class="meta-label">Publisher</div><div class="meta-value">${book.publisher || 'N/A'}</div></div>
        <div class="meta-item"><div class="meta-label">Language</div><div class="meta-value">${book.language || 'English'}</div></div>
        <div class="meta-item"><div class="meta-label">Pages</div><div class="meta-value">${book.pages || 'N/A'}</div></div>
        <div class="meta-item"><div class="meta-label">ISBN</div><div class="meta-value">${book.isbn || 'N/A'}</div></div>
        <div class="meta-item">
          <div class="meta-label">Stock</div>
          <div class="meta-value" style="color:${(book.stock || 0) > 10 ? 'var(--success)' : 'var(--warning)'}">
            <i class="fas fa-circle" style="font-size:0.5rem"></i> 
            ${(book.stock || 0) > 10 ? 'In Stock' : `Only ${book.stock} left`}
          </div>
        </div>
        <div class="meta-item"><div class="meta-label">Category</div><div class="meta-value">${book.category}</div></div>
      </div>
      ${book.tags && book.tags.length ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
          ${book.tags.map(t => `<span style="background:var(--bg-lavender);color:var(--primary);padding:4px 10px;border-radius:var(--radius-full);font-size:0.75rem;font-weight:500">${t}</span>`).join('')}
        </div>` : ''}
    </div>`;
}

async function toggleDetailWishlist(bookId) {
  const allBooks = await BOOKS.getAll();
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;
  const btn = document.getElementById('detailWishlistBtn');
  await WISHLIST.toggle(book, null);
  if (btn) {
    btn.innerHTML = `<i class="fas fa-heart"></i> ${WISHLIST.isWishlisted(bookId) ? 'Wishlisted' : 'Add to Wishlist'}`;
  }
}

function copyBookLink(bookId) {
  const url = window.location.href.split('#')[0] + `?book=${bookId}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link Copied!', 'Book link copied to clipboard.', 'success');
  }).catch(() => {
    showToast('Copy failed', 'Please copy the URL manually.', 'error');
  });
}

function closeBookDetail(event) {
  if (event.target === event.currentTarget) closeBookDetailModal();
}

function closeBookDetailModal() {
  document.getElementById('bookDetailOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
