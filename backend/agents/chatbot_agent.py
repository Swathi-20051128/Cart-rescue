import json
from typing import Dict, Any
from agents.orchestrator import LLMClient

class ChatbotAgent:
    def __init__(self):
        self.llm_client = LLMClient()

    CHATBOT_SYSTEM_PROMPT = """You are a helpful, friendly, and expert checkout assistance chatbot for CartGuard AI, an Indian e-commerce platform.
Your goal is to guide the user to successfully complete their purchase and resolve any friction they face.

Context:
- User Name: {user_name}
- Cart Value: ₹{cart_value}
- Cart Items: {cart_items_json}
- Payment Failures: {payment_failures}
- Form Field Errors: {form_field_errors}

Rules of Interaction:
1. Payments: If they experience payment failures or ask about payment errors, strongly recommend trying alternate payment apps (GPay, PhonePe, Paytm) or selecting Cash on Delivery (COD). Emphasize that COD guarantees order success!
2. Coupons & Discounts: If they ask for discounts, tell them to check their Notifications tab at the top of the storefront page. They can copy active coupon codes (like SAVE150) from there if any offer is triggered.
3. Product Specs: If they ask about product features, specs, warranty, or quality, refer to the specs inside the Cart Items context. Give precise details (e.g. materials, warranty, battery life).
4. Shipping: Standard shipping is free on orders above ₹1,000, taking 2-3 business days.
5. Tone: Be concise, polite, helpful, and professional.

Provide a helpful, direct response to the user's message."""

    async def get_response(self, user_message: str, context: Dict[str, Any]) -> str:
        cart_items = context.get("cart_items", [])
        cart_items_json = json.dumps(cart_items, indent=2)
        
        system_prompt = self.CHATBOT_SYSTEM_PROMPT.format(
            user_name=context.get("user_name", "Customer"),
            cart_value=context.get("cart_value", 0),
            cart_items_json=cart_items_json,
            payment_failures=context.get("payment_failures", 0),
            form_field_errors=context.get("form_field_errors", 0)
        )
        
        msg_lower = user_message.lower().strip()
        if msg_lower in ["hi", "hello", "hey", "hola"]:
            return f"Hi {context.get('user_name', 'Customer')}! I am your CartGuard checkout assistant. How can I help you complete your purchase today?"
            
        try:
            res = await self.llm_client.complete(
                prompt=user_message,
                system_prompt=system_prompt,
                model_size="small"
            )
            return res.get("text", "I'm here to help you complete your order. Try selecting Cash on Delivery or check your notifications for coupons!")
        except Exception:
            # Smart fallback rules
            if "fail" in msg_lower or "pay" in msg_lower or "card" in msg_lower or "upi" in msg_lower:
                return "I'm sorry your payment failed! Please try using another UPI app (GPay/PhonePe) or select Cash on Delivery (COD) to place your order successfully."
            elif "discount" in msg_lower or "coupon" in msg_lower or "offer" in msg_lower:
                return "You can check active discounts and coupons on the 'Notifications' tab at the top of your page. Just copy the code and apply it at checkout!"
            elif "ship" in msg_lower or "deliv" in msg_lower:
                return "We offer free standard shipping on orders above ₹1,000. Delivery usually takes 2 to 3 business days across India."
            return "I am here to assist you with checkout. Please let me know if you have any questions about payments, products, or discounts!"
