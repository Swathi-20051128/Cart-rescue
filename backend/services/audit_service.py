"""
CartGuard AI - Audit Service
Logs all decisions with full evidence chains for auditability.
"""
import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional, List


class AuditService:
    def __init__(self, db_path: str = "cartguard_audit.db"):
        self.db_path = db_path
        self._decisions_cache = []
        self.init_db()

    def init_db(self):
        """Initialize SQLite audit database."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                session_id TEXT NOT NULL,
                user_id TEXT,
                risk_score REAL,
                risk_level TEXT,
                root_cause TEXT,
                diagnosis_confidence REAL,
                action_type TEXT,
                channel TEXT,
                discount_amount REAL,
                uplift_probability REAL,
                expected_margin REAL,
                self_check_status TEXT,
                total_latency_ms REAL,
                total_cost_inr REAL,
                signals_json TEXT,
                full_result_json TEXT,
                outcome TEXT DEFAULT 'PENDING'
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS session_outcomes (
                session_id TEXT PRIMARY KEY,
                actual_outcome TEXT,
                recorded_at TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS metrics_summary (
                date TEXT PRIMARY KEY,
                total_sessions INTEGER,
                high_risk_sessions INTEGER,
                actions_taken INTEGER,
                do_nothing_count INTEGER,
                total_discount_inr REAL,
                total_cost_inr REAL,
                avg_latency_ms REAL
            )
        """)
        conn.commit()
        conn.close()

    def log_decision(self, result: Dict[str, Any], session_data: Dict[str, Any]):
        """Log a complete decision to the audit database."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        action = result.get("action", {})
        diagnosis = result.get("diagnosis", {})
        policy = result.get("policy", {})
        metrics = result.get("metrics", {})
        
        c.execute("""
            INSERT INTO audit_log (
                timestamp, session_id, user_id, risk_score, risk_level,
                root_cause, diagnosis_confidence, action_type, channel,
                discount_amount, uplift_probability, expected_margin,
                self_check_status, total_latency_ms, total_cost_inr,
                signals_json, full_result_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.utcnow().isoformat(),
            result.get("session_id", ""),
            session_data.get("user_id", ""),
            result.get("risk_score", 0),
            result.get("risk_level", "UNKNOWN"),
            diagnosis.get("root_cause", ""),
            diagnosis.get("confidence", 0),
            action.get("action_type", ""),
            action.get("channel", ""),
            action.get("discount_amount", 0),
            policy.get("uplift_probability", 0),
            policy.get("expected_incremental_margin_inr", 0),
            result.get("self_check", {}).get("status", ""),
            metrics.get("total_latency_ms", 0),
            metrics.get("total_cost_inr", 0),
            json.dumps(result.get("signals", {})),
            json.dumps(result),
        ))
        conn.commit()
        conn.close()

    def get_logs(self, limit: int = 50, session_id: Optional[str] = None) -> List[Dict]:
        """Retrieve audit log entries."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        if session_id:
            c.execute(
                "SELECT * FROM audit_log WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
                (session_id, limit)
            )
        else:
            c.execute("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?", (limit,))
        
        rows = [dict(row) for row in c.fetchall()]
        conn.close()
        return rows

    def get_metrics(self) -> Dict[str, Any]:
        """Get aggregated performance metrics."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute("SELECT COUNT(*) as total FROM audit_log")
        total = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM audit_log WHERE risk_level = 'HIGH'")
        high_risk = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM audit_log WHERE action_type != 'DO_NOTHING'")
        actions_taken = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM audit_log WHERE action_type = 'DO_NOTHING'")
        do_nothing = c.fetchone()[0]
        
        c.execute("SELECT SUM(discount_amount) FROM audit_log WHERE discount_amount > 0")
        total_discount = c.fetchone()[0] or 0
        
        c.execute("SELECT SUM(total_cost_inr) FROM audit_log")
        total_cost = c.fetchone()[0] or 0
        
        c.execute("SELECT AVG(total_latency_ms) FROM audit_log")
        avg_latency = c.fetchone()[0] or 0
        
        c.execute("SELECT AVG(risk_score) FROM audit_log")
        avg_risk = c.fetchone()[0] or 0
        
        c.execute("""
            SELECT root_cause, COUNT(*) as cnt 
            FROM audit_log 
            WHERE root_cause != '' 
            GROUP BY root_cause 
            ORDER BY cnt DESC
        """)
        cause_distribution = {row[0]: row[1] for row in c.fetchall()}
        
        c.execute("""
            SELECT action_type, COUNT(*) as cnt 
            FROM audit_log 
            GROUP BY action_type 
            ORDER BY cnt DESC
        """)
        action_distribution = {row[0]: row[1] for row in c.fetchall()}
        
        conn.close()
        
        return {
            "total_sessions": total,
            "high_risk_sessions": high_risk,
            "actions_taken": actions_taken,
            "do_nothing_count": do_nothing,
            "do_nothing_rate": round(do_nothing / max(total, 1) * 100, 1),
            "total_discount_inr": round(total_discount, 2),
            "avg_discount_per_action_inr": round(total_discount / max(actions_taken, 1), 2),
            "total_ai_cost_inr": round(total_cost, 4),
            "cost_per_decision_inr": round(total_cost / max(total, 1), 4),
            "avg_latency_ms": round(avg_latency, 2),
            "avg_risk_score": round(avg_risk, 4),
            "cause_distribution": cause_distribution,
            "action_distribution": action_distribution,
        }

    def record_outcome(self, session_id: str, outcome: str):
        """Record actual conversion outcome for a session."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("""
            INSERT OR REPLACE INTO session_outcomes (session_id, actual_outcome, recorded_at)
            VALUES (?, ?, ?)
        """, (session_id, outcome, datetime.utcnow().isoformat()))
        c.execute("""
            UPDATE audit_log SET outcome = ? WHERE session_id = ?
        """, (outcome, session_id))
        conn.commit()
        conn.close()


audit_service = AuditService()
