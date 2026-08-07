"""
CartGuard AI - FastAPI Backend
Main API server with WebSocket support for real-time session scoring.
Member M3: Backend & Systems Engineer
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
from services.redis_service import redis_service
from config.settings import settings


# ──────────────────────────── Lifespan ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("🚀 CartGuard AI starting up...")
    # Connect Redis (or fallback to in-memory)
    connected = await redis_service.connect()
    if connected:
        print("✅ Redis connected")
    else:
        print("ℹ️ Redis offline, using in-memory cache fallback")

    # Pre-load ML model
    try:
        from models.ensemble_model import get_model
        get_model()
        print("✅ ML model loaded")
    except Exception as e:
        print(f"⚠️ Model load warning: {e}")
    
    # Init DB
    audit_service.init_db()
    print("✅ Audit database initialized")
    yield
    await redis_service.close()
    print("👋 CartGuard AI shutting down...")


app = FastAPI(
    title="CartGuard AI API",
    description="Real-time cart abandonment risk scoring and remediation",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS for dashboard & frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────── Request / Response Models ────────────────────────────
class SessionRequest(BaseModel):
    session_id: str
    cart_value: float = 0.0
    session_duration: float = 0.0
    product_views: int = 0
    cart_adds: int = 0
    checkout_reached: int = 0
    payment_attempts: int = 0
    payment_failures: int = 0
    email_opt_in: bool = True
    whatsapp_opt_in: bool = False
    
    # Behavioral signals (from M4 SDK)
    mouse_velocity: Optional[float] = None
    scroll_speed: Optional[float] = None
    form_hesitation: Optional[float] = None
    tab_loss_count: Optional[int] = None

    class Config:
        extra = "allow"


class ActionResponse(BaseModel):
    session_id: str
    risk_score: float
    risk_level: str
    reason: str
    confidence: float
    evidence: List[str] = []
    action: str
    action_message: str
    discount: float
    channel: str
    expected_margin: float
    self_check: str
    audit_id: str
    latency_ms: float

    class Config:
        extra = "allow"


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
    sessions: List[SessionRequest]


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


# ──────────────────────────── Helper Functions ────────────────────────────
def build_action_response(request_dict: Dict[str, Any], result: Dict[str, Any], start_time: float) -> ActionResponse:
    session_id = str(request_dict.get("session_id", "unknown"))
    risk_score = float(result.get("risk_score", 0.0))
    risk_level = str(result.get("risk_level", "LOW"))
    
    diagnosis = result.get("diagnosis", {})
    reason = str(diagnosis.get("root_cause", "LOW_RISK"))
    confidence = float(diagnosis.get("confidence", 0.9))
    evidence = list(diagnosis.get("evidence", []))
    
    action_obj = result.get("action", {})
    action_str = str(action_obj.get("action", action_obj.get("action_type", "DO_NOTHING")))
    action_msg = str(action_obj.get("action_message", action_obj.get("message", "No intervention needed")))
    discount = float(action_obj.get("discount", action_obj.get("discount_amount", 0.0)))
    channel = str(action_obj.get("channel", "NONE"))
    expected_margin = float(action_obj.get("expected_margin", result.get("policy", {}).get("expected_incremental_margin_inr", 0.0)))
    
    self_check_obj = result.get("self_check", {})
    self_check_status = str(self_check_obj.get("status", "PASSED"))
    
    latency_ms = (time.time() - start_time) * 1000
    audit_id = f"audit_{int(time.time()*1000)}_{session_id}"

    return ActionResponse(
        session_id=session_id,
        risk_score=round(risk_score, 4),
        risk_level=risk_level,
        reason=reason,
        confidence=round(confidence, 2),
        evidence=evidence,
        action=action_str,
        action_message=action_msg,
        discount=round(discount, 2),
        channel=channel,
        expected_margin=round(expected_margin, 2),
        self_check=self_check_status,
        audit_id=audit_id,
        latency_ms=round(latency_ms, 2)
    )


# ──────────────────────────── API Endpoints ────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "CartGuard AI API", "version": "2.0.0"}


@app.get("/health", tags=["Health"])
async def health_check():
    """Health monitoring endpoint."""
    return {"status": "ok", "timestamp": time.time()}


@app.get("/metrics", tags=["Metrics"])
async def get_metrics():
    """Prometheus-style metrics endpoint."""
    return audit_service.get_metrics()


@app.get("/api/v1/metrics", tags=["Metrics"])
async def get_metrics_v1():
    """Metrics endpoint alias."""
    return audit_service.get_metrics()


@app.post("/score-session", response_model=ActionResponse, tags=["Scoring"])
async def score_session(request: SessionRequest, background_tasks: BackgroundTasks):
    """
    Primary scoring endpoint specified in M3 PDF breakdown.
    Returns structured ActionResponse with robust fallback on error.
    """
    start_time = time.time()
    try:
        session_dict = request.model_dump()
        result = await orchestrator.process_session(session_dict)
        
        # Async audit log
        background_tasks.add_task(audit_service.log_decision, result, session_dict)
        
        response = build_action_response(session_dict, result, start_time)
        return response
    except Exception as e:
        return ActionResponse(
            session_id=request.session_id,
            risk_score=0.0,
            risk_level="UNKNOWN",
            reason="ERROR",
            confidence=0.0,
            evidence=[str(e)],
            action="DO_NOTHING",
            action_message="System error, defaulting to no action",
            discount=0.0,
            channel="NONE",
            expected_margin=0.0,
            self_check="FAILED",
            audit_id=f"error_{int(time.time())}",
            latency_ms=0.0
        )


@app.post("/api/v1/score", tags=["Scoring"])
async def score_session_v1(session: SessionData, background_tasks: BackgroundTasks):
    """v1 score endpoint for extended session data."""
    start = time.time()
    try:
        session_dict = session.model_dump()
        if session_dict.get("original_cart_value") is None:
            session_dict["original_cart_value"] = session_dict["cart_value"]
        
        result = await orchestrator.process_session(session_dict)
        
        # Audit log in background
        background_tasks.add_task(audit_service.log_decision, result, session_dict)
        
        # Notification if action recommended
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
                session_accumulator.update(data.get("data", {}))
            elif event_type == "score_request" or "cart_value" in data:
                event_data = data.get("data", data)
                session_accumulator.update(event_data)
                
                result = await orchestrator.process_session(session_accumulator)
                action_resp = build_action_response(session_accumulator, result, time.time())
                await manager.send_result(session_id, action_resp.model_dump())
            elif event_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception:
        await websocket.close()


@app.get("/audit-log/{session_id}", tags=["Audit"])
async def get_audit_log_endpoint(session_id: str):
    """Retrieve decision history for a session."""
    log = audit_service.get_audit_log_by_session(session_id)
    if not log:
        return {"session_id": session_id, "logs": [], "count": 0}
    return log


@app.get("/api/v1/audit", tags=["Audit"])
async def get_audit_logs_v1(limit: int = 50, session_id: Optional[str] = None):
    """Retrieve audit log entries."""
    logs = audit_service.get_logs(limit=limit, session_id=session_id)
    return {"logs": logs, "count": len(logs)}


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
            "session_id": "S1001",
            "session_duration": 210,
            "product_views": 4,
            "cart_adds": 3,
            "checkout_reached": 1,
            "payment_attempts": 2,
            "payment_failures": 2,
            "email_opt_in": True,
            "whatsapp_opt_in": False,
            "mouse_velocity": 0.8,
            "scroll_speed": 120,
            "form_hesitation": 0.9,
            "tab_loss_count": 1,
            "cart_value": 2499,
        },
    },
    {
        "name": "price_shopping",
        "description": "Price Shopping: 12 views, category switching, tab loss",
        "expected": "VALUE_REASSURANCE",
        "session_data": {
            "session_id": "S1002",
            "cart_value": 899,
            "session_duration": 540,
            "product_views": 12,
            "cart_adds": 2,
            "checkout_reached": 0,
            "payment_attempts": 0,
            "payment_failures": 0,
            "email_opt_in": True,
            "whatsapp_opt_in": False,
            "mouse_velocity": 0.3,
            "scroll_speed": 200,
            "form_hesitation": 0.0,
            "tab_loss_count": 3,
        },
    },
    {
        "name": "checkout_friction",
        "description": "Checkout Friction: Form hesitation, no payment attempt",
        "expected": "CHECKOUT_HELP",
        "session_data": {
            "session_id": "S1004",
            "cart_value": 3499,
            "session_duration": 420,
            "product_views": 5,
            "cart_adds": 4,
            "checkout_reached": 1,
            "payment_attempts": 0,
            "payment_failures": 0,
            "email_opt_in": True,
            "whatsapp_opt_in": False,
            "mouse_velocity": 0.5,
            "scroll_speed": 60,
            "form_hesitation": 0.8,
            "tab_loss_count": 0,
        },
    },
]


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
