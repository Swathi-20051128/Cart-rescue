"""
CartGuard AI - FastAPI Backend
Main API server with WebSocket support for real-time session scoring.
"""
import asyncio
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.orchestrator import orchestrator
from services.audit_service import audit_service
from services.notification_service import notification_service
from config.settings import settings


# ──────────────────────────── Lifespan ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("🚀 CartGuard AI starting up...")
    # Pre-load model
    try:
        from models.ensemble_model import get_model
        get_model()
        print("✅ ML model loaded")
    except Exception as e:
        print(f"⚠️  Model load warning: {e}")
    
    # Init DB
    audit_service.init_db()
    print("✅ Audit database initialized")
    yield
    print("👋 CartGuard AI shutting down...")


app = FastAPI(
    title="CartGuard AI",
    description="Real-time cart abandonment risk scoring and remediation",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────── Models ────────────────────────────
class SessionData(BaseModel):
    session_id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    
    # Session behavior
    session_duration: float = 0
    product_views: int = 0
    cart_adds: int = 0
    cart_removes: int = 0
    cart_changes: int = 0
    cart_value: float = 0
    original_cart_value: Optional[float] = None
    
    # Navigation
    category_switches: int = 0
    tab_switches: int = 0
    page_revisits: int = 0
    back_navigations: int = 0
    
    # Checkout
    checkout_steps_completed: int = 0
    total_checkout_steps: int = 5
    checkout_time: float = 0
    
    # Payment
    payment_attempts: int = 0
    payment_failures: int = 0
    time_on_payment_page: float = 0
    payment_method_switches: int = 0
    
    # Form
    form_field_errors: int = 0
    
    # User profile
    is_returning_visitor: bool = False
    session_recency_minutes: float = 10
    user_segment: str = "REGULAR"
    user_discount_spend_this_month: float = 0
    
    # Consent
    is_dnd_registered: bool = False
    sms_opt_in: bool = True
    email_opt_in: bool = True
    whatsapp_opt_in: bool = False
    
    # Contact
    user_email: Optional[str] = None
    user_phone: Optional[str] = None

    class Config:
        extra = "allow"


class BatchSessionRequest(BaseModel):
    sessions: List[SessionData]


# ──────────────────────────── WebSocket Manager ────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)

    async def send_result(self, session_id: str, result: Dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(result)
            except Exception:
                self.disconnect(session_id)


manager = ConnectionManager()


# ──────────────────────────── Routes ────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "CartGuard AI", "version": "2.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "model_loaded": True,
    }


@app.post("/api/v1/score", tags=["Scoring"])
async def score_session(session: SessionData, background_tasks: BackgroundTasks):
    """
    Score a single session for abandonment risk.
    Returns risk score, diagnosis, and recommended action.
    
    Latency target: < 300ms
    """
    start = time.time()
    
    try:
        session_dict = session.model_dump()
        if session_dict.get("original_cart_value") is None:
            session_dict["original_cart_value"] = session_dict["cart_value"]
        
        result = await orchestrator.process_session(session_dict)
        
        # Audit log in background
        background_tasks.add_task(audit_service.log_decision, result, session_dict)
        
        # Send notification if action recommended
        action = result.get("action", {})
        if action.get("action_type") not in ["DO_NOTHING", None] and session.user_email:
            background_tasks.add_task(
                notification_service.send_notification,
                session_dict, action
            )
        
        latency = (time.time() - start) * 1000
        result["api_latency_ms"] = round(latency, 2)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/score/batch", tags=["Scoring"])
async def score_batch(request: BatchSessionRequest):
    """Score multiple sessions in parallel."""
    tasks = [
        orchestrator.process_session(s.model_dump())
        for s in request.sessions
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return {
        "results": [r if not isinstance(r, Exception) else {"error": str(r)} for r in results],
        "total": len(results),
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket for real-time session event streaming.
    Browser SDK sends events; server scores in real-time.
    """
    await manager.connect(websocket, session_id)
    try:
        session_accumulator = {"session_id": session_id}
        
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "update")
            
            if event_type == "event":
                # Accumulate events
                session_accumulator.update(data.get("data", {}))
            elif event_type == "score_request":
                session_accumulator.update(data.get("data", {}))
                
                # Score the session
                result = await orchestrator.process_session(session_accumulator)
                await manager.send_result(session_id, result)
            elif event_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)


@app.get("/api/v1/audit", tags=["Audit"])
async def get_audit_log(limit: int = 50, session_id: Optional[str] = None):
    """Retrieve audit log entries."""
    logs = audit_service.get_logs(limit=limit, session_id=session_id)
    return {"logs": logs, "count": len(logs)}


@app.get("/api/v1/metrics", tags=["Metrics"])
async def get_metrics():
    """Get system performance metrics."""
    return audit_service.get_metrics()


@app.get("/api/v1/demo/scenarios", tags=["Demo"])
async def get_demo_scenarios():
    """Get pre-built demo scenarios for testing."""
    return {"scenarios": DEMO_SCENARIOS}


@app.post("/api/v1/demo/run/{scenario_name}", tags=["Demo"])
async def run_demo_scenario(scenario_name: str):
    """Run a specific demo scenario."""
    scenario = next((s for s in DEMO_SCENARIOS if s["name"] == scenario_name), None)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_name}' not found")
    
    session = SessionData(**scenario["session_data"])
    result = await orchestrator.process_session(session.model_dump())
    return {"scenario": scenario["name"], "description": scenario["description"], "result": result}


# ──────────────────────────── Demo Scenarios ────────────────────────────
DEMO_SCENARIOS = [
    {
        "name": "payment_failure",
        "description": "Complex Payment Failure: 1 failed UPI, 2 mins hesitation, high cart value",
        "expected": "ALTERNATE_PAYMENT_GUIDANCE",
        "session_data": {
            "session_id": "DEMO_001",
            "session_duration": 240,
            "product_views": 4,
            "cart_adds": 2,
            "cart_removes": 0,
            "cart_changes": 2,
            "cart_value": 3500,
            "category_switches": 0,
            "tab_switches": 1,
            "page_revisits": 3,
            "checkout_steps_completed": 4,
            "checkout_time": 120,
            "payment_attempts": 2,
            "payment_failures": 1,
            "time_on_payment_page": 180,
            "payment_method_switches": 2,
            "form_field_errors": 0,
            "is_returning_visitor": True,
            "session_recency_minutes": 5,
            "user_segment": "PREMIUM",
        },
    },
    {
        "name": "comparison_shopping",
        "description": "Comparison Shopping: 5 product views, 3 category switches, tab loss",
        "expected": "SOCIAL_PROOF_NUDGE",
        "session_data": {
            "session_id": "DEMO_002",
            "session_duration": 480,
            "product_views": 12,
            "cart_adds": 1,
            "cart_removes": 0,
            "cart_changes": 3,
            "cart_value": 1200,
            "category_switches": 5,
            "tab_switches": 8,
            "page_revisits": 4,
            "checkout_steps_completed": 0,
            "checkout_time": 0,
            "payment_attempts": 0,
            "payment_failures": 0,
            "time_on_payment_page": 0,
            "payment_method_switches": 0,
            "form_field_errors": 0,
            "is_returning_visitor": False,
            "session_recency_minutes": 15,
            "user_segment": "REGULAR",
        },
    },
    {
        "name": "friction_abandonment",
        "description": "Checkout Friction: slow scroll, form field errors, no payment attempt",
        "expected": "CHECKOUT_ASSISTANCE",
        "session_data": {
            "session_id": "DEMO_003",
            "session_duration": 360,
            "product_views": 3,
            "cart_adds": 2,
            "cart_removes": 0,
            "cart_changes": 2,
            "cart_value": 800,
            "category_switches": 0,
            "tab_switches": 0,
            "page_revisits": 2,
            "checkout_steps_completed": 2,
            "checkout_time": 240,
            "payment_attempts": 0,
            "payment_failures": 0,
            "time_on_payment_page": 0,
            "payment_method_switches": 0,
            "form_field_errors": 5,
            "back_navigations": 6,
            "is_returning_visitor": False,
            "session_recency_minutes": 8,
            "user_segment": "REGULAR",
        },
    },
    {
        "name": "mixed_signals",
        "description": "Mixed Signals: 2 payment attempts (1 fail, 1 success), volatile cart",
        "expected": "DO_NOTHING",
        "session_data": {
            "session_id": "DEMO_004",
            "session_duration": 300,
            "product_views": 5,
            "cart_adds": 2,
            "cart_removes": 1,
            "cart_changes": 5,
            "cart_value": 1500,
            "original_cart_value": 2200,
            "category_switches": 2,
            "tab_switches": 3,
            "page_revisits": 3,
            "checkout_steps_completed": 3,
            "checkout_time": 90,
            "payment_attempts": 2,
            "payment_failures": 1,
            "time_on_payment_page": 90,
            "payment_method_switches": 1,
            "form_field_errors": 1,
            "is_returning_visitor": True,
            "session_recency_minutes": 20,
            "user_segment": "REGULAR",
        },
    },
    {
        "name": "low_intent",
        "description": "Low Intent, High Value: 10 product views, no cart adds, research mode",
        "expected": "DO_NOTHING",
        "session_data": {
            "session_id": "DEMO_005",
            "session_duration": 720,
            "product_views": 15,
            "cart_adds": 0,
            "cart_removes": 0,
            "cart_changes": 0,
            "cart_value": 0,
            "category_switches": 4,
            "tab_switches": 10,
            "page_revisits": 2,
            "checkout_steps_completed": 0,
            "checkout_time": 0,
            "payment_attempts": 0,
            "payment_failures": 0,
            "time_on_payment_page": 0,
            "payment_method_switches": 0,
            "form_field_errors": 0,
            "is_returning_visitor": False,
            "session_recency_minutes": 30,
            "user_segment": "NEW",
        },
    },
    {
        "name": "urgent_bargain_hunter",
        "description": "Urgent Bargain Hunter: Added item 3 times, removed twice, price check pattern",
        "expected": "LIMITED_OFFER",
        "session_data": {
            "session_id": "DEMO_006",
            "session_duration": 180,
            "product_views": 8,
            "cart_adds": 3,
            "cart_removes": 2,
            "cart_changes": 8,
            "cart_value": 900,
            "original_cart_value": 1200,
            "category_switches": 2,
            "tab_switches": 5,
            "page_revisits": 4,
            "checkout_steps_completed": 1,
            "checkout_time": 30,
            "payment_attempts": 0,
            "payment_failures": 0,
            "time_on_payment_page": 0,
            "payment_method_switches": 0,
            "form_field_errors": 0,
            "is_returning_visitor": True,
            "session_recency_minutes": 3,
            "user_segment": "BARGAIN",
        },
    },
]


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
