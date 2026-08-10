import { useState } from "react";
import Overview from "./Overview.jsx";
import LiveCarts from "./LiveCarts.jsx";
import ScoreSession from "./ScoreSession.jsx";
import AuditLog from "./AuditLog.jsx";
import DemoScenarios from "./DemoScenarios.jsx";
import UpliftAnalysis from "./UpliftAnalysis.jsx";

const TABS = {
  overview:   { label: "Overview",        icon: "ti-layout-dashboard", component: Overview },
  livecarts:  { label: "Live Carts",       icon: "ti-shopping-cart",    component: LiveCarts },
  score:      { label: "Score a Session",  icon: "ti-target-arrow",     component: ScoreSession },
  demo:       { label: "Demo Scenarios",   icon: "ti-player-play",      component: DemoScenarios },
  uplift:     { label: "Uplift Analysis",  icon: "ti-chart-line",       component: UpliftAnalysis },
  audit:      { label: "Audit Log",        icon: "ti-list-details",     component: AuditLog },
};

// Which tabs get a live badge in the sidebar
const LIVE_TABS = new Set(["livecarts"]);

const AdminDashboard = () => {
  const [tab, setTab] = useState("overview");
  const Active = TABS[tab].component;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">CartGuard AI — Admin</div>
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            className={tab === key ? "nav-item active" : "nav-item"}
            onClick={() => setTab(key)}
          >
            <i className={`ti ${t.icon}`} aria-hidden="true"></i>
            {t.label}
            {LIVE_TABS.has(key) && (
              <span className="sidebar-live-badge">LIVE</span>
            )}
          </button>
        ))}
      </aside>
      <main className="admin-content">
        <Active />
      </main>
    </div>
  );
};

export default AdminDashboard;