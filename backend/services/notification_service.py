"""
CartGuard AI - Notification Service
Handles email (SendGrid), SMS/WhatsApp (Twilio) notifications.
Respects TRAI/DND and consent rules.
"""
import os
import asyncio
from typing import Dict, Any, Optional
import httpx


class NotificationService:
    def __init__(self):
        self.sendgrid_key = os.getenv("SENDGRID_API_KEY", "")
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_from = os.getenv("TWILIO_FROM_NUMBER", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@cartguard.ai")

    async def send_notification(self, session_data: Dict[str, Any], action: Dict[str, Any]):
        """Send notification based on action channel and available user contacts."""
        action_type = action.get("action_type", "DO_NOTHING")
        message = action.get("message", "")
        
        if not message or action_type == "DO_NOTHING":
            print("[NOTIFICATION] Skipped: Action is DO_NOTHING or message is empty.")
            return {"status": "skipped", "reason": "no action or DO_NOTHING"}

        channel = action.get("channel", "IN_APP")
        
        user_phone = (
            session_data.get("user_phone")
            or session_data.get("user_mobile")
            or session_data.get("user_whatsapp")
            or ""
        )
        user_email = session_data.get("user_email") or ""

        # Auto-promote channel from IN_APP to WHATSAPP/SMS/EMAIL if contact info is provided
        if channel in ["IN_APP", "NONE"]:
            if session_data.get("user_whatsapp") or (user_phone and session_data.get("whatsapp_opt_in")):
                channel = "WHATSAPP"
            elif user_phone:
                channel = "SMS"
            elif user_email:
                channel = "EMAIL"

        # Consent check
        if not self._check_consent(session_data, channel):
            print(f"[NOTIFICATION SKIPPED] Consent check failed for channel={channel}")
            return {"status": "skipped", "reason": f"consent check failed for {channel}"}

        if channel == "EMAIL":
            return await self.send_email(
                to_email=user_email,
                subject="Your cart is waiting! 🛒",
                message=message,
                discount=action.get("discount_amount", 0),
            )
        elif channel in ["SMS", "WHATSAPP"]:
            return await self.send_sms(
                to_number=user_phone,
                message=message,
                channel=channel,
            )
        
        return {"status": "no_action"}

    def _check_consent(self, session_data: Dict, channel: str) -> bool:
        """TRAI/DND compliance check."""
        if session_data.get("is_dnd_registered", False) and channel == "SMS":
            return False
        if channel == "EMAIL" and not session_data.get("email_opt_in", True):
            return False
        if channel == "WHATSAPP" and session_data.get("whatsapp_opt_in") is False:
            return False
        return True

    def _format_phone(self, phone: str) -> str:
        """Format phone number into E.164 standard (e.g. +919876543210)."""
        if not phone:
            return ""
        p = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not p:
            return ""
        if not p.startswith("+"):
            if len(p) == 10:
                p = "+91" + p
            else:
                p = "+" + p
        return p

    async def send_email(
        self,
        to_email: str,
        subject: str,
        message: str,
        discount: float = 0,
    ) -> Dict[str, Any]:
        """Send cart recovery email via SendGrid."""
        if not self.sendgrid_key or not to_email:
            safe_subj = subject.encode('ascii', 'replace').decode('ascii')
            safe_msg = message.encode('ascii', 'replace').decode('ascii')
            print(f"[EMAIL MOCK] To: {to_email} | Subject: {safe_subj} | Message: {safe_msg}")
            return {"status": "mock_sent", "channel": "email"}

        discount_html = ""
        if discount > 0:
            discount_html = f'<p style="color:#e53e3e;font-weight:bold;">🎁 Save ₹{discount:.0f} with code: SAVE{int(discount)}</p>'

        html_content = f"""
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;border-radius:10px;text-align:center;color:white;">
            <h1>🛒 Your Cart is Waiting!</h1>
        </div>
        <div style="padding:20px;background:#f9f9f9;border-radius:0 0 10px 10px;">
            <p style="font-size:16px;">{message}</p>
            {discount_html}
            <a href="#" style="background:#764ba2;color:white;padding:15px 30px;border-radius:25px;text-decoration:none;display:inline-block;margin-top:20px;">
                Complete Your Purchase →
            </a>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:20px;">
            Unsubscribe | CartGuard AI
        </p>
        </body></html>
        """

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {self.sendgrid_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "personalizations": [{"to": [{"email": to_email}]}],
                        "from": {"email": self.from_email, "name": "CartGuard AI"},
                        "subject": subject,
                        "content": [{"type": "text/html", "value": html_content}],
                    },
                    timeout=10.0,
                )
                print(f"[EMAIL SENT] Status {response.status_code} to {to_email}")
                return {"status": "sent", "channel": "email", "status_code": response.status_code}
        except Exception as e:
            print(f"[EMAIL ERROR] {str(e)}")
            return {"status": "error", "error": str(e)}

    async def send_sms(
        self,
        to_number: str,
        message: str,
        channel: str = "SMS",
    ) -> Dict[str, Any]:
        """Send SMS/WhatsApp via Twilio."""
        formatted_num = self._format_phone(to_number)
        if not self.twilio_sid or not formatted_num:
            print(f"[{channel} MOCK] To: '{formatted_num}' (Twilio SID present: {bool(self.twilio_sid)}) | Message: {message}")
            return {"status": "mock_sent", "channel": channel.lower()}

        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"
            from_number = (
                f"whatsapp:{self.twilio_from}" if channel == "WHATSAPP" else self.twilio_from
            )
            to = f"whatsapp:{formatted_num}" if channel == "WHATSAPP" else formatted_num
            
            print(f"[{channel} DISPATCHING] To: {to} | From: {from_number} | Msg: {message[:50]}...")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    auth=(self.twilio_sid, self.twilio_token),
                    data={"From": from_number, "To": to, "Body": message},
                    timeout=10.0,
                )
                data = response.json()
                if response.status_code in [200, 201]:
                    print(f"[{channel} SUCCESS] SID: {data.get('sid')}")
                    return {"status": "sent", "channel": channel.lower(), "sid": data.get("sid")}
                else:
                    print(f"[{channel} TWILIO ERROR] Status {response.status_code}: {data.get('message', data)}")
                    return {"status": "error", "error": data.get("message", response.text), "code": data.get("code")}
        except Exception as e:
            print(f"[{channel} EXCEPTION] {str(e)}")
            return {"status": "error", "error": str(e)}


notification_service = NotificationService()
