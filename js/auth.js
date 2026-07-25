/**
 * STOLEBOOKS – Authentication Module (Fixed for Local)
 * 
 * WHAT CHANGED:
 * Previously used client-side password hashing + Genspark table API.
 * Now uses real JWT tokens from your Node.js backend.
 * 
 * - Registration → POST /api/auth/register
 * - Login        → POST /api/auth/login
 * - Passwords hashed with bcrypt on backend (safe)
 * - JWT token stored in localStorage
 */

const AUTH = {
  _user:  null,
  _token: null,

  /**
   * Initialize auth state from localStorage
   */
init() {
  try {
    const stored = localStorage.getItem('stolebooks_user');
    if (stored) {
      const session = JSON.parse(stored);
      if (session.expiresAt && Date.now() < session.expiresAt) {
        this._user = session.user;
        this._updateUI();
        CART.loadFromDB();
        WISHLIST.load();
      } else {
        this._clearSession();
      }
    }
  } catch {
    this._clearSession();
  }
},

  getUser()    { return this._user; },
  isLoggedIn() { return !!this._user; },
  isAdmin()    { return this._user && this._user.role === 'admin'; },

  /**
   * Register new user via backend
   */
  async register(formData) {
    const { full_name, email, password, phone } = formData;

    if (!full_name || full_name.trim().length < 2)
      throw new Error('Full name must be at least 2 characters');
    if (!this._isValidEmail(email))
      throw new Error('Invalid email address');
    if (!password || password.length < 8)
      throw new Error('Password must be at least 8 characters');

    // Call real backend
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ full_name: full_name.trim(), email: email.toLowerCase().trim(), password, phone: phone || '' }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    // Save session
    this._saveSession(data.user,data.token);
    this._updateUI();
    await CART.loadFromDB();
    await WISHLIST.load();

    showToast('Welcome to STOLEBOOKS! 🎉', `Hello ${data.user.full_name}, your account is ready!`, 'success');
    return data.user;
  },

  /**
   * Login via backend (real bcrypt + JWT)
   */
  async login(email, password) {
    if (!email || !password) throw new Error('Email and password are required');

    const res = await fetch(`${CONFIG.BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    // Save session with JWT token
    this._saveSession(data.user,data.token);
    this._updateUI();
    await CART.loadFromDB();
    await WISHLIST.load();

    showToast('Welcome back! 👋', `Good to see you, ${data.user.full_name}!`, 'success');
    return data.user;
  },

  /**
   * Logout
   */
 async logout() {
  await fetch(`${CONFIG.BACKEND_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  this._clearSession();
  CART._items = [];
  CART._updateUI();
  WISHLIST._items = [];
  WISHLIST._updateUI();
  this._updateUI();
  showToast('Logged out', 'You have been signed out successfully.', 'info');
  navigateTo('home');
},

  /**
   * Update user profile
   */
  _saveSession(user) {
  this._user = user;
  localStorage.setItem('stolebooks_user', JSON.stringify({
    user,
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
  }));
},

  // ── Private ────────────────────────────────────────────────────────────────

  _saveSession(user, token) {
    this._user  = user;
    this._token = token;
    const session = {
      user,
      token,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days (matches JWT)
    };
    localStorage.setItem('stolebooks_session', JSON.stringify(session));
  },

  _clearSession() {
    this._user  = null;
    this._token = null;
    localStorage.removeItem('stolebooks_user');
  },

  _updateUI() {
    const user          = this._user;
    const loginBtn      = document.getElementById('loginBtn');
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const adminDivider  = document.getElementById('adminDivider');
    const adminPanelLink= document.getElementById('adminPanelLink');

    if (!loginBtn) return;

    if (user) {
      loginBtn.style.display      = 'none';
      userAvatarBtn.style.display = 'flex';

      const initial = (user.full_name || user.email).charAt(0).toUpperCase();
      document.getElementById('userAvatarInitial').textContent     = initial;
      document.getElementById('userNameShort').textContent         = user.full_name?.split(' ')[0] || 'User';
      document.getElementById('dropdownAvatarInitial').textContent = initial;
      document.getElementById('dropdownUserName').textContent      = user.full_name || 'User';
      document.getElementById('dropdownUserEmail').textContent     = user.email || '';
      document.getElementById('userAvatarCircle').setAttribute('title', user.full_name || '');

      if (user.role === 'admin') {
        if (adminDivider)   adminDivider.style.display   = 'block';
        if (adminPanelLink) adminPanelLink.style.display = 'flex';
      } else {
        if (adminDivider)   adminDivider.style.display   = 'none';
        if (adminPanelLink) adminPanelLink.style.display = 'none';
      }
    } else {
      loginBtn.style.display      = 'flex';
      userAvatarBtn.style.display = 'none';
      if (adminDivider)   adminDivider.style.display   = 'none';
      if (adminPanelLink) adminPanelLink.style.display = 'none';
    }
  },

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
};

window.AUTH = AUTH;

function logout() { AUTH.logout(); closeUserDropdown(); }
