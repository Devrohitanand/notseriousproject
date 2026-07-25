"""StoleBooks backend integration tests.

Covers: health, auth (register/login/me/wrong pwd), forgot/reset password, books CRUD,
AI suggest, cart, wishlist, checkout (COD + Razorpay), payment verify (invalid sig),
orders (list/get/cancel/invoice), admin (stats/users/books/orders/coupons/announcements/complaints),
universities, cloudinary sign.

Run:
  pytest /app/backend/tests/backend_test.py -v --tb=short \
    --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
from __future__ import annotations

import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@stolebooks.in", "password": "ChangeMe123!"}
SELLER = {"email": "seller@stolebooks.in", "password": "Seller123!"}
BUYER = {"email": "buyer@stolebooks.in", "password": "Buyer123!"}

TIMEOUT = 30


# ------------- fixtures -------------
def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=TIMEOUT)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def seller_token():
    return _login(SELLER)


@pytest.fixture(scope="session")
def buyer_token():
    return _login(BUYER)


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ------------- 1. Health & basic reads -------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_books_list(self):
        r = requests.get(f"{API}/books", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 6, f"Expected >=6 seeded books, got {len(data)}"
        b = data[0]
        for key in ("id", "title", "author", "price", "status"):
            assert key in b

    def test_universities(self):
        r = requests.get(f"{API}/universities", timeout=TIMEOUT)
        assert r.status_code == 200
        assert len(r.json()) >= 6


# ------------- 2. Auth -------------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=TIMEOUT)
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["role"] == "ADMIN"
        assert j["user"]["email"] == ADMIN["email"]

    def test_login_seller(self):
        r = requests.post(f"{API}/auth/login", json=SELLER, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "SELLER"

    def test_login_buyer(self):
        r = requests.post(f"{API}/auth/login", json=BUYER, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "BUYER"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": BUYER["email"], "password": "wrong-pass"}, timeout=TIMEOUT)
        assert r.status_code == 401

    def test_me_returns_current_user(self, buyer_token):
        r = requests.get(f"{API}/auth/me", headers=_h(buyer_token), timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["email"] == BUYER["email"]

    def test_register_buyer_and_seller(self):
        suffix = uuid.uuid4().hex[:8]
        # BUYER
        p1 = {"name": "Test Buyer", "email": f"TEST_buyer_{suffix}@stolebooks.in", "password": "TestPass123!", "role": "BUYER"}
        r1 = requests.post(f"{API}/auth/register", json=p1, timeout=TIMEOUT)
        assert r1.status_code == 200, r1.text
        j1 = r1.json()
        assert "token" in j1 and j1["user"]["role"] == "BUYER"
        # SELLER with store_name
        p2 = {"name": "Test Seller", "email": f"TEST_seller_{suffix}@stolebooks.in", "password": "TestPass123!", "role": "SELLER", "store_name": "Test Store"}
        r2 = requests.post(f"{API}/auth/register", json=p2, timeout=TIMEOUT)
        assert r2.status_code == 200, r2.text
        j2 = r2.json()
        assert j2["user"]["role"] == "SELLER"
        assert j2["user"]["seller_status"] == "PENDING"


# ------------- 3. Forgot/Reset password -------------
class TestForgotReset:
    def test_forgot_reset_cycle(self):
        # request token
        r = requests.post(f"{API}/auth/forgot-password", json={"email": BUYER["email"]}, timeout=TIMEOUT)
        assert r.status_code == 200
        token = r.json().get("token")
        assert token, f"Expected reset token in preview response, got: {r.json()}"

        # reset to a new pwd
        new_pwd = "TempReset123!"
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pwd}, timeout=TIMEOUT)
        assert r2.status_code == 200

        # login with new pwd works
        r3 = requests.post(f"{API}/auth/login", json={"email": BUYER["email"], "password": new_pwd}, timeout=TIMEOUT)
        assert r3.status_code == 200

        # reset back to original
        r4 = requests.post(f"{API}/auth/forgot-password", json={"email": BUYER["email"]}, timeout=TIMEOUT)
        tok2 = r4.json()["token"]
        r5 = requests.post(f"{API}/auth/reset-password", json={"token": tok2, "password": BUYER["password"]}, timeout=TIMEOUT)
        assert r5.status_code == 200
        # confirm original works again
        r6 = requests.post(f"{API}/auth/login", json=BUYER, timeout=TIMEOUT)
        assert r6.status_code == 200


# ------------- 4. Books CRUD (seller) -------------
class TestBooksCRUD:
    _bid = None  # cross-test

    def test_seller_create_book(self, seller_token):
        payload = {
            "title": f"TEST Book {uuid.uuid4().hex[:6]}",
            "author": "Test Author",
            "subject": "Test Subject",
            "condition": "Good",
            "price": 250,
            "images": ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"],
            "status": "ACTIVE",
            "description": "Test description",
        }
        r = requests.post(f"{API}/books", headers=_h(seller_token), json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["title"] == payload["title"]
        assert b["price"] == 250
        assert b["seller_id"]
        TestBooksCRUD._bid = b["id"]

    def test_seller_list_own_books(self, seller_token):
        r = requests.get(f"{API}/seller/books", headers=_h(seller_token), timeout=TIMEOUT)
        assert r.status_code == 200
        ids = [b["id"] for b in r.json()]
        assert TestBooksCRUD._bid in ids

    def test_public_list_contains_new_book(self):
        r = requests.get(f"{API}/books", timeout=TIMEOUT)
        assert r.status_code == 200
        ids = [b["id"] for b in r.json()]
        assert TestBooksCRUD._bid in ids

    def test_update_book(self, seller_token):
        r = requests.put(f"{API}/books/{TestBooksCRUD._bid}", headers=_h(seller_token), json={"price": 199}, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["price"] == 199
        # verify via GET
        g = requests.get(f"{API}/books/{TestBooksCRUD._bid}", timeout=TIMEOUT)
        assert g.status_code == 200
        assert g.json()["price"] == 199

    def test_delete_book(self, seller_token):
        r = requests.delete(f"{API}/books/{TestBooksCRUD._bid}", headers=_h(seller_token), timeout=TIMEOUT)
        assert r.status_code == 200
        g = requests.get(f"{API}/books/{TestBooksCRUD._bid}", timeout=TIMEOUT)
        assert g.status_code == 404


# ------------- 5. AI suggest -------------
class TestAISuggest:
    def test_ai_suggest_returns_valid_keys(self, buyer_token):
        payload = {
            "title": "Engineering Mathematics Vol. 1",
            "author": "B.S. Grewal",
            "subject": "Engineering",
            "edition": "44th",
            "condition": "Good",
            "original_price": 800,
        }
        r = requests.post(f"{API}/ai/suggest", headers=_h(buyer_token), json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        required = {"recommended_price", "condition_score", "demand_score", "seo_title", "seo_description", "category", "estimated_days"}
        assert required.issubset(data.keys()), f"Missing keys: {required - set(data.keys())}"
        assert isinstance(data["recommended_price"], (int, float)) and data["recommended_price"] > 0


# ------------- 6. Cart -------------
@pytest.fixture(scope="session")
def a_book_id():
    """Pick a stable seeded ACTIVE book (avoid TEST_ books created by concurrent workers)."""
    r = requests.get(f"{API}/books", timeout=TIMEOUT)
    for b in r.json():
        if not b["title"].startswith("TEST") and b.get("status") == "ACTIVE":
            return b["id"]
    # fallback
    return r.json()[-1]["id"]


class TestCart:
    def test_add_and_get_cart(self, buyer_token, a_book_id):
        # clear first by removing (idempotent)
        requests.post(f"{API}/cart/remove", headers=_h(buyer_token), json={"book_id": a_book_id, "qty": 1}, timeout=TIMEOUT)
        r = requests.post(f"{API}/cart/add", headers=_h(buyer_token), json={"book_id": a_book_id, "qty": 1}, timeout=TIMEOUT)
        assert r.status_code == 200
        g = requests.get(f"{API}/cart", headers=_h(buyer_token), timeout=TIMEOUT)
        assert g.status_code == 200
        j = g.json()
        assert j["total"] > 0
        assert any(it["book"]["id"] == a_book_id for it in j["items"])

    def test_remove_cart(self, buyer_token, a_book_id):
        r = requests.post(f"{API}/cart/remove", headers=_h(buyer_token), json={"book_id": a_book_id, "qty": 1}, timeout=TIMEOUT)
        assert r.status_code == 200
        g = requests.get(f"{API}/cart", headers=_h(buyer_token), timeout=TIMEOUT)
        assert all(it["book"]["id"] != a_book_id for it in g.json()["items"])


# ------------- 7. Wishlist -------------
class TestWishlist:
    def test_toggle_and_list(self, buyer_token, a_book_id):
        # toggle ON
        r = requests.post(f"{API}/wishlist/toggle", headers=_h(buyer_token), json={"book_id": a_book_id}, timeout=TIMEOUT)
        assert r.status_code == 200
        was_added = r.json()["in_wishlist"]
        g = requests.get(f"{API}/wishlist", headers=_h(buyer_token), timeout=TIMEOUT)
        assert g.status_code == 200
        ids = [b["id"] for b in g.json()]
        if was_added:
            assert a_book_id in ids
        # toggle OFF (cleanup)
        requests.post(f"{API}/wishlist/toggle", headers=_h(buyer_token), json={"book_id": a_book_id}, timeout=TIMEOUT)


# ------------- 8. Checkout & Razorpay -------------
# Dedicated buyer for checkout tests to avoid cart races with parallel TestCart worker
@pytest.fixture(scope="class")
def isolated_buyer_token():
    suffix = uuid.uuid4().hex[:8]
    payload = {"name": "Checkout Buyer", "email": f"TEST_co_{suffix}@stolebooks.in", "password": "TestPass123!", "role": "BUYER"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="class")
def checkout_state():
    return {"cod_order_id": None, "rzp_order_id": None, "rzp_provider_order_id": None}


class TestCheckout:
    ADDR = {
        "name": "Test Buyer", "phone": "9999999999", "email": "buyer@stolebooks.in",
        "line1": "1 Main St", "city": "Chennai", "state": "TN", "pincode": "600001",
    }

    def test_checkout_razorpay(self, isolated_buyer_token, a_book_id, checkout_state):
        requests.post(f"{API}/cart/add", headers=_h(isolated_buyer_token), json={"book_id": a_book_id, "qty": 1}, timeout=TIMEOUT)
        payload = {"address": self.ADDR, "payment_method": "RAZORPAY"}
        r = requests.post(f"{API}/checkout", headers=_h(isolated_buyer_token), json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("razorpay_order_id"), f"Missing razorpay_order_id: {j}"
        assert j["total"] > 0
        checkout_state["rzp_order_id"] = j["order_id"]
        checkout_state["rzp_provider_order_id"] = j["razorpay_order_id"]

    def test_payments_verify_invalid_signature(self, isolated_buyer_token, checkout_state):
        oid = checkout_state.get("rzp_order_id")
        rzp_oid = checkout_state.get("rzp_provider_order_id")
        assert oid and rzp_oid
        payload = {"order_id": oid, "razorpay_order_id": rzp_oid, "razorpay_payment_id": "pay_TESTFAKE", "razorpay_signature": "INVALID_SIG_ABC"}
        r = requests.post(f"{API}/payments/verify", headers=_h(isolated_buyer_token), json=payload, timeout=TIMEOUT)
        assert r.status_code == 400, f"Expected 400 for invalid sig, got {r.status_code} {r.text}"

    def test_checkout_cod(self, isolated_buyer_token, a_book_id, checkout_state):
        requests.post(f"{API}/cart/add", headers=_h(isolated_buyer_token), json={"book_id": a_book_id, "qty": 1}, timeout=TIMEOUT)
        payload = {"address": self.ADDR, "payment_method": "COD"}
        r = requests.post(f"{API}/checkout", headers=_h(isolated_buyer_token), json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("razorpay_order_id") is None
        assert j["order_id"]
        checkout_state["cod_order_id"] = j["order_id"]

        # cart should be cleared
        g = requests.get(f"{API}/cart", headers=_h(isolated_buyer_token), timeout=TIMEOUT)
        assert len(g.json()["items"]) == 0


# ------------- 9. Orders -------------
class TestOrders:
    def test_list_orders(self, buyer_token):
        r = requests.get(f"{API}/orders", headers=_h(buyer_token), timeout=TIMEOUT)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_order_detail_and_cancel_and_invoice(self, isolated_buyer_token, seller_token):
        # Fully isolated: seller creates a fresh book, isolated buyer adds & checks out COD
        book_payload = {
            "title": f"TEST OrderBook {uuid.uuid4().hex[:6]}",
            "author": "Test", "subject": "Test", "condition": "Good", "price": 300,
            "images": ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"],
            "status": "ACTIVE", "description": "For order test",
        }
        cr = requests.post(f"{API}/books", headers=_h(seller_token), json=book_payload, timeout=TIMEOUT)
        assert cr.status_code == 200, cr.text
        bid = cr.json()["id"]

        addr = TestCheckout.ADDR
        requests.post(f"{API}/cart/add", headers=_h(isolated_buyer_token), json={"book_id": bid, "qty": 1}, timeout=TIMEOUT)
        r = requests.post(f"{API}/checkout", headers=_h(isolated_buyer_token), json={"address": addr, "payment_method": "COD"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        oid = r.json()["order_id"]
        total = r.json()["total"]

        # detail
        g = requests.get(f"{API}/orders/{oid}", headers=_h(isolated_buyer_token), timeout=TIMEOUT)
        assert g.status_code == 200
        assert g.json()["id"] == oid

        # invoice HTML
        inv = requests.get(f"{API}/orders/{oid}/invoice", headers=_h(isolated_buyer_token), timeout=TIMEOUT)
        assert inv.status_code == 200
        assert "text/html" in inv.headers.get("content-type", "")
        assert oid[:8] in inv.text
        assert str(total) in inv.text

        # cancel
        c = requests.post(f"{API}/orders/{oid}/cancel", headers=_h(isolated_buyer_token), timeout=TIMEOUT)
        assert c.status_code == 200
        # verify cancellation
        g2 = requests.get(f"{API}/orders/{oid}", headers=_h(isolated_buyer_token), timeout=TIMEOUT)
        assert g2.json()["status"] == "CANCELLED"
        # book should be ACTIVE again after cancel
        b = requests.get(f"{API}/books/{bid}", timeout=TIMEOUT)
        assert b.status_code == 200
        assert b.json()["status"] == "ACTIVE"
        # cleanup
        requests.delete(f"{API}/books/{bid}", headers=_h(seller_token), timeout=TIMEOUT)


# ------------- 10. Admin -------------
class TestAdmin:
    def test_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        j = r.json()
        for k in ("users", "books", "orders", "universities"):
            assert k in j

    def test_users_list(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 3

    def test_books_list(self, admin_token):
        r = requests.get(f"{API}/admin/books", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_orders_list(self, admin_token):
        r = requests.get(f"{API}/admin/orders", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200

    def test_coupons_crud(self, admin_token):
        code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        c = requests.post(f"{API}/admin/coupons", headers=_h(admin_token), json={"code": code, "type": "FLAT", "value": 25, "min_order": 100}, timeout=TIMEOUT)
        assert c.status_code == 200, c.text
        cid = c.json()["id"]

        listed = requests.get(f"{API}/admin/coupons", headers=_h(admin_token), timeout=TIMEOUT)
        assert listed.status_code == 200
        assert any(x["code"] == code.upper() for x in listed.json())

        d = requests.delete(f"{API}/admin/coupons/{cid}", headers=_h(admin_token), timeout=TIMEOUT)
        assert d.status_code == 200

    def test_announcements_crud(self, admin_token):
        title = f"TEST Announcement {uuid.uuid4().hex[:6]}"
        c = requests.post(f"{API}/admin/announcements", headers=_h(admin_token), json={"title": title, "body": "hello"}, timeout=TIMEOUT)
        assert c.status_code == 200
        aid = c.json()["id"]

        pub = requests.get(f"{API}/announcements", timeout=TIMEOUT)
        assert pub.status_code == 200
        assert any(a["title"] == title for a in pub.json())

        d = requests.delete(f"{API}/admin/announcements/{aid}", headers=_h(admin_token), timeout=TIMEOUT)
        assert d.status_code == 200

    def test_complaints_from_contact(self, admin_token):
        msg = f"TEST complaint {uuid.uuid4().hex[:6]}"
        # public contact endpoint
        r = requests.post(f"{API}/contact", json={"name": "Q", "email": "q@x.in", "message": msg}, timeout=TIMEOUT)
        assert r.status_code == 200
        # admin list
        c = requests.get(f"{API}/admin/complaints", headers=_h(admin_token), timeout=TIMEOUT)
        assert c.status_code == 200
        assert any(m.get("message") == msg for m in c.json())


# ------------- 11. Cloudinary sign -------------
class TestCloudinary:
    def test_sign(self, buyer_token):
        r = requests.post(f"{API}/cloudinary/sign", headers=_h(buyer_token), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("timestamp", "signature", "folder", "cloud_name", "api_key"):
            assert k in j and j[k]
