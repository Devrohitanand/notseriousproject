/**
 * STOLEBOOKS – Configuration
 * 
 * ⚠️  LOCAL SETUP: Set BACKEND_URL to your Node.js backend
 * ⚠️  Replace RAZORPAY_KEY_ID with your real key
 */

const CONFIG = {
  // ─── Backend URL ────────────────────────────────────────────────────────────
  // For LOCAL development:
  BACKEND_URL: 'http://localhost:4000',
  // For PRODUCTION (after deploying backend to Railway/Render):
  // BACKEND_URL: 'https://your-backend.railway.app',

  // ─── Razorpay ───────────────────────────────────────────────────────────────
  // Get from: https://dashboard.razorpay.com → Settings → API Keys
  // Use TEST key for development, LIVE key for production
  RAZORPAY_KEY_ID: 'rzp_test_YOUR_KEY_HERE',  // ← REPLACE THIS

  // ─── Site Config ────────────────────────────────────────────────────────────
  SITE_NAME: 'STOLEBOOKS',
  SITE_EMAIL: 'support@stolebooks.com',
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
  FREE_SHIPPING_THRESHOLD: 500,
  SHIPPING_COST: 49,

  // ─── Admin ──────────────────────────────────────────────────────────────────
  ADMIN_EMAIL: 'admin@stolebooks.com',

  // ─── IMPORTANT: TABLE_API_BASE is NO LONGER USED ────────────────────────────
  // Previously this used Genspark's "tables" API which only works on Genspark.
  // Now all API calls go through your local Node.js backend at BACKEND_URL.
  TABLE_API_BASE: null, // DISABLED – using real backend now

  // ─── Pagination ─────────────────────────────────────────────────────────────
  BOOKS_PER_PAGE: 12,
  ORDERS_PER_PAGE: 10,
};

window.CONFIG = CONFIG;
