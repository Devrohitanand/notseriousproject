/*
 *  STOLEBOOKS – Backend Server (Node.js + Express)
  
*  This is your production-ready backend.
*  It handles:
*    - REST API for books, users, orders, cart, wishlist
 *    - JWT Authentication
 *    - Razorpay payment integration (with signature verification)
 *    - Nodemailer email notifications
 *    - MongoDB database (via Mongoose)
 *    - Role-based access control
 * 
 *  Setup:
 *    1. npm install  (installs all dependencies)
 *    2. Copy .env.example to .env and fill in your values
 *    3. node server.js  (or npm start)
 * ══════════════════════════════════════════════════════════════
 */


require('dotenv').config(); // ← Load .env file FIRST

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const Razorpay   = require('razorpay');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');
const path       = require('path');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp           = require('hpp');
const cookieParser = require('cookie-parser');
const Joi = require('joi');
const fetch = require('node-fetch');
const app = express();

// Middleware

// ══ SECURITY HEADERS ══
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "'unsafe-eval'", "https:"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https:"],
      fontSrc:    ["'self'", "https:", "data:"],
      imgSrc:     ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:"],
      frameSrc:   ["'self'", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ══ RATE LIMITING ══
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again after 15 minutes.' },
  skipSuccessfulRequests: true,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many reset attempts. Try again after 1 hour.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Try again after 15 minutes.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', forgotLimiter);

// ══ INPUT SANITIZATION ══
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(hpp());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve static frontend files (if deploying as monorepo)
app.use(express.static(path.join(__dirname, '../')));

//  Environment Variables (from .env)
// ⚠️  ALL secrets come from .env – NEVER hardcode them here
const {
  PORT            = 4000,
  MONGODB_URI,              // YOUR_DB_URI
  JWT_SECRET,               // A random secret string
  RAZORPAY_KEY_ID,          // YOUR_RAZORPAY_KEY_ID
  RAZORPAY_KEY_SECRET,      // YOUR_RAZORPAY_SECRET
  EMAIL_USER,               // YOUR_EMAIL
  EMAIL_PASS,               // YOUR_EMAIL_PASSWORD
  ADMIN_EMAIL = 'admin@stolebooks.com',
} = process.env;

// MongoDB Connection 
mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/stolebooks', {
  useNewUrlParser:    true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('   Set MONGODB_URI in your .env file');
  console.log('   Get a free DB at https://mongodb.com/atlas');
});

// Mongoose Schemas

// User Schema
const UserSchema = new mongoose.Schema({
  full_name:   { type: String, required: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },          // bcrypt hashed
  phone:       { type: String, default: '' },
  role:        { type: String, enum: ['user', 'admin'], default: 'user' },
  is_verified: { type: Boolean, default: false },
  avatar:      { type: String, default: '' },
  default_address: { type: String, default: '' },
  resetToken:       { type: String, default: null },// maa chud gyi ye error resolve krte krte
  resetTokenExpiry: { type: Number, default: null },
}, { timestamps: true });

// Book Schema
const BookSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  author:          { type: String, required: true },
  price:           { type: Number, required: true },
  original_price:  { type: Number },
  rating:          { type: Number, default: 4.0 },
  reviews_count:   { type: Number, default: 0 },
  category:        { type: String, required: true },
  cover_image:     { type: String, default: '' },
  description:     { type: String, default: '' },
  isbn:            { type: String, default: '' },
  pages:           { type: Number, default: 0 },
  publisher:       { type: String, default: '' },
  language:        { type: String, default: 'English' },
  stock:           { type: Number, default: 100 },
  is_bestseller:   { type: Boolean, default: false },
  is_new_arrival:  { type: Boolean, default: false },
  is_featured:     { type: Boolean, default: false },
  is_trending:     { type: Boolean, default: false },
  discount_percent:{ type: Number, default: 0 },
  tags:            [String],
}, { timestamps: true });

// Order Schema
const OrderSchema = new mongoose.Schema({
  user_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_email:        String,
  customer_name:     String,
  customer_phone:    String,
  address:           String,
  city:              String,
  district:          String,
  state:             String,
  pincode:           String,
  items:             [{ 
    book_id:    String,
    title:      String,
    qty:        Number,
    price:      Number,
  }],
  total_amount:      { type: Number, required: true },
  shipping_amount:   { type: Number, default: 0 },
  payment_method:    { type: String, enum: ['razorpay', 'upi', 'cod'] },
  order_status:      { type: String, enum: ['pending','confirmed','processing','shipped','delivered','cancelled'], default: 'pending' },
  payment_status:    { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature:  String,
  estimated_delivery: String,

  // ── Shiprocket Fields ──
shiprocket_order_id: { type: String, default: null },
shiprocket_shipment_id: { type: String, default: null },
awb_number:          { type: String, default: null },
courier_name:        { type: String, default: null },
tracking_url:        { type: String, default: null },
shipping_status:     { 
  type: String, 
  enum: ['pending','processing','shipped','out_for_delivery','delivered','cancelled'],
  default: 'pending'
},
}, { timestamps: true });

// Cart Schema
const CartSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book_id:    String,
  book_title: String,
  book_image: String,
  price:      Number,
  quantity:   { type: Number, default: 1 },
  author:     String,
}, { timestamps: true });

// Wishlist Schema
const WishlistSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book_id:    String,
  book_title: String,
  book_image: String,
  price:      Number,
  author:     String,
  rating:     Number,
}, { timestamps: true });

const User     = mongoose.model('User', UserSchema);
const Book     = mongoose.model('Book', BookSchema);
const Order    = mongoose.model('Order', OrderSchema);
const Cart     = mongoose.model('Cart', CartSchema);
const Wishlist = mongoose.model('Wishlist', WishlistSchema);

// ── Razorpay Instance ──────────────────────────────────────────────────────────
// ⚠️  Replace with your real keys in .env
// RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
// RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET
const razorpay = new Razorpay({
  key_id:     RAZORPAY_KEY_ID     || 'rzp_test_YOUR_KEY_ID',
  key_secret: RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET',
});

// ── Email Transport (Nodemailer) ───────────────────────────────────────────────
// ⚠️  Set EMAIL_USER and EMAIL_PASS in .env
// For Gmail: use App Password (not your real password)
// Guide: https://support.google.com/accounts/answer/185833
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER || 'YOUR_EMAIL@gmail.com',  // EMAIL_USER=YOUR_EMAIL
    pass: EMAIL_PASS || 'YOUR_APP_PASSWORD',      // EMAIL_PASS=YOUR_EMAIL_PASSWORD
  },
}); // gaand phat gyi krte krte ye fix

//  SHIPROCKET INTEGRATION

let shiprocketToken = null;
let shiprocketTokenExpiry = null;

// Shiprocket token generate karo (24h valid)
async function getShiprocketToken() {
  // Token valid hai toh reuse karo
  if (shiprocketToken && shiprocketTokenExpiry && Date.now() < shiprocketTokenExpiry) {
    return shiprocketToken;
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }),
    });

    const data = await res.json();
    if (!data.token) throw new Error('Shiprocket login failed');

    shiprocketToken = data.token;
    shiprocketTokenExpiry = Date.now() + (23 * 60 * 60 * 1000); // 23 hours
    console.log('✅ Shiprocket token generated');
    return shiprocketToken;

  } catch (err) {
    console.error('❌ Shiprocket auth failed:', err.message);
    return null;
  }
}

// Shiprocket order create karo
async function createShiprocketOrder(order, userEmail) {
  try {
    const token = await getShiprocketToken();
    if (!token) throw new Error('No Shiprocket token');

    // Items format karo
    let items = [];
    try { items = JSON.parse(order.items || '[]'); } catch(e) {}

    const payload = {
      order_id:         order._id.toString(),
      order_date:       new Date(order.createdAt).toISOString().split('T')[0],
      pickup_location:  'Primary', // Shiprocket dashboard mein set karo
      channel_id:       '',
      comment:          'STOLEBOOKS Order',
      billing_customer_name: order.customer_name,
      billing_last_name:     '',
      billing_address:       order.address,
      billing_city:          order.city,
      billing_pincode:       order.pincode,
      billing_state:         order.state,
      billing_country:       'India',
      billing_email:         userEmail || '',
      billing_phone:         order.customer_phone,
      shipping_is_billing:   true,
      order_items: items.map(i => ({
        name:          i.title,
        sku:           i.book_id || 'BOOK',
        units:         i.qty || 1,
        selling_price: i.price,
        discount:      0,
        tax:           0,
        hsn:           49011010, // Books ka HSN code
      })),
      payment_method:  order.payment_method === 'cod' ? 'COD' : 'Prepaid',
      sub_total:       order.total_amount,
      length:          20,  // cm
      breadth:         15,  // cm
      height:          5,   // cm
      weight:          0.5, // kg
    };

    const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('📦 Shiprocket order response:', data);

    if (data.order_id) {
      return {
        shiprocket_order_id:    data.order_id.toString(),
        shiprocket_shipment_id: data.shipment_id?.toString() || null,
        awb_number:             data.awb_code || null,
        courier_name:           data.courier_name || null,
        tracking_url:           data.tracking_url || null,
      };
    }
    throw new Error(data.message || 'Shiprocket order creation failed');

  } catch (err) {
    console.error('❌ Shiprocket order failed:', err.message);
    return null; // Order fail hone par bhi save hoga
  }
}

async function sendOrderEmail(order, userEmail) {
  // Email to admin
  await emailTransporter.sendMail({
    from:    `STOLEBOOKS <${EMAIL_USER}>`,
    to:      ADMIN_EMAIL,
    subject: '📦 New Order Received – STOLEBOOKS',
    html: `
      <h2>New Order #${order._id}</h2>
      <p><strong>Customer:</strong> ${order.customer_name} (${userEmail})</p>
      <p><strong>Amount:</strong> ₹${order.total_amount}</p>
      <p><strong>Payment:</strong> ${order.payment_method} – ${order.payment_status}</p>
      <p><strong>Items:</strong></p>
      <ul>${(order.items || []).map(i => `<li>${i.title} × ${i.qty} = ₹${i.price * i.qty}</li>`).join('')}</ul>
      <p><strong>Delivery to:</strong> ${order.address}, ${order.city}, ${order.state} – ${order.pincode}</p>
    `,
  });

  // Email to customer
  if (userEmail) {
    await emailTransporter.sendMail({
      from:    `STOLEBOOKS <${EMAIL_USER}>`,
      to:      userEmail,
      subject: '🎉 Order Confirmed – STOLEBOOKS',
      html: `
        <h2>Thank you for your order, ${order.customer_name}! 🎉</h2>
        <p>Your order has been confirmed.</p>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Total:</strong> ₹${order.total_amount}</p>
        <p><strong>Estimated Delivery:</strong> 3–5 business days</p>
        <p>We'll notify you when your books are shipped!</p>
        <br>
        <p>Happy reading! 📚</p>
        <p><em>– Team STOLEBOOKS</em></p>
      `,
    });
  }
}

// Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'fallback_secret_change_this');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
}
//  AUTH ROUTES

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    // Joi Validation
const schema = Joi.object({
  full_name: Joi.string().min(2).max(50).required(),
  email:     Joi.string().email().required(),
  password:  Joi.string().min(8).max(100).required(),
  phone:     Joi.string().allow('').optional(),
});
const { error } = schema.validate(req.body);
if (error) return res.status(400).json({ error: error.details[0].message });

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    // Hash password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const user = await User.create({
      full_name,
      email: email.toLowerCase(),
      password: hashedPassword,  // <- Always store hashed password
      phone: phone || '',
      role: isAdmin ? 'admin' : 'user',
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

  res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
res.status(201).json({
  user: { id: user._id, full_name, email: user.email, phone, role: user.role }
});
  } catch (err) {
    console.error('[POST /api/auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Joi Validation
const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
});
const { error: loginError } = loginSchema.validate(req.body);
if (loginError) return res.status(400).json({ error: loginError.details[0].message });
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'No account found with this email' });

    // Verify password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

   res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
res.json({
  token,
  user: {
    id:        user._id,
    full_name: user.full_name,
    email:     user.email,
    phone:     user.phone,
    role:      user.role,
  },
});
    
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ══ LOGOUT ══
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

      // Save token in user record
      await User.findByIdAndUpdate(
  user._id, 
  { $set: { resetToken: resetToken, resetTokenExpiry: resetExpiry } },
  { new: true }
);
console.log('Token saved to DB:', resetToken);

      // Reset link
      const resetLink = `http://localhost:4000/reset-password?token=${resetToken}&email=${user.email}`;

      try {
        await emailTransporter.sendMail({
          from: `STOLEBOOKS <${EMAIL_USER}>`,
          to: user.email,
          subject: '🔐 Password Reset – STOLEBOOKS',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
              <h2 style="color:#7c3aed">STOLEBOOKS Password Reset</h2>
              <p>Hello <strong>${user.full_name}</strong>,</p>
              <p>We received a request to reset your password. Click the button below to reset it:</p>
              <div style="text-align:center;margin:30px 0">
                <a href="${resetLink}" style="background:#7c3aed;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1rem">
                  🔑 Reset My Password
                </a>
              </div>
              <p style="color:#6b7280;font-size:0.875rem">This link expires in <strong>1 hour</strong>.</p>
              <p style="color:#6b7280;font-size:0.875rem">If you did not request this, ignore this email. Your account is safe.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
              <p style="color:#9ca3af;font-size:0.75rem">STOLEBOOKS Team | support@stolebooks.com</p>
            </div>
          `,
        });
        console.log(`✅ Reset email sent to: ${user.email}`);
      } catch (emailErr) {
        console.error('❌ Email error:', emailErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[forgot-password]', err);
    res.json({ success: true });
  }
});

// GET /reset-password — Reset password page

app.get('/reset-password', (req, res) => {
  const { token, email } = req.query;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reset Password – STOLEBOOKS</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:sans-serif; background:#f5f3ff; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
        .card { background:white; border-radius:16px; padding:36px; width:100%; max-width:420px; box-shadow:0 10px 40px rgba(0,0,0,0.1); }
        .logo { text-align:center; margin-bottom:24px; }
        .logo h1 { color:#7c3aed; font-size:1.5rem; }
        h2 { font-size:1.3rem; color:#111; margin-bottom:8px; text-align:center; }
        p { color:#6b7280; font-size:0.875rem; text-align:center; margin-bottom:24px; }
        label { display:block; font-size:0.875rem; font-weight:600; color:#374151; margin-bottom:6px; }
        input { width:100%; padding:12px; border:1.5px solid #e5e7eb; border-radius:8px; font-size:0.9rem; outline:none; margin-bottom:16px; }
        input:focus { border-color:#7c3aed; }
        button { width:100%; padding:13px; background:#7c3aed; color:white; border:none; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; }
        button:hover { background:#6d28d9; }
        .msg { padding:12px; border-radius:8px; font-size:0.875rem; margin-bottom:16px; display:none; text-align:center; }
        .success { background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; }
        .error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .back { display:block; text-align:center; margin-top:16px; color:#7c3aed; font-size:0.875rem; text-decoration:none; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <h1>📚 STOLEBOOKS</h1>
        </div>
        <h2>Reset Your Password</h2>
        <p>Enter your new password below</p>

        <div id="successMsg" class="msg success">✅ Password reset successful! Redirecting to login...</div>
        <div id="errorMsg" class="msg error"></div>

        <div id="formSection">
          <label>New Password</label>
          <input type="password" id="newPassword" placeholder="Min. 8 characters" />
          <label>Confirm Password</label>
          <input type="password" id="confirmPassword" placeholder="Re-enter new password" />
          <button onclick="resetPassword()">🔑 Reset Password</button>
        </div>

        <a href="http://localhost:4000" class="back">← Back to STOLEBOOKS</a>
      </div>

      <script>
        async function resetPassword() {
          const newPass    = document.getElementById('newPassword').value;
          const confirmPass = document.getElementById('confirmPassword').value;
          const errorMsg   = document.getElementById('errorMsg');
          const successMsg = document.getElementById('successMsg');

          errorMsg.style.display = 'none';

          if (!newPass || newPass.length < 8) {
            errorMsg.textContent = 'Password must be at least 8 characters.';
            errorMsg.style.display = 'block';
            return;
          }
          if (newPass !== confirmPass) {
            errorMsg.textContent = 'Passwords do not match.';
            errorMsg.style.display = 'block';
            return;
          }

          try {
            const res = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: new URLSearchParams(window.location.search).get('token'),
                email: new URLSearchParams(window.location.search).get('email'),
                newPassword: newPass
              })
            });
            const data = await res.json();

            if (data.success) {
              document.getElementById('formSection').style.display = 'none';
              successMsg.style.display = 'block';
              setTimeout(() => { window.location.href = 'http://localhost:4000'; }, 2500);
            } else {
              errorMsg.textContent = data.error || 'Reset failed. Link may have expired.';
              errorMsg.style.display = 'block';
            }
          } catch(e) {
            errorMsg.textContent = 'Something went wrong. Please try again.';
            errorMsg.style.display = 'block';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
      console.log('Reset attempt - token:', token, 'email:', email);
      const debugUser = await User.findOne({ email: email.toLowerCase() });
      console.log('User resetToken in DB:', debugUser?.resetToken);
      console.log('Token match:', debugUser?.resetToken === token);
    // Find user with valid token
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    console.log(`✅ Password reset successful for: ${user.email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

//  BOOKS ROUTES

// GET /api/books
app.get('/api/books', async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      search, category, sort,
      is_bestseller, is_new_arrival, is_featured, is_trending
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { title:    { $regex: search, $options: 'i' } },
        { author:   { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags:     { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }
    if (category && category !== 'all') query.category = category;
    if (is_bestseller  === 'true') query.is_bestseller  = true;
    if (is_new_arrival === 'true') query.is_new_arrival = true;
    if (is_featured    === 'true') query.is_featured    = true;
    if (is_trending    === 'true') query.is_trending    = true;

    const sortObj = {};
    if (sort === 'price_low')  sortObj.price = 1;
    if (sort === 'price_high') sortObj.price = -1;
    if (sort === 'rating')     sortObj.rating = -1;
    if (sort === 'new')        sortObj.createdAt = -1;
    if (!sort)                 sortObj.createdAt = -1;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Book.countDocuments(query);
    const books = await Book.find(query).sort(sortObj).skip(skip).limit(parseInt(limit));

    res.json({ books, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[GET /api/books]', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /api/books/:id
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// POST /api/books (admin only)
app.post('/api/books', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create book', details: err.message });
  }
});

// PUT /api/books/:id (admin only)
app.put('/api/books/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// DELETE /api/books/:id (admin only)
app.delete('/api/books/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

//  PAYMENT ROUTES

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order. Call this from frontend before opening checkout.
 * 
 * ⚠️  RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env
 */
app.post('/api/payment/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount:   Math.round(amount * 100), // Convert to paise
      currency,
      receipt:  receipt || `receipt_${Date.now()}`,
      notes: {
        user_id:   req.user.id,
        user_email: req.user.email,
      }
    };

    const order = await razorpay.orders.create(options);
    res.json({ 
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   RAZORPAY_KEY_ID  // Send key_id to frontend (NOT key_secret!)
    });
  } catch (err) {
    console.error('[POST /api/payment/create-order]', err);
    res.status(500).json({ error: 'Failed to create payment order', details: err.message });
  }
});

/**
 * POST /api/payment/verify
 * Verifies Razorpay payment signature using HMAC SHA256.
 * 
 * ⚠️  IMPORTANT: This is the critical security step.
 * Never mark an order as paid without this verification!
 * 
 * RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET (in .env)
 */
app.post('/api/payment/verify', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      our_order_id  // Your internal order ID
    } = req.body;

    // STEP 1: Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // STEP 2: Compare signatures
    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      console.warn('⚠️ Payment signature mismatch!');
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // STEP 3: Mark order as paid in DB
    if (our_order_id) {
      await Order.findByIdAndUpdate(our_order_id, {
        payment_status:      'paid',
        order_status:        'confirmed',
        razorpay_payment_id,
        razorpay_signature,
      });
    }

    console.log(`✅ Payment verified: ${razorpay_payment_id}`);
    res.json({ success: true, payment_id: razorpay_payment_id });

  } catch (err) {
    console.error('[POST /api/payment/verify]', err);
    res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

/*
 * POST /api/payment/webhook
 * Razorpay sends payment events to this endpoint.
 * 
 * ⚠️  Set this URL in Razorpay Dashboard → Settings → Webhooks
 * ⚠️  Set RAZORPAY_WEBHOOK_SECRET in .env
 */
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSig = crypto
      .createHmac('sha256', secret || '')
      .update(req.body)
      .digest('hex');

    if (secret && signature !== expectedSig) {
      console.warn('⚠️ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body);
    console.log('📩 Webhook event:', event.event);

    // Handle payment events
    switch (event.event) {
      case 'payment.captured':
        const paymentId  = event.payload.payment.entity.id;
        const notes      = event.payload.payment.entity.notes;
        if (notes?.order_id) {
          await Order.findByIdAndUpdate(notes.order_id, {
            payment_status:      'paid',
            order_status:        'confirmed',
            razorpay_payment_id: paymentId,
          });
        }
        break;
      case 'payment.failed':
        console.log('Payment failed:', event.payload.payment.entity.id);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[POST /api/payment/webhook]', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

//  ORDERS ROUTES

// POST /api/orders — Order create + Shiprocket
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    // items string hai toh parse karo
if (typeof req.body.items === 'string') {
  req.body.items = JSON.parse(req.body.items);
}
    const orderData = {
      ...req.body,
      user_id:    req.user.id,
      user_email: req.user.email
    };

    const order = await Order.create(orderData);
    console.log(`✅ Order saved: ${order._id}`);

    // Shiprocket — non-blocking
    createShiprocketOrder(order, req.user.email).then(async (shiprocketData) => {
      if (shiprocketData) {
        await Order.findByIdAndUpdate(order._id, {
          ...shiprocketData,
          shipping_status: 'processing',
        });
        console.log(`✅ Shiprocket linked: AWB ${shiprocketData.awb_number}`);
      }
    }).catch(err => console.error('Shiprocket error:', err.message));

    // Email — non-blocking
    sendOrderEmail(order, req.user.email).catch(err => {
      console.warn('⚠️ Email failed:', err.message);
    });

    res.status(201).json(order);

  } catch (err) {
    console.error('[POST /api/orders]', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders/my – User's orders
app.get('/api/orders/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders – All orders (admin only)
app.get('/api/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user_id', 'full_name email');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/orders/:id – Update order status (admin)
app.patch('/api/orders/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// GET /api/orders/:id/track — Order tracking
app.get('/api/orders/:id/track', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.user.id, 
      user_id: req.user.id 
    });

    // Admin ya order owner hi dekh sakta hai
    const order2 = await Order.findById(req.params.id);
    if (!order2) return res.status(404).json({ error: 'Order not found' });
    if (order2.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // AWB nahi hai toh basic info return karo
    if (!order2.awb_number) {
      return res.json({
        order_id:        order2._id,
        shipping_status: order2.shipping_status || 'pending',
        message:         'Shipment being processed',
        awb_number:      null,
        tracking_url:    null,
      });
    }

    // Shiprocket se live tracking lo
    try {
      const token = await getShiprocketToken();
      const trackRes = await fetch(
        `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${order2.awb_number}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const trackData = await trackRes.json();

      // Status map karo
      const statusMap = {
        'NEW':              'processing',
        'PICKUP PENDING':   'processing',
        'PICKUP QUEUED':    'processing',
        'PICKED UP':        'shipped',
        'IN TRANSIT':       'shipped',
        'OUT FOR DELIVERY': 'out_for_delivery',
        'DELIVERED':        'delivered',
        'CANCELLED':        'cancelled',
      };

      const currentStatus = trackData?.tracking_data?.shipment_status || '';
      const mappedStatus  = statusMap[currentStatus.toUpperCase()] || order2.shipping_status;

      // DB mein status update karo
      if (mappedStatus !== order2.shipping_status) {
        await Order.findByIdAndUpdate(order2._id, { shipping_status: mappedStatus });
      }

      res.json({
        order_id:        order2._id,
        shipping_status: mappedStatus,
        awb_number:      order2.awb_number,
        courier_name:    order2.courier_name,
        tracking_url:    order2.tracking_url,
        current_status:  currentStatus,
        tracking_data:   trackData?.tracking_data || null,
      });

    } catch (trackErr) {
      console.error('Tracking fetch failed:', trackErr.message);
      res.json({
        order_id:        order2._id,
        shipping_status: order2.shipping_status,
        awb_number:      order2.awb_number,
        courier_name:    order2.courier_name,
        tracking_url:    order2.tracking_url,
      });
    }

  } catch (err) {
    console.error('[GET /api/orders/:id/track]', err);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// POST /api/shiprocket/webhook — Auto status update
app.post('/api/shiprocket/webhook', async (req, res) => {
  try {
    const { awb, current_status, order_id } = req.body;
    console.log('📦 Shiprocket webhook:', { awb, current_status, order_id });

    const statusMap = {
      'PICKED UP':        'shipped',
      'IN TRANSIT':       'shipped',
      'OUT FOR DELIVERY': 'out_for_delivery',
      'DELIVERED':        'delivered',
      'CANCELLED':        'cancelled',
    };

    const mappedStatus = statusMap[current_status?.toUpperCase()];

    if (awb && mappedStatus) {
      await Order.findOneAndUpdate(
        { awb_number: awb },
        { shipping_status: mappedStatus }
      );
      console.log(`✅ Webhook: AWB ${awb} → ${mappedStatus}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Shiprocket Webhook]', err);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

//  CART ROUTES

app.get('/api/cart', authMiddleware, async (req, res) => {
  const items = await Cart.find({ user_id: req.user.id });
  res.json(items);
});

app.post('/api/cart', authMiddleware, async (req, res) => {
  try {
    // Check if already in cart
    const existing = await Cart.findOne({ user_id: req.user.id, book_id: req.body.book_id });
    if (existing) {
      existing.quantity += 1;
      await existing.save();
      return res.json(existing);
    }
    const item = await Cart.create({ ...req.body, user_id: req.user.id });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

app.patch('/api/cart/:id', authMiddleware, async (req, res) => {
  const item = await Cart.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

app.delete('/api/cart/:id', authMiddleware, async (req, res) => {
  await Cart.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

app.delete('/api/cart', authMiddleware, async (req, res) => {
  await Cart.deleteMany({ user_id: req.user.id });
  res.status(204).end();
});

//  WISHLIST ROUTES

app.get('/api/wishlist', authMiddleware, async (req, res) => {
  const items = await Wishlist.find({ user_id: req.user.id });
  res.json(items);
});

app.post('/api/wishlist', authMiddleware, async (req, res) => {
  const existing = await Wishlist.findOne({ user_id: req.user.id, book_id: req.body.book_id });
  if (existing) return res.json(existing);
  const item = await Wishlist.create({ ...req.body, user_id: req.user.id });
  res.status(201).json(item);
});

app.delete('/api/wishlist/:id', authMiddleware, async (req, res) => {
  await Wishlist.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

//  USER ROUTES

app.get('/api/users/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

app.patch('/api/users/me', authMiddleware, async (req, res) => {
  const { password, role, ...data } = req.body; // Block changing role from here
  const user = await User.findByIdAndUpdate(req.user.id, data, { new: true }).select('-password');
  res.json(user);
});

app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// //  Start Server 
// app.listen(PORT, () => {
//   console.log(`
// ╔════════════════════════════════════════╗
// ║   STOLEBOOKS Backend Running           ║
// ║   http://localhost:${PORT}                ║
// ╚════════════════════════════════════════╝
//   `);
// });
// ══ GLOBAL ERROR HANDLER ══
app.use((err, req, res, next) => {
  console.error('🔴 Error:', {
    message: err.message,
    stack:   err.stack,
    url:     req.url,
    method:  req.method,
    ip:      req.ip,
    user:    req.user?.email || 'anonymous',
    time:    new Date().toISOString(),
  });
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500
      ? 'Something went wrong. Please try again.'
      : err.message,
  });
});

// ══ CRASH PREVENTION ══
process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
});
const { exec } = require("child_process");

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   STOLEBOOKS Backend Running           ║
║   http://localhost:${PORT}                ║
╚════════════════════════════════════════╝
  `);

  // 👇 auto open browser
  exec(`start http://localhost:${PORT}`);
});

module.exports = app;
