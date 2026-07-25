/**
 * STOLEBOOKS – Pages Module
 * 
 * SPA Router: renders different pages into #mainContent
 */

// Current page state
let _currentPage = 'home';
let _currentSearchQuery = '';

/**
 * Navigate to a page
 * @param {string} page - Page name
 * @param {string} param - Optional parameter (search query, category, etc.)
 */
function navigateTo(page, param = '') {
  _currentPage = page;
  closeUserDropdown();

  // Close cart sidebar if open
  document.getElementById('cartSidebar')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('active');
  document.body.style.overflow = '';

 // Scroll to top
 window.scrollTo({ top: 0, behavior: 'smooth' });

  // Show/hide footer
  const footer = document.getElementById('mainFooter');
  const catBar = document.getElementById('categoryBar');

  switch (page) {
    case 'home':
      if (catBar) catBar.style.display = 'block';
      if (footer) footer.style.display = 'block';
      renderHomePage();
      break;
    case 'books':
      if (catBar) catBar.style.display = 'block';
      if (footer) footer.style.display = 'block';
      renderBooksPage(param);
      break;
    case 'login':
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'none';
      renderLoginPage();
      break;
    case 'register':
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'none';
      renderRegisterPage();
      break;
    case 'checkout':
      if (!AUTH.isLoggedIn()) {
        showToast('Please sign in', 'You need to be logged in to checkout.', 'info');
        navigateTo('login');
        return;
      }
      if (CART.getItems().length === 0) {
        showToast('Cart is empty', 'Add some books before checking out!', 'warning');
        navigateTo('books');
        return;
      }
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'none';
      renderCheckoutPage();
      break;
    case 'dashboard':
      if (!AUTH.isLoggedIn()) {
        showToast('Please sign in', 'Sign in to view your profile.', 'info');
        navigateTo('login');
        return;
      }
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'block';
      renderDashboardPage();
      break;
    case 'orders':
      if (!AUTH.isLoggedIn()) {
        showToast('Please sign in', 'Sign in to view your orders.', 'info');
        navigateTo('login');
        return;
      }
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'block';
      renderDashboardPage('orders');
      break;
    case 'wishlist':
      if (!AUTH.isLoggedIn()) {
        showToast('Please sign in', 'Sign in to view your wishlist.', 'info');
        navigateTo('login');
        return;
      }
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'block';
      renderWishlistPage();
      break;
    case 'admin':
      if (!AUTH.isAdmin()) {
        renderAccessDenied();
        return;
      }
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'block';
      ADMIN.renderPage();
      break;
    case 'order-success':
      if (catBar) catBar.style.display = 'none';
      if (footer) footer.style.display = 'block';
      renderOrderSuccessPage(param);
      break;
      case 'privacy-policy':
        if (catBar) catBar.style.display = 'none';
        if (footer) footer.style.display = 'block';
        renderPolicyPage('privacy-policy');
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        break;
      case 'terms':
        if (catBar) catBar.style.display = 'none';
        if (footer) footer.style.display = 'block';
        renderPolicyPage('terms');
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        break;
      case 'refund-policy':
        if (catBar) catBar.style.display = 'none';
        if (footer) footer.style.display = 'block';
        renderPolicyPage('refund-policy');
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        break;
    default:
      renderHomePage();
  }
}

//  HOME PAGE 

async function renderHomePage() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <!-- Hero -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-text">
          <div class="hero-badge"><i class="fas fa-certificate"></i> Premium Bookstore</div>
          <h1 class="hero-title">
            Your Next Great<br>
            <span class="highlight">Read Awaits</span><br>
            You Here
          </h1>
          <p class="hero-subtitle">Discover thousands of books across all genres. From bestsellers to hidden gems – find your perfect story at unbeatable prices.</p>
          <div class="hero-cta">
            <button class="btn btn-primary btn-lg" onclick="navigateTo('books')">
              <i class="fas fa-book-open"></i> Explore Books
            </button>
            <button class="btn btn-outline btn-lg" onclick="navigateTo('books','deal')">
              <i class="fas fa-tag"></i> Today's Deals
            </button>
          </div>
          <div class="hero-stats">
            <div class="stat-item"><div class="stat-number">10K+</div><div class="stat-label">Books Available</div></div>
            <div class="stat-item"><div class="stat-number">50K+</div><div class="stat-label">Happy Readers</div></div>
            <div class="stat-item"><div class="stat-number">4.9★</div><div class="stat-label">Average Rating</div></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="floating-books" id="floatingBooks">
            <div class="float-book"><img src="https://m.media-amazon.com/images/I/81wgcld4wxL._AC_UF1000,1000_QL80_.jpg" alt="Atomic Habits" /></div>
            <div class="float-book"><img src="https://m.media-amazon.com/images/I/71g2ednj0JL._AC_UF1000,1000_QL80_.jpg" alt="The Alchemist" /></div>
            <div class="float-book"><img src="https://m.media-amazon.com/images/I/71aFt4+OTOL._AC_UF1000,1000_QL80_.jpg" alt="Psychology of Money" /></div>
            <div class="float-book"><img src="https://m.media-amazon.com/images/I/81ym3QUd3KL._AC_UF1000,1000_QL80_.jpg" alt="Dune" /></div>
            <div class="float-book"><img src="https://m.media-amazon.com/images/I/71XJ8xwLPpL._AC_UF1000,1000_QL80_.jpg" alt="Sapiens" /></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Promo Features Strip -->
    <div class="promo-strip">
      <div class="promo-strip-inner">
        <div class="promo-feature reveal">
          <div class="promo-icon"><i class="fas fa-shipping-fast"></i></div>
          <div class="promo-text"><h4>Free Shipping</h4><p>On orders above ₹500</p></div>
        </div>
        <div class="promo-feature reveal">
          <div class="promo-icon"><i class="fas fa-undo-alt"></i></div>
          <div class="promo-text"><h4>Easy Returns</h4><p>7-day hassle-free returns</p></div>
        </div>
        <div class="promo-feature reveal">
          <div class="promo-icon"><i class="fas fa-shield-alt"></i></div>
          <div class="promo-text"><h4>Secure Payment</h4><p>100% safe & encrypted</p></div>
        </div>
        <div class="promo-feature reveal">
          <div class="promo-icon"><i class="fas fa-headset"></i></div>
          <div class="promo-text"><h4>24/7 Support</h4><p>Always here to help</p></div>
        </div>
      </div>
    </div>

    <!-- Bestsellers -->
    <section class="section" id="bestsellersSection">
      <div class="container">
        <div class="section-header reveal">
          <div class="section-title-wrap">
            <div class="section-label"><i class="fas fa-crown"></i> Top Rated</div>
            <h2 class="section-title">Bestselling Books</h2>
            <p class="section-subtitle">Most loved books by our readers</p>
          </div>
          <button class="view-all-btn" onclick="navigateTo('books','bestseller')">
            View All <i class="fas fa-arrow-right"></i>
          </button>
        </div>
        <div class="books-scroll-row" id="bestsellerRow">${BOOKS.renderSkeletons(6)}</div>
      </div>
    </section>

    <!-- Deal Banner -->
    <section class="container" style="padding: 0 0 40px">
      <div class="deal-banner reveal" id="dealBanner">
        <div class="deal-left">
          <div class="deal-title">🔥 Today's Exclusive Deals</div>
          <div class="deal-subtitle">Save big on top books – limited time offer!</div>
          <div class="deal-countdown">
            <div class="countdown-item"><span class="countdown-num" id="cdHours">00</span><span class="countdown-lbl">Hrs</span></div>
            <div class="countdown-item"><span class="countdown-num" id="cdMins">00</span><span class="countdown-lbl">Min</span></div>
            <div class="countdown-item"><span class="countdown-num" id="cdSecs">00</span><span class="countdown-lbl">Sec</span></div>
          </div>
          <button class="btn" style="background:white;color:var(--primary);margin-top:20px;font-weight:700" onclick="navigateTo('books','deal')">
            <i class="fas fa-tag"></i> Shop Deals
          </button>
        </div>
        <div class="deal-badge">
          <div class="deal-pct">UP TO<br>43%</div>
          <div class="deal-off">OFF</div>
        </div>
      </div>
    </section>

    <!-- New Arrivals -->
    <section class="section section-alt" id="newArrivalsSection">
      <div class="container">
        <div class="section-header reveal">
          <div class="section-title-wrap">
            <div class="section-label"><i class="fas fa-sparkles"></i> Just In</div>
            <h2 class="section-title">New Arrivals</h2>
            <p class="section-subtitle">Fresh titles hot off the press</p>
          </div>
          <button class="view-all-btn" onclick="navigateTo('books','new')">
            View All <i class="fas fa-arrow-right"></i>
          </button>
        </div>
        <div class="books-scroll-row" id="newArrivalsRow">${BOOKS.renderSkeletons(4)}</div>
      </div>
    </section>

    <!-- Featured Books -->
    <section class="section" id="featuredSection">
      <div class="container">
        <div class="section-header reveal">
          <div class="section-title-wrap">
            <div class="section-label"><i class="fas fa-star"></i> Editor's Choice</div>
            <h2 class="section-title">Featured Books</h2>
            <p class="section-subtitle">Handpicked by our book experts</p>
          </div>
          <button class="view-all-btn" onclick="navigateTo('books','featured')">
            View All <i class="fas fa-arrow-right"></i>
          </button>
        </div>
        <div class="books-grid" id="featuredGrid">${BOOKS.renderSkeletons(8)}</div>
      </div>
    </section>

    <!-- Trending -->
    <section class="section section-alt" id="trendingSection">
      <div class="container">
        <div class="section-header reveal">
          <div class="section-title-wrap">
            <div class="section-label"><i class="fas fa-fire"></i> What's Hot</div>
            <h2 class="section-title">Trending Now</h2>
            <p class="section-subtitle">Everyone is talking about these books</p>
          </div>
          <button class="view-all-btn" onclick="navigateTo('books','trending')">
            View All <i class="fas fa-arrow-right"></i>
          </button>
        </div>
        <div class="books-scroll-row" id="trendingRow">${BOOKS.renderSkeletons(5)}</div>
      </div>
    </section>

    <!-- Category Grid -->
    <section class="section">
      <div class="container">
        <div class="section-header reveal">
          <div class="section-title-wrap">
            <div class="section-label"><i class="fas fa-th"></i> Browse</div>
            <h2 class="section-title">Shop by Category</h2>
          </div>
        </div>
        <div class="categories-grid reveal" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">
          ${[
      { cat: 'Fiction', icon: 'fas fa-dragon', color: '#7c3aed' },
      { cat: 'Non-Fiction', icon: 'fas fa-landmark', color: '#0891b2' },
      { cat: 'Self-Help', icon: 'fas fa-brain', color: '#059669' },
      { cat: 'Teens & YA', icon: 'fas fa-star', color: '#d97706' },
      { cat: 'Kids', icon: 'fas fa-child', color: '#dc2626' },
      { cat: 'Exams', icon: 'fas fa-graduation-cap', color: '#7c3aed' },
      { cat: 'Medical Exams', icon: 'fas fa-stethoscope', color: '#0891b2' },
      { cat: 'Manga', icon: 'fas fa-scroll', color: '#059669' },
      { cat: 'Biography', icon: 'fas fa-user-tie', color: '#d97706' },
      { cat: 'Science', icon: 'fas fa-flask', color: '#7c3aed' },
      { cat: 'Mystery', icon: 'fas fa-search', color: '#dc2626' },
      { cat: 'Romance', icon: 'fas fa-heart', color: '#db2777' },
    ].map(c => `
            <div onclick="navigateTo('books','${c.cat}')" style="background:white;border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:20px;text-align:center;cursor:pointer;transition:all 0.2s ease" 
              onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'" 
              onmouseleave="this.style.transform='';this.style.boxShadow=''">
              <div style="width:44px;height:44px;border-radius:50%;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin:0 auto 10px">
                <i class="${c.icon}"></i>
              </div>
              <div style="font-size:0.8rem;font-weight:600;color:var(--text-dark)">${c.cat}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;

  // Load real data
  const allBooks = await BOOKS.getAll();

  // Bestsellers
  const bestsellers = allBooks.filter(b => b.is_bestseller).slice(0, 8);
  document.getElementById('bestsellerRow').innerHTML = bestsellers.length
    ? bestsellers.map(b => BOOKS.renderCard(b)).join('')
    : '<div class="no-results"><i class="fas fa-book-open"></i><h3>No bestsellers yet</h3></div>';

  // New Arrivals
  const newArrivals = allBooks.filter(b => b.is_new_arrival).slice(0, 6);
  document.getElementById('newArrivalsRow').innerHTML = newArrivals.length
    ? newArrivals.map(b => BOOKS.renderCard(b)).join('')
    : '<div class="no-results"><i class="fas fa-book-open"></i><h3>Check back soon!</h3></div>';

  // Featured
  const featured = allBooks.filter(b => b.is_featured).slice(0, 8);
  document.getElementById('featuredGrid').innerHTML = featured.length
    ? featured.map(b => BOOKS.renderCard(b)).join('')
    : '<div class="no-results"><i class="fas fa-book-open"></i><h3>No featured books</h3></div>';

  // Trending
  const trending = allBooks.filter(b => b.is_trending).slice(0, 6);
  document.getElementById('trendingRow').innerHTML = trending.length
    ? trending.map(b => BOOKS.renderCard(b)).join('')
    : '<div class="no-results"><i class="fas fa-fire"></i><h3>Check back soon!</h3></div>';

  // Start countdown
  startCountdown();

  // Init scroll reveal
  initScrollReveal();
}

// ── BOOKS CATALOG PAGE ────────────────────────────────────────────────────────

let _booksPageFilter = {
  category: 'all',
  search: '',
  sortBy: '',
  maxPrice: 5000,
  minRating: 0,
  categories: [],
};

async function renderBooksPage(param = '') {
  const main = document.getElementById('mainContent');

  // Determine initial filter from param
  if (param) {
    const decoded = decodeURIComponent(param);
    if (['bestseller', 'new', 'featured', 'trending', 'deal'].includes(decoded)) {
      _booksPageFilter = { ..._booksPageFilter, category: decoded, search: '' };
    } else if (['Fiction', 'Non-Fiction', 'Self-Help', 'Biography', 'Science', 'Mystery', 'Technology', 'Romance', 'Kids', 'Teens & YA', 'Manga', 'Medical Exams', 'Exams', 'Award Winners'].includes(decoded)) {
      _booksPageFilter = { ..._booksPageFilter, category: decoded, search: '' };
    } else {
      _booksPageFilter = { ..._booksPageFilter, search: decoded, category: 'all' };
    }
  }

  main.innerHTML = `
    <div class="books-page">
      <!-- Filter Sidebar -->
      <aside class="filter-sidebar">
        <h3><i class="fas fa-sliders-h" style="color:var(--primary)"></i> Filters</h3>
        
        <div class="filter-section">
          <div class="filter-label">Category</div>
          <div class="filter-options" id="categoryFilterOptions">
            ${['All', 'Fiction', 'Non-Fiction', 'Self-Help', 'Biography', 'Science', 'Mystery', 'Technology', 'Romance', 'Kids', 'Teens & YA', 'Manga', 'Medical Exams', 'Exams', 'Award Winners'].map(c => `
              <label class="filter-option">
                <input type="radio" name="catFilter" value="${c.toLowerCase() === 'all' ? 'all' : c}" 
                  ${_booksPageFilter.category === (c.toLowerCase() === 'all' ? 'all' : c) ? 'checked' : ''}
                  onchange="applyBooksFilter()">
                <span class="filter-option-label">${c}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-label">Price Range</div>
          <div class="price-range-wrap">
            <input type="range" min="0" max="5000" step="50" value="${_booksPageFilter.maxPrice}"
              class="price-range-slider" id="priceRangeSlider" oninput="updatePriceLabel(this.value);applyBooksFilter()">
            <div class="price-range-labels">
              <span>₹0</span>
              <span id="priceLabel">Up to ₹${_booksPageFilter.maxPrice}</span>
            </div>
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-label">Minimum Rating</div>
          <div class="rating-filter">
            ${[4.5, 4, 3.5, 3].map(r => `
              <label class="rating-option">
                <input type="radio" name="ratingFilter" value="${r}" 
                  ${_booksPageFilter.minRating === r ? 'checked' : ''}
                  onchange="applyBooksFilter()">
                <div class="stars">${BOOKS._renderStars(r)}</div>
                <span>${r}+ stars</span>
              </label>
            `).join('')}
            <label class="rating-option">
              <input type="radio" name="ratingFilter" value="0" 
                ${_booksPageFilter.minRating === 0 ? 'checked' : ''}
                onchange="applyBooksFilter()">
              <span>All ratings</span>
            </label>
          </div>
        </div>

        <button class="filter-reset-btn" onclick="resetFilters()">
          <i class="fas fa-undo"></i> Reset Filters
        </button>
      </aside>

      <!-- Main Catalog -->
      <div class="catalog-main">
        <div class="catalog-toolbar">
          <div class="catalog-results" id="catalogResults">Loading books...</div>
          <select class="sort-select" id="sortSelect" onchange="applySortChange(this.value)">
            <option value="">Sort: Relevance</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name: A to Z</option>
            <option value="new">Newest First</option>
          </select>
        </div>
        <div class="books-grid" id="booksGrid">${BOOKS.renderSkeletons(12)}</div>
        <div id="booksPagination" class="pagination"></div>
      </div>
    </div>`;

  // If came from search, fill in search box
  if (_booksPageFilter.search) {
    const input = document.getElementById('globalSearchInput');
    if (input) input.value = _booksPageFilter.search;
  }

  await loadBooksGrid();
}

async function loadBooksGrid() {
  const allBooks = await BOOKS.getAll();
  let books = [...allBooks];

  // Apply search filter
  if (_booksPageFilter.search) {
    books = BOOKS.filterBySearch(books, _booksPageFilter.search);
  }

  // Apply category filter
  const cat = _booksPageFilter.category;
  if (cat && cat !== 'all') {
    if (cat === 'bestseller') books = books.filter(b => b.is_bestseller);
    else if (cat === 'new') books = books.filter(b => b.is_new_arrival);
    else if (cat === 'featured') books = books.filter(b => b.is_featured);
    else if (cat === 'trending') books = books.filter(b => b.is_trending);
    else if (cat === 'deal') books = books.filter(b => (b.discount_percent || 0) >= 30);
    else books = books.filter(b => b.category === cat || (b.tags || []).some(t => t.toLowerCase().includes(cat.toLowerCase())));
  }

  // Apply rating filter
  if (_booksPageFilter.minRating > 0) {
    books = books.filter(b => (b.rating || 0) >= _booksPageFilter.minRating);
  }

  // Apply price filter
  if (_booksPageFilter.maxPrice < 5000) {
    books = books.filter(b => b.price <= _booksPageFilter.maxPrice);
  }

  // Apply sort
  const sortBy = _booksPageFilter.sortBy || document.getElementById('sortSelect')?.value;
  if (sortBy) {
    books.sort((a, b) => {
      if (sortBy === 'price_low') return a.price - b.price;
      if (sortBy === 'price_high') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'new') return (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0);
      return 0;
    });
  }

  const total = books.length;
  const resultsEl = document.getElementById('catalogResults');
  const gridEl = document.getElementById('booksGrid');
  if (!gridEl) return;

  if (resultsEl) {
    resultsEl.innerHTML = `Showing <strong>${total}</strong> book${total !== 1 ? 's' : ''}
      ${_booksPageFilter.search ? ` for "<strong>${_booksPageFilter.search}</strong>"` : ''}
      ${cat && cat !== 'all' ? ` in <strong>${cat}</strong>` : ''}`;
  }

  if (books.length === 0) {
    gridEl.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No books found</h3>
        <p>Try adjusting your filters or search query.</p>
        <button class="btn btn-primary" onclick="resetFilters()" style="margin-top:16px">Clear Filters</button>
      </div>`;
    return;
  }

  gridEl.innerHTML = books.map(b => BOOKS.renderCard(b)).join('');
}

function applyBooksFilter() {
  // Read filter values
  const catEl = document.querySelector('input[name="catFilter"]:checked');
  const ratingEl = document.querySelector('input[name="ratingFilter"]:checked');
  const priceEl = document.getElementById('priceRangeSlider');

  _booksPageFilter.category = catEl?.value || 'all';
  _booksPageFilter.minRating = ratingEl ? parseFloat(ratingEl.value) : 0;
  _booksPageFilter.maxPrice = priceEl ? parseInt(priceEl.value) : 5000;

  const gridEl = document.getElementById('booksGrid');

  setTimeout(() => loadBooksGrid(), 300);
}

function applySortChange(val) {
  _booksPageFilter.sortBy = val;
  loadBooksGrid();
}

function updatePriceLabel(val) {
  const el = document.getElementById('priceLabel');
  if (el) el.textContent = `Up to ₹${val}`;
}

function resetFilters() {
  _booksPageFilter = { category: 'all', search: '', sortBy: '', maxPrice: 5000, minRating: 0 };
  const catFirst = document.querySelector('input[name="catFilter"][value="all"]');
  if (catFirst) catFirst.checked = true;
  const ratingFirst = document.querySelector('input[name="ratingFilter"][value="0"]');
  if (ratingFirst) ratingFirst.checked = true;
  const slider = document.getElementById('priceRangeSlider');
  if (slider) { slider.value = 5000; updatePriceLabel(5000); }
  const sortSel = document.getElementById('sortSelect');
  if (sortSel) sortSel.value = '';
  loadBooksGrid();
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────

function renderLoginPage() {
  document.getElementById('mainContent').innerHTML = `
    <div class="auth-page page-enter">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon-nav" style="width:52px;height:52px;font-size:1.3rem">
            <i class="fas fa-book-open"></i>
          </div>
          <h2 class="font-serif">Welcome Back</h2>
          <p>Sign in to your STOLEBOOKS account</p>
        </div>

        <form class="auth-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <div class="form-input-wrap">
              <i class="fas fa-envelope form-input-icon"></i>
              <input type="email" class="form-input" id="loginEmail" placeholder="your@email.com" required autocomplete="email" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" style="display:flex;justify-content:space-between">
              Password
             <a href="#" onclick="event.preventDefault();renderForgotPasswordModal()" style="color:var(--primary);font-size:0.8rem;font-weight:500">Forgot password?</a>
            </label>
            <div class="form-input-wrap">
              <i class="fas fa-lock form-input-icon"></i>
              <input type="password" class="form-input" id="loginPassword" placeholder="Enter your password" required autocomplete="current-password" />
              <span class="pass-toggle" onclick="togglePassword('loginPassword', this)"><i class="fas fa-eye"></i></span>
            </div>
          </div>

          <div id="loginError" style="display:none" class="form-error"><i class="fas fa-exclamation-circle"></i> <span></span></div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="loginSubmitBtn">
            <i class="fas fa-sign-in-alt"></i> Sign In
          </button>
        </form>

        <div class="auth-divider" style="margin:20px 0">OR</div>

        <div class="auth-switch">
          Don't have an account? <a href="#" onclick="navigateTo('register')">Create one now</a>
        </div>

        <!-- Demo hint -->
        <div style="margin-top:20px;padding:12px;background:var(--bg-lavender);border-radius:var(--radius-md);font-size:0.78rem;color:var(--text-medium);text-align:center">
          <i class="fas fa-shield-alt" style="color:var(--primary)"></i>
        Your data is safe & encrypted with us
        </div>
      </div>
    </div>`;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginSubmitBtn');
  const errorEl = document.getElementById('loginError');

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Signing in...';

  try {
    await AUTH.login(email, password);
    const user = AUTH.getUser();
    navigateTo(user.role === 'admin' ? 'admin' : 'home');
  } catch (err) {
    errorEl.style.display = 'flex';
    errorEl.querySelector('span').textContent = err.message;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
}

// ── REGISTER PAGE ─────────────────────────────────────────────────────────────

function renderRegisterPage() {
  document.getElementById('mainContent').innerHTML = `
    <div class="auth-page page-enter">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon-nav" style="width:52px;height:52px;font-size:1.3rem">
            <i class="fas fa-book-open"></i>
          </div>
          <h2 class="font-serif">Join STOLEBOOKS</h2>
          <p>Create your account and start reading</p>
        </div>

        <form class="auth-form" onsubmit="handleRegister(event)">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <div class="form-input-wrap">
                <i class="fas fa-user form-input-icon"></i>
                <input type="text" class="form-input" id="regFirstName" placeholder="First name" required />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <div class="form-input-wrap">
                <i class="fas fa-user form-input-icon"></i>
                <input type="text" class="form-input" id="regLastName" placeholder="Last name" required />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <div class="form-input-wrap">
              <i class="fas fa-envelope form-input-icon"></i>
              <input type="email" class="form-input" id="regEmail" placeholder="your@email.com" required autocomplete="email" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <div class="form-input-wrap">
              <i class="fas fa-phone form-input-icon"></i>
              <input type="tel" class="form-input" id="regPhone" placeholder="+91 98765 43210" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="form-input-wrap">
              <i class="fas fa-lock form-input-icon"></i>
              <input type="password" class="form-input" id="regPassword" placeholder="Min. 8 characters" required />
              <span class="pass-toggle" onclick="togglePassword('regPassword', this)"><i class="fas fa-eye"></i></span>
            </div>
            <div class="form-hint">Use at least 8 characters with letters and numbers</div>
          </div>

          <div id="regError" style="display:none" class="form-error"><i class="fas fa-exclamation-circle"></i> <span></span></div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="regSubmitBtn">
            <i class="fas fa-user-plus"></i> Create Account
          </button>
        </form>

        <div class="auth-divider" style="margin:20px 0">OR</div>

        <div class="auth-switch">
          Already have an account? <a href="#" onclick="navigateTo('login')">Sign in</a>
        </div>
      </div>
    </div>`;
}

async function handleRegister(e) {
  e.preventDefault();
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;
  const btn = document.getElementById('regSubmitBtn');
  const errorEl = document.getElementById('regError');

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Creating account...';

  try {
    await AUTH.register({ full_name: `${firstName} ${lastName}`, email, password, phone });
    navigateTo('home');
  } catch (err) {
    errorEl.style.display = 'flex';
    errorEl.querySelector('span').textContent = err.message;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
  }
}

// ── CHECKOUT PAGE ─────────────────────────────────────────────────────────────

let _checkoutStep = 1;
let _checkoutAddress = {};
let _checkoutPayment = 'razorpay';

function renderCheckoutPage() {
  _checkoutStep = 1;
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="checkout-page page-enter">
      <div class="checkout-stepper">
        <div class="step active" id="step1">
          <div class="step-circle">1</div>
          <span class="step-label">Address</span>
          <div></div>
        </div>
        <div class="step" id="step2">
          <div class="step-circle">2</div>
          <span class="step-label">Payment</span>
          <div></div>
        </div>
        <div class="step" id="step3">
          <div class="step-circle">3</div>
          <span class="step-label">Review</span>
        </div>
      </div>

      <div class="checkout-grid">
        <div class="checkout-main" id="checkoutMain">
          <!-- Step content -->
        </div>
        <div>
          <div class="order-summary-card">
            <div class="order-summary-title"><i class="fas fa-receipt" style="color:var(--primary)"></i> Order Summary</div>
            <div class="order-items-list" id="checkoutOrderItems">
              ${CART.getItems().map(i => `
                <div class="order-item">
                  <img src="${i.book_image}" class="order-item-img" onerror="this.src='https://via.placeholder.com/44x60/f3f0ff/7c3aed?text=📚'" />
                  <div class="order-item-info">
                    <div class="order-item-title">${i.book_title}</div>
                    <div class="order-item-qty">Qty: ${i.quantity || 1}</div>
                  </div>
                  <span class="order-item-price">${CONFIG.CURRENCY_SYMBOL}${i.price * (i.quantity || 1)}</span>
                </div>
              `).join('')}
            </div>
            <div class="order-divider"></div>
            <div class="order-totals" id="checkoutTotals">
              ${(() => {
      const sub = CART.getSubtotal();
      const ship = sub >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_COST;
      const tot = sub + ship;
      return `
                  <div class="total-row"><span>Subtotal</span><span>${CONFIG.CURRENCY_SYMBOL}${sub}</span></div>
                  <div class="total-row"><span>Shipping</span><span>${ship === 0 ? '<span style="color:var(--success)">FREE</span>' : CONFIG.CURRENCY_SYMBOL + ship}</span></div>
                  <div class="total-row grand"><span>Total</span><span>${CONFIG.CURRENCY_SYMBOL}${tot}</span></div>
                `;
    })()}
            </div>
            <div class="secure-badge"><i class="fas fa-lock"></i> Secured by Razorpay</div>
          </div>
        </div>
      </div>
    </div>`;

  renderCheckoutStep(1);
}

function renderCheckoutStep(step) {
  _checkoutStep = step;
  const mainEl = document.getElementById('checkoutMain');
  if (!mainEl) return;

  // Update stepper UI
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`step${i}`);
    if (!stepEl) continue;
    stepEl.classList.remove('active', 'done');
    if (i < step) stepEl.classList.add('done');
    if (i === step) stepEl.classList.add('active');
    const circle = stepEl.querySelector('.step-circle');
    if (i < step) circle.innerHTML = '<i class="fas fa-check"></i>';
    else circle.textContent = i;
  }

  if (step === 1) {
    const user = AUTH.getUser();
    mainEl.innerHTML = `
      <div class="checkout-card page-enter">
        <h3 class="checkout-card-title"><i class="fas fa-map-marker-alt"></i> Delivery Address</h3>
        <form onsubmit="saveAddressAndNext(event)">
          <div class="address-grid">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <div class="form-input-wrap">
                <i class="fas fa-user form-input-icon"></i>
                <input type="text" class="form-input" id="addrName" placeholder="Your full name" required value="${user?.full_name || ''}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number *</label>
              <div class="form-input-wrap">
                <i class="fas fa-phone form-input-icon"></i>
                <input type="tel" class="form-input" id="addrPhone" placeholder="+91 XXXXX XXXXX" required value="${user?.phone || ''}" />
              </div>
            </div>
            <div class="form-group full-col">
              <label class="form-label">Street Address *</label>
              <div class="form-input-wrap">
                <i class="fas fa-home form-input-icon"></i>
                <input type="text" class="form-input" id="addrStreet" placeholder="House No., Street, Area" required />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">City *</label>
              <div class="form-input-wrap">
                <i class="fas fa-city form-input-icon"></i>
                <input type="text" class="form-input" id="addrCity" placeholder="City" required />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">District *</label>
              <div class="form-input-wrap">
                <i class="fas fa-map form-input-icon"></i>
                <input type="text" class="form-input" id="addrDistrict" placeholder="District" required />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">State *</label>
              <div class="form-input-wrap">
                <i class="fas fa-flag form-input-icon"></i>
                <select class="form-input" id="addrState" required>
                  <option value="">Select State</option>
                  ${['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Ladakh', 'Lakshadweep', 'Puducherry'].map(s => `<option>${s}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Pincode *</label>
              <div class="form-input-wrap">
                <i class="fas fa-map-pin form-input-icon"></i>
                <input type="text" class="form-input" id="addrPincode" placeholder="6-digit pincode" pattern="[0-9]{6}" required />
              </div>
            </div>
          </div>
          <div style="margin-top:20px">
            <button type="submit" class="btn btn-primary btn-lg">
              Continue to Payment <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </form>
      </div>`;
  }

  if (step === 2) {
    mainEl.innerHTML = `
      <div class="checkout-card page-enter">
        <h3 class="checkout-card-title"><i class="fas fa-credit-card"></i> Select Payment Method</h3>
        
        <div class="payment-methods">
          <!-- Razorpay -->
          <div class="payment-method selected" id="pm-razorpay" onclick="selectPayment('razorpay')">
            <div class="payment-method-header">
              <input type="radio" class="pm-radio" name="payment" value="razorpay" checked>
              <span class="pm-icon">💳</span>
              <span class="pm-label">Card / Net Banking / Wallet</span>
              <span class="pm-badge"><i class="fas fa-shield-alt"></i> Secure</span>
            </div>
            <div class="payment-method-detail">
              <p style="font-size:0.875rem;color:var(--text-medium)">
                <i class="fas fa-info-circle" style="color:var(--primary)"></i>
                Pay securely using Debit/Credit Card, Net Banking, or Wallet via Razorpay.
              </p>
              <!-- 
                ⚠️ PRODUCTION: Replace CONFIG.RAZORPAY_KEY_ID with your real key.
                RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID (in .env)
              -->
            </div>
          </div>

          <!-- UPI -->
          <div class="payment-method" id="pm-upi" onclick="selectPayment('upi')">
            <div class="payment-method-header">
              <input type="radio" class="pm-radio" name="payment" value="upi">
              <span class="pm-icon">📱</span>
              <span class="pm-label">UPI Payment</span>
              <span class="pm-badge" style="background:rgba(16,185,129,0.1);color:var(--success)">₹ Fast</span>
            </div>
            <div class="payment-method-detail">
              <div class="upi-input">
                <div class="form-input-wrap" style="flex:1">
                  <i class="fas fa-at form-input-icon"></i>
                  <input type="text" class="form-input" id="upiIdInput" placeholder="yourname@upi" />
                </div>
                <button type="button" class="btn btn-secondary" onclick="verifyUPI()">Verify</button>
              </div>
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
                Enter your UPI ID (e.g., 9876543210@upi, name@paytm)
              </p>
            </div>
          </div>

          <!-- COD -->
          <div class="payment-method" id="pm-cod" onclick="selectPayment('cod')">
            <div class="payment-method-header">
              <input type="radio" class="pm-radio" name="payment" value="cod">
              <span class="pm-icon">💵</span>
              <span class="pm-label">Cash on Delivery</span>
            </div>
            <div class="payment-method-detail">
              <p style="font-size:0.875rem;color:var(--text-medium)">
                Pay in cash when your books are delivered. 
                <strong style="color:var(--warning)">+₹${CONFIG.SHIPPING_COST} COD charge may apply.</strong>
              </p>
            </div>
          </div>
        </div>

        <div style="margin-top:24px;display:flex;gap:12px">
          <button class="btn btn-secondary" onclick="renderCheckoutStep(1)">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button class="btn btn-primary btn-lg" onclick="renderCheckoutStep(3)">
            Review Order <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>`;
  }

  if (step === 3) {
    const subtotal = CART.getSubtotal();
    const shipping = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_COST;
    const total = subtotal + shipping;
    const items = CART.getItems();
    const pmLabels = { razorpay: 'Card / Net Banking / Wallet', upi: 'UPI', cod: 'Cash on Delivery' };

    mainEl.innerHTML = `
      <div class="checkout-card page-enter">
        <h3 class="checkout-card-title"><i class="fas fa-check-circle"></i> Review Your Order</h3>
        
        <div style="background:var(--bg-lavender);border-radius:var(--radius-md);padding:16px;margin-bottom:16px">
          <h4 style="font-size:0.9rem;margin-bottom:10px;display:flex;align-items:center;gap:8px;color:var(--primary)">
            <i class="fas fa-map-marker-alt"></i> Delivery to:
          </h4>
          <p style="font-size:0.9rem;line-height:1.6">
            <strong>${_checkoutAddress.name}</strong><br>
            ${_checkoutAddress.street}, ${_checkoutAddress.city}, ${_checkoutAddress.district}<br>
            ${_checkoutAddress.state} – ${_checkoutAddress.pincode}<br>
            <i class="fas fa-phone" style="color:var(--primary)"></i> ${_checkoutAddress.phone}
          </p>
        </div>

        <div style="background:var(--bg-lavender);border-radius:var(--radius-md);padding:16px;margin-bottom:16px">
          <h4 style="font-size:0.9rem;margin-bottom:6px;display:flex;align-items:center;gap:8px;color:var(--primary)">
            <i class="fas fa-credit-card"></i> Payment:
          </h4>
          <p style="font-size:0.9rem">${pmLabels[_checkoutPayment] || _checkoutPayment}</p>
        </div>

        <div style="background:var(--bg-lavender);border-radius:var(--radius-md);padding:16px;margin-bottom:20px">
          <h4 style="font-size:0.9rem;margin-bottom:10px;display:flex;align-items:center;gap:8px;color:var(--primary)">
            <i class="fas fa-box"></i> Items (${items.length}):
          </h4>
          ${items.map(i => `
            <div style="display:flex;justify-content:space-between;font-size:0.875rem;padding:4px 0">
              <span>${i.book_title} × ${i.quantity || 1}</span>
              <strong>${CONFIG.CURRENCY_SYMBOL}${i.price * (i.quantity || 1)}</strong>
            </div>`).join('')}
          <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:800;font-size:1rem">
            <span>Grand Total</span>
            <span style="color:var(--primary)">${CONFIG.CURRENCY_SYMBOL}${total}</span>
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="renderCheckoutStep(2)">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button class="btn btn-primary btn-lg" id="placeOrderBtn" onclick="placeOrder()">
            <i class="fas fa-lock"></i> Place Order ${_checkoutPayment !== 'cod' ? '& Pay' : ''} – ${CONFIG.CURRENCY_SYMBOL}${total}
          </button>
        </div>
      </div>`;
  }
}

function saveAddressAndNext(e) {
  e.preventDefault();
  _checkoutAddress = {
    name: document.getElementById('addrName').value.trim(),
    phone: document.getElementById('addrPhone').value.trim(),
    street: document.getElementById('addrStreet').value.trim(),
    city: document.getElementById('addrCity').value.trim(),
    district: document.getElementById('addrDistrict').value.trim(),
    state: document.getElementById('addrState').value,
    pincode: document.getElementById('addrPincode').value.trim(),
  };
  renderCheckoutStep(2);
}

function selectPayment(method) {
  _checkoutPayment = method;
  document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
  document.getElementById(`pm-${method}`)?.classList.add('selected');
  document.querySelectorAll('.pm-radio').forEach(r => { r.checked = r.value === method; });
}

function verifyUPI() {
  const upiId = document.getElementById('upiIdInput')?.value.trim();
  if (!upiId || !upiId.includes('@')) {
    showToast('Invalid UPI', 'Please enter a valid UPI ID (e.g., name@upi)', 'error');
    return;
  }
  showToast('UPI Verified ✓', `UPI ID ${upiId} is valid.`, 'success');
}

async function placeOrder() {
  const btn = document.getElementById('placeOrderBtn');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Processing...';

  const user = AUTH.getUser();
  const items = CART.getItems();
  const subtotal = CART.getSubtotal();
  const shipping = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_COST;
  const total = subtotal + shipping;

  try {
    // Build order object
    const orderPayload = {
      user_id: user.id,
      user_email: user.email,
      customer_name: _checkoutAddress.name,
      customer_phone: _checkoutAddress.phone,
      address: _checkoutAddress.street,
      city: _checkoutAddress.city,
      district: _checkoutAddress.district,
      state: _checkoutAddress.state,
      pincode: _checkoutAddress.pincode,
      items: JSON.stringify(items.map(i => ({
        book_id: i.book_id, title: i.book_title,
        qty: i.quantity || 1, price: i.price
      }))),
      total_amount: total,
      shipping_amount: shipping,
      payment_method: _checkoutPayment,
      order_status: 'pending',
      payment_status: 'pending',
      order_date: new Date().toISOString(),
      estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
    };

    if (_checkoutPayment === 'cod') {
      // COD: save order directly
      const order = await API.createOrder(orderPayload);
      await CART.clearCart();
      showToast('Order Placed! 🎉', 'Your order has been placed successfully.', 'success');
      navigateTo('order-success', order.id);

    } else if (_checkoutPayment === 'upi') {
      const upiId = document.getElementById('upiIdInput')?.value.trim();
      const result = await PAYMENT.initiateUPI(orderPayload, upiId);
      if (result.success) {
        orderPayload.payment_status = 'paid';
        orderPayload.order_status = 'confirmed';
        orderPayload.razorpay_payment_id = result.paymentId;
        const order = await API.createOrder(orderPayload);
        await CART.clearCart();
        showToast('Payment Successful! 🎉', 'Your UPI payment was processed.', 'success');
        navigateTo('order-success', order.id);
      }

    } else {
      // Razorpay
      const result = await PAYMENT.initiateRazorpay({
        orderId: `temp_${Date.now()}`,
        amount: total,
        customerName: _checkoutAddress.name,
        email: user.email,
        phone: _checkoutAddress.phone,
      });

      if (result.success) {
        // ⚠️ In production: verify signature on backend BEFORE creating order
        orderPayload.payment_status = 'paid';
        orderPayload.order_status = 'confirmed';
        orderPayload.razorpay_payment_id = result.paymentId;
        orderPayload.razorpay_order_id = result.orderId;
        const order = await API.createOrder(orderPayload);
        await CART.clearCart();
        showToast('Payment Successful! 🎉', `Order confirmed. Payment ID: ${result.paymentId}`, 'success');
        navigateTo('order-success', order.id);
      }
    }

  } catch (err) {
    console.error('[placeOrder]', err);
    showToast('Error', err.message || 'Something went wrong. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-lock"></i> Place Order – ${CONFIG.CURRENCY_SYMBOL}${total}`;
  }
}

// ── ORDER SUCCESS PAGE ────────────────────────────────────────────────────────

function renderOrderSuccessPage(orderId) {
  document.getElementById('mainContent').innerHTML = `
    <div class="order-success-page page-enter">
      <div class="success-icon check-pop"><i class="fas fa-check"></i></div>
      <h2>Order Confirmed! 🎉</h2>
      <p>Thank you for shopping at STOLEBOOKS! Your books are on their way to you.</p>
      <div class="order-ref">
        Order Reference<br>
        <strong>#${(orderId || 'ORD' + Date.now()).toString().substr(0, 13).toUpperCase()}</strong>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px">
          A confirmation will be shown in your Order History
        </div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" onclick="navigateTo('orders')">
          <i class="fas fa-box"></i> View My Orders
        </button>
        <button class="btn btn-outline btn-lg" onclick="navigateTo('home')">
          <i class="fas fa-home"></i> Continue Shopping
        </button>
      </div>
      <div style="margin-top:32px;padding:20px;background:var(--bg-lavender);border-radius:var(--radius-lg);font-size:0.875rem;color:var(--text-medium)">
        <i class="fas fa-truck" style="color:var(--primary);font-size:1.3rem;display:block;margin-bottom:8px"></i>
        <strong>Estimated Delivery:</strong> 3–5 business days<br>
        <small>You will receive updates via email (if configured)</small>
      </div>
    </div>`;
}

// ── DASHBOARD PAGE ────────────────────────────────────────────────────────────

async function renderDashboardPage(defaultTab = 'profile') {
  const user = AUTH.getUser();
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="dashboard-page page-enter">
      <!-- Profile Card -->
      <div class="dashboard-profile-card">
        <div class="profile-avatar-lg">${(user.full_name || 'U').charAt(0).toUpperCase()}</div>
        <div class="profile-info">
          <h2>${user.full_name}</h2>
          <p>${user.email}</p>
          <div class="profile-stats">
            <div class="profile-stat">
              <div class="profile-stat-num" id="dash-orders-count">–</div>
              <div class="profile-stat-label">Orders</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-num">${WISHLIST.getItems().length}</div>
              <div class="profile-stat-label">Wishlist</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-num">${CART.getTotalQty()}</div>
              <div class="profile-stat-label">In Cart</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="dashboard-tabs">
        <div class="dashboard-tab ${defaultTab === 'profile' ? 'active' : ''}" onclick="switchDashTab('profile', this)">
          <i class="fas fa-user"></i> Profile
        </div>
        <div class="dashboard-tab ${defaultTab === 'orders' ? 'active' : ''}" onclick="switchDashTab('orders', this)">
          <i class="fas fa-box"></i> My Orders
        </div>
        <div class="dashboard-tab" onclick="switchDashTab('wishlist', this)">
          <i class="fas fa-heart"></i> Wishlist
        </div>
        <div class="dashboard-tab" onclick="switchDashTab('settings', this)">
          <i class="fas fa-cog"></i> Settings
        </div>
      </div>

      <!-- Panels -->
      <div id="dash-panel-profile" class="dashboard-panel ${defaultTab === 'profile' ? 'active' : ''}">
        ${renderProfilePanel(user)}
      </div>
      <div id="dash-panel-orders" class="dashboard-panel ${defaultTab === 'orders' ? 'active' : ''}">
        <div class="empty-state"><div class="loading-spinner" style="border-color:var(--primary-light);border-top-color:var(--primary);width:36px;height:36px;border-width:3px"></div></div>
      </div>
      <div id="dash-panel-wishlist" class="dashboard-panel">
        ${renderWishlistPanel()}
      </div>
      <div id="dash-panel-settings" class="dashboard-panel">
        ${renderSettingsPanel(user)}
      </div>
    </div>`;

  // Load orders
  const orders = await API.getUserOrders(user.id);
  document.getElementById('dash-orders-count').textContent = orders.length;
  document.getElementById('dash-panel-orders').innerHTML = renderOrdersPanel(orders);

  if (defaultTab === 'orders') {
    document.getElementById('dash-panel-orders').classList.add('active');
  }
}

function switchDashTab(tab, btnEl) {
  document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  document.getElementById(`dash-panel-${tab}`)?.classList.add('active');
}

function renderProfilePanel(user) {
  return `
    <div class="checkout-card">
      <h3 class="checkout-card-title"><i class="fas fa-user-edit"></i> Personal Information</h3>
      <form onsubmit="updateProfile(event)" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <div class="form-input-wrap">
            <i class="fas fa-user form-input-icon"></i>
            <input type="text" class="form-input" id="profileName" value="${user.full_name || ''}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <div class="form-input-wrap">
            <i class="fas fa-phone form-input-icon"></i>
            <input type="tel" class="form-input" id="profilePhone" value="${user.phone || ''}" />
          </div>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Email</label>
          <div class="form-input-wrap">
            <i class="fas fa-envelope form-input-icon"></i>
            <input type="email" class="form-input" value="${user.email}" disabled style="opacity:0.6" />
          </div>
          <div class="form-hint">Email cannot be changed</div>
        </div>
        <div style="grid-column:1/-1">
          <button type="submit" class="btn btn-primary" id="profileSaveBtn">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </form>
    </div>`;
}

async function updateProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('profileSaveBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Saving...';
  try {
    await AUTH.updateProfile({
      full_name: document.getElementById('profileName').value.trim(),
      phone: document.getElementById('profilePhone').value.trim(),
    });
    showToast('Profile Updated', 'Your profile has been saved.', 'success');
  } catch (e) {
    showToast('Error', e.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
}

function renderOrdersPanel(orders) {
  if (!orders || orders.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon"><i class="fas fa-box-open"></i></div>
      <h3>No orders yet</h3>
      <p>Your orders will appear here after you make a purchase.</p>
      <button class="btn btn-primary" onclick="navigateTo('books')"><i class="fas fa-book"></i> Start Shopping</button>
    </div>`;
  }

  return `<div class="orders-list">${orders.map(order => {
    let items = [];
    try { items = JSON.parse(order.items || '[]'); } catch (e) { }
    return `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <div class="order-id">Order #${order.id.substr(0, 13).toUpperCase()}</div>
            <div class="order-date">${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="order-status-badge status-${order.order_status || 'pending'}">${(order.order_status || 'Pending').toUpperCase()}</span>
            <span class="order-status-badge status-${order.payment_status || 'pending'}">${(order.payment_status || 'Pending').toUpperCase()}</span>
          </div>
        </div>
        ${items.length > 0 ? `<div class="order-books-row">
          ${items.map(i => `<img src="" data-book-id="${i.book_id}" alt="${i.title}" class="order-book-thumb" onerror="this.style.display='none'" />`).join('')}
        </div>` : ''}
        <div class="order-card-footer">
          <div>
            <div class="order-total-text">${items.length} item(s) · ${order.payment_method?.toUpperCase()}</div>
            <div class="order-total-amt">${CONFIG.CURRENCY_SYMBOL}${order.total_amount}</div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted)">
            <i class="fas fa-map-marker-alt"></i> ${order.city || ''}, ${order.state || ''}
          </div>
        </div>
        
        ${order.awb_number ? `
  <div style="padding:8px 0;border-top:1px solid var(--border-light);margin-top:8px">
    <button onclick="trackOrder('${order.id}')" 
      style="background:var(--bg-lavender);border:none;padding:6px 14px;border-radius:6px;color:var(--primary);font-size:0.8rem;font-weight:600;cursor:pointer;">
      <i class="fas fa-map-marker-alt"></i> Track Order
    </button>
    <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px">
      AWB: ${order.awb_number}
    </span>
  </div>
` : `
  <div style="padding:8px 0;border-top:1px solid var(--border-light);margin-top:8px;font-size:0.8rem;color:var(--text-muted)">
    <i class="fas fa-clock"></i> Shipment being prepared...
  </div>
`}

      </div>`;
  }).join('')}</div>`;
}

function renderWishlistPanel() {
  const items = WISHLIST.getItems();
  if (items.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon"><i class="fas fa-heart"></i></div>
      <h3>Your wishlist is empty</h3>
      <p>Save books you love for later.</p>
      <button class="btn btn-primary" onclick="navigateTo('books')"><i class="fas fa-book"></i> Browse Books</button>
    </div>`;
  }
  return `<div class="books-grid">${items.map(item => `
    <div class="book-card">
      <div class="book-card-img-wrap">
        <img src="${item.book_image}" alt="${item.book_title}" class="book-card-img" onerror="this.src='https://via.placeholder.com/200x280/f3f0ff/7c3aed?text=📚'" />
      </div>
      <div class="book-card-body">
        <div class="book-title">${item.book_title}</div>
        <div class="book-author">by ${item.author}</div>
        <div class="book-price-row"><span class="price-current">${CONFIG.CURRENCY_SYMBOL}${item.price}</span></div>
        <div class="book-card-actions">
          <button class="add-cart-btn" onclick="CART.addItem({id:'${item.book_id}',title:'${item.book_title}',cover_image:'${item.book_image}',price:${item.price},author:'${item.author}'}, this)">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function renderSettingsPanel(user) {
  return `
    <div class="checkout-card">
      <h3 class="checkout-card-title"><i class="fas fa-cog"></i> Account Settings</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--bg-lavender);border-radius:var(--radius-md)">
          <div>
            <div style="font-weight:600;font-size:0.9rem">Email Notifications</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Order updates and offers</div>
          </div>
          <label style="position:relative;display:inline-block;width:46px;height:24px;cursor:pointer">
            <input type="checkbox" checked style="opacity:0;width:0;height:0">
            <span style="position:absolute;inset:0;background:var(--primary);border-radius:12px;transition:0.3s"></span>
            <span style="position:absolute;left:2px;top:2px;width:20px;height:20px;background:white;border-radius:50%;transition:0.3s;transform:translateX(22px)"></span>
          </label>
        </div>
        <div style="padding:14px;background:#fef2f2;border-radius:var(--radius-md);border:1px solid #fecaca">
          <h4 style="color:var(--danger);margin-bottom:8px;font-size:0.9rem">Danger Zone</h4>
          <button class="btn btn-danger btn-sm" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Sign Out
          </button>
        </div>
      </div>
    </div>`;
}

// ── WISHLIST PAGE ─────────────────────────────────────────────────────────────

async function renderWishlistPage() {
  await WISHLIST.load();
  const items = WISHLIST.getItems();
  const allBooks = await BOOKS.getAll();

  document.getElementById('mainContent').innerHTML = `
    <div class="wishlist-page page-enter">
      <h2 class="font-serif"><i class="fas fa-heart" style="color:#e11d48"></i> My Wishlist (${items.length})</h2>
      ${items.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-heart-broken"></i></div>
          <h3>Your wishlist is empty</h3>
          <p>Find books you love and add them here!</p>
          <button class="btn btn-primary" onclick="navigateTo('books')"><i class="fas fa-book"></i> Explore Books</button>
        </div>` : `
        <div class="wishlist-grid">
          ${items.map(item => {
    const book = allBooks.find(b => b.id === item.book_id) || { id: item.book_id, title: item.book_title, cover_image: item.book_image, price: item.price, author: item.author, rating: item.rating, category: '' };
    return BOOKS.renderCard(book);
  }).join('')}
        </div>`}
    </div>`;
}

// ── ACCESS DENIED ─────────────────────────────────────────────────────────────

function renderAccessDenied() {
  document.getElementById('mainContent').innerHTML = `
    <div class="order-success-page page-enter">
      <div class="success-icon" style="background:linear-gradient(135deg,#fee2e2,#fca5a5)">
        <i class="fas fa-ban" style="color:var(--danger)"></i>
      </div>
      <h2>Access Denied</h2>
      <p>You don't have permission to view this page.</p>
      <button class="btn btn-primary btn-lg" onclick="navigateTo('home')">
        <i class="fas fa-home"></i> Go Home
      </button>
    </div>`;
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────

function togglePassword(inputId, toggleEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  toggleEl.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  const btn = document.getElementById('userAvatarBtn');
  if (!dropdown) return;
  const isOpen = dropdown.style.display !== 'none';
  dropdown.style.display = isOpen ? 'none' : 'block';
  btn?.classList.toggle('open', !isOpen);
  if (!isOpen) {
    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', closeUserDropdown, { once: true });
    }, 10);
  }
}

function closeUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  const btn = document.getElementById('userAvatarBtn');
  if (dropdown) dropdown.style.display = 'none';
  if (btn) btn.classList.remove('open');
}

function toggleMobileMenu() {
  const nav = document.getElementById('mobileNav');
  if (!nav) return;
  nav.classList.toggle('open');
}
function startCountdown() {
  // Set countdown to midnight
  function update() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');
    if (hEl) hEl.textContent = String(h).padStart(2, '0');
    if (mEl) mEl.textContent = String(m).padStart(2, '0');
    if (sEl) sEl.textContent = String(s).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
}

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
// ── FORGOT PASSWORD MODAL ─────────────────────────────────────────────────────
function renderForgotPasswordModal() {
  const existing = document.getElementById('forgotPasswordModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'forgotPasswordModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:32px;width:100%;max-width:420px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:fadeInUp 0.3s ease;">
      <button onclick="closeForgotModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.2rem;color:#6b7280;cursor:pointer;"><i class="fas fa-times"></i></button>
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#c4b5fd);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.5rem;color:#7c3aed;"><i class="fas fa-key"></i></div>
        <h3 style="font-size:1.3rem;font-weight:700;color:#111827;margin:0">Forgot Password?</h3>
        <p style="color:#6b7280;font-size:0.875rem;margin-top:6px">Enter your registered email. We'll send reset instructions.</p>
      </div>
      <div id="forgotFormSection">
        <div style="margin-bottom:16px">
          <label style="font-size:0.875rem;font-weight:600;color:#374151;display:block;margin-bottom:6px">Email Address</label>
          <div style="position:relative">
            <i class="fas fa-envelope" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9ca3af;"></i>
            <input type="email" id="forgotEmailInput" placeholder="your@email.com"
              style="width:100%;padding:10px 12px 10px 36px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#e5e7eb'" />
          </div>
        </div>
        <div id="forgotError" style="display:none;color:#dc2626;font-size:0.8rem;margin-bottom:12px;padding:8px 12px;background:#fef2f2;border-radius:6px;">
          <i class="fas fa-exclamation-circle"></i> <span></span>
        </div>
        <button onclick="handleForgotPassword()" id="forgotSubmitBtn"
          style="width:100%;padding:12px;background:#7c3aed;color:white;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;">
          <i class="fas fa-paper-plane"></i> Send Reset Instructions
        </button>
        <button onclick="closeForgotModal()"
          style="width:100%;padding:10px;background:none;color:#6b7280;border:1px solid #e5e7eb;border-radius:8px;font-size:0.875rem;cursor:pointer;margin-top:10px;">
          Cancel
        </button>
      </div>
      <div id="forgotSuccessSection" style="display:none;text-align:center">
        <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#d1fae5,#6ee7b7);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.5rem;color:#059669;"><i class="fas fa-check"></i></div>
        <h4 style="color:#111827;margin:0 0 8px">Check Your Email!</h4>
        <p style="color:#6b7280;font-size:0.875rem;line-height:1.6" id="forgotSuccessMsg"></p>
        <div style="margin-top:16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:0.8rem;color:#92400e;text-align:left;">
          <i class="fas fa-info-circle"></i> <strong>Note:</strong> Check Spam/Junk folder. For help: <strong>support@stolebooks.com</strong>
        </div>
        <button onclick="closeForgotModal()" style="margin-top:16px;padding:10px 24px;background:#7c3aed;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Back to Login</button>
      </div>
    </div>`;

  modal.addEventListener('click', (e) => { if (e.target === modal) closeForgotModal(); });
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('forgotEmailInput')?.focus(), 100);
}

async function handleForgotPassword() {
  const email = document.getElementById('forgotEmailInput')?.value.trim();
  const btn = document.getElementById('forgotSubmitBtn');
  const errorEl = document.getElementById('forgotError');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.style.display = 'block';
    errorEl.querySelector('span').textContent = 'Please enter a valid email address.';
    return;
  }

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    await fetch(`${CONFIG.BACKEND_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch (e) { }

  document.getElementById('forgotFormSection').style.display = 'none';
  document.getElementById('forgotSuccessSection').style.display = 'block';
  document.getElementById('forgotSuccessMsg').textContent =
    `If an account exists with ${email}, reset instructions have been sent.`;
}

function closeForgotModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) modal.remove();
  document.body.style.overflow = '';
}

// ── POLICY PAGES ──────────────────────────────────────────────────────────────
function renderPolicyPage(type) {
  const policies = {
    'privacy-policy': {
      title: 'Privacy Policy',
      icon: 'fas fa-shield-alt',
      updated: 'January 1, 2025',
      body: `
        <h3>1. Information We Collect</h3>
        <p>We collect your name, email, phone, and address when you register or place an order. Payment data is processed securely via Razorpay — we never store card details.</p>
        <h3>2. How We Use Your Information</h3>
        <ul><li>To process and fulfill your book orders</li><li>To send order confirmation emails</li><li>To manage your account</li><li>To improve our services</li></ul>
        <h3>3. Data Sharing</h3>
        <p>We never sell your data. We share only with payment processors (Razorpay) and delivery partners, as needed to complete your order.</p>
        <h3>4. Data Security</h3>
        <p>We use SSL encryption, bcrypt password hashing, and JWT authentication to protect your data.</p>
        <h3>5. Your Rights</h3>
        <ul><li>Access your personal data anytime from your dashboard</li><li>Request data deletion by emailing us</li><li>Unsubscribe from marketing emails anytime</li></ul>
        <h3>6. Contact</h3>
        <p>📧 <strong>privacy@stolebooks.com</strong></p>
      `
    },
    'terms': {
      title: 'Terms of Service',
      icon: 'fas fa-file-contract',
      updated: 'January 1, 2025',
      body: `
        <h3>1. Acceptance</h3>
        <p>By using STOLEBOOKS, you agree to these Terms. You must be 18+ or have parental consent.</p>
        <h3>2. Account</h3>
        <ul><li>Provide accurate information when registering</li><li>Keep your password confidential</li><li>You are responsible for all activity under your account</li></ul>
        <h3>3. Products & Pricing</h3>
        <ul><li>All prices in Indian Rupees (₹) inclusive of taxes</li><li>We reserve the right to change prices anytime</li><li>Product availability subject to stock levels</li></ul>
        <h3>4. Payment</h3>
        <p>We accept Razorpay (Card, Net Banking, UPI, Wallets) and Cash on Delivery. All transactions are SSL secured.</p>
        <h3>5. Shipping</h3>
        <ul><li>Free shipping on orders above ₹500</li><li>Estimated delivery: 3–7 business days</li></ul>
        <h3>6. Prohibited Activities</h3>
        <ul><li>No unlawful use of the site</li><li>No unauthorized access attempts</li><li>No false or misleading information</li></ul>
        <h3>7. Governing Law</h3>
        <p>These terms are governed by the laws of India.</p>
        <h3>8. Contact</h3>
        <p>📧 <strong>legal@stolebooks.com</strong></p>
      `
    },
    'refund-policy': {
      title: 'Refund & Return Policy',
      icon: 'fas fa-undo-alt',
      updated: 'January 1, 2025',
      body: `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:16px">
          <strong style="color:#166534">✅ Our Promise:</strong> <span style="color:#166534">7-day hassle-free returns on all orders.</span>
        </div>
        <h3>1. Return Eligibility</h3>
        <ul><li>Book in original unread condition</li><li>Return request within 7 days of delivery</li><li>Item received damaged, defective, or wrong</li></ul>
        <h3>2. Non-Returnable</h3>
        <ul><li>Books that have been read or show signs of use</li><li>Items damaged by customer after delivery</li><li>Clearance/sale items marked non-returnable</li></ul>
        <h3>3. How to Return</h3>
        <ol><li>Email <strong>returns@stolebooks.com</strong> with Order ID</li><li>Attach photos if item is damaged</li><li>We'll respond within 24–48 hours</li><li>Refund processed after item inspection</li></ol>
        <h3>4. Refund Timeline</h3>
        <ul><li>Credit/Debit Card: 5–7 business days</li><li>UPI / Net Banking: 3–5 business days</li><li>COD: 5–7 business days via bank transfer</li></ul>
        <h3>5. Cancellation</h3>
        <p>Cancel within 2 hours of order if not yet dispatched. Email <strong>support@stolebooks.com</strong> immediately.</p>
        <h3>6. Contact</h3>
        <p>📧 <strong>returns@stolebooks.com</strong><br>⏰ Response within 24 hours</p>
      `
    }
  };

  const policy = policies[type];
  if (!policy) return;

  const main = document.getElementById('mainContent');
  const footer = document.getElementById('mainFooter');
  const catBar = document.getElementById('categoryBar');
  if (catBar) catBar.style.display = 'none';
  if (footer) footer.style.display = 'block';

  main.innerHTML = `
    <div class="page-enter" style="max-width:800px;margin:0 auto;padding:40px 20px">
      <button onclick="navigateTo('home')" style="display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid var(--border);border-radius:8px;padding:8px 16px;cursor:pointer;color:var(--text-medium);font-size:0.875rem;margin-bottom:24px;">
        <i class="fas fa-arrow-left"></i> Back to Home
      </button>
      <div style="text-align:center;margin-bottom:32px">
        <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#c4b5fd);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.4rem;color:#7c3aed;">
          <i class="${policy.icon}"></i>
        </div>
        <h1 style="font-size:1.8rem;font-weight:800;color:var(--text-dark);margin:0 0 6px">${policy.title}</h1>
        <p style="color:var(--text-muted);font-size:0.85rem">Last updated: ${policy.updated}</p>
      </div>
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid var(--border-light);line-height:1.8;color:var(--text-medium)">
        <style>
          .pol h3{color:var(--text-dark);font-size:1rem;margin:24px 0 8px;padding-bottom:6px;border-bottom:2px solid var(--bg-lavender)}
          .pol ul,.pol ol{padding-left:20px;margin:8px 0}
          .pol li{margin-bottom:5px}
          .pol p{margin:8px 0}
          .pol strong{color:var(--text-dark)}
        </style>
        <div class="pol">${policy.body}</div>
      </div>
      <div style="text-align:center;margin-top:24px;padding:16px;background:var(--bg-lavender);border-radius:12px">
        <p style="margin:0;font-size:0.875rem;color:var(--text-medium)">
          Questions? <a href="mailto:support@stolebooks.com" style="color:var(--primary);font-weight:600">support@stolebooks.com</a>
        </p>
      </div>
    </div>`;
}
// ── Order Tracking ────────────────────────────────────────────────────────────
async function trackOrder(orderId) {
  const token = JSON.parse(localStorage.getItem('stolebooks_session'))?.token;
  if (!token) { showToast('Error', 'Please login first', 'error'); return; }

  showToast('Tracking...', 'Fetching your shipment status', 'info');

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/orders/${orderId}/track`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    // Status labels
    const statusLabels = {
      'pending':          '🕐 Order Placed',
      'processing':       '📦 Being Packed',
      'shipped':          '🚚 Shipped',
      'out_for_delivery': '🛵 Out for Delivery',
      'delivered':        '✅ Delivered',
      'cancelled':        '❌ Cancelled',
    };

    const statusLabel = statusLabels[data.shipping_status] || '🕐 Processing';

    // Modal show karo
    const existing = document.getElementById('trackingModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'trackingModal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;

    modal.innerHTML = `
      <div style="background:white;border-radius:16px;padding:32px;width:100%;max-width:460px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <button onclick="document.getElementById('trackingModal').remove();document.body.style.overflow=''"
          style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.2rem;color:#6b7280;cursor:pointer;">
          <i class="fas fa-times"></i>
        </button>

        <h3 style="font-size:1.2rem;font-weight:700;color:#111;margin:0 0 20px">
          <i class="fas fa-map-marker-alt" style="color:#7c3aed"></i> Order Tracking
        </h3>

        <!-- Status Steps -->
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
          ${['pending','processing','shipped','out_for_delivery','delivered'].map((s, i) => {
            const labels = {
              'pending':          'Order Placed',
              'processing':       'Being Packed',
              'shipped':          'Shipped',
              'out_for_delivery': 'Out for Delivery',
              'delivered':        'Delivered',
            };
            const statuses = ['pending','processing','shipped','out_for_delivery','delivered'];
            const currentIdx = statuses.indexOf(data.shipping_status);
            const isDone    = i <= currentIdx;
            const isCurrent = i === currentIdx;

            return `
              <div style="display:flex;align-items:center;gap:12px">
                <div style="
                  width:28px;height:28px;border-radius:50%;flex-shrink:0;
                  background:${isDone ? '#7c3aed' : '#e5e7eb'};
                  display:flex;align-items:center;justify-content:center;
                  color:white;font-size:0.75rem;font-weight:700;
                ">
                  ${isDone ? '<i class="fas fa-check"></i>' : (i+1)}
                </div>
                <span style="font-size:0.875rem;font-weight:${isCurrent ? '700' : '400'};color:${isCurrent ? '#7c3aed' : isDone ? '#111' : '#9ca3af'}">
                  ${labels[s]}
                  ${isCurrent ? '<span style="background:#ede9fe;color:#7c3aed;font-size:0.7rem;padding:2px 8px;border-radius:20px;margin-left:8px">Current</span>' : ''}
                </span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Details -->
        <div style="background:#f9fafb;border-radius:10px;padding:14px;font-size:0.85rem;">
          ${data.awb_number ? `<div style="margin-bottom:6px"><strong>AWB:</strong> ${data.awb_number}</div>` : ''}
          ${data.courier_name ? `<div style="margin-bottom:6px"><strong>Courier:</strong> ${data.courier_name}</div>` : ''}
          ${data.tracking_url ? `<div><a href="${data.tracking_url}" target="_blank" style="color:#7c3aed;font-weight:600"><i class="fas fa-external-link-alt"></i> Track on Courier Website</a></div>` : ''}
          ${!data.awb_number ? `<div style="color:#6b7280">${data.message || 'Shipment details will be available soon.'}</div>` : ''}
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
    });

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

  } catch (err) {
    showToast('Error', 'Could not fetch tracking info. Try again.', 'error');
  }
}