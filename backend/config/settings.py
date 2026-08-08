"""
CartGuard AI - Configuration Settings
All values read from environment variables with safe defaults.
"""
import os
from typing import List, Optional

try:
    from pydantic_settings import BaseSettings
    from pydantic import field_validator
    _USE_PYDANTIC_SETTINGS = True
except ImportError:
    from pydantic import BaseModel as BaseSettings
    _USE_PYDANTIC_SETTINGS = False


def _parse_cors_origins(raw: str) -> List[str]:
    """Parse comma-separated CORS origins from env var."""
    if not raw or raw.strip() == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "CartGuard AI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    PORT: int = int(os.getenv("PORT", "8000"))

    # ── API Keys ─────────────────────────────────────────────────────────────
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY", "")
    SENDGRID_API_KEY: Optional[str] = os.getenv("SENDGRID_API_KEY", "")
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: Optional[str] = os.getenv("TWILIO_FROM_NUMBER", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@cartguard.ai")

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cartguard.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # ── ML Model Paths ────────────────────────────────────────────────────────
    CATBOOST_MODEL_PATH: str = os.getenv("CATBOOST_MODEL_PATH", "models/catboost_model.cbm")
    XGBOOST_MODEL_PATH: str = os.getenv("XGBOOST_MODEL_PATH", "models/xgboost_model.json")
    SCALER_PATH: str = os.getenv("SCALER_PATH", "models/scaler.pkl")  # fixed: was feature_pipeline.pkl

    # ── LLM Settings ──────────────────────────────────────────────────────────
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")   # groq | openai | local
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.2-3b-preview")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    LOCAL_LLM_URL: str = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")

    # ── Agent / Timeout Settings ───────────────────────────────────────────────
    AGENT_TIMEOUT_MS: int = int(os.getenv("AGENT_TIMEOUT_MS", "300"))
    LLM_TIMEOUT_MS: int = int(os.getenv("LLM_TIMEOUT_MS", "200"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))

    # ── Business Rules ────────────────────────────────────────────────────────
    PER_USER_BUDGET_INR: float = float(os.getenv("PER_USER_BUDGET_INR", "500.0"))
    PER_CAMPAIGN_BUDGET_INR: float = float(os.getenv("PER_CAMPAIGN_BUDGET_INR", "50000.0"))
    MIN_RISK_SCORE_FOR_ACTION: float = float(os.getenv("MIN_RISK_SCORE_FOR_ACTION", "0.55"))
    MAX_DISCOUNT_PERCENT: float = float(os.getenv("MAX_DISCOUNT_PERCENT", "20.0"))
    HIGH_VALUE_CART_THRESHOLD: float = float(os.getenv("HIGH_VALUE_CART_THRESHOLD", "2000.0"))
    MARGIN_RATE: float = float(os.getenv("MARGIN_RATE", "0.25"))

    # ── Risk Thresholds ───────────────────────────────────────────────────────
    HIGH_RISK_THRESHOLD: float = float(os.getenv("HIGH_RISK_THRESHOLD", "0.75"))
    MEDIUM_RISK_THRESHOLD: float = float(os.getenv("MEDIUM_RISK_THRESHOLD", "0.55"))
    LOW_RISK_THRESHOLD: float = float(os.getenv("LOW_RISK_THRESHOLD", "0.35"))

    # ── Cost per call (INR) ────────────────────────────────────────────────────
    COST_CATBOOST_PER_CALL: float = float(os.getenv("COST_CATBOOST_PER_CALL", "0.001"))
    COST_LLM_SMALL_PER_CALL: float = float(os.getenv("COST_LLM_SMALL_PER_CALL", "0.05"))
    COST_LLM_LARGE_PER_CALL: float = float(os.getenv("COST_LLM_LARGE_PER_CALL", "0.50"))

    # ── Uplift Simulation ─────────────────────────────────────────────────────
    UPLIFT_N_SESSIONS: int = int(os.getenv("UPLIFT_N_SESSIONS", "10000"))
    UPLIFT_SEED: int = int(os.getenv("UPLIFT_SEED", "42"))

    # ── CORS ──────────────────────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> List[str]:
        raw = os.getenv("CORS_ORIGINS", "*")
        return _parse_cors_origins(raw)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
