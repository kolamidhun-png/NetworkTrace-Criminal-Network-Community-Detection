import React, { useMemo, useState } from "react";

const API = "http://127.0.0.1:8000/api";

function Metric({ label, before, after, format = (value) => value }) {
  const numericBefore = Number(before);
  const numericAfter = Number(after);
  const delta =
    Number.isFinite(numericBefore) && Number.isFinite(numericAfter)
      ? numericAfter - numericBefore
      : null;

  return (
    <div className="sim-metric">
      <span>{label}</span>
      <div className="sim-metric-values">
        <strong>{format(before)}</strong>
        <span className="sim-arrow">→</span>
        <strong>{format(after)}</strong>
      </div>
      {delta !== null && (
        <small className={delta > 0 ? "sim-delta-positive" : delta < 0 ? "sim-delta-negative" : "sim-delta-neutral"}>
          {delta > 0 ? "+" : ""}
          {format(delta)}
        </small>
      )}
    </div>
  );
}

function pctDelta(before, after) {
  const b = Number(before);
  const a = Number(after);
  if (!Number.isFinite(b) || !Number.isFinite(a)) return "—";
  const delta = a - b;
  return `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(3)}%`;
}

export default function WhatIfSimulator() {
  const [node, setNode] = useState("");
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSimulation = async () => {
    const value = node.trim().toUpperCase();

    if (!value) {
      setError("Enter a node ID such as P049.");
      setSimulation(null);
      return;
    }

    setLoading(true);
    setError("");
    setSimulation(null);

    try {
      const response = await fetch(`${API}/simulation/remove-node`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ node: value }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : data.message || "Simulation request failed."
        );
      }

      if (data.exists === false) {
        throw new Error(`Node ${value} was not found in the active network.`);
      }

      setSimulation(data);
      setNode(value);
    } catch (err) {
      console.error("What-If simulation error:", err);
      setError(err.message || "Unable to run the simulation.");
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = () => {
    setSimulation(null);
    setError("");
    setNode("");
  };

  const impact = useMemo(() => {
    if (!simulation?.before || !simulation?.after) return null;

    const before = simulation.before;
    const after = simulation.after;

    const edgeDelta = Number(after.edges) - Number(before.edges);
    const nodeDelta = Number(after.nodes) - Number(before.nodes);
    const communityDelta =
      Number(after.communities) - Number(before.communities);
    const componentDelta =
      Number(after.components) - Number(before.components);
    const densityDelta =
      Number(after.density) - Number(before.density);

    return {
      edgeDelta,
      nodeDelta,
      communityDelta,
      componentDelta,
      densityDelta,
      densityPercent: pctDelta(before.density, after.density),
      disconnected:
        Number(after.components) > Number(before.components),
      communityChanged:
        Number(after.communities) !== Number(before.communities),
    };
  }, [simulation]);

  return (
    <section className="simulator-section">
      <div className="simulator-header">
        <div>
          <span className="section-kicker">SCENARIO ANALYSIS</span>
          <h2>What-If Network Simulator</h2>
          <p>
            Simulate node removal and measure how the network structure changes.
          </p>
        </div>

        <span className="simulator-badge">
          {loading ? "● Running" : "● Simulation Ready"}
        </span>
      </div>

      <div className="simulator-input-row">
        <div className="simulator-input-wrap">
          <label htmlFor="what-if-node">NODE TO REMOVE</label>
          <input
            id="what-if-node"
            type="text"
            value={node}
            placeholder="Enter node e.g. P049"
            onChange={(event) => setNode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSimulation();
            }}
            disabled={loading}
          />
        </div>

        <button
          type="button"
          className="simulator-run-button"
          onClick={runSimulation}
          disabled={loading}
        >
          {loading ? "Simulating..." : "Run Simulation"}
        </button>

        {(simulation || error) && (
          <button
            type="button"
            className="simulator-reset-button"
            onClick={resetSimulation}
            disabled={loading}
          >
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="simulator-error">
          <strong>Simulation failed</strong>
          <span>{error}</span>
        </div>
      )}

      {simulation && impact && (
        <div className="simulator-results">
          <div className="simulator-result-title">
            <div>
              <span>SIMULATION RESULT</span>
              <h3>
                Removing <strong>{simulation.node}</strong>
              </h3>
            </div>

            <div className="simulator-impact-pill">
              {impact.disconnected
                ? "Connectivity changed"
                : impact.communityChanged
                  ? "Community structure changed"
                  : "Network structure changed"}
            </div>
          </div>

          <div className="simulator-metrics-grid">
            <Metric
              label="Nodes"
              before={simulation.before.nodes}
              after={simulation.after.nodes}
            />

            <Metric
              label="Relationships"
              before={simulation.before.edges}
              after={simulation.after.edges}
            />

            <Metric
              label="Communities"
              before={simulation.before.communities}
              after={simulation.after.communities}
            />

            <Metric
              label="Components"
              before={simulation.before.components}
              after={simulation.after.components}
            />

            <Metric
              label="Density"
              before={simulation.before.density}
              after={simulation.after.density}
              format={(value) => Number(value).toFixed(6)}
            />
          </div>

          <div className="simulator-impact-grid">
            <div className="simulator-impact-card">
              <small>RELATIONSHIPS REMOVED</small>
              <strong>{Math.abs(impact.edgeDelta)}</strong>
              <span>
                {impact.edgeDelta < 0
                  ? "connections lost with the removed node"
                  : "net relationship change"}
              </span>
            </div>

            <div className="simulator-impact-card">
              <small>DENSITY CHANGE</small>
              <strong>{impact.densityPercent}</strong>
              <span>
                {impact.densityDelta < 0
                  ? "lower structural density"
                  : impact.densityDelta > 0
                    ? "higher structural density"
                    : "no density change"}
              </span>
            </div>

            <div className="simulator-impact-card">
              <small>COMMUNITY CHANGE</small>
              <strong>
                {impact.communityDelta > 0 ? "+" : ""}
                {impact.communityDelta}
              </strong>
              <span>
                {impact.communityDelta > 0
                  ? "additional communities detected"
                  : impact.communityDelta < 0
                    ? "fewer communities detected"
                    : "community count unchanged"}
              </span>
            </div>

            <div className="simulator-impact-card">
              <small>CONNECTIVITY CHANGE</small>
              <strong>
                {impact.componentDelta > 0 ? "+" : ""}
                {impact.componentDelta}
              </strong>
              <span>
                {impact.componentDelta > 0
                  ? "additional disconnected component"
                  : impact.componentDelta < 0
                    ? "fewer connected components"
                    : "component count unchanged"}
              </span>
            </div>
          </div>

          <div className="simulator-comparison">
            <div className="comparison-column">
              <div className="comparison-heading">
                <span>BEFORE</span>
                <strong>{simulation.node} present</strong>
              </div>
              <div className="comparison-stats">
                <span>
                  Nodes <b>{simulation.before.nodes}</b>
                </span>
                <span>
                  Relationships <b>{simulation.before.edges}</b>
                </span>
                <span>
                  Communities <b>{simulation.before.communities}</b>
                </span>
                <span>
                  Components <b>{simulation.before.components}</b>
                </span>
                <span>
                  Density <b>{Number(simulation.before.density).toFixed(6)}</b>
                </span>
              </div>
            </div>

            <div className="comparison-divider">→</div>

            <div className="comparison-column comparison-after">
              <div className="comparison-heading">
                <span>AFTER</span>
                <strong>{simulation.node} removed</strong>
              </div>
              <div className="comparison-stats">
                <span>
                  Nodes <b>{simulation.after.nodes}</b>
                </span>
                <span>
                  Relationships <b>{simulation.after.edges}</b>
                </span>
                <span>
                  Communities <b>{simulation.after.communities}</b>
                </span>
                <span>
                  Components <b>{simulation.after.components}</b>
                </span>
                <span>
                  Density <b>{Number(simulation.after.density).toFixed(6)}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="simulator-note">
            <strong>Interpretation:</strong>{" "}
            This scenario measures structural change in the graph. It is a
            network-analysis simulation and should not be interpreted as proof
            about real-world behavior or responsibility.
          </div>
        </div>
      )}
    </section>
  );
}
