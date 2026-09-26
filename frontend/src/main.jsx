import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";

import NetworkGraph from "./components/NetworkGraph";
import TemporalCharts from "./components/TemporalCharts";
import DatasetUpload from "./components/DatasetUpload";
import CommunityInvestigation from "./components/CommunityInvestigation";
import PathInvestigation from "./components/PathInvestigation";

const API = "http://127.0.0.1:8000/api";

function App() {
  const [summary, setSummary] = useState(null);
  const [communities, setCommunities] = useState(null);
  const [centrality, setCentrality] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  const [node, setNode] = useState("");
  const [simulation, setSimulation] = useState(null);

  // Temporal
  const [temporal, setTemporal] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [temporalLoading, setTemporalLoading] = useState(false);
  const [temporalError, setTemporalError] = useState("");

  // Network Intelligence
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] =
    useState(false);
  const [intelligenceError, setIntelligenceError] =
    useState("");

  // Dashboard refresh after dataset upload
  const [dashboardRefreshKey, setDashboardRefreshKey] =
    useState(0);

  // Community highlighting
  const [highlightedCommunity, setHighlightedCommunity] =
    useState(null);

  // Shortest-path investigation
  const [pathResult, setPathResult] = useState(null);

  // =========================================================
  // LOAD MAIN ANALYTICS
  // =========================================================

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [
          summaryResponse,
          communitiesResponse,
          centralityResponse,
          anomaliesResponse,
        ] = await Promise.all([
          fetch(`${API}/analytics/summary`),
          fetch(`${API}/communities`),
          fetch(`${API}/centrality`),
          fetch(`${API}/anomalies`),
        ]);

        if (
          !summaryResponse.ok ||
          !communitiesResponse.ok ||
          !centralityResponse.ok ||
          !anomaliesResponse.ok
        ) {
          throw new Error("Analytics API request failed");
        }

        const summaryData =
          await summaryResponse.json();

        const communitiesData =
          await communitiesResponse.json();

        const centralityData =
          await centralityResponse.json();

        const anomaliesData =
          await anomaliesResponse.json();

        setSummary(summaryData);
        setCommunities(communitiesData);
        setCentrality(
          centralityData.results || []
        );
        setAnomalies(
          anomaliesData.results || []
        );
      } catch (error) {
        console.error(
          "Analytics loading error:",
          error
        );
      }
    }

    loadAnalytics();
  }, [dashboardRefreshKey]);

  // =========================================================
  // LOAD NETWORK INTELLIGENCE
  // =========================================================

  useEffect(() => {
    async function loadIntelligence() {
      setIntelligenceLoading(true);
      setIntelligenceError("");

      try {
        const response = await fetch(
          `${API}/analytics/intelligence`
        );

        if (!response.ok) {
          throw new Error(
            "Network Intelligence API request failed"
          );
        }

        const data = await response.json();

        setIntelligence(data);
      } catch (error) {
        console.error(
          "Network Intelligence error:",
          error
        );

        setIntelligenceError(
          "Unable to load Network Intelligence."
        );
      } finally {
        setIntelligenceLoading(false);
      }
    }

    loadIntelligence();
  }, [dashboardRefreshKey]);

  // =========================================================
  // LOAD TEMPORAL ANALYSIS
  // =========================================================

  useEffect(() => {
    loadTemporal("", "");
  }, [dashboardRefreshKey]);

  async function loadTemporal(
    customStart = "",
    customEnd = ""
  ) {
    setTemporalLoading(true);
    setTemporalError("");

    try {
      const params = new URLSearchParams();

      if (customStart) {
        params.append("start", customStart);
      }

      if (customEnd) {
        params.append("end", customEnd);
      }

      const query = params.toString();

      const response = await fetch(
        `${API}/temporal${
          query ? `?${query}` : ""
        }`
      );

      if (!response.ok) {
        throw new Error(
          "Temporal API request failed"
        );
      }

      const data = await response.json();

      setTemporal(data);
    } catch (error) {
      console.error(
        "Temporal loading error:",
        error
      );

      setTemporalError(
        "Unable to load temporal network analysis."
      );
    } finally {
      setTemporalLoading(false);
    }
  }

  function applyTemporalFilter() {
    loadTemporal(startDate, endDate);
  }

  function resetTemporalFilter() {
    setStartDate("");
    setEndDate("");
    loadTemporal("", "");
  }

  // =========================================================
  // WHAT-IF SIMULATOR
  // =========================================================

  const simulate = async () => {
    if (!node.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/simulation/remove-node`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            node: node.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Simulation request failed"
        );
      }

      const result = await response.json();

      setSimulation(result);
    } catch (error) {
      console.error(
        "Simulation error:",
        error
      );

      setSimulation({
        error:
          "Unable to run simulation.",
      });
    }
  };

  // =========================================================
  // TEMPORAL INSIGHTS
  // =========================================================

  const timeline = temporal?.timeline || [];

  const busiestPeriod =
    timeline.length > 0
      ? [...timeline].sort(
          (a, b) =>
            b.records - a.records
        )[0]
      : null;

  const peakNodes =
    timeline.length > 0
      ? Math.max(
          ...timeline.map(
            (item) => item.nodes
          )
        )
      : 0;

  const highestDensity =
    timeline.length > 0
      ? Math.max(
          ...timeline.map((item) =>
            Number(item.density)
          )
        )
      : 0;

  const minimumComponents =
    timeline.length > 0
      ? Math.min(
          ...timeline.map(
            (item) =>
              Number(item.components)
          )
        )
      : 0;

  const maximumComponents =
    timeline.length > 0
      ? Math.max(
          ...timeline.map(
            (item) =>
              Number(item.components)
          )
        )
      : 0;

  // =========================================================
  // DATASET UPLOAD REFRESH
  // =========================================================

  function handleDatasetUploadSuccess() {
    setStartDate("");
    setEndDate("");
    setDashboardRefreshKey((current) => current + 1);
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header>
        <div>
          <h1>NETWORKTRACE</h1>

          <p>
            Graph Intelligence & Community Analysis
          </p>
        </div>

        <span className="status">
          ● API Analytics
        </span>
      </header>

      <main>

        {/* ===================================================
            SUMMARY CARDS
        =================================================== */}

        <section className="cards">
          {summary && (
            <>
              <div className="card">
                <small>NODES</small>
                <strong>
                  {summary.nodes}
                </strong>
              </div>

              <div className="card">
                <small>EDGES</small>
                <strong>
                  {summary.edges}
                </strong>
              </div>

              <div className="card">
                <small>COMMUNITIES</small>
                <strong>
                  {summary.communities}
                </strong>
              </div>

              <div className="card">
                <small>DENSITY</small>
                <strong>
                  {summary.density}
                </strong>
              </div>
            </>
          )}
        </section>

        {/* ===================================================
            NETWORK INTELLIGENCE
        =================================================== */}

        <section className="intelligence-section">

          <div className="section-heading">
            <div>
              <h2>
                Network Intelligence
              </h2>

              <p>
                Combined structural, community,
                centrality, anomaly and temporal
                network signals.
              </p>
            </div>

            <span className="intelligence-status">
              {intelligenceLoading
                ? "Loading..."
                : "● Intelligence Ready"}
            </span>
          </div>

          {intelligenceError && (
            <div className="intelligence-error">
              {intelligenceError}
            </div>
          )}

          {intelligence && (
            <>
              {/* Network Overview */}

              <div className="intelligence-cards">

                <div className="intelligence-card">
                  <small>
                    NETWORK NODES
                  </small>

                  <strong>
                    {
                      intelligence.network
                        .nodes
                    }
                  </strong>

                  <span>
                    entities in the network
                  </span>
                </div>

                <div className="intelligence-card">
                  <small>
                    RELATIONSHIPS
                  </small>

                  <strong>
                    {
                      intelligence.network
                        .edges
                    }
                  </strong>

                  <span>
                    observed relationships
                  </span>
                </div>

                <div className="intelligence-card">
                  <small>
                    COMMUNITIES
                  </small>

                  <strong>
                    {
                      intelligence.network
                        .communities
                    }
                  </strong>

                  <span>
                    detected groups
                  </span>
                </div>

                <div className="intelligence-card">
                  <small>
                    CONNECTED COMPONENTS
                  </small>

                  <strong>
                    {
                      intelligence.network
                        .components
                    }
                  </strong>

                  <span>
                    network components
                  </span>
                </div>

              </div>

              {/* Intelligence Grid */}

              <div className="intelligence-grid">

                {/* Community Distribution */}

                <div className="panel intelligence-panel">

                  <div className="panel-header">
                    <div>
                      <h2>
                        Community Distribution
                      </h2>

                      <p>
                        Number of nodes in each
                        detected community.
                      </p>
                    </div>
                  </div>

                  <div className="community-bars">

                    {Object.entries(
                      intelligence
                        .communities
                        .sizes
                    ).map(
                      ([community, size]) => {
                        const percentage =
                          (
                            (size /
                              intelligence
                                .network
                                .nodes) *
                            100
                          ).toFixed(1);

                        return (
                          <div
                            className="community-bar-row"
                            key={community}
                          >

                            <div className="community-bar-label">
                              <span>
                                Community{" "}
                                {community}
                              </span>

                              <strong>
                                {size}
                              </strong>
                            </div>

                            <div className="community-bar-track">
                              <div
                                className="community-bar-fill"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>

                            <small>
                              {percentage}% of
                              nodes
                            </small>

                          </div>
                        );
                      }
                    )}

                  </div>
                </div>

                {/* Connectivity */}

                <div className="panel intelligence-panel">

                  <div className="panel-header">
                    <div>
                      <h2>
                        Connectivity
                      </h2>

                      <p>
                        Overall connected
                        structure of the graph.
                      </p>
                    </div>
                  </div>

                  <div className="connectivity-stat">

                    <span>
                      Largest component
                    </span>

                    <strong>
                      {
                        intelligence
                          .connectivity
                          .largest_component
                      }
                    </strong>

                    <small>
                      nodes
                    </small>

                  </div>

                  <div className="connectivity-stat">

                    <span>
                      Network coverage
                    </span>

                    <strong>
                      {
                        intelligence
                          .connectivity
                          .largest_component_percentage
                      }
                      %
                    </strong>

                    <small>
                      of all nodes
                    </small>

                  </div>

                  <div className="connectivity-stat">

                    <span>
                      Components
                    </span>

                    <strong>
                      {
                        intelligence
                          .connectivity
                          .components
                      }
                    </strong>

                    <small>
                      connected groups
                    </small>

                  </div>

                </div>

                {/* Degree Centrality */}

                <div className="panel intelligence-panel">

                  <div className="panel-header">
                    <div>
                      <h2>
                        Degree Centrality
                      </h2>

                      <p>
                        Nodes with the highest
                        normalized degree values.
                      </p>
                    </div>
                  </div>

                  <div className="intelligence-list">

                    {intelligence.centrality.top_degree.map(
                      (item, index) => (
                        <div
                          className="intelligence-list-row"
                          key={item.node}
                        >
                          <span className="rank">
                            {index + 1}
                          </span>

                          <strong>
                            {item.node}
                          </strong>

                          <span>
                            {Number(
                              item.value
                            ).toFixed(6)}
                          </span>
                        </div>
                      )
                    )}

                  </div>
                </div>

                {/* Betweenness Centrality */}

                <div className="panel intelligence-panel">

                  <div className="panel-header">
                    <div>
                      <h2>
                        Betweenness Centrality
                      </h2>

                      <p>
                        Nodes with the highest
                        bridge-position scores.
                      </p>
                    </div>
                  </div>

                  <div className="intelligence-list">

                    {intelligence.centrality.top_betweenness.map(
                      (item, index) => (
                        <div
                          className="intelligence-list-row"
                          key={item.node}
                        >
                          <span className="rank">
                            {index + 1}
                          </span>

                          <strong>
                            {item.node}
                          </strong>

                          <span>
                            {Number(
                              item.value
                            ).toFixed(6)}
                          </span>
                        </div>
                      )
                    )}

                  </div>
                </div>

                {/* Structural Anomaly Signals */}

                <div className="panel intelligence-panel">

                  <div className="panel-header">
                    <div>
                      <h2>
                        Structural Anomaly Signals
                      </h2>

                      <p>
                        Highest Isolation Forest
                        anomaly scores.
                      </p>
                    </div>
                  </div>

                  <div className="intelligence-list">

                    {intelligence.anomalies.map(
                      (item, index) => (
                        <div
                          className="intelligence-list-row"
                          key={item.node}
                        >
                          <span className="rank">
                            {index + 1}
                          </span>

                          <strong>
                            {item.node}
                          </strong>

                          <span>
                            {Number(
                              item.anomaly_score
                            ).toFixed(5)}
                          </span>

                          <em
                            className={
                              item.is_anomaly
                                ? "signal-anomaly"
                                : "signal-normal"
                            }
                          >
                            {item.is_anomaly
                              ? "Signal"
                              : "Normal"}
                          </em>
                        </div>
                      )
                    )}

                  </div>
                </div>

                {/* Temporal Overview */}

                <div className="panel intelligence-panel">

                  <div className="panel-header">
                    <div>
                      <h2>
                        Temporal Overview
                      </h2>

                      <p>
                        Summary of activity across
                        the available timeline.
                      </p>
                    </div>
                  </div>

                  <div className="temporal-overview">

                    <div>
                      <small>
                        PERIODS
                      </small>

                      <strong>
                        {
                          intelligence
                            .temporal
                            .periods
                        }
                      </strong>
                    </div>

                    <div>
                      <small>
                        BUSIEST PERIOD
                      </small>

                      <strong>
                        {
                          intelligence
                            .temporal
                            .busiest_period
                        }
                      </strong>
                    </div>

                    <div>
                      <small>
                        RELATIONSHIPS
                      </small>

                      <strong>
                        {
                          intelligence
                            .temporal
                            .busiest_period_records
                        }
                      </strong>
                    </div>

                  </div>

                </div>

              </div>
            </>
          )}

        </section>

        {/* ===================================================
            DATASET MANAGEMENT
        =================================================== */}

        <DatasetUpload
          onUploadSuccess={handleDatasetUploadSuccess}
        />

        {/* ===================================================
            NETWORK EXPLORER
        =================================================== */}

        <NetworkGraph
          key={dashboardRefreshKey}
          centrality={centrality}
          anomalies={anomalies}
          communities={
            communities?.communities || {}
          }
          highlightedCommunity={highlightedCommunity}
          pathResult={pathResult}
        />

        {/* ===================================================
            COMMUNITY INVESTIGATION
        =================================================== */}

        <CommunityInvestigation
          communities={
            communities?.communities || {}
          }
          centrality={centrality}
          onHighlightCommunity={setHighlightedCommunity}
        />

        {/* ===================================================
            PATH INVESTIGATION
        =================================================== */}

        <PathInvestigation
          nodes={Object.values(
            communities?.communities || {}
          ).flat()}
          onPathFound={setPathResult}
        />

        {/* ===================================================
            COMMUNITIES + CENTRALITY
        =================================================== */}

        <section className="grid">

          <div className="panel">
            <h2>Communities</h2>

            {communities?.communities &&
              Object.entries(
                communities.communities
              ).map(
                ([id, nodes]) => (
                  <div
                    className="community"
                    key={id}
                  >
                    <b>
                      Community {id}
                    </b>

                    <span>
                      {nodes.join(", ")}
                    </span>
                  </div>
                )
              )}
          </div>

          <div className="panel">
            <h2>
              Centrality Signals
            </h2>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Node</th>
                    <th>Degree</th>
                    <th>
                      Betweenness
                    </th>
                    <th>Closeness</th>
                  </tr>
                </thead>

                <tbody>
                  {centrality
                    .slice(0, 10)
                    .map((item) => (
                      <tr
                        key={item.node}
                      >
                        <td>
                          {item.node}
                        </td>

                        <td>
                          {Number(
                            item.degree
                          ).toFixed(4)}
                        </td>

                        <td>
                          {Number(
                            item.betweenness
                          ).toFixed(4)}
                        </td>

                        <td>
                          {Number(
                            item.closeness
                          ).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        {/* ===================================================
            ANOMALIES + SIMULATOR
        =================================================== */}

        <section className="grid">

          <div className="panel">
            <h2>
              Structural Anomalies
            </h2>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Node</th>
                    <th>Score</th>
                    <th>Signal</th>
                  </tr>
                </thead>

                <tbody>
                  {anomalies
                    .slice(0, 10)
                    .map((item) => {
                      const score =
                        Number(
                          item.anomaly_score
                        );

                      const signal =
                        item.signal ??
                        (item.is_anomaly
                          ? "Anomaly"
                          : "Normal");

                      return (
                        <tr
                          key={item.node}
                        >
                          <td>
                            {item.node}
                          </td>

                          <td>
                            {Number.isFinite(
                              score
                            )
                              ? score.toFixed(
                                  4
                                )
                              : "0.0000"}
                          </td>

                          <td>
                            {signal}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel whatif-panel">
            <div className="whatif-header">
              <div>
                <h2>What-If Simulator</h2>

                <p className="panel-description">
                  Simulate the structural effect of removing a node from the network.
                </p>
              </div>

              <span className="whatif-badge">
                NETWORK SIMULATION
              </span>
            </div>

            <div className="simulator-controls">
              <input
                type="text"
                placeholder="Enter node e.g. P049"
                value={node}
                onChange={(e) =>
                  setNode(e.target.value.toUpperCase())
                }
              />

              <button onClick={simulate}>
                Simulate
              </button>
            </div>

            {simulation && (
              <div className="simulation-output">
                {simulation.error ? (
                  <div className="simulation-error">
                    <strong>Simulation Error</strong>
                    <span>{simulation.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="simulation-node-banner">
                      <div>
                        <small>SIMULATED NODE REMOVAL</small>
                        <strong>{simulation.node}</strong>
                      </div>
                      <span>What-If Scenario</span>
                    </div>

                    <div className="simulation-table">
                      <div className="simulation-table-header">
                        <span>METRIC</span>
                        <span>BEFORE</span>
                        <span>AFTER</span>
                        <span>CHANGE</span>
                      </div>

                      {(() => {
                        const before = simulation.before || {};
                        const after = simulation.after || {};
                        const changes = {
                          nodes: Number(after.nodes || 0) - Number(before.nodes || 0),
                          edges: Number(after.edges || 0) - Number(before.edges || 0),
                          communities: Number(after.communities || 0) - Number(before.communities || 0),
                          components: Number(after.components || 0) - Number(before.components || 0),
                          density: Number(after.density || 0) - Number(before.density || 0),
                        };

                        const formatChange = (value, digits = 0) => {
                          const formatted = Number(value).toFixed(digits);
                          return value > 0 ? `+${formatted}` : formatted;
                        };

                        const impactClass = (value, positiveGood = false) => {
                          if (value === 0) return "impact-neutral";
                          return positiveGood
                            ? value > 0 ? "impact-positive" : "impact-negative"
                            : value < 0 ? "impact-negative" : "impact-positive";
                        };

                        return (
                          <>
                            <div className="simulation-row">
                              <span>Nodes</span>
                              <strong>{before.nodes ?? "—"}</strong>
                              <strong>{after.nodes ?? "—"}</strong>
                              <strong className={impactClass(changes.nodes)}>{formatChange(changes.nodes)}</strong>
                            </div>

                            <div className="simulation-row">
                              <span>Edges</span>
                              <strong>{before.edges ?? "—"}</strong>
                              <strong>{after.edges ?? "—"}</strong>
                              <strong className={impactClass(changes.edges)}>{formatChange(changes.edges)}</strong>
                            </div>

                            <div className="simulation-row">
                              <span>Communities</span>
                              <strong>{before.communities ?? "—"}</strong>
                              <strong>{after.communities ?? "—"}</strong>
                              <strong className={impactClass(changes.communities, true)}>{formatChange(changes.communities)}</strong>
                            </div>

                            <div className="simulation-row">
                              <span>Components</span>
                              <strong>{before.components ?? "—"}</strong>
                              <strong>{after.components ?? "—"}</strong>
                              <strong className={impactClass(changes.components, true)}>{formatChange(changes.components)}</strong>
                            </div>

                            <div className="simulation-row">
                              <span>Density</span>
                              <strong>{Number(before.density || 0).toFixed(6)}</strong>
                              <strong>{Number(after.density || 0).toFixed(6)}</strong>
                              <strong className={impactClass(changes.density)}>{formatChange(changes.density, 6)}</strong>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="simulation-impact">
                      <div className="simulation-impact-title">
                        <span>NETWORK IMPACT</span>
                      </div>

                      <div className="impact-grid">
                        <div className="impact-card">
                          <span className="impact-icon">🔗</span>
                          <div>
                            <small>RELATIONSHIPS REMOVED</small>
                            <strong>
                              {Math.max(
                                0,
                                Number(simulation.before?.edges || 0) - Number(simulation.after?.edges || 0)
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="impact-card">
                          <span className="impact-icon">👥</span>
                          <div>
                            <small>COMMUNITY CHANGE</small>
                            <strong>
                              {Number(simulation.after?.communities || 0) - Number(simulation.before?.communities || 0) > 0 ? "+" : ""}
                              {Number(simulation.after?.communities || 0) - Number(simulation.before?.communities || 0)}
                            </strong>
                          </div>
                        </div>

                        <div className="impact-card">
                          <span className="impact-icon">🌐</span>
                          <div>
                            <small>COMPONENT CHANGE</small>
                            <strong>
                              {Number(simulation.after?.components || 0) - Number(simulation.before?.components || 0) > 0 ? "+" : ""}
                              {Number(simulation.after?.components || 0) - Number(simulation.before?.components || 0)}
                            </strong>
                          </div>
                        </div>

                        <div className="impact-card">
                          <span className="impact-icon">📉</span>
                          <div>
                            <small>DENSITY CHANGE</small>
                            <strong>
                              {(Number(simulation.after?.density || 0) - Number(simulation.before?.density || 0)).toFixed(6)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="simulation-note">
                      <strong>Structural interpretation</strong>
                      <p>
                        This simulation shows how the network structure changes under a hypothetical node-removal scenario. The results describe graph structure only and should not be interpreted as evidence about real-world behavior.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </section>

        {/* ===================================================
            TEMPORAL NETWORK ANALYSIS
        =================================================== */}

        <section className="temporal-section">

          <div className="section-heading">

            <div>
              <h2>
                Temporal Network Analysis
              </h2>

              <p>
                Analyze how network structure
                changes across time.
              </p>
            </div>

            <span className="temporal-status">
              {temporalLoading
                ? "Loading..."
                : "● Temporal Data"}
            </span>

          </div>

          {/* Date Filters */}

          <div className="temporal-filters">

            <div className="date-control">
              <label>
                START DATE
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="date-control">
              <label>
                END DATE
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
              />
            </div>

            <button
              onClick={
                applyTemporalFilter
              }
            >
              Apply Filter
            </button>

            <button
              className="secondary-button"
              onClick={
                resetTemporalFilter
              }
            >
              Reset
            </button>

          </div>

          {temporalError && (
            <div className="temporal-error">
              {temporalError}
            </div>
          )}

          {temporal && (
            <>

              {/* Temporal Summary */}

              <div className="temporal-cards">

                <div className="temporal-card">
                  <small>
                    RECORDS
                  </small>

                  <strong>
                    {temporal.records}
                  </strong>
                </div>

                <div className="temporal-card">
                  <small>
                    ACTIVE NODES
                  </small>

                  <strong>
                    {temporal.nodes}
                  </strong>
                </div>

                <div className="temporal-card">
                  <small>
                    EDGES
                  </small>

                  <strong>
                    {temporal.edges}
                  </strong>
                </div>

                <div className="temporal-card">
                  <small>
                    COMPONENTS
                  </small>

                  <strong>
                    {temporal.components}
                  </strong>
                </div>

              </div>

              {/* Temporal Charts */}

              <div className="panel temporal-panel">

                <div className="panel-header">

                  <div>
                    <h2>
                      Temporal Trends
                    </h2>

                    <p>
                      Visual representation of
                      network changes across
                      monthly snapshots.
                    </p>
                  </div>

                  <span>
                    {timeline.length} periods
                  </span>

                </div>

                <TemporalCharts
                  timeline={timeline}
                />

              </div>

              {/* Timeline */}

              <div className="panel temporal-panel">

                <div className="panel-header">

                  <div>
                    <h2>
                      Network Timeline
                    </h2>

                    <p>
                      Monthly structural
                      statistics for the
                      selected period.
                    </p>
                  </div>

                  <span>
                    {timeline.length} periods
                  </span>

                </div>

                {timeline.length > 0 ? (
                  <div className="table-wrapper">

                    <table className="temporal-table">

                      <thead>
                        <tr>
                          <th>PERIOD</th>
                          <th>
                            RELATIONSHIPS
                          </th>
                          <th>
                            ACTIVE NODES
                          </th>
                          <th>DENSITY</th>
                          <th>
                            COMPONENTS
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {timeline.map(
                          (item) => (
                            <tr
                              key={
                                item.period
                              }
                            >
                              <td>
                                <strong>
                                  {
                                    item.period
                                  }
                                </strong>
                              </td>

                              <td>
                                {
                                  item.records
                                }
                              </td>

                              <td>
                                {
                                  item.nodes
                                }
                              </td>

                              <td>
                                {Number(
                                  item.density
                                ).toFixed(
                                  6
                                )}
                              </td>

                              <td>
                                {
                                  item.components
                                }
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>

                    </table>

                  </div>
                ) : (
                  <div className="empty-state">
                    No temporal records
                    found for the
                    selected period.
                  </div>
                )}

              </div>

              {/* Temporal Insights */}

              {timeline.length > 0 && (
                <div className="temporal-insights">

                  <div className="insight-card">
                    <small>
                      BUSIEST PERIOD
                    </small>

                    <strong>
                      {
                        busiestPeriod?.period
                      }
                    </strong>

                    <span>
                      {
                        busiestPeriod?.records
                      }{" "}
                      relationships
                    </span>
                  </div>

                  <div className="insight-card">
                    <small>
                      PEAK ACTIVE NODES
                    </small>

                    <strong>
                      {peakNodes}
                    </strong>

                    <span>
                      maximum active nodes
                      in a period
                    </span>
                  </div>

                  <div className="insight-card">
                    <small>
                      HIGHEST DENSITY
                    </small>

                    <strong>
                      {highestDensity.toFixed(
                        6
                      )}
                    </strong>

                    <span>
                      maximum observed
                      snapshot density
                    </span>
                  </div>

                  <div className="insight-card">
                    <small>
                      COMPONENT RANGE
                    </small>

                    <strong>
                      {minimumComponents} →{" "}
                      {maximumComponents}
                    </strong>

                    <span>
                      observed connected
                      components
                    </span>
                  </div>

                </div>
              )}

            </>
          )}

        </section>

      </main>
    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <App />
);