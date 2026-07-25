"""StoleBooks Marketplace — FastAPI backend (production-oriented MVP)."""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import bcrypt
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import httpx
import jwt
import razorpay
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.routing import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

import emailer
import shiprocket as sr

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

# ---------------- Config ----------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXP = int(os.environ.get("JWT_EXPIRE_MINUTES", "10080"))
RAZORPAY_KEY_ID = os.environ["RAZORPAY_KEY_ID"]
RAZORPAY_KEY_SECRET = os.environ["RAZORPAY_KEY_SECRET"]
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
CLOUD_NAME = os.environ["CLOUDINARY_CLOUD_NAME"]
CLOUD_KEY = os.environ["CLOUDINARY_API_KEY"]
CLOUD_SECRET = os.environ["CLOUDINARY_API_SECRET"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").rstrip("/")
BACKEND_PUBLIC_URL = os.environ.get("BACKEND_PUBLIC_URL", "").rstrip("/") or FRONTEND_URL
GOOGLE_REDIRECT_URI = f"{BACKEND_PUBLIC_URL}/api/auth/google/callback"

cloudinary.config(cloud_name=CLOUD_NAME, api_key=CLOUD_KEY, api_secret=CLOUD_SECRET, secure=True)
rz_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("stolebooks")

app = FastAPI(title="StoleBooks API")
api = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def strip_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


# ---------------- Auth helpers ----------------
def hash_pwd(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_pwd(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXP),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_user_optional(request: Request) -> Optional[dict]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    return user


async def require_user(request: Request) -> dict:
    user = await get_user_optional(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_role(*roles: str):
    async def dep(user: dict = Depends(require_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


# ---------------- Models ----------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = "BUYER"  # BUYER | SELLER
    store_name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BookIn(BaseModel):
    title: str
    author: str
    subject: str
    edition: Optional[str] = None
    branch: Optional[str] = None
    semester: Optional[str] = None
    publication: Optional[str] = None
    condition: str = "Good"
    missing_pages: Optional[str] = None
    notes: Optional[str] = None
    binding: Optional[str] = None
    purchase_year: Optional[int] = None
    original_price: Optional[int] = None
    price: int
    university: Optional[str] = None
    images: list[str] = []  # cloudinary secure_urls
    description: str = ""
    status: str = "ACTIVE"  # ACTIVE | PAUSED | DRAFT | PENDING


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    condition: Optional[str] = None
    price: Optional[int] = None
    description: Optional[str] = None
    images: Optional[list[str]] = None
    status: Optional[str] = None
    university: Optional[str] = None


class CartAddIn(BaseModel):
    book_id: str
    qty: int = 1


class AddressIn(BaseModel):
    name: str
    phone: str
    email: EmailStr
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"


class CheckoutIn(BaseModel):
    address: AddressIn
    payment_method: str = "RAZORPAY"  # RAZORPAY | COD
    coupon_code: Optional[str] = None


class VerifyPaymentIn(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class ReviewIn(BaseModel):
    book_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class AISuggestIn(BaseModel):
    title: str
    author: str
    subject: Optional[str] = ""
    edition: Optional[str] = ""
    condition: Optional[str] = "Good"
    original_price: Optional[int] = 0
    notes: Optional[str] = ""


# ---------------- Auth routes ----------------
@api.post("/auth/register")
async def register(payload: RegisterIn):
    if payload.role not in ("BUYER", "SELLER"):
        raise HTTPException(400, "Invalid role")
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = new_id()
    doc = {
        "id": uid,
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": hash_pwd(payload.password),
        "role": payload.role,
        "seller_status": "PENDING" if payload.role == "SELLER" else "NA",
        "store_name": payload.store_name or "",
        "wallet_balance": 0,
        "avatar_url": "",
        "auth_provider": "email",
        "created_at": now_iso(),
        "email_verified": True,  # skip verification for MVP
    }
    await db.users.insert_one(doc)
    token = make_token(uid, payload.role)
    # Send welcome email (best-effort)
    try:
        subject, html = emailer.welcome_email(doc["name"], FRONTEND_URL or "https://stolebooks.in")
        await emailer.send_email(doc["email"], subject, html)
    except Exception as e:
        log.warning("Welcome email failed: %s", e)
    return {"token": token, "user": {"id": uid, "name": doc["name"], "email": doc["email"], "role": doc["role"], "seller_status": doc["seller_status"], "avatar_url": ""}}


@api.post("/auth/login")
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not user.get("password_hash") or not check_pwd(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"], "seller_status": user.get("seller_status", "NA"), "avatar_url": user.get("avatar_url", "")}}


@api.get("/auth/me")
async def me(user: dict = Depends(require_user)):
    return user


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=8)


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotIn):
    """Generate a short-lived JWT reset token and email a reset link."""
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user:
        return {"ok": True}
    tok = jwt.encode(
        {"sub": user["id"], "purpose": "reset", "exp": datetime.now(timezone.utc) + timedelta(minutes=30)},
        JWT_SECRET, algorithm=JWT_ALG,
    )
    reset_link = f"{FRONTEND_URL}/reset-password?token={tok}"
    try:
        subject, html = emailer.password_reset_email(user["name"], reset_link)
        sent = await emailer.send_email(user["email"], subject, html)
    except Exception as e:
        log.warning("Reset email failed: %s", e)
        sent = False
    # If email couldn't be delivered, expose token so preview users can still finish flow
    if sent:
        return {"ok": True}
    return {"ok": True, "token": tok}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetIn):
    try:
        data = jwt.decode(payload.token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(400, "Invalid or expired reset token")
    if data.get("purpose") != "reset":
        raise HTTPException(400, "Invalid token")
    user = await db.users.find_one({"id": data["sub"]})
    if not user:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": data["sub"]}, {"$set": {"password_hash": hash_pwd(payload.password)}})
    try:
        subject, html = emailer.password_reset_confirmation(user["name"])
        await emailer.send_email(user["email"], subject, html)
    except Exception as e:
        log.warning("Reset confirmation email failed: %s", e)
    return {"ok": True}


# ---------------- Google OAuth ----------------
@api.get("/auth/google/login")
async def google_login(role: str = "BUYER"):
    """Kick off Google OAuth. Role hint is stored in state for new-user creation."""
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(500, "Google OAuth not configured")
    if role not in ("BUYER", "SELLER"):
        role = "BUYER"
    state = jwt.encode(
        {"role": role, "nonce": new_id(), "exp": datetime.now(timezone.utc) + timedelta(minutes=10)},
        JWT_SECRET, algorithm=JWT_ALG,
    )
    from urllib.parse import urlencode
    params = urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@api.get("/auth/google/callback")
async def google_callback(request: Request):
    code = request.query_params.get("code")
    state = request.query_params.get("state", "")
    err = request.query_params.get("error")
    front_login = f"{FRONTEND_URL}/login"
    if err or not code:
        return RedirectResponse(f"{front_login}?google_error={err or 'no_code'}")
    try:
        state_data = jwt.decode(state, JWT_SECRET, algorithms=[JWT_ALG]) if state else {}
    except Exception:
        state_data = {}
    role_hint = state_data.get("role", "BUYER")

    # Exchange code for tokens
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token_resp = await client.post("https://oauth2.googleapis.com/token", data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            })
        if token_resp.status_code != 200:
            log.error("Google token exchange failed: %s", token_resp.text[:300])
            return RedirectResponse(f"{front_login}?google_error=token_exchange")
        access_token = token_resp.json().get("access_token")
        async with httpx.AsyncClient(timeout=15) as client:
            info = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if info.status_code != 200:
            return RedirectResponse(f"{front_login}?google_error=userinfo")
        profile = info.json()
    except Exception as e:
        log.error("Google OAuth error: %s", e)
        return RedirectResponse(f"{front_login}?google_error=network")

    email = (profile.get("email") or "").lower()
    if not email or not profile.get("email_verified"):
        return RedirectResponse(f"{front_login}?google_error=email_unverified")

    name = profile.get("name") or email.split("@")[0]
    avatar = profile.get("picture") or ""
    google_id = profile.get("sub")

    existing = await db.users.find_one({"email": email})
    if existing:
        # Link Google to existing account
        await db.users.update_one({"id": existing["id"]}, {"$set": {
            "google_id": google_id, "avatar_url": avatar or existing.get("avatar_url", ""),
            "email_verified": True,
        }})
        user = await db.users.find_one({"id": existing["id"]})
    else:
        uid = new_id()
        user = {
            "id": uid, "name": name, "email": email,
            "password_hash": "",  # cannot log in with password until they set one
            "role": role_hint,
            "seller_status": "PENDING" if role_hint == "SELLER" else "NA",
            "store_name": "", "wallet_balance": 0,
            "avatar_url": avatar,
            "google_id": google_id,
            "auth_provider": "google",
            "email_verified": True,
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
        try:
            subject, html = emailer.welcome_email(name, FRONTEND_URL or "")
            await emailer.send_email(email, subject, html)
        except Exception as e:
            log.warning("Welcome email failed: %s", e)

    token = make_token(user["id"], user["role"])
    # Redirect back to the frontend with the JWT; frontend will save it and go to dashboard
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")


# ---------------- Universities ----------------
@api.get("/universities")
async def list_universities():
    items = await db.universities.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api.post("/universities")
async def create_university(payload: dict, user: dict = Depends(require_role("ADMIN"))):
    doc = {"id": new_id(), "name": payload["name"], "short_name": payload.get("short_name", payload["name"][:4].upper()), "city": payload.get("city", ""), "logo_text": payload.get("logo_text", payload["name"][:2].upper()), "created_at": now_iso()}
    await db.universities.insert_one(doc)
    return strip_id(doc)


# ---------------- Books ----------------
@api.get("/books")
async def list_books(q: Optional[str] = None, subject: Optional[str] = None, condition: Optional[str] = None, min_price: Optional[int] = None, max_price: Optional[int] = None, sort: str = "newest", limit: int = 60, skip: int = 0):
    filt: dict[str, Any] = {"status": "ACTIVE"}
    if q:
        filt["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"author": {"$regex": q, "$options": "i"}}, {"subject": {"$regex": q, "$options": "i"}}]
    if subject:
        filt["subject"] = subject
    if condition:
        filt["condition"] = condition
    if min_price is not None or max_price is not None:
        filt["price"] = {}
        if min_price is not None:
            filt["price"]["$gte"] = min_price
        if max_price is not None:
            filt["price"]["$lte"] = max_price
    sort_key = {"newest": ("created_at", -1), "price_asc": ("price", 1), "price_desc": ("price", -1), "popular": ("views", -1)}.get(sort, ("created_at", -1))
    cur = db.books.find(filt, {"_id": 0}).sort(sort_key[0], sort_key[1]).skip(skip).limit(limit)
    return await cur.to_list(limit)


@api.get("/books/{book_id}")
async def get_book(book_id: str):
    b = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Book not found")
    await db.books.update_one({"id": book_id}, {"$inc": {"views": 1}})
    # attach seller info
    seller = await db.users.find_one({"id": b["seller_id"]}, {"_id": 0, "name": 1, "store_name": 1, "seller_status": 1})
    b["seller"] = seller or {}
    # reviews
    reviews = await db.reviews.find({"book_id": book_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    b["reviews"] = reviews
    b["avg_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    return b


@api.post("/books")
async def create_book(payload: BookIn, user: dict = Depends(require_role("SELLER", "ADMIN"))):
    doc = payload.model_dump()
    doc.update({"id": new_id(), "seller_id": user["id"], "views": 0, "created_at": now_iso(), "updated_at": now_iso()})
    await db.books.insert_one(doc)
    return strip_id(doc)


@api.put("/books/{book_id}")
async def update_book(book_id: str, payload: BookUpdate, user: dict = Depends(require_role("SELLER", "ADMIN"))):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Not found")
    if b["seller_id"] != user["id"] and user["role"] != "ADMIN":
        raise HTTPException(403, "Not your listing")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    await db.books.update_one({"id": book_id}, {"$set": updates})
    return await db.books.find_one({"id": book_id}, {"_id": 0})


@api.delete("/books/{book_id}")
async def delete_book(book_id: str, user: dict = Depends(require_role("SELLER", "ADMIN"))):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Not found")
    if b["seller_id"] != user["id"] and user["role"] != "ADMIN":
        raise HTTPException(403, "Forbidden")
    await db.books.delete_one({"id": book_id})
    return {"ok": True}


@api.get("/seller/books")
async def my_listings(user: dict = Depends(require_role("SELLER", "ADMIN"))):
    return await db.books.find({"seller_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ---------------- Cloudinary sign ----------------
@api.post("/cloudinary/sign")
async def cloudinary_sign(user: dict = Depends(require_user)):
    timestamp = int(time.time())
    folder = f"stolebooks/user_{user['id']}"
    params = {"timestamp": timestamp, "folder": folder}
    signature = cloudinary.utils.api_sign_request(params, CLOUD_SECRET)
    return {"timestamp": timestamp, "signature": signature, "folder": folder, "cloud_name": CLOUD_NAME, "api_key": CLOUD_KEY}


# ---------------- AI suggestions ----------------
@api.post("/ai/suggest")
async def ai_suggest(payload: AISuggestIn, user: dict = Depends(require_user)):
    """Generate AI-based pricing + SEO for a book listing (Claude Sonnet 4.5)."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        log.error("emergentintegrations missing: %s", e)
        return _fallback_suggest(payload)

    system = (
        "You are an expert Indian textbook marketplace pricing assistant. "
        "Given book details, return STRICT JSON with keys: "
        "recommended_price (int in INR, aim for 30-55% of original_price if provided, else fair used market price), "
        "condition_score (0-100 integer), demand_score (0-100 integer), "
        "seo_title (<=70 chars), seo_description (<=160 chars), "
        "category (short string), estimated_days (integer days to sell). Return ONLY valid JSON."
    )
    user_prompt = (
        f"Title: {payload.title}\nAuthor: {payload.author}\nSubject: {payload.subject}\n"
        f"Edition: {payload.edition}\nCondition: {payload.condition}\n"
        f"Original price INR: {payload.original_price}\nNotes: {payload.notes}"
    )
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"suggest-{new_id()}", system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text=user_prompt))
        import json
        text = str(resp).strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text)
        return data
    except Exception as e:
        log.warning("AI suggest failed: %s", e)
        return _fallback_suggest(payload)


def _fallback_suggest(p: AISuggestIn) -> dict:
    op = p.original_price or 500
    cond_map = {"Like New": 0.55, "Good": 0.4, "Fair": 0.3, "Verified Seller": 0.5, "Quality Checked": 0.5}
    ratio = cond_map.get(p.condition or "Good", 0.4)
    return {
        "recommended_price": max(50, int(op * ratio)),
        "condition_score": {"Like New": 90, "Good": 75, "Fair": 55}.get(p.condition or "Good", 70),
        "demand_score": 65,
        "seo_title": f"{p.title} by {p.author} — Used {p.subject or 'Textbook'} | StoleBooks",
        "seo_description": f"Buy used {p.title} ({p.author}) at student-friendly prices. Verified sellers, secure checkout.",
        "category": p.subject or "General",
        "estimated_days": 14,
    }


# ---------------- Cart ----------------
@api.get("/cart")
async def get_cart(user: dict = Depends(require_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}
    detailed = []
    total = 0
    for it in cart.get("items", []):
        b = await db.books.find_one({"id": it["book_id"]}, {"_id": 0})
        if b:
            detailed.append({"book": b, "qty": it["qty"]})
            total += b["price"] * it["qty"]
    return {"items": detailed, "total": total}


@api.post("/cart/add")
async def add_cart(payload: CartAddIn, user: dict = Depends(require_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    items = cart["items"] if cart else []
    found = False
    for it in items:
        if it["book_id"] == payload.book_id:
            it["qty"] += payload.qty
            found = True
            break
    if not found:
        items.append({"book_id": payload.book_id, "qty": payload.qty})
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items, "updated_at": now_iso()}}, upsert=True)
    return {"ok": True}


@api.post("/cart/remove")
async def remove_cart(payload: CartAddIn, user: dict = Depends(require_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        return {"ok": True}
    items = [it for it in cart["items"] if it["book_id"] != payload.book_id]
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}})
    return {"ok": True}


# ---------------- Wishlist ----------------
@api.get("/wishlist")
async def get_wishlist(user: dict = Depends(require_user)):
    w = await db.wishlists.find_one({"user_id": user["id"]}, {"_id": 0}) or {"book_ids": []}
    books = []
    for bid in w.get("book_ids", []):
        b = await db.books.find_one({"id": bid}, {"_id": 0})
        if b:
            books.append(b)
    return books


@api.post("/wishlist/toggle")
async def toggle_wishlist(payload: dict, user: dict = Depends(require_user)):
    bid = payload["book_id"]
    w = await db.wishlists.find_one({"user_id": user["id"]}) or {"book_ids": []}
    ids = w.get("book_ids", [])
    if bid in ids:
        ids.remove(bid)
    else:
        ids.append(bid)
    await db.wishlists.update_one({"user_id": user["id"]}, {"$set": {"book_ids": ids}}, upsert=True)
    return {"in_wishlist": bid in ids}


# ---------------- Orders & Razorpay ----------------
@api.post("/checkout")
async def checkout(payload: CheckoutIn, user: dict = Depends(require_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(400, "Cart is empty")
    items = []
    subtotal = 0
    for it in cart["items"]:
        b = await db.books.find_one({"id": it["book_id"]}, {"_id": 0})
        if not b or b.get("status") != "ACTIVE":
            continue
        items.append({"book_id": b["id"], "title": b["title"], "price": b["price"], "qty": it["qty"], "seller_id": b["seller_id"], "image": (b.get("images") or [""])[0]})
        subtotal += b["price"] * it["qty"]
    if not items:
        raise HTTPException(400, "No purchasable items")

    discount = 0
    if payload.coupon_code:
        c = await db.coupons.find_one({"code": payload.coupon_code.upper(), "active": True})
        if c:
            if c["type"] == "PERCENT":
                discount = int(subtotal * c["value"] / 100)
            else:
                discount = int(c["value"])
    shipping = 0 if subtotal >= 500 else 40
    total = max(0, subtotal - discount) + shipping

    oid = new_id()
    order_doc = {
        "id": oid,
        "buyer_id": user["id"],
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "total": total,
        "address": payload.address.model_dump(),
        "payment_method": payload.payment_method,
        "payment_status": "PENDING",
        "shipment_status": "PENDING",
        "status": "CREATED",
        "coupon_code": payload.coupon_code,
        "created_at": now_iso(),
    }

    if payload.payment_method == "RAZORPAY":
        rz_order = rz_client.order.create({"amount": total * 100, "currency": "INR", "receipt": oid[:38], "payment_capture": 1})
        order_doc["razorpay_order_id"] = rz_order["id"]
    elif payload.payment_method == "COD":
        order_doc["status"] = "CONFIRMED"
        order_doc["shipment_status"] = "PROCESSING"
        # reserve books
        for it in items:
            await db.books.update_one({"id": it["book_id"]}, {"$set": {"status": "SOLD"}})

    await db.orders.insert_one(order_doc)
    # clear cart
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": []}})

    # For COD path: send confirmation + trigger Shiprocket
    if payload.payment_method == "COD":
        try:
            subject, html = emailer.order_confirmation(user["name"], order_doc, FRONTEND_URL or "")
            await emailer.send_email(user["email"], subject, html)
        except Exception as e:
            log.warning("COD order email failed: %s", e)
        # fire-and-forget shipment creation
        import asyncio as _asyncio
        _asyncio.create_task(_auto_create_shipment(oid))

    return {
        "order_id": oid,
        "total": total,
        "razorpay_order_id": order_doc.get("razorpay_order_id"),
        "razorpay_key_id": RAZORPAY_KEY_ID if payload.payment_method == "RAZORPAY" else None,
    }


@api.post("/payments/verify")
async def verify_payment(payload: VerifyPaymentIn, user: dict = Depends(require_user)):
    order = await db.orders.find_one({"id": payload.order_id, "buyer_id": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    try:
        rz_client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(400, "Signature verification failed")
    # Fetch full payment details from Razorpay for method + fee metadata
    try:
        rz_payment = rz_client.payment.fetch(payload.razorpay_payment_id)
    except Exception:
        rz_payment = {}
    method = rz_payment.get("method")  # upi | card | netbanking | wallet | emi
    await db.orders.update_one({"id": payload.order_id}, {"$set": {
        "payment_status": "PAID",
        "status": "PAID",
        "razorpay_payment_id": payload.razorpay_payment_id,
        "razorpay_signature": payload.razorpay_signature,
        "payment_method_detail": method,
        "paid_at": now_iso(),
        "shipment_status": "PROCESSING",
    }})
    for it in order["items"]:
        await db.books.update_one({"id": it["book_id"]}, {"$set": {"status": "SOLD"}})
    await db.payments.insert_one({
        "id": new_id(), "order_id": payload.order_id, "user_id": user["id"],
        "provider": "razorpay", "provider_order_id": payload.razorpay_order_id,
        "provider_payment_id": payload.razorpay_payment_id, "signature": payload.razorpay_signature,
        "amount": order["total"], "method": method,
        "status": "PAID", "created_at": now_iso(), "raw": {k: rz_payment.get(k) for k in ("method", "vpa", "bank", "wallet", "card_id") if k in rz_payment},
    })
    # Send order-confirmation email and auto-create Shiprocket shipment
    try:
        subject, html = emailer.order_confirmation(user["name"], order, FRONTEND_URL or "")
        await emailer.send_email(user["email"], subject, html)
    except Exception as e:
        log.warning("Order confirmation email failed: %s", e)
    import asyncio as _asyncio
    _asyncio.create_task(_auto_create_shipment(payload.order_id))
    return {"ok": True, "order_id": payload.order_id, "payment_method": method}


@api.post("/payments/webhook")
async def rz_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(400, "Bad signature")
    import json
    data = json.loads(body.decode())
    log.info("Razorpay webhook event: %s", data.get("event"))
    return {"ok": True}


@api.get("/orders")
async def my_orders(user: dict = Depends(require_user)):
    return await db.orders.find({"buyer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.get("/orders/{oid}")
async def get_order(oid: str, user: dict = Depends(require_user)):
    o = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Not found")
    if o["buyer_id"] != user["id"] and user["role"] != "ADMIN":
        raise HTTPException(403, "Forbidden")
    return o


@api.post("/orders/{oid}/cancel")
async def cancel_order(oid: str, user: dict = Depends(require_user)):
    o = await db.orders.find_one({"id": oid, "buyer_id": user["id"]})
    if not o:
        raise HTTPException(404, "Not found")
    if o["status"] in ("DELIVERED", "CANCELLED"):
        raise HTTPException(400, "Cannot cancel")
    await db.orders.update_one({"id": oid}, {"$set": {"status": "CANCELLED", "shipment_status": "CANCELLED"}})
    for it in o["items"]:
        await db.books.update_one({"id": it["book_id"]}, {"$set": {"status": "ACTIVE"}})
    return {"ok": True}


# Seller orders
@api.get("/seller/orders")
async def seller_orders(user: dict = Depends(require_role("SELLER", "ADMIN"))):
    orders = await db.orders.find({"items.seller_id": user["id"], "status": {"$in": ["PAID", "DELIVERED"]}}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@api.get("/seller/stats")
async def seller_stats(user: dict = Depends(require_role("SELLER", "ADMIN"))):
    listings = await db.books.count_documents({"seller_id": user["id"]})
    active = await db.books.count_documents({"seller_id": user["id"], "status": "ACTIVE"})
    sold = await db.books.count_documents({"seller_id": user["id"], "status": "SOLD"})
    orders = await db.orders.find({"items.seller_id": user["id"], "payment_status": "PAID"}).to_list(1000)
    revenue = 0
    for o in orders:
        for it in o["items"]:
            if it["seller_id"] == user["id"]:
                revenue += it["price"] * it["qty"]
    return {"listings": listings, "active": active, "sold": sold, "revenue": revenue, "orders": len(orders)}


# ---------------- Reviews ----------------
@api.post("/reviews")
async def add_review(payload: ReviewIn, user: dict = Depends(require_user)):
    # verified purchase check
    purchased = await db.orders.find_one({"buyer_id": user["id"], "items.book_id": payload.book_id, "payment_status": "PAID"})
    doc = {"id": new_id(), "book_id": payload.book_id, "user_id": user["id"], "user_name": user["name"], "rating": payload.rating, "comment": payload.comment, "verified": bool(purchased), "created_at": now_iso()}
    await db.reviews.insert_one(doc)
    return strip_id(doc)


# ---------------- Resell ----------------
@api.post("/resell/{book_id}")
async def resell(book_id: str, user: dict = Depends(require_user)):
    """Prefill a new listing from a previously purchased book."""
    order = await db.orders.find_one({"buyer_id": user["id"], "items.book_id": book_id, "payment_status": "PAID"})
    if not order:
        raise HTTPException(403, "You must purchase this book to resell it")
    src = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not src:
        raise HTTPException(404, "Original book not found")
    new_book = {
        **{k: src[k] for k in ("title", "author", "subject", "edition", "publication", "description", "images", "university") if k in src},
        "id": new_id(),
        "seller_id": user["id"],
        "price": int(src["price"] * 0.8),
        "condition": "Good",
        "status": "DRAFT",
        "views": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "resell_of": book_id,
    }
    # user needs seller role — auto-upgrade to SELLER for resell
    if user["role"] == "BUYER":
        await db.users.update_one({"id": user["id"]}, {"$set": {"role": "SELLER", "seller_status": "APPROVED", "store_name": f"{user['name']}'s Store"}})
    await db.books.insert_one(new_book)
    return strip_id(new_book)


# ---------------- Admin ----------------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("ADMIN"))):
    return {
        "users": await db.users.count_documents({}),
        "books": await db.books.count_documents({}),
        "orders": await db.orders.count_documents({}),
        "universities": await db.universities.count_documents({}),
        "revenue": sum([o["total"] for o in await db.orders.find({"payment_status": "PAID"}, {"_id": 0, "total": 1}).to_list(10000)]),
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("ADMIN"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/users/{uid}/approve-seller")
async def approve_seller(uid: str, user: dict = Depends(require_role("ADMIN"))):
    await db.users.update_one({"id": uid}, {"$set": {"seller_status": "APPROVED"}})
    return {"ok": True}


@api.get("/admin/orders")
async def admin_orders(user: dict = Depends(require_role("ADMIN"))):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/admin/books")
async def admin_books(user: dict = Depends(require_role("ADMIN"))):
    return await db.books.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/books/{bid}/approve")
async def approve_book(bid: str, user: dict = Depends(require_role("ADMIN"))):
    await db.books.update_one({"id": bid}, {"$set": {"status": "ACTIVE"}})
    return {"ok": True}


# ---------------- Contact ----------------
@api.post("/contact")
async def contact(payload: dict):
    doc = {"id": new_id(), "name": payload.get("name", ""), "email": payload.get("email", ""), "message": payload.get("message", ""), "created_at": now_iso()}
    await db.contact_messages.insert_one(doc)
    return {"ok": True}


# ---------------- Invoice ----------------
from fastapi.responses import HTMLResponse


@api.get("/orders/{oid}/invoice", response_class=HTMLResponse)
async def invoice(oid: str, user: dict = Depends(require_user)):
    o = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not o or (o["buyer_id"] != user["id"] and user["role"] != "ADMIN"):
        raise HTTPException(404, "Not found")
    rows = "".join(
        f"<tr><td>{it['title']}</td><td>{it['qty']}</td><td>₹{it['price']}</td><td>₹{it['price']*it['qty']}</td></tr>"
        for it in o["items"]
    )
    addr = o["address"]
    html = f"""
    <html><head><title>Invoice {oid[:8]}</title>
    <style>body{{font-family:Inter,Arial;padding:40px;color:#161226;max-width:800px;margin:auto}}
    h1{{color:#5A2C81;margin:0}}table{{width:100%;border-collapse:collapse;margin-top:24px}}
    th,td{{padding:10px;border-bottom:1px solid #eee;text-align:left}}th{{background:#F3ECFC;color:#5A2C81}}
    .tot{{font-weight:900;font-size:20px;color:#5A2C81}}.brand{{letter-spacing:.2em;font-weight:900;color:#5A2C81}}
    .btn{{display:inline-block;background:#5A2C81;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;margin-top:20px}}
    @media print{{.btn{{display:none}}}}</style></head>
    <body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><p class="brand">STOLEBOOKS</p><p style="color:#64748b">Academic Marketplace</p></div>
      <div style="text-align:right"><h1>INVOICE</h1><p>#{oid[:8]}<br>{o['created_at'][:10]}</p></div>
    </div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <div><strong>Bill to</strong><br>{addr['name']}<br>{addr['line1']} {addr.get('line2','') or ''}<br>{addr['city']}, {addr['state']} {addr['pincode']}<br>{addr['phone']} · {addr['email']}</div>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>{rows}</tbody></table>
    <p style="text-align:right;margin-top:20px">Subtotal: ₹{o['subtotal']}<br>Discount: -₹{o.get('discount', 0)}<br>Shipping: ₹{o.get('shipping', 0)}</p>
    <p style="text-align:right" class="tot">Total: ₹{o['total']}</p>
    <p style="margin-top:24px;color:#64748b;font-size:12px">Payment: {o.get('payment_method_detail') or o['payment_method']} · Status: {o.get('payment_status')}<br>Razorpay Payment ID: {o.get('razorpay_payment_id','—')}</p>
    <a class="btn" href="javascript:window.print()">Print / Save as PDF</a>
    </body></html>
    """
    return HTMLResponse(html)


# ---------------- Coupons (admin) ----------------
class CouponIn(BaseModel):
    code: str
    type: str  # PERCENT | FLAT
    value: int
    min_order: int = 0
    active: bool = True


@api.get("/admin/coupons")
async def admin_list_coupons(user: dict = Depends(require_role("ADMIN"))):
    return await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/admin/coupons")
async def admin_create_coupon(payload: CouponIn, user: dict = Depends(require_role("ADMIN"))):
    doc = payload.model_dump(); doc["code"] = doc["code"].upper(); doc["id"] = new_id(); doc["created_at"] = now_iso()
    await db.coupons.insert_one(doc)
    return strip_id(doc)


@api.delete("/admin/coupons/{cid}")
async def admin_delete_coupon(cid: str, user: dict = Depends(require_role("ADMIN"))):
    await db.coupons.delete_one({"id": cid})
    return {"ok": True}


# ---------------- Announcements ----------------
@api.get("/announcements")
async def list_announcements():
    return await db.announcements.find({"active": True}, {"_id": 0}).sort("created_at", -1).to_list(20)


@api.post("/admin/announcements")
async def admin_create_announcement(payload: dict, user: dict = Depends(require_role("ADMIN"))):
    doc = {"id": new_id(), "title": payload.get("title", ""), "body": payload.get("body", ""), "active": True, "created_at": now_iso()}
    await db.announcements.insert_one(doc)
    return strip_id(doc)


@api.delete("/admin/announcements/{aid}")
async def admin_delete_announcement(aid: str, user: dict = Depends(require_role("ADMIN"))):
    await db.announcements.delete_one({"id": aid})
    return {"ok": True}


# ---------------- Complaints (contact messages) ----------------
@api.get("/admin/complaints")
async def admin_complaints(user: dict = Depends(require_role("ADMIN"))):
    return await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ---------------- Shiprocket ----------------
async def _auto_create_shipment(oid: str) -> None:
    """Best-effort: push a paid order to Shiprocket. Records outcome on the order."""
    order = await db.orders.find_one({"id": oid})
    if not order:
        return
    if not sr.is_enabled():
        stub_awb = f"SB{int(time.time())}"
        await db.orders.update_one({"id": oid}, {"$set": {
            "shipment_status": "SHIPPED", "awb": stub_awb,
            "tracking_url": f"https://shiprocket.co/tracking/{stub_awb}", "shipment_provider": "stub",
        }})
        return
    try:
        result = await sr.create_order(db, order)
        awb = result.get("awb")
        # If AWB not returned inline, request assignment
        if not awb and result.get("shipment_id"):
            awb_resp = await sr.generate_awb(db, result["shipment_id"])
            awb = (awb_resp.get("response") or {}).get("data", {}).get("awb_code") or awb_resp.get("awb_code")
        tracking = f"https://shiprocket.co/tracking/{awb}" if awb else None
        await db.orders.update_one({"id": oid}, {"$set": {
            "shipment_status": "SHIPPED", "awb": awb,
            "shiprocket_order_id": result.get("order_id"),
            "shiprocket_shipment_id": result.get("shipment_id"),
            "tracking_url": tracking, "shipment_provider": "shiprocket",
            "courier_name": result.get("courier"),
        }})
        # Notify buyer by email
        try:
            buyer = await db.users.find_one({"id": order["buyer_id"]})
            if buyer and awb:
                subject, html = emailer.order_shipped(buyer["name"], order, awb, tracking or "")
                await emailer.send_email(buyer["email"], subject, html)
        except Exception as e:
            log.warning("Shipment email failed: %s", e)
    except Exception as e:
        log.error("Shiprocket auto-create failed for order %s: %s", oid, e)
        await db.orders.update_one({"id": oid}, {"$set": {"shipment_status": "PROCESSING", "shipment_error": str(e)[:300]}})


@api.post("/shiprocket/create/{oid}")
async def shiprocket_create(oid: str, user: dict = Depends(require_role("ADMIN", "SELLER"))):
    """Manually push a paid order to Shiprocket."""
    order = await db.orders.find_one({"id": oid})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("payment_status") != "PAID" and order.get("payment_method") != "COD":
        raise HTTPException(400, "Order not paid")
    await _auto_create_shipment(oid)
    return await db.orders.find_one({"id": oid}, {"_id": 0})


@api.get("/shiprocket/track/{awb}")
async def shiprocket_track(awb: str, user: dict = Depends(require_user)):
    if not sr.is_enabled():
        return {"awb": awb, "status": "STUB", "note": "Shiprocket not configured"}
    return await sr.track(db, awb)


@api.post("/shiprocket/cancel/{oid}")
async def shiprocket_cancel(oid: str, user: dict = Depends(require_role("ADMIN"))):
    order = await db.orders.find_one({"id": oid})
    if not order or not order.get("shiprocket_shipment_id"):
        raise HTTPException(404, "Shipment not found")
    if sr.is_enabled():
        await sr.cancel(db, [order["shiprocket_shipment_id"]])
    await db.orders.update_one({"id": oid}, {"$set": {"shipment_status": "CANCELLED"}})
    return {"ok": True}


@api.post("/shiprocket/webhook")
async def shiprocket_webhook(request: Request):
    body = await request.json()
    awb = body.get("awb")
    sr_status = body.get("current_status", "UPDATE")
    if awb:
        await db.orders.update_one({"awb": awb}, {"$set": {"shipment_status": sr_status}})
    await db.shipment_events.insert_one({"id": new_id(), "awb": awb, "status": sr_status, "payload": body, "created_at": now_iso()})
    return {"ok": True}


# ---------------- Seed & init ----------------
async def _seed_if_empty():
    if await db.users.count_documents({}) > 0:
        return
    log.info("Seeding initial data...")
    # Admin
    admin = {"id": new_id(), "name": "Admin", "email": "admin@stolebooks.in", "password_hash": hash_pwd("ChangeMe123!"), "role": "ADMIN", "seller_status": "APPROVED", "wallet_balance": 0, "created_at": now_iso(), "email_verified": True}
    seller = {"id": new_id(), "name": "Ravi Kumar", "email": "seller@stolebooks.in", "password_hash": hash_pwd("Seller123!"), "role": "SELLER", "seller_status": "APPROVED", "store_name": "Campus Book Corner", "wallet_balance": 0, "created_at": now_iso(), "email_verified": True}
    buyer = {"id": new_id(), "name": "Ananya Sharma", "email": "buyer@stolebooks.in", "password_hash": hash_pwd("Buyer123!"), "role": "BUYER", "seller_status": "NA", "wallet_balance": 0, "created_at": now_iso(), "email_verified": True}
    await db.users.insert_many([admin, seller, buyer])

    unis = [
        {"id": new_id(), "name": "SRM University", "short_name": "SRM", "city": "Chennai", "logo_text": "SRM", "created_at": now_iso()},
        {"id": new_id(), "name": "MIT Manipal", "short_name": "MIT", "city": "Manipal", "logo_text": "MIT", "created_at": now_iso()},
        {"id": new_id(), "name": "LPU Punjab", "short_name": "LPU", "city": "Phagwara", "logo_text": "LPU", "created_at": now_iso()},
        {"id": new_id(), "name": "Chandigarh University", "short_name": "CU", "city": "Chandigarh", "logo_text": "CU", "created_at": now_iso()},
        {"id": new_id(), "name": "VIT Vellore", "short_name": "VIT", "city": "Vellore", "logo_text": "VIT", "created_at": now_iso()},
        {"id": new_id(), "name": "BITS Pilani", "short_name": "BITS", "city": "Pilani", "logo_text": "BITS", "created_at": now_iso()},
    ]
    await db.universities.insert_many(unis)

    covers = [
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800",
        "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800",
        "https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=800",
        "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800",
        "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800",
    ]
    books = [
        ("Engineering Mathematics Vol. 1", "B. S. Grewal", "Engineering", 420, "Like New"),
        ("Gray's Anatomy for Students", "Richard Drake", "Medical", 680, "Quality Checked"),
        ("GATE Computer Science Handbook", "Made Easy", "Entrance Exams", 350, "Good"),
        ("Basic Electrical Engineering", "V. K. Mehta", "Engineering", 290, "Verified Seller"),
        ("Fundamentals of Physics", "Halliday Resnick", "Engineering", 540, "Good"),
        ("NEET Biology Champion", "MTG Editorial", "Entrance Exams", 380, "Like New"),
    ]
    for i, (title, author, subject, price, cond) in enumerate(books):
        await db.books.insert_one({
            "id": new_id(), "seller_id": seller["id"], "title": title, "author": author, "subject": subject,
            "price": price, "condition": cond, "status": "ACTIVE", "images": [covers[i % len(covers)]],
            "description": f"A well-maintained copy of {title} by {author}. Perfect for students.",
            "university": unis[i % len(unis)]["short_name"], "views": 0,
            "created_at": now_iso(), "updated_at": now_iso(), "edition": "Latest", "original_price": price * 2,
        })

    await db.coupons.insert_many([
        {"id": new_id(), "code": "WELCOME50", "type": "FLAT", "value": 50, "min_order": 200, "active": True, "created_at": now_iso()},
        {"id": new_id(), "code": "SAVE10", "type": "PERCENT", "value": 10, "min_order": 300, "active": True, "created_at": now_iso()},
    ])
    log.info("Seed complete.")


@app.on_event("startup")
async def _startup():
    await db.users.create_index("email", unique=True)
    await db.books.create_index([("title", "text"), ("author", "text"), ("subject", "text")])
    await db.books.create_index("seller_id")
    await db.orders.create_index("buyer_id")
    await _seed_if_empty()
    # Verify SMTP configuration (non-blocking)
    try:
        await emailer.verify_connection()
    except Exception as e:
        log.warning("SMTP verify at startup failed: %s", e)


@app.on_event("shutdown")
async def _shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@api.get("/")
async def root():
    return {"service": "StoleBooks API", "status": "ok"}
