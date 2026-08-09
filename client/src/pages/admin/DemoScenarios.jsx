import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const DemoScenarios = () => {
  const [scenarios, setScenarios] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get("/admin/demo-scenarios").then((res) => setScenarios(res.data.scenarios || res.data));
  }, []);

  const run = async (name) => {
    const { data } = await api.post(`/admin/demo-scenarios/${name}/run`);
    setResult(data);
  };

  return (
    <div>
      <h2>Demo Scenarios</h2>
      <div className="scenario-grid">
        {(Array.isArray(scenarios) ? scenarios : []).map((s, idx) => {
          const name = typeof s === "string" ? s : s.name || s.id;
          return (
            <div key={idx} className="scenario-card">
              <h4>{name}</h4>
              <button onClick={() => run(name)}>Run</button>
            </div>
          );
        })}
      </div>
      {result && (
        <pre className="result-json">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

export default DemoScenarios;
