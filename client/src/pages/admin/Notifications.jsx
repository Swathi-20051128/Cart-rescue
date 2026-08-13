import { useEffect, useState } from "react";
import api from "../../api/axios.js";

export default function Notifications() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("whatsapp"); // "whatsapp" | "mail" | "dashboard"

  // WPPConnect WhatsApp connection state
  const [wppStatus, setWppStatus] = useState("DISCONNECTED");
  const [wppQrCode, setWppQrCode] = useState("");
  const [wppLoading, setWppLoading] = useState(false);

  const checkWppStatus = () => {
    setWppLoading(true);
    api.get("/admin/whatsapp-status")
      .then((res) => {
        const status = res.data.status || "DISCONNECTED";
        setWppStatus(status);
        if (res.data.qrcode) {
          setWppQrCode(res.data.qrcode);
        } else {
          setWppQrCode("");
        }
      })
      .catch((err) => {
        console.error("WPPConnect offline:", err);
        setWppStatus("OFFLINE");
      })
      .finally(() => setWppLoading(false));
  };

  const initWppSession = () => {
    setWppLoading(true);
    setWppStatus("STARTING");
    setWppQrCode("");
    api.post("/admin/whatsapp-start")
      .then((res) => {
        const status = res.data.status || "DISCONNECTED";
        setWppStatus(status);
        if (res.data.qrcode) {
          setWppQrCode(res.data.qrcode);
        }
      })
      .catch((err) => {
        console.error("Failed to start session:", err);
        setWppStatus("OFFLINE");
      })
      .finally(() => setWppLoading(false));
  };

  useEffect(() => {
    if (activeTab === "whatsapp") {
      checkWppStatus();
    }
  }, [activeTab]);

  useEffect(() => {
    let interval = null;
    const currentStatus = (wppStatus || "").toUpperCase();
    const isPollingState = ["STARTING", "INITIALIZING", "NOT_LOGGED", "QRCODE", "PAIN_CONNECTING", "NOT_INITIALIZED"].includes(currentStatus);

    if (activeTab === "whatsapp" && isPollingState) {
      interval = setInterval(() => {
        api.get("/admin/whatsapp-status")
          .then((res) => {
            const status = res.data.status || "DISCONNECTED";
            setWppStatus(status);
            if (res.data.qrcode) {
              setWppQrCode(res.data.qrcode);
            }
          })
          .catch((err) => {
            console.error("WPPConnect polling error:", err);
          });
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, wppStatus]);

  useEffect(() => {
    setLoading(true);
    api.get("/admin/audit-log", { params: { limit: 100 } })
      .then((res) => {
        setLogs(res.data.logs || res.data);
      })
      .catch((err) => console.error("Failed to load notification audits", err))
      .finally(() => setLoading(false));
  }, []);

  // Filter logs by channel
  const filteredLogs = logs.filter((l) => {
    const ch = (l.channel || "").toUpperCase();
    if (activeTab === "whatsapp") {
      return ch === "WHATSAPP" || ch === "SMS";
    }
    if (activeTab === "mail") {
      return ch === "EMAIL";
    }
    if (activeTab === "dashboard") {
      return ch === "IN_APP" || ch === "DASHBOARD" || !l.channel;
    }
    return false;
  });

  return (
    <div>
      <h2>Notifications Dispatcher Log</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, marginBottom: 20 }}>
        Monitor automated cart recovery messages dispatched across multi-agent channels.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
        {[
          { id: "whatsapp", label: "💬 WhatsApp Messages" },
          { id: "mail", label: "✉️ Email Notifications" },
          { id: "dashboard", label: "🖥️ In-App Dashboard Alerts" },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 18px",
                background: isActive ? "var(--plum)" : "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "none",
                borderRadius: "6px 6px 0 0",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* WhatsApp Link Scanner Widget */}
      {activeTab === "whatsapp" && (
        <div style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ fontSize: 15, margin: 0, color: "var(--text)" }}>📲 WPPConnect WhatsApp Link Controller</h3>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, textTransform: "uppercase",
              background: wppStatus === "CONNECTED" ? "rgba(16,185,129,0.15)" : wppStatus === "OFFLINE" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
              color: wppStatus === "CONNECTED" ? "#10B981" : wppStatus === "OFFLINE" ? "#EF4444" : "#F59E0B"
            }}>
              Status: {wppStatus}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px", lineHeight: 1.5 }}>
            Link your phone directly to the local Puppeteer-driven WPPConnect engine to automate WhatsApp text alerts.
          </p>

          {wppStatus === "OFFLINE" && (
            <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.18)", borderRadius: 8, fontSize: 12, color: "#EF4444" }}>
              <div>⚠️ <strong>WPPConnect Server is Offline</strong>: Please start your WhatsApp daemon locally on port <code>21465</code>.</div>
              <button onClick={checkWppStatus} className="secondary" style={{ marginTop: 8, padding: "5px 12px", fontSize: 11, width: "auto" }}>
                🔄 Retry Connection
              </button>
            </div>
          )}

          {wppStatus === "CONNECTED" && (
            <div style={{ padding: 12, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.18)", borderRadius: 8, fontSize: 12, color: "#10B981", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>✅ <strong>WhatsApp Connected</strong>: Session is active and authenticated. Dispatched alerts will text users directly.</span>
              <button onClick={checkWppStatus} className="secondary" style={{ padding: "5px 12px", fontSize: 11, width: "auto" }}>
                🔄 Refresh Status
              </button>
            </div>
          )}

          {(wppStatus === "DISCONNECTED" || wppStatus === "CLOSED" || wppStatus === "NOT_LOGGED") && (
            <div>
              <button onClick={initWppSession} className="primary" disabled={wppLoading} style={{ padding: "10px 20px", fontSize: 13, width: "auto" }}>
                {wppLoading ? "🤖 Initializing session…" : "🔑 Start WhatsApp Link Session"}
              </button>
            </div>
          )}

          {wppStatus === "STARTING" && (
            <div style={{ textAlign: "center", padding: 16, background: "var(--bg-alt)", borderRadius: 10 }}>
              <div className="agent-spinner" style={{ width: 24, height: 24, margin: "0 auto 12px", borderWidth: 2 }} />
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Spinning up headless Chrome instance. Generating QR code…</div>
            </div>
          )}

          {wppStatus === "QRCODE" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "var(--bg-alt)", padding: 16, borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>📲 Scan WhatsApp QR Code</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                Open WhatsApp on your mobile device ➡️ Linked Devices ➡️ Link a Device, and scan below:
              </div>
              {wppQrCode ? (
                <img src={wppQrCode} alt="WhatsApp Link QR Code" style={{ background: "#fff", padding: 12, borderRadius: 8, width: 200, height: 200, border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 200, height: 200, background: "var(--panel)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-muted)" }}>
                  Generating image…
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={checkWppStatus} className="primary" style={{ padding: "8px 16px", fontSize: 12, width: "auto" }}>
                  ✅ I scanned it (Check Link)
                </button>
                <button onClick={initWppSession} className="secondary" style={{ padding: "8px 16px", fontSize: 12, width: "auto" }}>
                  Regenerate QR
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          <div className="agent-spinner" style={{ width: 24, height: 24, margin: "0 auto 12px", borderWidth: 2 }} />
          <div>Syncing notifications logs…</div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)",
          color: "var(--text-muted)"
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>No messages found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>No recovery incentives were triggered for this channel.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredLogs.map((l) => {
            const resultObj = l.full_result_json || {};
            const action = resultObj.action || {};
            const message = action.message || l.message || "Hi! We noticed you left items in your cart. Complete your purchase now and claim a special discount!";
            const discount = action.discount_amount || l.discount_amount || 0;

            return (
              <div
                key={l.id}
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Header info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                        Session ID: {l.session_id}
                      </span>
                      <span style={{ fontSize: 11, background: "var(--bg-alt)", padding: "2px 8px", borderRadius: 12, color: "var(--text-secondary)" }}>
                        {l.root_cause || "摩擦流失"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      Recipient User: {l.user_id} · Audited at {new Date(l.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {discount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "3px 9px", borderRadius: 20 }}>
                        ₹{discount} OFFER
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", padding: "3px 9px", borderRadius: 20,
                      background: l.outcome === "SENT" || l.outcome === "PENDING" ? "rgba(16,185,129,0.12)" : "rgba(148,163,184,0.12)",
                      color: l.outcome === "SENT" || l.outcome === "PENDING" ? "#10B981" : "var(--text-muted)",
                      textTransform: "uppercase"
                    }}>
                      {l.outcome || "DISPATCHED"}
                    </span>
                  </div>
                </div>

                {/* Sub-tab specific content preview */}
                {activeTab === "whatsapp" && (
                  <div style={{
                    background: "rgba(7, 94, 84, 0.05)",
                    border: "1px solid rgba(7, 94, 84, 0.15)",
                    borderRadius: 12,
                    padding: 12,
                    maxWidth: "500px",
                    position: "relative",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#128C7E", marginBottom: 4 }}>
                      🟢 WhatsApp Message Preview
                    </div>
                    <div style={{
                      background: "var(--surface)",
                      padding: 10,
                      borderRadius: "0 8px 8px 8px",
                      fontSize: 13,
                      color: "var(--text)",
                      lineHeight: 1.5,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)"
                    }}>
                      {message}
                    </div>
                  </div>
                )}

                {activeTab === "mail" && (
                  <div style={{
                    background: "var(--bg-alt)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>
                      📧 Resend Email Template
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 8 }}>
                      <strong>Subject:</strong> Complete Your Purchase | CartGuard AI<br />
                      <strong>From:</strong> onboarding@resend.dev
                    </div>
                    <div style={{
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      padding: 14,
                      borderRadius: 8,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6
                    }}>
                      {message}
                      {discount > 0 && (
                        <div style={{ color: "#EF4444", fontWeight: 700, marginTop: 8 }}>
                          🎁 Save ₹{discount} with code: SAVE{discount}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "dashboard" && (
                  <div style={{
                    background: "linear-gradient(90deg, rgba(139,92,246,0.06), rgba(236,72,153,0.06))",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#EC4899", marginBottom: 6 }}>
                      🖥️ In-App Topbar Banner Alert
                    </div>
                    <div style={{
                      background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 10
                    }}>
                      <span>🔔 {message}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
