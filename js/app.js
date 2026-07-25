/**
 * STOLEBOOKS – Main Application Entry Point
 * 
 * Initializes the app, sets up global utilities.
 */

// ── Toast System ──────────────────────────────────────────────────────────────

/**
 * Show a toast notification
 * @param {string} title   - Toast title
 * @param {string} message - Toast message
 * @param {string} type    - 'success' | 'error' | 'warning' | 'info'
 */
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: 'fas fa-check-circle',
    error:   'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info:    'fas fa-info-circle',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info} toast-icon"></i>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close" onclick="dismissToast(this.closest('.toast'))">
      <i class="fas fa-times"></i>
    </button>`;

  container.appendChild(toast);

  // Auto-dismiss after 4 seconds
  const timer = setTimeout(() => dismissToast(toast), 4000);
  toast._timer = timer;
}

function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 300);
}

window.showToast = showToast;

// ── Header Scroll Effect ───────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const header = document.getElementById('mainHeader');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }
});

// ── App Initialization ────────────────────────────────────────────────────────
async function initApp() {
  // Initialize auth (loads session from localStorage)
  AUTH.init();

  // Pre-fetch books in background
  BOOKS.fetchAll();

  // Navigate to home page
  navigateTo('home');

  // Hide page loader
  setTimeout(() => {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.add('hidden');
  }, 1400);
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// ── Keyboard Shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // ESC closes modals
  if (e.key === 'Escape') {
    closeBookDetailModal();
    closeCartSidebar();
    closeUserDropdown();
    const adminOverlay = document.getElementById('bookFormOverlay');
    if (adminOverlay) adminOverlay.classList.remove('active');
  }
  // '/' focuses search
  if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    const input = document.getElementById('globalSearchInput');
    if (input) { input.focus(); input.select(); }
  }
});

// ── Click Outside Handlers ────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  // Close user dropdown
  const dropdownWrap = document.getElementById('userMenuWrap');
  if (dropdownWrap && !dropdownWrap.contains(e.target)) {
    closeUserDropdown();
  }
});
