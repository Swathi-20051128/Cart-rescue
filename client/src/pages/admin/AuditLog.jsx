import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [sessionFilter, setSessionFilter] = useState("");

  const load = () => {
    api.get("/admin/audit-log", { params: { limit: 50, session_id: sessionFilter || undefined } })
      .then((res) => setLogs(res.data.logs || res.data));
  };

  useEffect(() => { load(); }, [sessionFilter]);

  return (
    <div>
      <h2>Audit Log</h2>
      <input
        placeholder="Filter by session_id"
        value={sessionFilter}
        onChange={(e) => setSessionFilter(e.target.value)}
      />
      <table className="admin-table">
        <thead>
          <tr>
            <th>Timestamp</th><th>Session</th><th>User</th><th>Risk</th><th>Root Cause</th>
            <th>Action</th><th>Channel</th><th>Discount</th><th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.timestamp).toLocaleString()}</td>
              <td>{l.session_id}</td>
              <td>{l.user_id}</td>
              <td>{(l.risk_score * 100).toFixed(0)}% ({l.risk_level})</td>
              <td>{l.root_cause}</td>
              <td>{l.action_type}</td>
              <td>{l.channel}</td>
              <td>₹{l.discount_amount}</td>
              <td>{l.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLog;