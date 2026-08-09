import { useState } from "react";
import Overview from "./Overview.jsx";
import ScoreSession from "./ScoreSession.jsx";
import AuditLog from "./AuditLog.jsx";
import DemoScenarios from "./DemoScenarios.jsx";
import UpliftAnalysis from "./UpliftAnalysis.jsx";

const TABS = {
  overview: { label: "Overview", component: Overview },
  score: { label: "Score a Session", component: ScoreSession },
  demo: { label: "Demo Scenarios", component: DemoScenarios },
  uplift: { label: "Uplift Analysis", component: UpliftAnalysis },
  audit: { label: "Audit Log", component: AuditLog },
};

const AdminDashboard = () => {
  const [tab, setTab] = useState("overview");
  const Active = TABS[tab].component;

  return (
    <div className="page admin-page">
      <h1>CartGuard AI — Admin Dashboard</h1>
      <div className="tabs">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            className={tab === key ? "tab active" : "tab"}
            onClick={() => setTab(key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        <Active />
      </div>
    </div>
  );
};

export default AdminDashboard;
