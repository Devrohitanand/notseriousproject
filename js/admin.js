/**
 * STOLEBOOKS – Admin Module
 * 
 * Admin panel with role-based access control.
 * Only accessible by users with role === 'admin'.
 * 
 * Default admin credentials:
 *   Email: admin@stolebooks.com
 *   Password: admin123
 */

const ADMIN = {

  async renderPage() {
    // Security: Double-check admin role
    if (!AUTH.isAdmin()) {
      renderAccessDenied();
      return;
    }

    const main = document.getElementById('mainContent');
    main.innerHTML = `
      <div class="admin-page page-enter">
        <div class="admin-header">
          <h1><i class="fas fa-shield-alt" style="color:var(--primary)"></i> Admin Panel</h1>
          <p style="color:var(--text-muted);font-size:0.9rem">Manage your STOLEBOOKS platform</p>
        </div>

        <!-- Stats -->
        <div class="admin-stats-grid" id="adminStatsGrid">
          ${[1,2,3,4].map(() => `<div class="admin-stat-card"><div class="skeleton" style="width:50px;height:50px;border-radius:12px"></div><div class="skeleton-body" style="flex:1"><div class="skeleton skeleton-line" style="height:20px;width:60%"></div><div class="skeleton skeleton-line" style="height:12px;width:80%"></div></div></div>`).join('')}
        </div>

        <!-- Tabs -->
        <div class="admin-tabs">
          <div class="admin-tab active" onclick="ADMIN.switchTab('books', this)"><i class="fas fa-book"></i> Books</div>
          <div class="admin-tab" onclick="ADMIN.switchTab('orders', this)"><i class="fas fa-shopping-bag"></i> Orders</div>
          <div class="admin-tab" onclick="ADMIN.switchTab('users', this)"><i class="fas fa-users"></i> Users</div>
        </div>

        <!-- Panels -->
        <div id="admin-panel-books" class="admin-panel active"></div>
        <div id="admin-panel-orders" class="admin-panel"></div>
        <div id="admin-panel-users" class="admin-panel"></div>
      </div>

      <!-- Book Form Modal -->
      <div class="form-modal-overlay" id="bookFormOverlay" onclick="ADMIN.closeBookForm(event)">
        <div class="form-modal" id="bookFormModal">
          <h3 id="bookFormTitle">Add New Book</h3>
          <form onsubmit="ADMIN.saveBook(event)" id="bookForm">
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">Title *</label>
                <div class="form-input-wrap"><i class="fas fa-book form-input-icon"></i>
                  <input type="text" class="form-input" id="bf-title" required placeholder="Book title" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Author *</label>
                <div class="form-input-wrap"><i class="fas fa-pen form-input-icon"></i>
                  <input type="text" class="form-input" id="bf-author" required placeholder="Author name" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Category *</label>
                <div class="form-input-wrap"><i class="fas fa-tag form-input-icon"></i>
                  <select class="form-input" id="bf-category" required>
                    ${['Fiction','Non-Fiction','Self-Help','Biography','Science','Mystery','Technology','Romance','Kids','Teens & YA','Manga','Medical Exams','Exams','Award Winners'].map(c => `<option>${c}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Price (₹) *</label>
                <div class="form-input-wrap"><i class="fas fa-rupee-sign form-input-icon"></i>
                  <input type="number" class="form-input" id="bf-price" required min="1" placeholder="e.g. 299" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">MRP (₹)</label>
                <div class="form-input-wrap"><i class="fas fa-rupee-sign form-input-icon"></i>
                  <input type="number" class="form-input" id="bf-mrp" placeholder="e.g. 499" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Rating (1-5)</label>
                <div class="form-input-wrap"><i class="fas fa-star form-input-icon"></i>
                  <input type="number" class="form-input" id="bf-rating" min="1" max="5" step="0.1" placeholder="e.g. 4.5" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Stock</label>
                <div class="form-input-wrap"><i class="fas fa-boxes form-input-icon"></i>
                  <input type="number" class="form-input" id="bf-stock" min="0" placeholder="e.g. 100" />
                </div>
              </div>
              <div class="form-group full">
                <label class="form-label">Cover Image URL *</label>
                <div class="form-input-wrap"><i class="fas fa-image form-input-icon"></i>
                  <input type="url" class="form-input" id="bf-image" required placeholder="https://..." />
                </div>
              </div>
              <div class="form-group full">
                <label class="form-label">Description</label>
                <textarea class="form-input" id="bf-description" rows="3" placeholder="Book description..." style="padding-top:10px;padding-left:14px;resize:vertical"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Publisher</label>
                <div class="form-input-wrap"><i class="fas fa-building form-input-icon"></i>
                  <input type="text" class="form-input" id="bf-publisher" placeholder="Publisher" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Pages</label>
                <div class="form-input-wrap"><i class="fas fa-file form-input-icon"></i>
                  <input type="number" class="form-input" id="bf-pages" placeholder="Number of pages" />
                </div>
              </div>
              <div class="form-group full" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.875rem">
                  <input type="checkbox" id="bf-bestseller" style="accent-color:var(--primary)"> Bestseller
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.875rem">
                  <input type="checkbox" id="bf-newarrival" style="accent-color:var(--primary)"> New Arrival
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.875rem">
                  <input type="checkbox" id="bf-featured" style="accent-color:var(--primary)"> Featured
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.875rem">
                  <input type="checkbox" id="bf-trending" style="accent-color:var(--primary)"> Trending
                </label>
              </div>
            </div>
            <input type="hidden" id="bf-edit-id" />
            <div style="display:flex;gap:12px;margin-top:20px">
              <button type="submit" class="btn btn-primary" id="bookFormSaveBtn">
                <i class="fas fa-save"></i> Save Book
              </button>
              <button type="button" class="btn btn-secondary" onclick="ADMIN.closeBookForm()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>`;

    // Load all data
    await this.loadStats();
    await this.loadBooksPanel();
  },

  async loadStats() {
    const [books, orders, users] = await Promise.all([
      API.getBooks({ limit: 200 }),
      API.getAllOrders(),
      API.getAllUsers(),
    ]);

    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    document.getElementById('adminStatsGrid').innerHTML = `
      <div class="admin-stat-card">
        <div class="admin-stat-icon stat-purple"><i class="fas fa-book"></i></div>
        <div class="admin-stat-info">
          <h3>${books.books?.length || 0}</h3>
          <p>Total Books</p>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon stat-green"><i class="fas fa-shopping-bag"></i></div>
        <div class="admin-stat-info">
          <h3>${orders.length}</h3>
          <p>Total Orders</p>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon stat-amber"><i class="fas fa-users"></i></div>
        <div class="admin-stat-info">
          <h3>${users.length}</h3>
          <p>Registered Users</p>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon stat-green"><i class="fas fa-rupee-sign"></i></div>
        <div class="admin-stat-info">
          <h3>₹${totalRevenue.toLocaleString('en-IN')}</h3>
          <p>Total Revenue</p>
        </div>
      </div>`;
  },

  async loadBooksPanel() {
    const panel = document.getElementById('admin-panel-books');
    if (!panel) return;

    const result = await API.getBooks({ limit: 200 });
    const books  = result.books || [];

    panel.innerHTML = `
      <div class="data-table-wrap">
        <div class="data-table-toolbar">
          <input type="text" class="table-search-input" placeholder="Search books..." oninput="ADMIN.filterBooksTable(this.value)" id="adminBooksSearch" />
          <button class="btn btn-primary btn-sm" onclick="ADMIN.openBookForm()">
            <i class="fas fa-plus"></i> Add Book
          </button>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" id="adminBooksTable">
            <thead>
              <tr>
                <th>Cover</th>
                <th>Title</th>
                <th>Author</th>
                <th>Category</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="adminBooksTbody">
              ${books.map(b => this._bookRow(b)).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    this._booksData = books;
  },

  _bookRow(b) {
    return `
      <tr id="admin-book-row-${b.id}">
        <td><img src="${b.cover_image}" class="table-book-img" onerror="this.src='https://via.placeholder.com/40x55/f3f0ff/7c3aed?text=📚'" /></td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${b.title}">
          <strong>${b.title}</strong>
          ${b.is_bestseller ? '<span class="badge badge-bestseller" style="font-size:0.6rem;margin-left:4px">BS</span>' : ''}
          ${b.is_new_arrival ? '<span class="badge badge-new" style="font-size:0.6rem;margin-left:4px">NEW</span>' : ''}
        </td>
        <td style="color:var(--text-muted);font-size:0.8rem">${b.author}</td>
        <td><span class="badge" style="background:rgba(124,58,237,0.1);color:var(--primary)">${b.category}</span></td>
        <td><strong style="color:var(--primary)">₹${b.price}</strong>${b.original_price ? `<br><small style="color:var(--text-muted);text-decoration:line-through">₹${b.original_price}</small>` : ''}</td>
        <td>${b.rating || '-'} ★</td>
        <td><span style="color:${(b.stock||0) > 20 ? 'var(--success)' : 'var(--warning)'}">
          ${b.stock || 0}
        </span></td>
        <td>
          <div class="table-actions">
            <button class="table-btn table-btn-edit" onclick="ADMIN.openBookForm('${b.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="table-btn table-btn-delete" onclick="ADMIN.deleteBook('${b.id}')"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>`;
  },

  async loadOrdersPanel() {
    const panel = document.getElementById('admin-panel-orders');
    if (!panel) return;

    const orders = await API.getAllOrders();

    panel.innerHTML = `
      <div class="data-table-wrap">
        <div class="data-table-toolbar">
          <input type="text" class="table-search-input" placeholder="Search orders..." oninput="ADMIN.filterOrdersTable(this.value)" />
          <span style="font-size:0.875rem;color:var(--text-muted)">${orders.length} total orders</span>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" id="adminOrdersTable">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Order Status</th>
                <th>Pay Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr id="admin-order-row-${o.id}">
                  <td><code style="font-size:0.75rem">${o.id.substr(0,10)}...</code></td>
                  <td><strong>${o.customer_name || '–'}</strong><br><small style="color:var(--text-muted)">${o.customer_phone || ''}</small></td>
                  <td style="font-size:0.8rem;color:var(--text-muted)">${o.user_email || '–'}</td>
                  <td><strong style="color:var(--primary)">₹${o.total_amount}</strong></td>
                  <td style="text-transform:uppercase;font-size:0.8rem">${o.payment_method || '–'}</td>
                  <td><span class="order-status-badge status-${o.order_status||'pending'}">${(o.order_status||'pending').toUpperCase()}</span></td>
                  <td><span class="order-status-badge status-${o.payment_status||'pending'}">${(o.payment_status||'pending').toUpperCase()}</span></td>
                  <td style="font-size:0.8rem;color:var(--text-muted)">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div class="table-actions">
                      <select onchange="ADMIN.updateOrderStatus('${o.id}', this.value)" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.75rem;cursor:pointer">
                        ${['pending','confirmed','processing','shipped','delivered','cancelled'].map(s =>
                          `<option value="${s}" ${o.order_status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
                        ).join('')}
                      </select>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  async loadUsersPanel() {
    const panel = document.getElementById('admin-panel-users');
    if (!panel) return;

    const users = await API.getAllUsers();

    panel.innerHTML = `
      <div class="data-table-wrap">
        <div class="data-table-toolbar">
          <input type="text" class="table-search-input" placeholder="Search users..." />
          <span style="font-size:0.875rem;color:var(--text-muted)">${users.length} users</span>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>
                    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-light));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.875rem">
                      ${(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td><strong>${u.full_name || '–'}</strong></td>
                  <td style="font-size:0.875rem;color:var(--text-muted)">${u.email}</td>
                  <td style="font-size:0.875rem">${u.phone || '–'}</td>
                  <td><span class="badge ${u.role === 'admin' ? 'badge-featured' : ''}" style="background:${u.role==='admin'?'rgba(124,58,237,0.15)':'rgba(16,185,129,0.1)'};color:${u.role==='admin'?'var(--primary)':'var(--success)'}">${u.role || 'user'}</span></td>
                  <td style="font-size:0.8rem;color:var(--text-muted)">${new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _booksData: [],
  _editingBookId: null,

  openBookForm(bookId = null) {
    this._editingBookId = bookId;
    document.getElementById('bookFormTitle').textContent = bookId ? 'Edit Book' : 'Add New Book';
    document.getElementById('bookFormSaveBtn').textContent = bookId ? '💾 Update Book' : '💾 Save Book';
    document.getElementById('bf-edit-id').value = bookId || '';

    if (bookId) {
      const book = this._booksData.find(b => b.id === bookId);
      if (book) {
        document.getElementById('bf-title').value       = book.title || '';
        document.getElementById('bf-author').value      = book.author || '';
        document.getElementById('bf-category').value    = book.category || '';
        document.getElementById('bf-price').value       = book.price || '';
        document.getElementById('bf-mrp').value         = book.original_price || '';
        document.getElementById('bf-rating').value      = book.rating || '';
        document.getElementById('bf-stock').value       = book.stock || '';
        document.getElementById('bf-image').value       = book.cover_image || '';
        document.getElementById('bf-description').value = book.description || '';
        document.getElementById('bf-publisher').value   = book.publisher || '';
        document.getElementById('bf-pages').value       = book.pages || '';
        document.getElementById('bf-bestseller').checked= book.is_bestseller || false;
        document.getElementById('bf-newarrival').checked= book.is_new_arrival || false;
        document.getElementById('bf-featured').checked  = book.is_featured || false;
        document.getElementById('bf-trending').checked  = book.is_trending || false;
      }
    } else {
      document.getElementById('bookForm').reset();
    }

    document.getElementById('bookFormOverlay').classList.add('active');
  },

  closeBookForm(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('bookFormOverlay').classList.remove('active');
    this._editingBookId = null;
  },

  async saveBook(e) {
    e.preventDefault();
    const btn = document.getElementById('bookFormSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner"></div> Saving...';

    const bookData = {
      title:          document.getElementById('bf-title').value.trim(),
      author:         document.getElementById('bf-author').value.trim(),
      category:       document.getElementById('bf-category').value,
      price:          parseFloat(document.getElementById('bf-price').value),
      original_price: parseFloat(document.getElementById('bf-mrp').value) || 0,
      rating:         parseFloat(document.getElementById('bf-rating').value) || 4.0,
      stock:          parseInt(document.getElementById('bf-stock').value) || 100,
      cover_image:    document.getElementById('bf-image').value.trim(),
      description:    document.getElementById('bf-description').value.trim(),
      publisher:      document.getElementById('bf-publisher').value.trim(),
      pages:          parseInt(document.getElementById('bf-pages').value) || 0,
      is_bestseller:  document.getElementById('bf-bestseller').checked,
      is_new_arrival: document.getElementById('bf-newarrival').checked,
      is_featured:    document.getElementById('bf-featured').checked,
      is_trending:    document.getElementById('bf-trending').checked,
      discount_percent: 0, // Calculated below after object is defined
      language:       'English',
      reviews_count:  0,
      tags:           [document.getElementById('bf-category').value.toLowerCase()],
    };

    // Recalculate discount
    if (bookData.original_price > bookData.price) {
      bookData.discount_percent = Math.round(((bookData.original_price - bookData.price) / bookData.original_price) * 100);
    }

    try {
      if (this._editingBookId) {
        await API.updateBook(this._editingBookId, bookData);
        showToast('Book Updated', `"${bookData.title}" has been updated.`, 'success');
      } else {
        await API.createBook(bookData);
        showToast('Book Added', `"${bookData.title}" has been added.`, 'success');
      }
      BOOKS._allBooks = []; // Clear cache
      this.closeBookForm();
      await this.loadBooksPanel();
    } catch (err) {
      showToast('Error', err.message || 'Failed to save book.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Book';
  },

  async deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    const ok = await API.deleteBook(bookId);
    if (ok) {
      document.getElementById(`admin-book-row-${bookId}`)?.remove();
      BOOKS._allBooks = []; // Clear cache
      showToast('Deleted', 'Book has been removed.', 'success');
    } else {
      showToast('Error', 'Failed to delete book.', 'error');
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      await API.updateOrderStatus(orderId, status);
      showToast('Status Updated', `Order status updated to ${status}.`, 'success');
    } catch (e) {
      showToast('Error', 'Failed to update order status.', 'error');
    }
  },

  switchTab(tab, btnEl) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const panel = document.getElementById(`admin-panel-${tab}`);
    if (panel) panel.classList.add('active');

    // Lazy-load panel content
    if (tab === 'orders') this.loadOrdersPanel();
    if (tab === 'users')  this.loadUsersPanel();
    if (tab === 'books')  this.loadBooksPanel();
  },

  filterBooksTable(query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll('#adminBooksTbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  },

  filterOrdersTable(query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll('#adminOrdersTable tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  },
};

window.ADMIN = ADMIN;
