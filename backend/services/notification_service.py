"""
CartGuard AI - Notification Service
Handles email (SendGrid), SMS/WhatsApp (Twilio) notifications.
Respects TRAI/DND and consent rules.
"""
import os
import asyncio
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Ensure environment variables from root .env are loaded
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))


class NotificationService:
    def __init__(self):
        self.reload_config()
        self.wpp_token_cache = None

    def reload_config(self):
        """Reload configuration from environment variables."""
        self.sendgrid_key = os.getenv("SENDGRID_API_KEY", "")
        self.resend_key = os.getenv("RESEND_API_KEY", "")
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_from = os.getenv("TWILIO_FROM_NUMBER", "")
        self.from_email = "onboarding@resend.dev"

    async def send_notification(self, session_data: Dict[str, Any], action: Dict[str, Any]):
        """Send notification across all available channels concurrently."""
        action_type = action.get("action_type", "DO_NOTHING")
        message = action.get("message", "")
        
        if not message or action_type == "DO_NOTHING":
            print("[NOTIFICATION] Skipped: Action is DO_NOTHING or message is empty.")
            return {"status": "skipped", "reason": "no action or DO_NOTHING"}

        user_phone = (
            session_data.get("user_phone")
            or session_data.get("user_mobile")
            or session_data.get("user_whatsapp")
            or ""
        )
        user_email = session_data.get("user_email") or ""

        results = {}

        # 1. Email Dispatch
        if user_email and self._check_consent(session_data, "EMAIL"):
            try:
                results["email"] = await self.send_email(
                    to_email=user_email,
                    subject="Your cart is waiting! 🛒",
                    message=message,
                    discount=action.get("discount_amount", 0),
                )
            except Exception as e:
                results["email"] = {"status": "failed", "error": str(e)}

        # 2. WhatsApp/SMS Dispatch
        if user_phone:
            if self._check_consent(session_data, "WHATSAPP"):
                try:
                    results["whatsapp"] = await self.send_sms(
                        to_number=user_phone,
                        message=message,
                        channel="WHATSAPP",
                    )
                except Exception as e:
                    results["whatsapp"] = {"status": "failed", "error": str(e)}
            elif self._check_consent(session_data, "SMS"):
                try:
                    results["sms"] = await self.send_sms(
                        to_number=user_phone,
                        message=message,
                        channel="SMS",
                    )
                except Exception as e:
                    results["sms"] = {"status": "failed", "error": str(e)}

        # 3. In-App alert / Dashboard (naturally logged via audit)
        results["in_app"] = {"status": "logged", "message": message}

        return {
            "status": "dispatched",
            "channels": list(results.keys()),
            "results": results
        }

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
        """Send cart recovery email via Resend."""
        if not self.resend_key or not to_email:
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
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.resend_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": "CartGuard AI <onboarding@resend.dev>",
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                    },
                    timeout=10.0,
                )
                print(f"[EMAIL SENT] Status {response.status_code} to {to_email} | Response: {response.text}")
                return {
                    "status": "sent" if response.status_code in [200, 201] else "failed",
                    "channel": "email",
                    "status_code": response.status_code,
                    "response": response.text
                }
        except Exception as e:
            print(f"[EMAIL ERROR] {str(e)}")
            return {"status": "error", "error": str(e)}

    async def get_wpp_token(self, wpp_url: str, session: str) -> str:
        """Dynamically fetch or refresh WPPConnect JWT authorization token."""
        if self.wpp_token_cache:
            return self.wpp_token_cache

        env_token = os.getenv("WPPCONNECT_TOKEN", "")
        if env_token:
            self.wpp_token_cache = env_token
            return env_token

        secret_key = "THISISMYSECURETOKEN"
        url = f"{wpp_url.rstrip('/')}/api/{session}/{secret_key}/generate-token"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, timeout=5.0)
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    token = data.get("token")
                    if token:
                        self.wpp_token_cache = token
                        return token
        except Exception as e:
            print(f"[WPPCONNECT TOKEN EXCEPTION] Failed to generate token: {str(e)}")
        return ""

    async def send_sms(
        self,
        to_number: str,
        message: str,
        channel: str = "SMS",
    ) -> Dict[str, Any]:
        """Send SMS/WhatsApp via Twilio or WPPConnect."""
        formatted_num = self._format_phone(to_number)
        
        # ─── WPPConnect WhatsApp Integration ───
        if channel == "WHATSAPP":
            wpp_url = os.getenv("WPPCONNECT_API_URL", "")
            wpp_session = os.getenv("WPPCONNECT_SESSION", "cartguard")
            wpp_token = await self.get_wpp_token(wpp_url, wpp_session)
            
            if wpp_url and formatted_num:
                cleaned_phone = formatted_num.replace("+", "")
                url = f"{wpp_url.rstrip('/')}/api/{wpp_session}/send-message"
                headers = {"Content-Type": "application/json"}
                if wpp_token:
                    headers["Authorization"] = f"Bearer {wpp_token}"
                
                print(f"[WHATSAPP WPPCONNECT DISPATCHING] To: {cleaned_phone} via {url}")
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            url,
                            headers=headers,
                            json={"phone": cleaned_phone, "message": message},
                            timeout=5.0
                        )
                        if response.status_code in [200, 201]:
                            print(f"[WHATSAPP WPPCONNECT SUCCESS] Sent to {cleaned_phone}")
                            return {"status": "sent", "channel": "whatsapp", "provider": "wppconnect"}
                        else:
                            print(f"[WHATSAPP WPPCONNECT ERROR] Status {response.status_code}: {response.text}")
                except Exception as e:
                    print(f"[WHATSAPP WPPCONNECT EXCEPTION] {str(e)}")
                # If WPPConnect fails, fall through to Twilio/Mock

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
