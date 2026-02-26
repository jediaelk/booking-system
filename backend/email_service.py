import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
APPROVER_EMAIL = os.getenv("APPROVER_EMAIL", "jediaelk@gmail.com")


def _send(to: str, subject: str, html: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"[EMAIL SKIPPED – SMTP not configured] To: {to} | Subject: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, to, msg.as_string())
    logger.info(f"Email sent → {to}: {subject}")


def _tier_label(tier) -> str:
    return tier.value.replace("_", " ").title()


def notify_client_submitted(booking):
    subject = f"Booking Request Received — {booking.booking_date} at {booking.time_slot}"
    html = f"""
    <html><body style="font-family:sans-serif;color:#111;">
    <h2 style="border-bottom:2px solid #000;padding-bottom:8px;">Booking Request Received</h2>
    <p>Dear {booking.client_name},</p>
    <p>We've received your chauffeur booking request. It is currently <strong>pending approval</strong> and you'll hear from us shortly.</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px;">
      <tr style="background:#f8f8f8;"><td><strong>Date</strong></td><td>{booking.booking_date}</td></tr>
      <tr><td><strong>Time Slot</strong></td><td>{booking.time_slot}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Service Tier</strong></td><td>{_tier_label(booking.tier)}</td></tr>
      <tr><td><strong>Pickup</strong></td><td>{booking.pickup_location}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Dropoff</strong></td><td>{booking.dropoff_location}</td></tr>
      <tr><td><strong>Passengers</strong></td><td>{booking.passengers}</td></tr>
      {f'<tr style="background:#f8f8f8;"><td><strong>Special Requests</strong></td><td>{booking.special_requests}</td></tr>' if booking.special_requests else ''}
    </table>
    <p style="margin-top:24px;color:#555;">You will receive a confirmation email once your booking has been reviewed.</p>
    </body></html>
    """
    _send(booking.client_email, subject, html)


def notify_approver(booking):
    subject = f"[New Booking] {booking.client_name} — {_tier_label(booking.tier)} · {booking.booking_date}"
    html = f"""
    <html><body style="font-family:sans-serif;color:#111;">
    <h2 style="border-bottom:2px solid #000;padding-bottom:8px;">New Booking Request</h2>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px;">
      <tr style="background:#f8f8f8;"><td><strong>Client</strong></td><td>{booking.client_name}</td></tr>
      <tr><td><strong>Email</strong></td><td>{booking.client_email}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Phone</strong></td><td>{booking.client_phone}</td></tr>
      <tr><td><strong>Tier</strong></td><td>{_tier_label(booking.tier)}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Date</strong></td><td>{booking.booking_date}</td></tr>
      <tr><td><strong>Time Slot</strong></td><td>{booking.time_slot}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Pickup</strong></td><td>{booking.pickup_location}</td></tr>
      <tr><td><strong>Dropoff</strong></td><td>{booking.dropoff_location}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Passengers</strong></td><td>{booking.passengers}</td></tr>
      <tr><td><strong>Special Requests</strong></td><td>{booking.special_requests or '—'}</td></tr>
    </table>
    <p style="margin-top:24px;color:#555;">Log in to the dashboard to approve or reject this booking.</p>
    </body></html>
    """
    _send(APPROVER_EMAIL, subject, html)


def notify_approval(booking):
    subject = f"Your Booking is Confirmed — {booking.booking_date} at {booking.time_slot}"
    html = f"""
    <html><body style="font-family:sans-serif;color:#111;">
    <h2 style="border-bottom:2px solid #000;padding-bottom:8px;">Booking Confirmed</h2>
    <p>Dear {booking.client_name},</p>
    <p>Your chauffeur booking has been <strong>confirmed</strong>. Details below:</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px;">
      <tr style="background:#f8f8f8;"><td><strong>Date</strong></td><td>{booking.booking_date}</td></tr>
      <tr><td><strong>Time</strong></td><td>{booking.time_slot}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Service Tier</strong></td><td>{_tier_label(booking.tier)}</td></tr>
      <tr><td><strong>Pickup</strong></td><td>{booking.pickup_location}</td></tr>
      <tr style="background:#f8f8f8;"><td><strong>Dropoff</strong></td><td>{booking.dropoff_location}</td></tr>
      <tr><td><strong>Passengers</strong></td><td>{booking.passengers}</td></tr>
    </table>
    <p style="margin-top:24px;">Thank you for choosing our service. Your driver will be in touch shortly before the booking.</p>
    </body></html>
    """
    _send(booking.client_email, subject, html)


def notify_rejection(booking):
    subject = f"Booking Request Update — {booking.booking_date}"
    reason_block = f"<p><strong>Reason:</strong> {booking.rejection_reason}</p>" if booking.rejection_reason else ""
    html = f"""
    <html><body style="font-family:sans-serif;color:#111;">
    <h2 style="border-bottom:2px solid #000;padding-bottom:8px;">Booking Request Update</h2>
    <p>Dear {booking.client_name},</p>
    <p>Unfortunately we were unable to confirm your booking request for <strong>{booking.booking_date}</strong> at <strong>{booking.time_slot}</strong>.</p>
    {reason_block}
    <p>Please contact us if you have any questions or would like to rebook.</p>
    </body></html>
    """
    _send(booking.client_email, subject, html)
