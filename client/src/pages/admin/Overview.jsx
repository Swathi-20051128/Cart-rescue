import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import api from "../../api/axios.js";

const COLORS = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

const Overview = () => {
  const [data, setData] = useState(null);
  const [liveSessions, setLiveSessions] = useState([]);

  const load = () => {
    api.get("/admin/overview").then((res) => setData(res.data)).catch(() => {});
    api.get("/admin/live-sessions").then((res) => setLiveSessions(res.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // real-time polling
    return () => clearInterval(interval);
  }, []);

  if (!data) return <p>Loading metrics... (is the Python ML service running?)</p>;

  const causeData = Object.entries(data.cause_distribution || {}).map(([name, value]) => ({ name, value }));
  const actionData = Object.entries(data.action_distribution || {}).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi"><span>{data.total_sessions}</span>Total Sessions</div>
        <div className="kpi"><span>{data.high_risk_sessions}</span>High Risk</div>
        <div className="kpi"><span>{data.recovery_rate}</span>Recovery Rate</div>
        <div className="kpi"><span>₹{data.total_discount_inr}</span>Total Discounts</div>
        <div className="kpi"><span>{data.avg_latency_ms} ms</span>Avg Latency</div>
        <div className="kpi"><span>{data.total_users}</span>Registered Users</div>
        <div className="kpi"><span>{data.total_orders}</span>Orders Placed</div>
        <div className="kpi"><span>{data.live_carts}</span>Live Carts (real-time)</div>
      </div>

      <div className="chart-row">
        <div className="chart-box">
          <h3>Root Cause Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={causeData} dataKey="value" nameKey="name" outerRadius={90} label>
                {causeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-box">
          <h3>Action Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={actionData}>
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h3>Live Carts (auto-refreshing every 5s)</h3>
      <table className="admin-table">
        <thead>
          <tr><th>User</th><th>Session</th><th>Items</th><th>Cart Value</th><th>Risk</th><th>Level</th></tr>
        </thead>
        <tbody>
          {liveSessions.map((c) => (
            <tr key={c._id}>
              <td>{c.user?.name} ({c.user?.email})</td>
              <td>{c.sessionId}</td>
              <td>{c.items.length}</td>
              <td>₹{c.items.reduce((s, i) => s + i.price * i.quantity, 0)}</td>
              <td>{(c.lastRiskScore * 100).toFixed(0)}%</td>
              <td><span className={`badge badge-${c.lastRiskLevel?.toLowerCase()}`}>{c.lastRiskLevel}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Overview;
