"""SMTP email helper — sends transactional emails via SMTP with StoleBooks branding.

Uses aiosmtplib (async) so it does not block the FastAPI event loop.
Fails soft: any SMTP error is logged, endpoints continue to work.
"""
from __future__ import annotations

import logging
import os
import ssl
from email.message import EmailMessage
from typing import Optional

import aiosmtplib
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

log = logging.getLogger("stolebooks.email")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or 587)
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER or "no-reply@stolebooks.in")
EMAIL_ENABLED = os.environ.get("EMAIL_ENABLED", "false").lower() == "true"


def _base_layout(title: str, body_html: str) -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title></head>
<body style="margin:0;background:#F7F7FB;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#161226">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:32px;overflow:hidden;box-shadow:0 16px 36px rgba(18,23,39,0.06)">
    <div style="background:linear-gradient(135deg,#35164F,#5A2C81 50%,#7E4CB0);padding:32px 40px;color:#fff">
      <p style="margin:0;letter-spacing:.22em;font-weight:900;font-size:18px">STOLEBOOKS</p>
      <p style="margin:4px 0 0;font-size:11px;letter-spacing:.24em;text-transform:uppercase;opacity:.75">Academic Marketplace</p>
    </div>
    <div style="padding:40px">
      <h1 style="margin:0 0 16px;color:#161226;font-size:24px;line-height:1.3">{title}</h1>
      {body_html}
      <p style="margin-top:32px;color:#64748b;font-size:12px;line-height:1.6">You received this email because an account with this address exists at StoleBooks. If this wasn't you, please ignore this message.</p>
    </div>
    <div style="background:#F3ECFC;padding:24px 40px;text-align:center;color:#5A2C81;font-size:12px">
      © StoleBooks · Made for students, by students
    </div>
  </div>
</body></html>"""


async def send_email(to: str, subject: str, html: str, plain: Optional[str] = None) -> bool:
    """Send an email. Returns True on success, False on failure (never raises)."""
    if not EMAIL_ENABLED or not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        log.info("Email disabled or SMTP not configured; skipping send to %s (subject=%r)", to, subject)
        return False
    # Determine envelope sender (bare address without display name)
    from email.utils import parseaddr, formataddr
    display, addr = parseaddr(SMTP_FROM or SMTP_USER)
    envelope_from = addr or SMTP_USER
    header_from = formataddr((display or "StoleBooks", envelope_from))

    msg = EmailMessage()
    msg["From"] = header_from
    msg["To"] = to
    msg["Subject"] = subject
    msg["Reply-To"] = envelope_from
    if plain:
        msg.set_content(plain)
    else:
        msg.set_content("Please view this email in an HTML-capable client.")
    msg.add_alternative(html, subtype="html")
    try:
        use_tls = SMTP_PORT == 465
        start_tls = SMTP_PORT == 587
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASS,
            use_tls=use_tls,
            start_tls=start_tls,
            tls_context=ssl.create_default_context() if (use_tls or start_tls) else None,
            sender=envelope_from,
            recipients=[to],
            timeout=20,
        )
        log.info("Email sent to %s subject=%r", to, subject)
        return True
    except Exception as e:
        log.error("SMTP send failed to %s: %s", to, e)
        return False


async def verify_connection() -> bool:
    if not EMAIL_ENABLED or not SMTP_HOST:
        return False
    try:
        client = aiosmtplib.SMTP(hostname=SMTP_HOST, port=SMTP_PORT, timeout=10, start_tls=(SMTP_PORT == 587), use_tls=(SMTP_PORT == 465))
        await client.connect()
        await client.login(SMTP_USER, SMTP_PASS)
        await client.quit()
        log.info("SMTP connection verified: %s:%s", SMTP_HOST, SMTP_PORT)
        return True
    except Exception as e:
        log.warning("SMTP verify failed: %s", e)
        return False


# ---------- Templates ----------
def welcome_email(name: str, frontend_url: str) -> tuple[str, str]:
    subject = "Welcome to StoleBooks — start reading, sharing, saving 📚"
    body = f"""
    <p style="font-size:15px;line-height:1.7">Hi <strong>{name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7">Welcome to <strong>StoleBooks</strong> — a student-first marketplace where books get a second life. Buy, sell, and exchange affordable academic books with verified students across India.</p>
    <p style="margin:24px 0"><a href="{frontend_url}/browse" style="display:inline-block;background:#5A2C81;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Explore Books →</a></p>
    <p style="font-size:14px;line-height:1.7;color:#64748b">Read more. Waste less. Share stories.</p>
    """
    return subject, _base_layout("Welcome to StoleBooks", body)


def password_reset_email(name: str, reset_link: str) -> tuple[str, str]:
    subject = "Reset your StoleBooks password"
    body = f"""
    <p style="font-size:15px;line-height:1.7">Hi <strong>{name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7">We received a request to reset your StoleBooks password. Click the button below to choose a new one. This link is valid for <strong>30 minutes</strong>.</p>
    <p style="margin:24px 0"><a href="{reset_link}" style="display:inline-block;background:#5A2C81;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Reset Password</a></p>
    <p style="font-size:13px;line-height:1.7;color:#64748b">Or paste this URL into your browser:<br><span style="word-break:break-all">{reset_link}</span></p>
    <p style="font-size:13px;line-height:1.7;color:#64748b">If you didn't request a reset, you can safely ignore this email.</p>
    """
    return subject, _base_layout("Reset your password", body)


def password_reset_confirmation(name: str) -> tuple[str, str]:
    subject = "Your StoleBooks password was changed"
    body = f"""
    <p style="font-size:15px;line-height:1.7">Hi <strong>{name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7">Your StoleBooks password was updated successfully. If this was you — you're all set!</p>
    <p style="font-size:14px;line-height:1.7;color:#64748b">If you didn't make this change, please contact support immediately.</p>
    """
    return subject, _base_layout("Password updated", body)


def email_verification(name: str, verify_link: str) -> tuple[str, str]:
    subject = "Verify your StoleBooks email"
    body = f"""
    <p style="font-size:15px;line-height:1.7">Hi <strong>{name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7">Thanks for signing up! Please confirm your email address to unlock the full StoleBooks experience.</p>
    <p style="margin:24px 0"><a href="{verify_link}" style="display:inline-block;background:#5A2C81;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Verify email</a></p>
    <p style="font-size:13px;line-height:1.7;color:#64748b">This link expires in 24 hours.</p>
    """
    return subject, _base_layout("Verify your email", body)


def order_confirmation(name: str, order: dict, frontend_url: str) -> tuple[str, str]:
    rows = "".join(
        f'<tr><td style="padding:10px;border-bottom:1px solid #eee">{it["title"]}</td>'
        f'<td style="padding:10px;border-bottom:1px solid #eee;text-align:center">{it["qty"]}</td>'
        f'<td style="padding:10px;border-bottom:1px solid #eee;text-align:right">₹{it["price"] * it["qty"]}</td></tr>'
        for it in order["items"]
    )
    subject = f"Order confirmed · #{order['id'][:8]}"
    body = f"""
    <p style="font-size:15px;line-height:1.7">Hi <strong>{name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7">Thanks for your order! We've received your payment and your books are being prepared for dispatch.</p>
    <div style="border:1px solid #eee;border-radius:16px;overflow:hidden;margin-top:20px">
      <div style="background:#F3ECFC;padding:16px;color:#5A2C81;font-weight:700">Order #{order['id'][:8]}</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
        <th style="text-align:left;padding:10px;background:#fafafa">Item</th>
        <th style="text-align:center;padding:10px;background:#fafafa">Qty</th>
        <th style="text-align:right;padding:10px;background:#fafafa">Amount</th>
      </tr></thead><tbody>{rows}</tbody></table>
      <div style="padding:16px;text-align:right">
        <p style="margin:0;color:#64748b;font-size:13px">Shipping: ₹{order.get('shipping', 0)}</p>
        <p style="margin:8px 0 0;color:#5A2C81;font-size:20px;font-weight:900">Total: ₹{order['total']}</p>
      </div>
    </div>
    <p style="margin:24px 0"><a href="{frontend_url}/buyer" style="display:inline-block;background:#5A2C81;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Track your order →</a></p>
    """
    return subject, _base_layout(f"Order confirmed · #{order['id'][:8]}", body)


def order_shipped(name: str, order: dict, awb: str, tracking_url: str) -> tuple[str, str]:
    subject = f"Your StoleBooks order is on the way · #{order['id'][:8]}"
    body = f"""
    <p style="font-size:15px;line-height:1.7">Hi <strong>{name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7">Great news — your order has been shipped! You can track your parcel using the tracking number below.</p>
    <div style="background:#F3ECFC;border-radius:16px;padding:20px;margin:20px 0">
      <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.16em">AWB / Tracking</p>
      <p style="margin:8px 0 0;color:#5A2C81;font-weight:900;font-size:20px">{awb}</p>
    </div>
    <p style="margin:24px 0"><a href="{tracking_url}" style="display:inline-block;background:#5A2C81;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Track shipment →</a></p>
    <p style="font-size:14px;color:#64748b;line-height:1.7">Estimated delivery: 5–10 business days.</p>
    """
    return subject, _base_layout("Your order is on the way", body)
