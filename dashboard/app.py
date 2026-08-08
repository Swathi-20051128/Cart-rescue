"""
CartGuard AI - Streamlit Dashboard
Real-time monitoring dashboard with live sessions, metrics, and audit log.
"""
import streamlit as st
import requests
import json
import time
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import sys
import os

# ── Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="CartGuard AI Dashboard",
    page_icon="🛒",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")

# ── Custom CSS (aligned to test.html light-mode design) ─────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    /* Global Light Theme Override */
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
    }
    
    .stApp, [data-testid="stAppViewContainer"], [data-testid="stHeader"], .main {
        background-color: #f8fafc !important;
        color: #0b2e59 !important;
    }
    
    .main .block-container {
        background: #f8fafc !important;
        padding-top: 1.5rem !important;
        padding-bottom: 3rem !important;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
        color: #0b2e59 !important;
        font-weight: 800 !important;
        letter-spacing: -0.3px !important;
    }

    /* Stat card metrics */
    [data-testid="stMetricValue"] {
        font-family: 'JetBrains Mono', monospace !important;
        font-weight: 800 !important;
        color: #0b2e59 !important;
    }
    [data-testid="stMetricLabel"] {
        font-size: 0.8rem !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        color: #475569 !important;
    }
    [data-testid="stMetricDelta"] { font-size: 0.78rem !important; }

    /* Metric containers — modern card design */
    [data-testid="metric-container"] {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 12px !important;
        padding: 16px 20px !important;
        box-shadow: 0 4px 12px rgba(11, 46, 89, 0.05) !important;
    }

    /* Expanders & Cards */
    [data-testid="stExpander"] {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 12px !important;
        box-shadow: 0 2px 8px rgba(11, 46, 89, 0.04) !important;
        margin-bottom: 12px !important;
    }
    [data-testid="stExpander"] summary span {
        color: #0b2e59 !important;
        font-weight: 700 !important;
    }

    /* Form Container */
    [data-testid="stForm"] {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 14px !important;
        padding: 24px !important;
        box-shadow: 0 4px 16px rgba(11, 46, 89, 0.06) !important;
    }

    /* Inputs, Selectboxes & Text Area */
    div[data-baseweb="input"] input, div[data-baseweb="select"] > div {
        background-color: #ffffff !important;
        color: #0b2e59 !important;
        border-radius: 8px !important;
        border: 1px solid #cbd5e1 !important;
    }
    div[data-baseweb="input"] input:focus {
        border-color: #0b2e59 !important;
        box-shadow: 0 0 0 2px rgba(11, 46, 89, 0.15) !important;
    }

    /* Primary & Action Buttons */
    .stButton > button, div[data-testid="stFormSubmitButton"] > button {
        background: linear-gradient(135deg, #0b2e59 0%, #1e3a5a 100%) !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 10px !important;
        padding: 10px 24px !important;
        font-weight: 700 !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        box-shadow: 0 4px 12px rgba(11, 46, 89, 0.18) !important;
        transition: all 0.2s ease !important;
    }
    .stButton > button:hover, div[data-testid="stFormSubmitButton"] > button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 18px rgba(11, 46, 89, 0.28) !important;
    }

    /* Radio buttons & Checkboxes */
    div[role="radiogroup"] label, [data-testid="stCheckbox"] label {
        color: #0b2e59 !important;
        font-weight: 600 !important;
    }

    /* Code backtick badges */
    code, pre {
        background-color: #e2e8f0 !important;
        color: #0b2e59 !important;
        font-weight: 700 !important;
        font-family: 'JetBrains Mono', monospace !important;
        border-radius: 6px !important;
        padding: 2px 8px !important;
    }

    /* Slider track & thumb styling for clean visibility */
    div[data-baseweb="slider"] div[role="slider"] {
        background-color: #0b2e59 !important;
        border-color: #0b2e59 !important;
    }
    div[data-baseweb="slider"] div {
        color: #0b2e59 !important;
        font-weight: 700 !important;
    }

    /* Plotly SVG text override for high contrast */
    .js-plotly-plot .plotly text, .js-plotly-plot .plotly .gtitle, .js-plotly-plot .plotly .xtitle, .js-plotly-plot .plotly .ytitle {
        fill: #0b2e59 !important;
        font-weight: 600 !important;
    }

    /* JSON Viewer Light Theme & High-Contrast Styling */
    [data-testid="stJson"], .react-json-view, div[data-testid="stJson"] pre {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 10px !important;
        padding: 14px !important;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.03) !important;
    }
    [data-testid="stJson"] * {
        font-family: 'JetBrains Mono', monospace !important;
    }
    .react-json-view .variable-name, .react-json-view span[style*="color"] {
        color: #0b2e59 !important;
        font-weight: 700 !important;
    }
    .react-json-view .string-value, [data-testid="stJson"] .string {
        color: #0284c7 !important;
        font-weight: 600 !important;
    }
    .react-json-view .number-value, .react-json-view .boolean-value, [data-testid="stJson"] .number, [data-testid="stJson"] .boolean {
        color: #d97706 !important;
        font-weight: 700 !important;
    }

    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #ffffff !important;
        border-right: 1px solid #cbd5e1 !important;
    }
    [data-testid="stSidebar"] * { color: #0b2e59 !important; }

    .sidebar-header {
        background: linear-gradient(135deg, #0b2e59 0%, #1e3a5a 100%);
        padding: 16px 18px;
        border-radius: 12px;
        text-align: center;
        color: #ffffff !important;
        font-weight: 800;
        font-size: 1.1rem;
        margin-bottom: 18px;
        letter-spacing: 0.3px;
        box-shadow: 0 4px 14px rgba(11, 46, 89, 0.2);
    }

    /* Dividers */
    hr { border-color: #cbd5e1 !important; }

    /* Audit & Data Tables */
    [data-testid="stDataFrame"] {
        border: 1px solid #cbd5e1 !important;
        border-radius: 10px !important;
        overflow: hidden !important;
        background: #ffffff !important;
    }
</style>
""", unsafe_allow_html=True)


# ── Helpers ───────────────────────────────────────────────────────────────────
def api_call(endpoint: str, method: str = "GET", data: dict = None):
    try:
        url = f"{API_BASE}{endpoint}"
        if method == "GET":
            r = requests.get(url, timeout=10)
        else:
            r = requests.post(url, json=data, timeout=15)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        return None


def risk_color(level: str) -> str:
    return {"HIGH": "#ff4757", "MEDIUM": "#ffa502", "LOW": "#2ed573"}.get(level, "#999")


def action_color(action: str) -> str:
    colors = {
        "DO_NOTHING": "#636e72",
        "ALTERNATE_PAYMENT_GUIDANCE": "#0984e3",
        "SOCIAL_PROOF_NUDGE": "#6c5ce7",
        "CHECKOUT_ASSISTANCE": "#00b894",
        "LIMITED_OFFER": "#e17055",
    }
    return colors.get(action, "#74b9ff")


def _interpret_signal(signal: str, value: float) -> str:
    """Interpret a 0-1 signal value as a human-readable label."""
    interpretations = {
        "hesitation_score":  ["Decisive", "Slightly hesitant", "Hesitant", "Very hesitant"],
        "price_sensitivity": ["Not price-sensitive", "Slightly price-sensitive", "Price-sensitive", "Highly price-sensitive"],
        "funnel_friction":   ["Smooth journey", "Minor friction", "Significant friction", "Severe friction"],
        "comparison_intent": ["Focused buyer", "Some comparison", "Active comparison", "Heavy comparison"],
        "urgency_score":     ["Low urgency", "Moderate urgency", "High urgency", "Very urgent"],
        "payment_risk":      ["No payment risk", "Low risk", "Medium risk", "High payment risk"],
    }
    labels = interpretations.get(signal, ["Low", "Medium", "High", "Very High"])
    idx = min(int(value * 4), 3)
    return labels[idx]


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('<div class="sidebar-header">🛒 CartGuard AI v2.0</div>', unsafe_allow_html=True)
    
    page = st.selectbox(
        "Navigation",
        ["🏠 Dashboard", "🔬 Score Session", "⚡ Batch Scoring", "🎭 Demo Scenarios", "📊 Uplift Analysis", "📋 Audit Log"],
    )
    
    st.divider()
    
    # Health check
    health = api_call("/health")
    if health:
        st.success("✅ Backend Connected")
    else:
        st.error("❌ Backend Offline")
        st.info("Start backend: `python backend/main.py`")
    
    st.divider()
    st.markdown("**Model Info**")
    st.caption("🤖 CatBoost + XGBoost + LLM")
    st.caption("⚡ Target: <300ms")
    st.caption("💰 Cost: <₹0.10/decision")
    
    auto_refresh = st.checkbox("Auto-refresh (10s)", value=False)
    if auto_refresh:
        time.sleep(10)
        st.rerun()


# ── Dashboard Page ─────────────────────────────────────────────────────────────
if "🏠 Dashboard" in page:
    st.title("🛒 CartGuard AI — Real-Time Dashboard")
    st.caption(f"Last updated: {datetime.now().strftime('%H:%M:%S')}")
    
    metrics = api_call("/api/v1/metrics")
    
    if metrics:
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.metric("Total Sessions", metrics.get("total_sessions", 0))
        with col2:
            st.metric("High Risk", metrics.get("high_risk_sessions", 0),
                      delta=f"{metrics.get('high_risk_sessions',0)/max(metrics.get('total_sessions',1),1)*100:.0f}%")
        with col3:
            st.metric("Actions Taken", metrics.get("actions_taken", 0))
        with col4:
            st.metric("DO NOTHING Rate", f"{metrics.get('do_nothing_rate', 0):.0f}%")
        with col5:
            st.metric("Avg Latency", f"{metrics.get('avg_latency_ms', 0):.0f}ms")

        st.divider()
        
        col_l, col_r = st.columns(2)
        
        with col_l:
            # Cause distribution
            cause_dist = metrics.get("cause_distribution", {})
            if cause_dist:
                fig = px.pie(
                    values=list(cause_dist.values()),
                    names=list(cause_dist.keys()),
                    title="Abandonment Root Cause Distribution",
                    color_discrete_sequence=px.colors.qualitative.Bold,
                    hole=0.4,
                )
                fig.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    font_color="#0b2e59",
                )
                st.plotly_chart(fig, use_container_width=True)
        
        with col_r:
            # Action distribution
            action_dist = metrics.get("action_distribution", {})
            if action_dist:
                fig = px.bar(
                    x=list(action_dist.values()),
                    y=list(action_dist.keys()),
                    orientation="h",
                    title="Action Distribution",
                    color=list(action_dist.keys()),
                    color_discrete_sequence=px.colors.qualitative.Pastel,
                )
                fig.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    font_color="#0b2e59",
                    showlegend=False,
                )
                st.plotly_chart(fig, use_container_width=True)

        # Financial metrics
        st.subheader("💰 Financial Impact")
        f1, f2, f3, f4 = st.columns(4)
        with f1:
            st.metric("Total Discount Spent", f"₹{metrics.get('total_discount_inr', 0):,.0f}")
        with f2:
            st.metric("Avg Discount/Action", f"₹{metrics.get('avg_discount_per_action_inr', 0):.0f}")
        with f3:
            st.metric("AI Cost/Decision", f"₹{metrics.get('cost_per_decision_inr', 0):.4f}")
        with f4:
            st.metric("Total AI Cost", f"₹{metrics.get('total_ai_cost_inr', 0):.2f}")
    else:
        st.info("📊 No metrics yet. Run the demo scenarios to populate the dashboard!")
        
        # Show architecture diagram
        st.subheader("🏗️ System Architecture")
        st.code("""
Browser SDK → WebSocket → FastAPI Orchestrator
                                    │
        ┌───────────────────────────┼────────────────────────┐
        ▼                           ▼                        ▼
Signal Agent               Risk Agent (ML)          Context Agent
(Derive micro-signals)     CatBoost+XGBoost         (LTV, Segment)
        │                           │
        └───────────────────────────┘
                        │
                        ▼
            Diagnosis Agent (LLM)
            PaymentFailure / Friction / Comparison
                        │
                        ▼
            Policy & Guardrail Agent
            Budget / Consent / Uplift
                        │
                        ▼
            Action Agent (Generative LLM)
            Personalized nudge / DO_NOTHING
                        │
                        ▼
            Self-Check Agent (Validator)
            Consistency / Budget / Margin
                        │
                        ▼
            Audit Log (SQLite → PostgreSQL)
        """, language="text")


# ── Score Session Page ─────────────────────────────────────────────────────────
elif "🔬 Score Session" in page:
    st.title("🔬 Score a Session")
    st.caption("Enter session data to get real-time abandonment risk score and recommended action.")

    with st.form("session_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Session Behavior")
            session_duration = st.slider("Session Duration (seconds)", 0, 1800, 300)
            product_views = st.slider("Product Views", 0, 50, 5)
            cart_adds = st.slider("Cart Adds", 0, 20, 2)
            cart_removes = st.slider("Cart Removes", 0, 10, 0)
            cart_value = st.number_input("Cart Value (₹)", 0.0, 50000.0, 1500.0, step=100.0)
            category_switches = st.slider("Category Switches", 0, 10, 2)
            tab_switches = st.slider("Tab Switches", 0, 20, 3)
        
        with col2:
            st.subheader("Checkout & Payment")
            checkout_steps = st.slider("Checkout Steps Completed (of 5)", 0, 5, 2)
            checkout_time = st.slider("Checkout Time (seconds)", 0, 600, 60)
            payment_attempts = st.slider("Payment Attempts", 0, 5, 0)
            payment_failures = st.slider("Payment Failures", 0, 5, 0)
            time_on_payment = st.slider("Time on Payment Page (seconds)", 0, 600, 0)
            form_errors = st.slider("Form Field Errors", 0, 10, 0)
            back_navs = st.slider("Back Navigations", 0, 10, 1)
        
        col3, col4 = st.columns(2)
        with col3:
            st.subheader("User Profile")
            is_returning = st.checkbox("Returning Visitor", value=True)
            user_segment = st.selectbox("User Segment", ["REGULAR", "PREMIUM", "BARGAIN", "NEW"])
            user_spend_month = st.number_input("Discount Spend This Month (₹)", 0.0, 500.0, 0.0)
        
        with col4:
            st.subheader("Consent")
            is_dnd = st.checkbox("DND Registered", value=False)
            email_opt = st.checkbox("Email Opt-In", value=True)
            sms_opt  = st.checkbox("SMS Opt-In", value=True)
            user_email    = st.text_input("User Email (optional)", "")
            user_mobile   = st.text_input("&#128241; Mobile Number (for SMS)", "",
                                          placeholder="+91 98765 43210",
                                          help="Used only for notification preview")
            user_whatsapp = st.text_input("&#128994; WhatsApp Number", "",
                                          placeholder="+91 98765 43210",
                                          help="Used only for notification preview")
        
        submitted = st.form_submit_button("🚀 Score Session", use_container_width=True)
    
    if submitted:
        payload = {
            "session_id": f"MANUAL_{int(time.time())}",
            "session_duration": session_duration,
            "product_views": product_views,
            "cart_adds": cart_adds,
            "cart_removes": cart_removes,
            "cart_changes": cart_adds + cart_removes,
            "cart_value": cart_value,
            "category_switches": category_switches,
            "tab_switches": tab_switches,
            "checkout_steps_completed": checkout_steps,
            "checkout_time": checkout_time,
            "payment_attempts": payment_attempts,
            "payment_failures": payment_failures,
            "time_on_payment_page": time_on_payment,
            "form_field_errors": form_errors,
            "back_navigations": back_navs,
            "is_returning_visitor": is_returning,
            "user_segment": user_segment,
            "user_discount_spend_this_month": user_spend_month,
            "is_dnd_registered": is_dnd,
            "email_opt_in": email_opt,
            "sms_opt_in": sms_opt,
            "whatsapp_opt_in": True if user_whatsapp.strip() else False,
            "user_email": user_email.strip(),
            "user_phone": user_mobile.strip() or user_whatsapp.strip(),
            "user_mobile": user_mobile.strip(),
            "user_whatsapp": user_whatsapp.strip(),
        }
        # save contact info in session_state so notification cards can use it
        st.session_state["preview_mobile"]    = user_mobile.strip()
        st.session_state["preview_whatsapp"]  = user_whatsapp.strip()
        st.session_state["preview_email"]     = user_email.strip()
        
        with st.spinner("⚡ Scoring session through AI agents..."):
            result = api_call("/api/v1/score", method="POST", data=payload)
        
        if result:
            risk_score = result.get("risk_score", 0)
            risk_level = result.get("risk_level", "LOW")
            
            # Risk gauge
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                fig = go.Figure(go.Indicator(
                    mode="gauge+number+delta",
                    value=risk_score * 100,
                    domain={"x": [0, 1], "y": [0, 1]},
                    title={"text": f"Abandonment Risk — {risk_level}", "font": {"size": 20}},
                    gauge={
                        "axis": {"range": [0, 100]},
                        "bar": {"color": risk_color(risk_level)},
                        "steps": [
                            {"range": [0, 35], "color": "#1a2a1a"},
                            {"range": [35, 55], "color": "#2a2a1a"},
                            {"range": [55, 75], "color": "#2a1a1a"},
                            {"range": [75, 100], "color": "#3a1a1a"},
                        ],
                        "threshold": {
                            "line": {"color": "#0b2e59", "width": 3},
                            "thickness": 0.75,
                            "value": risk_score * 100,
                        },
                    },
                ))
                fig.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)",
                    font_color="#0b2e59",
                    height=300,
                )
                st.plotly_chart(fig, use_container_width=True)
            
            # Diagnosis
            st.subheader("🩺 Diagnosis")
            diag = result.get("diagnosis", {})
            dcol1, dcol2 = st.columns(2)
            with dcol1:
                st.markdown(f"**Root Cause:** `{diag.get('root_cause', 'UNKNOWN')}`")
                st.markdown(f"**Confidence:** {diag.get('confidence', 0)*100:.0f}%")
            with dcol2:
                st.markdown("**Evidence:**")
                for e in diag.get("evidence", []):
                    st.markdown(f"- {e}")
            
            # Action
            action      = result.get("action", {})
            action_type = action.get("action_type", "DO_NOTHING")
            msg         = action.get("message", "")
            channel     = action.get("channel", "IN_APP")
            discount    = action.get("discount_amount", 0)

            st.subheader("&#9889; Recommended Action")
            acol1, acol2 = st.columns([1, 2])
            with acol1:
                color = action_color(action_type)
                st.markdown(
                    f'<span style="background:{color};color:white;padding:8px 18px;'
                    f'border-radius:20px;font-weight:700;font-size:14px;letter-spacing:0.3px;">'
                    f'{action_type}</span>',
                    unsafe_allow_html=True,
                )
                st.write("")
                if discount > 0:
                    st.metric("Discount Offered", f"&#8377;{discount:.0f}")
                st.caption(f"&#128226; Channel: **{channel}**")
            with acol2:
                if msg:
                    st.info(f"&#128172; {msg}")

            # ── Notification Previews ─────────────────────────────────────────
            if action_type != "DO_NOTHING" and msg:
                st.markdown("#### &#128232; Notification Previews")

                mob = st.session_state.get("preview_mobile", "")
                wa  = st.session_state.get("preview_whatsapp", "")
                em  = st.session_state.get("preview_email", "")

                def _safe(t):
                    return t.encode("utf-8", errors="replace").decode("utf-8")

                msg_s   = _safe(msg)
                msg_120 = _safe(msg[:120] + ("..." if len(msg) > 120 else ""))

                email_cta = (f'<div style="margin-top:8px;background:#EDC951;color:#0B2E59;'
                             f'display:inline-block;padding:4px 14px;border-radius:6px;'
                             f'font-weight:700;font-size:0.75rem;">Save &#8377;{discount:.0f} Now &#8594;</div>'
                             if discount > 0 else "")
                sms_disc = f" Code SAVE{int(discount)} &mdash; &#8377;{int(discount)} off!" if discount > 0 else ""
                wa_disc  = f'<br><br>&#128176; <b>&#8377;{int(discount)} off &mdash; limited time!</b>' if discount > 0 else ""

                card = ('background:#ffffff;border:1px solid #ccd6e8;border-radius:12px;'
                        'padding:16px 18px;box-shadow:0 2px 8px rgba(11,46,89,0.07);')
                to_style = 'font-size:0.72rem;color:#3a5a8a;margin-bottom:7px;'

                email_html = (
                    f'<div style="{card}">'
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
                    '<span style="font-size:1.3rem;">&#128231;</span>'
                    '<span style="font-weight:700;color:#0B2E59;font-size:0.9rem;">Email</span></div>'
                    f'<div style="{to_style}">&#128231; <b>To:</b> {em if em else "<i>no email entered</i>"}</div>'
                    '<div style="font-size:0.78rem;color:#3a5a8a;font-weight:600;margin-bottom:4px;">'
                    'Subject: Exclusive offer just for you &#127873;</div>'
                    '<div style="font-size:0.82rem;color:#1e3a5a;line-height:1.5;background:#f4f6fb;'
                    'border-left:3px solid #0B2E59;padding:8px 10px;border-radius:0 6px 6px 0;">'
                    + msg_s + '</div>' + email_cta + '</div>'
                )

                sms_html = (
                    f'<div style="{card}">'
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
                    '<span style="font-size:1.3rem;">&#128172;</span>'
                    '<span style="font-weight:700;color:#0B2E59;font-size:0.9rem;">SMS</span></div>'
                    f'<div style="{to_style}">&#128222; <b>To:</b> {mob if mob else "<i>no number entered</i>"}</div>'
                    '<div style="background:#EAFDE6;border-radius:12px 12px 12px 2px;'
                    'padding:10px 13px;font-size:0.82rem;color:#1a3a1a;line-height:1.5;">'
                    'CartGuard: ' + msg_120 + sms_disc + '</div>'
                    '<div style="font-size:0.7rem;color:#3a5a8a;margin-top:6px;">'
                    'Delivered via SMS &middot; Reply STOP to opt out</div></div>'
                )

                wa_html = (
                    f'<div style="{card}">'
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
                    '<span style="font-size:1.3rem;">&#128994;</span>'
                    '<span style="font-weight:700;color:#0B2E59;font-size:0.9rem;">WhatsApp</span></div>'
                    f'<div style="{to_style}">&#128994; <b>To:</b> {wa if wa else "<i>no number entered</i>"}</div>'
                    '<div style="background:#dcf8c6;border-radius:12px 12px 12px 2px;'
                    'padding:10px 13px;font-size:0.82rem;color:#1a3a1a;line-height:1.6;">'
                    '<b>CartGuard AI &#128722;</b><br><br>'
                    + msg_s + wa_disc + '</div>'
                    '<div style="font-size:0.7rem;color:#3a5a8a;margin-top:6px;">'
                    'Sent via WhatsApp Business API</div></div>'
                )

                nc1, nc2, nc3 = st.columns(3)
                with nc1: st.markdown(email_html, unsafe_allow_html=True)
                with nc2: st.markdown(sms_html,   unsafe_allow_html=True)
                with nc3: st.markdown(wa_html,    unsafe_allow_html=True)

                # Live dispatch status banner
                notif_res = result.get("notification_result", {})
                if notif_res:
                    n_status = notif_res.get("status")
                    n_chan   = notif_res.get("channel", "").upper()
                    if n_status == "sent":
                        n_sid = notif_res.get("sid", "OK")
                        st.success(f"🟢 **Live {n_chan} Delivered!** (Twilio SID: `{n_sid}`)")
                    elif n_status == "error":
                        n_err = notif_res.get("error", "Unknown error")
                        st.warning(f"⚠️ **Live {n_chan} Dispatch Status**: {n_err}")
                    elif n_status == "mock_sent":
                        st.info(f"ℹ️ **{n_chan} Mock Dispatch**: Add live keys to `.env` to enable real phone delivery.")
            
            # Self-check
            self_check = result.get("self_check", {})
            if self_check.get("status") == "PASSED":
                st.success("✅ Self-Check: PASSED — All guardrails satisfied")
            else:
                st.error(f"❌ Self-Check: FAILED — Action overridden to DO_NOTHING")
            
            # Signals
            with st.expander("📊 Behavioral Signals"):
                signals = result.get("signals", {})
                sig_df = pd.DataFrame([
                    {"Signal": k, "Value": v, "Interpretation": _interpret_signal(k, v)}
                    for k, v in signals.items()
                ])
                st.dataframe(sig_df, use_container_width=True)
            
            # Metrics
            with st.expander("⏱️ Performance Metrics"):
                metrics_data = result.get("metrics", {})
                mcol1, mcol2, mcol3 = st.columns(3)
                mcol1.metric("Total Latency", f"{metrics_data.get('total_latency_ms', 0):.0f}ms")
                mcol2.metric("AI Cost", f"₹{metrics_data.get('total_cost_inr', 0):.4f}")
                
                agent_latencies = metrics_data.get("agent_latencies", {})
                if agent_latencies:
                    fig = px.bar(
                        x=list(agent_latencies.keys()),
                        y=list(agent_latencies.values()),
                        title="Agent Latency Breakdown",
                        labels={"x": "Agent", "y": "Latency (ms)"},
                        color=list(agent_latencies.values()),
                        color_continuous_scale="viridis",
                    )
                    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", font_color="#0b2e59")
                    st.plotly_chart(fig, use_container_width=True)
            
            # Full JSON
            with st.expander("🔍 Full Result JSON"):
                st.json(result)
        else:
            st.error("Failed to score session. Is the backend running?")


# ── Batch Scoring Page ────────────────────────────────────────────────────────
elif "⚡ Batch Scoring" in page:
    st.title("⚡ Batch Session Scoring")
    st.caption("Score multiple sessions in parallel via `POST /api/v1/score/batch`.")

    mode = st.radio("Select Batch Source", ["🎭 6 PRD Demo Scenarios Batch", "🎲 Generate Random Sessions Batch"], horizontal=True)

    if "6 PRD" in mode:
        scenarios_data = api_call("/api/v1/demo/scenarios")
        if scenarios_data and "scenarios" in scenarios_data:
            sessions_list = [s["session_data"] for s in scenarios_data["scenarios"]]
            st.info(f"Loaded {len(sessions_list)} pre-configured demo scenarios for parallel batch execution.")
        else:
            sessions_list = [
                {"session_id": "BATCH_001", "cart_value": 3500, "payment_attempts": 2, "payment_failures": 1, "session_duration": 240},
                {"session_id": "BATCH_002", "cart_value": 1200, "product_views": 12, "tab_switches": 8, "session_duration": 480},
                {"session_id": "BATCH_003", "cart_value": 800, "form_field_errors": 5, "session_duration": 360},
                {"session_id": "BATCH_004", "cart_value": 1500, "payment_attempts": 2, "payment_failures": 1, "session_duration": 300},
                {"session_id": "BATCH_005", "cart_value": 0, "product_views": 15, "session_duration": 720},
                {"session_id": "BATCH_006", "cart_value": 900, "cart_adds": 3, "cart_removes": 2, "session_duration": 180},
            ]
            st.caption("Using offline fallback session payloads.")
    else:
        batch_size = st.slider("Batch Size", 2, 26, 6)

        # ── Persona archetypes: realistic signals that trigger varied ML decisions ──
        ARCHETYPES = [
            {
                "label": "💳 Payment Failure",
                "base": {
                    "cart_value": 3800, "session_duration": 220,
                    "product_views": 4, "cart_adds": 2, "cart_removes": 0,
                    "checkout_steps_completed": 4, "checkout_time": 180,
                    "payment_attempts": 3, "payment_failures": 2,
                    "time_on_payment_page": 240, "form_field_errors": 2,
                    "back_navigations": 3, "tab_switches": 1,
                    "category_switches": 0, "cart_changes": 2,
                    "is_returning_visitor": True, "user_segment": "REGULAR",
                    "is_dnd_registered": False, "email_opt_in": True, "sms_opt_in": True,
                    "user_discount_spend_this_month": 0,
                },
            },
            {
                "label": "🔍 Comparison Shopper",
                "base": {
                    "cart_value": 1500, "session_duration": 540,
                    "product_views": 18, "cart_adds": 4, "cart_removes": 3,
                    "checkout_steps_completed": 1, "checkout_time": 20,
                    "payment_attempts": 0, "payment_failures": 0,
                    "time_on_payment_page": 0, "form_field_errors": 0,
                    "back_navigations": 6, "tab_switches": 12,
                    "category_switches": 5, "cart_changes": 7,
                    "is_returning_visitor": False, "user_segment": "BARGAIN",
                    "is_dnd_registered": False, "email_opt_in": True, "sms_opt_in": False,
                    "user_discount_spend_this_month": 0,
                },
            },
            {
                "label": "😤 Checkout Friction",
                "base": {
                    "cart_value": 2200, "session_duration": 420,
                    "product_views": 6, "cart_adds": 3, "cart_removes": 1,
                    "checkout_steps_completed": 3, "checkout_time": 300,
                    "payment_attempts": 1, "payment_failures": 0,
                    "time_on_payment_page": 0, "form_field_errors": 7,
                    "back_navigations": 5, "tab_switches": 2,
                    "category_switches": 1, "cart_changes": 4,
                    "is_returning_visitor": True, "user_segment": "REGULAR",
                    "is_dnd_registered": False, "email_opt_in": True, "sms_opt_in": True,
                    "user_discount_spend_this_month": 0,
                },
            },
            {
                "label": "💰 Price Sensitive Bargain Hunter",
                "base": {
                    "cart_value": 950, "session_duration": 680,
                    "product_views": 22, "cart_adds": 6, "cart_removes": 5,
                    "checkout_steps_completed": 2, "checkout_time": 45,
                    "payment_attempts": 0, "payment_failures": 0,
                    "time_on_payment_page": 0, "form_field_errors": 0,
                    "back_navigations": 4, "tab_switches": 9,
                    "category_switches": 4, "cart_changes": 11,
                    "is_returning_visitor": True, "user_segment": "BARGAIN",
                    "is_dnd_registered": False, "email_opt_in": True, "sms_opt_in": True,
                    "user_discount_spend_this_month": 80,
                },
            },
            {
                "label": "🛍️ High-Intent Premium",
                "base": {
                    "cart_value": 8500, "session_duration": 180,
                    "product_views": 3, "cart_adds": 1, "cart_removes": 0,
                    "checkout_steps_completed": 5, "checkout_time": 90,
                    "payment_attempts": 1, "payment_failures": 0,
                    "time_on_payment_page": 30, "form_field_errors": 0,
                    "back_navigations": 0, "tab_switches": 0,
                    "category_switches": 0, "cart_changes": 1,
                    "is_returning_visitor": True, "user_segment": "PREMIUM",
                    "is_dnd_registered": False, "email_opt_in": True, "sms_opt_in": True,
                    "user_discount_spend_this_month": 0,
                },
            },
            {
                "label": "👀 Casual Browser",
                "base": {
                    "cart_value": 400, "session_duration": 90,
                    "product_views": 8, "cart_adds": 1, "cart_removes": 1,
                    "checkout_steps_completed": 0, "checkout_time": 0,
                    "payment_attempts": 0, "payment_failures": 0,
                    "time_on_payment_page": 0, "form_field_errors": 0,
                    "back_navigations": 1, "tab_switches": 3,
                    "category_switches": 2, "cart_changes": 2,
                    "is_returning_visitor": False, "user_segment": "NEW",
                    "is_dnd_registered": False, "email_opt_in": False, "sms_opt_in": False,
                    "user_discount_spend_this_month": 0,
                },
            },
            {
                "label": "⏱️ Abandoned Checkout",
                "base": {
                    "cart_value": 2900, "session_duration": 310,
                    "product_views": 5, "cart_adds": 2, "cart_removes": 0,
                    "checkout_steps_completed": 4, "checkout_time": 250,
                    "payment_attempts": 2, "payment_failures": 1,
                    "time_on_payment_page": 180, "form_field_errors": 3,
                    "back_navigations": 4, "tab_switches": 5,
                    "category_switches": 0, "cart_changes": 2,
                    "is_returning_visitor": True, "user_segment": "REGULAR",
                    "is_dnd_registered": False, "email_opt_in": True, "sms_opt_in": True,
                    "user_discount_spend_this_month": 0,
                },
            },
            {
                "label": "🧠 Social Proof Candidate",
                "base": {
                    "cart_value": 1800, "session_duration": 480,
                    "product_views": 15, "cart_adds": 3, "cart_removes": 2,
                    "checkout_steps_completed": 2, "checkout_time": 60,
                    "payment_attempts": 0, "payment_failures": 0,
                    "time_on_payment_page": 0, "form_field_errors": 0,
                    "back_navigations": 3, "tab_switches": 8,
                    "category_switches": 3, "cart_changes": 5,
                    "is_returning_visitor": False, "user_segment": "NEW",
                    "is_dnd_registered": False, "email_opt_in": True, "sms_opt_in": True,
                    "user_discount_spend_this_month": 0,
                },
            },
        ]

        def _jitter(val, pct=0.20):
            """Add ±pct random noise to a numeric value, floor 0."""
            if not isinstance(val, (int, float)):
                return val
            noise = 1.0 + np.random.uniform(-pct, pct)
            result = val * noise
            return max(0, int(result)) if isinstance(val, int) else max(0.0, round(result, 2))

        sessions_list = []
        archetype_picks = []
        for i in range(batch_size):
            arch = ARCHETYPES[i % len(ARCHETYPES)]
            sess = {k: _jitter(v) for k, v in arch["base"].items()}
            sess["session_id"] = f"RAND_{arch['label'].split()[-1].upper()}_{i+1:03d}"
            sessions_list.append(sess)
            archetype_picks.append(arch["label"])

        preview_df = pd.DataFrame([
            {
                "Session ID": s["session_id"],
                "Persona Archetype": archetype_picks[i],
                "Cart ₹": f"₹{s['cart_value']:,.0f}",
                "Pay Failures": s["payment_failures"],
                "Tab Switches": s["tab_switches"],
                "Form Errors": s["form_field_errors"],
                "Checkout Steps": s["checkout_steps_completed"],
            }
            for i, s in enumerate(sessions_list)
        ])
        st.dataframe(preview_df, use_container_width=True, hide_index=True)
        st.caption(f"Generated **{len(sessions_list)}** sessions across {min(batch_size, len(ARCHETYPES))} persona archetypes with ±20% random noise.")

    with st.expander("🔍 Inspect Batch Request Payload"):
        st.json({"sessions": sessions_list})

    if st.button("🚀 Execute Batch Scoring", use_container_width=True):
        with st.spinner(f"⚡ Scoring {len(sessions_list)} sessions in parallel..."):
            res = api_call("/api/v1/score/batch", method="POST", data={"sessions": sessions_list})

        if res and "results" in res:
            results = res["results"]
            st.success(f"✅ Processed {res.get('total', len(results))} sessions in parallel.")

            # Summary Metrics
            col1, col2, col3, col4 = st.columns(4)
            high_risk = sum(1 for r in results if r.get("risk_level") == "HIGH")
            do_nothing = sum(1 for r in results if r.get("action", {}).get("action_type") == "DO_NOTHING")
            avg_lat = np.mean([r.get("metrics", {}).get("total_latency_ms", 0) for r in results if "metrics" in r]) if results else 0

            with col1:
                st.metric("Total Scored", len(results))
            with col2:
                st.metric("High Risk Sessions", high_risk)
            with col3:
                st.metric("DO NOTHING Rate", f"{(do_nothing / max(len(results), 1)) * 100:.0f}%")
            with col4:
                st.metric("Avg Latency", f"{avg_lat:.0f}ms")

            # Table display
            table_data = []
            for r in results:
                if "error" in r:
                    table_data.append({"Session ID": "Error", "Risk Score": "N/A", "Risk Level": "ERROR", "Root Cause": r.get("error"), "Action": "NONE", "Latency": "N/A"})
                else:
                    table_data.append({
                        "Session ID": r.get("session_id", "N/A"),
                        "Risk Score": f"{r.get('risk_score', 0):.0%}",
                        "Risk Level": r.get("risk_level", "LOW"),
                        "Root Cause": r.get("diagnosis", {}).get("root_cause", "N/A"),
                        "Action": r.get("action", {}).get("action_type", "DO_NOTHING"),
                        "Discount": f"₹{r.get('action', {}).get('discount_amount', 0):.0f}",
                        "Self Check": r.get("self_check", {}).get("status", "N/A"),
                        "Latency (ms)": f"{r.get('metrics', {}).get('total_latency_ms', 0):.0f}",
                    })

            st.subheader("📋 Batch Results Summary")
            st.dataframe(pd.DataFrame(table_data), use_container_width=True)

            with st.expander("🔍 Full Batch Response JSON"):
                st.json(res)
        else:
            st.error("Failed to execute batch scoring. Is backend running at `http://localhost:8000`?")


# ── Demo Scenarios Page ─────────────────────────────────────────────────────────
elif "🎭 Demo Scenarios" in page:
    st.title("🎭 Demo Scenarios")
    st.caption("Run pre-built scenarios from the PRD to showcase CartGuard AI capabilities.")
    
    scenarios_data = api_call("/api/v1/demo/scenarios")
    
    if not scenarios_data:
        st.error("Backend not connected. Start the backend first.")
    else:
        scenarios = scenarios_data.get("scenarios", [])
        
        for i, scenario in enumerate(scenarios):
            with st.expander(f"**{i+1}. {scenario['name'].upper().replace('_', ' ')}** — {scenario['description']}"):
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.markdown(f"**Expected Action:** `{scenario.get('expected', 'See result')}`")
                with col2:
                    if st.button(f"▶ Run Scenario", key=f"demo_{scenario['name']}"):
                        with st.spinner(f"Running {scenario['name']}..."):
                            result = api_call(f"/api/v1/demo/run/{scenario['name']}", method="POST")
                        if result:
                            st.session_state[f"demo_res_{scenario['name']}"] = result.get("result", {})

                # Always render result from session_state so it survives reruns
                res = st.session_state.get(f"demo_res_{scenario['name']}")
                if res:
                    risk   = res.get("risk_score", 0)
                    action = res.get("action", {}).get("action_type", "?")
                    diag   = res.get("diagnosis", {}).get("root_cause", "?")

                    st.success(f"✅ **Risk Score**: {risk:.0%} &nbsp;|&nbsp; **Diagnosis**: `{diag}` &nbsp;|&nbsp; **Recommended Action**: `{action}`")

                    if action == scenario.get("expected"):
                        st.success(f"🎯 **Success**: Action matches expected `{action}`")
                    else:
                        st.warning(f"⚠️ Expected `{scenario.get('expected')}` but got `{action}`")

                    if st.checkbox("🔍 Show full result JSON", key=f"json_{scenario['name']}"):
                        st.json(res)


# ── Uplift Analysis Page ──────────────────────────────────────────────────────
elif "📊 Uplift Analysis" in page:
    st.title("📊 Synthetic Uplift Analysis")
    st.caption("Prove incremental margin impact with statistical significance.")
    
    col1, col2 = st.columns(2)
    with col1:
        n_sessions = st.select_slider("Simulation Size", [1000, 5000, 10000, 50000], value=10000)
    with col2:
        if st.button("▶ Run Simulation", use_container_width=True):
            with st.spinner("Running uplift simulation..."):
                import sys
                sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
                try:
                    from services.uplift_service import uplift_simulator
                    result = uplift_simulator.simulate_ab_test(n_sessions=n_sessions)
                    st.session_state["uplift_result"] = result
                except Exception as e:
                    st.error(f"Error: {e}")
    
    if "uplift_result" in st.session_state:
        result = st.session_state["uplift_result"]
        
        cvr = result.get("conversion_rates", {})
        sig = result.get("statistical_significance", {})
        fin = result.get("financial_impact", {})
        
        # Key metrics
        st.subheader("📈 Conversion Rate Results")
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Control CVR", f"{cvr.get('control_cvr', 0):.1f}%")
        m2.metric("Treatment CVR", f"{cvr.get('treatment_cvr', 0):.1f}%",
                  delta=f"+{cvr.get('absolute_uplift_pp', 0):.1f}pp")
        m3.metric("Relative Uplift", f"{cvr.get('relative_uplift_pct', 0):.1f}%")
        m4.metric("p-value", f"{sig.get('p_value', 1):.4f}",
                  delta="Significant ✅" if sig.get("is_significant") else "Not significant ❌")
        
        # Financial impact
        st.subheader("💰 Financial Impact")
        f1, f2, f3 = st.columns(3)
        f1.metric("Incremental Margin/Session", f"₹{fin.get('incremental_margin_per_session_inr', 0):.2f}")
        f2.metric("Discount Reduction", f"{fin.get('discount_reduction_pct', 0):.0f}%")
        f3.metric("Smart vs Blanket Savings", f"₹{fin.get('discount_savings_per_session_inr', 0):.2f}")
        
        # CI visualization
        st.subheader("📊 Confidence Interval for Uplift")
        ci_low = cvr.get("ci_lower_pp", 0)
        ci_high = cvr.get("ci_upper_pp", 0)
        uplift_val = cvr.get("absolute_uplift_pp", 0)
        
        fig = go.Figure()
        fig.add_shape(type="rect", x0=ci_low, x1=ci_high, y0=0.3, y1=0.7,
                      fillcolor="rgba(102,126,234,0.3)", line_color="rgba(102,126,234,0.8)")
        fig.add_vline(x=uplift_val, line_color="#764ba2", line_width=3)
        fig.add_vline(x=0, line_color="#94a3b8", line_dash="dash")
        fig.update_layout(
            title=f"95% CI for Uplift: [{ci_low:.1f}pp, {ci_high:.1f}pp]",
            xaxis_title="Conversion Rate Uplift (percentage points)",
            paper_bgcolor="rgba(0,0,0,0)",
            font_color="#0b2e59",
            height=200,
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Action performance
        st.subheader("🎯 Action Performance")
        action_perf = result.get("action_performance", {})
        if action_perf:
            perf_df = pd.DataFrame([
                {"Action": k, "Count": v["count"], "CVR%": v["cvr"],
                 "Avg Margin ₹": v["avg_margin_inr"], "Avg Discount ₹": v["avg_discount_inr"]}
                for k, v in action_perf.items()
            ])
            st.dataframe(perf_df, use_container_width=True)


# ── Audit Log Page ─────────────────────────────────────────────────────────────
elif "📋 Audit Log" in page:
    st.title("📋 Audit Log")
    st.caption("Full decision trail with evidence chains for every session.")
    
    col1, col2 = st.columns(2)
    with col1:
        limit = st.selectbox("Show last N entries", [10, 25, 50, 100], index=1)
    with col2:
        filter_session = st.text_input("Filter by Session ID", "")
    
    # Bug fix: pass session filter to API call
    audit_endpoint = f"/api/v1/audit?limit={limit}"
    if filter_session:
        audit_endpoint += f"&session_id={filter_session}"
    logs = api_call(audit_endpoint)
    
    if logs and logs.get("logs"):
        df = pd.DataFrame(logs["logs"])
        
        display_cols = [
            "timestamp", "session_id", "risk_score", "risk_level",
            "root_cause", "action_type", "discount_amount",
            "self_check_status", "total_latency_ms", "total_cost_inr"
        ]
        available_cols = [c for c in display_cols if c in df.columns]
        
        st.dataframe(df[available_cols], use_container_width=True)
        
        # Download
        csv = df.to_csv(index=False)
        st.download_button("⬇️ Download CSV", csv, "audit_log.csv", "text/csv")
    else:
        st.info("No audit entries yet. Score some sessions to populate the log.")


# ── Signal Interpreter — moved above first use to fix NameError ──────────────
def _interpret_signal(signal: str, value: float) -> str:
    """Interpret a 0–1 signal value as a human-readable label."""
    interpretations = {
        "hesitation_score":  ["Decisive", "Slightly hesitant", "Hesitant", "Very hesitant"],
        "price_sensitivity": ["Not price-sensitive", "Slightly price-sensitive", "Price-sensitive", "Highly price-sensitive"],
        "funnel_friction":   ["Smooth journey", "Minor friction", "Significant friction", "Severe friction"],
        "comparison_intent": ["Focused buyer", "Some comparison", "Active comparison", "Heavy comparison"],
        "urgency_score":     ["Low urgency", "Moderate urgency", "High urgency", "Very urgent"],
        "payment_risk":      ["No payment risk", "Low risk", "Medium risk", "High payment risk"],
    }
    labels = interpretations.get(signal, ["Low", "Medium", "High", "Very High"])
    idx = min(int(value * 4), 3)
    return labels[idx]


if __name__ == "__main__":
    pass
