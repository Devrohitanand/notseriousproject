"""Shiprocket integration — token caching, order creation, tracking, cancellation.

Env-gated: if SHIPROCKET_EMAIL/PASSWORD are not set, functions raise
ShiprocketNotConfigured which upstream endpoints handle by falling back to a
stubbed AWB so the UI keeps working.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Optional

import httpx
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

log = logging.getLogger("stolebooks.shiprocket")

SR_EMAIL = os.environ.get("SHIPROCKET_EMAIL", "")
SR_PASSWORD = os.environ.get("SHIPROCKET_PASSWORD", "")
SR_PICKUP = os.environ.get("SHIPROCKET_PICKUP_LOCATION", "Primary")
SR_BASE = "https://apiv2.shiprocket.in/v1/external"


class ShiprocketNotConfigured(Exception):
    pass


def is_enabled() -> bool:
    return bool(SR_EMAIL and SR_PASSWORD)


async def get_token(db) -> str:
    if not is_enabled():
        raise ShiprocketNotConfigured()
    doc = await db.integrations.find_one({"key": "shiprocket"})
    if doc and doc.get("expires_at", 0) > time.time() + 60:
        return doc["token"]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{SR_BASE}/auth/login", json={"email": SR_EMAIL, "password": SR_PASSWORD})
    if r.status_code != 200:
        log.error("Shiprocket auth failed: %s %s", r.status_code, r.text[:200])
        raise RuntimeError("Shiprocket auth failed")
    tok = r.json().get("token")
    # Token TTL is normally 10 days; cache for 20h to be safe
    await db.integrations.update_one({"key": "shiprocket"}, {"$set": {"token": tok, "expires_at": time.time() + 60 * 60 * 20}}, upsert=True)
    log.info("Shiprocket token refreshed")
    return tok


async def _authed(db) -> httpx.AsyncClient:
    tok = await get_token(db)
    return httpx.AsyncClient(base_url=SR_BASE, headers={"Authorization": f"Bearer {tok}"}, timeout=20)


async def create_order(db, order: dict) -> dict:
    """Push a paid order to Shiprocket. Returns dict with shipment_id, order_id, awb (if assigned)."""
    async with await _authed(db) as client:
        addr = order["address"]
        # Ensure phone is 10 digits (Shiprocket rejects otherwise)
        phone = "".join(c for c in addr.get("phone", "") if c.isdigit())[-10:] or "9999999999"
        payload = {
            "order_id": order["id"][:20],
            "order_date": order["created_at"][:10],
            "pickup_location": SR_PICKUP,
            "billing_customer_name": addr["name"][:40] or "Customer",
            "billing_last_name": ".",
            "billing_address": addr["line1"][:100] or "-",
            "billing_address_2": (addr.get("line2") or "")[:100],
            "billing_city": addr["city"][:40] or "-",
            "billing_pincode": addr["pincode"],
            "billing_state": addr["state"][:40] or "-",
            "billing_country": addr.get("country", "India"),
            "billing_email": addr["email"],
            "billing_phone": phone,
            "shipping_is_billing": True,
            "order_items": [
                {"name": it["title"][:80], "sku": it["book_id"][:20], "units": it["qty"], "selling_price": it["price"], "hsn": "4901"}
                for it in order["items"]
            ],
            "payment_method": "COD" if order.get("payment_method") == "COD" else "Prepaid",
            "sub_total": order["total"],
            "length": 22, "breadth": 16, "height": 5, "weight": max(0.4, 0.4 * sum(i["qty"] for i in order["items"])),
        }
        r = await client.post("/orders/create/adhoc", json=payload)
    if r.status_code >= 400:
        log.error("Shiprocket create failed: %s %s", r.status_code, r.text[:300])
        raise RuntimeError(f"Shiprocket create failed: {r.text[:200]}")
    data = r.json()
    return {
        "order_id": data.get("order_id"),
        "shipment_id": data.get("shipment_id"),
        "awb": data.get("awb_code"),
        "courier": data.get("courier_name"),
        "raw": data,
    }


async def track(db, awb: str) -> dict:
    async with await _authed(db) as client:
        r = await client.get(f"/courier/track/awb/{awb}")
    return r.json() if r.status_code == 200 else {"error": r.text[:200]}


async def cancel(db, shipment_ids: list) -> dict:
    async with await _authed(db) as client:
        r = await client.post("/orders/cancel", json={"ids": shipment_ids})
    return r.json() if r.status_code == 200 else {"error": r.text[:200]}


async def generate_awb(db, shipment_id: int, courier_id: Optional[int] = None) -> dict:
    """Assign an AWB after order creation. Called automatically if not returned inline."""
    async with await _authed(db) as client:
        payload = {"shipment_id": shipment_id}
        if courier_id:
            payload["courier_id"] = courier_id
        r = await client.post("/courier/assign/awb", json=payload)
    return r.json() if r.status_code == 200 else {"error": r.text[:200]}


async def generate_label(db, shipment_ids: list) -> dict:
    async with await _authed(db) as client:
        r = await client.post("/courier/generate/label", json={"shipment_id": shipment_ids})
    return r.json() if r.status_code == 200 else {"error": r.text[:200]}


async def generate_invoice(db, order_ids: list) -> dict:
    async with await _authed(db) as client:
        r = await client.post("/orders/print/invoice", json={"ids": order_ids})
    return r.json() if r.status_code == 200 else {"error": r.text[:200]}
