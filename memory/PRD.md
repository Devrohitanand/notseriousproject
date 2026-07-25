# StoleBooks — Product Requirements (Running)

**Original brief:** production-ready student book marketplace preserving the design shown in the walkthrough video and referenced GitHub repo (`STOLEBOOKSnew`). Amazon/Shopify/OLX-level functionality with Razorpay payments, Shiprocket shipping, AI listing, buyer/seller/admin roles, wallet, reviews, resell, and 6 legal pages sourced from an official PDF.

## Personas
- **Buyer** — browses, wishlists, cart, checkout, tracks orders, reviews, resells.
- **Seller** — creates & manages listings, dashboard, revenue, orders.
- **Admin** — manages users, books, orders, coupons, complaints, announcements.

## Implemented (Feb 2026)
- **Frontend:** React SPA on `/app/frontend` — Home, Browse (filter/sort/wishlist/discount/verified badges), Product page, Cart, Checkout, Buyer/Seller/Admin dashboards, Sell/Universities/Verify pages, 6 legal pages fed from `/app/frontend/src/lib/legalContent.js` (verbatim PDF content), animated hamburger nav, framer-motion micro-interactions, mobile responsive.
- **Backend:** FastAPI on `/app/backend/server.py` + `emailer.py` + `shiprocket.py`. Motor Mongo with UUID id-based docs. JWT auth (email+password), forgot/reset password, seeded admin/seller/buyer accounts.
- **Google OAuth 2.0:** `/api/auth/google/login` → Google consent → `/api/auth/google/callback` → issues our JWT → frontend `/auth/callback` route stores it. Account linking on existing email, avatar_url stored.
- **Razorpay Standard Checkout** with explicit config for UPI (QR + Intent + Collect: GPay, PhonePe, Paytm, BHIM), Card, Netbanking, Wallet, EMI. Signature verified server-side, `payment.fetch` retrieves method+VPA+bank+card for storage. Webhook endpoint at `/api/payments/webhook` with HMAC-SHA256 verification.
- **Shiprocket integration** (`/app/backend/shiprocket.py`) — token caching (20h) in Mongo, create adhoc order, AWB assignment, label & invoice generation, cancel, track by AWB, webhook receiver. Auto-fires after successful payment or COD checkout. Falls back to stub AWB if not configured.
- **SMTP emails** via `aiosmtplib` + branded HTML templates (`emailer.py`). Connection verified at startup. Sends welcome, password-reset link, reset confirmation, order-confirmation, order-shipped. Fails soft (never blocks user flow); when SMTP rejects, `forgot-password` also returns the token so the user can complete the flow.
- **AI listing** via Emergent LLM + Claude Sonnet 4.5 (`/api/ai/suggest`) — recommended price, condition score, demand score, SEO title/description, category, estimated selling time. Deterministic fallback if LLM unavailable.
- **Cloudinary** signed uploads (`/api/cloudinary/sign`) — 6 images per listing.
- **Cart + Wishlist + Reviews + Resell** endpoints.
- **Admin** — stats, users, books, orders, coupons CRUD, announcements CRUD, complaints (contact form messages), seller approval, book approval.
- **Invoices** as printable HTML (`/api/orders/{id}/invoice`).

## Deferred / Backlog
- **P1:** refund automation from Razorpay (button + webhook capture), advanced analytics charts (revenue-over-time, top sellers), review UI with star input + photo upload, first-order coupon toast promo, wallet withdrawal to sellers.
- **P1:** SMTP sender-domain verification — `nirojbaruah2016@gmail.com` is being rejected by mailrcld. Configure a verified domain in mailrcld or switch to a domain email; then real email delivery will work.
- **P2:** SSR/SEO server rendering, sitemap.xml/robots.txt, CSRF tokens on forms, rate-limiting on auth endpoints, audit logs for admin actions.
- **P2:** In-app notifications center, price-drop watchers, real-time chat between buyer & seller.

## Environment Variables (in `backend/.env`)
`MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `EMERGENT_LLM_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLOUDINARY_*`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `EMAIL_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`, `BACKEND_PUBLIC_URL`.

## Google OAuth setup (Cloud Console)
- Authorized JavaScript origin: `https://stolebooks-dev.preview.emergentagent.com`
- Authorized redirect URI: `https://stolebooks-dev.preview.emergentagent.com/api/auth/google/callback`
- OAuth consent screen: External + your Google account added as **Test user** while app is in Testing mode.

## Razorpay webhook setup
- URL: `https://stolebooks-dev.preview.emergentagent.com/api/payments/webhook`
- Secret: value of `RAZORPAY_WEBHOOK_SECRET` from `.env`
- Events: `payment.captured`, `payment.failed`, `refund.processed`.

## Seed data
Admin, seller, buyer accounts + 6 universities + 6 sample books + coupons `WELCOME50` and `SAVE10`. See `/app/memory/test_credentials.md`.
