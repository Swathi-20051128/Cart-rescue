import { useState } from "react";
import api from "../../api/axios.js";

const UpliftAnalysis = () => {
  const [n, setN] = useState(10000);
  const [result, setResult] = useState(null);

  const run = async () => {
    const { data } = await api.get("/admin/uplift", { params: { n_sessions: n } });
    setResult(data);
  };

  return (
    <div>
      <h2>Synthetic Uplift Analysis</h2>
      <label>
        Number of sessions:
        <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))} />
      </label>
      <button onClick={run}>Run Simulation</button>
      {result && <pre className="result-json">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
};

export default UpliftAnalysis;
