import React, { useMemo, useState } from "react";
import "../styles/path_investigation.css";

const API_BASE = "http://127.0.0.1:8000";

export default function PathInvestigation({
  nodes = [],
  onPathFound,
}) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nodeList = useMemo(() => {
    return [...nodes]
      .map((node) => {
        if (typeof node === "string") {
          return node;
        }

        return node?.id ?? node?.node ?? node?.name ?? "";
      })
      .filter(Boolean)
      .map(String)
      .sort();
  }, [nodes]);

  async function findShortestPath() {
    setError("");
    setResult(null);

    if (!source || !target) {
      setError("Please select both source and target nodes.");
      return;
    }

    if (source === target) {
      setError("Source and target must be different nodes.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        source,
        target,
      });

      const response = await fetch(
        `${API_BASE}/api/path/shortest?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to find the shortest path."
        );
      }

      setResult(data);

      if (onPathFound) {
        onPathFound(data);
      }
    } catch (err) {
      setError(
        err.message || "Unable to find the shortest path."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearPath() {
    setSource("");
    setTarget("");
    setResult(null);
    setError("");

    if (onPathFound) {
      onPathFound(null);
    }
  }

  return (
    <section className="path-investigation-panel">
      <div className="path-investigation-header">
        <div>
          <h2>Path Investigation</h2>

          <p>
            Find the shortest structural path between two
            nodes in the network.
          </p>
        </div>
      </div>

      <div className="path-controls">
        <div className="path-field">
          <label htmlFor="path-source">
            Source Node
          </label>

          <select
            id="path-source"
            value={source}
            onChange={(event) =>
              setSource(event.target.value)
            }
          >
            <option value="">
              Select source
            </option>

            {nodeList.map((node) => (
              <option key={node} value={node}>
                {node}
              </option>
            ))}
          </select>
        </div>

        <div className="path-arrow">
          →
        </div>

        <div className="path-field">
          <label htmlFor="path-target">
            Target Node
          </label>

          <select
            id="path-target"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value)
            }
          >
            <option value="">
              Select target
            </option>

            {nodeList.map((node) => (
              <option key={node} value={node}>
                {node}
              </option>
            ))}
          </select>
        </div>

        <div className="path-actions">
          <button
            type="button"
            className="path-find-button"
            onClick={findShortestPath}
            disabled={loading}
          >
            {loading
              ? "Finding..."
              : "Find Shortest Path"}
          </button>

          <button
            type="button"
            className="path-clear-button"
            onClick={clearPath}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="path-error">
          {error}
        </div>
      )}

      {result && (
        <div className="path-result">
          <div className="path-result-header">
            <div>
              <h3>Shortest Path Result</h3>

              <span>
                {result.connected
                  ? "Connected"
                  : "No path found"}
              </span>
            </div>
          </div>

          {result.connected ? (
            <>
              <div className="path-metrics">
                <div className="path-metric-card">
                  <span>Source</span>
                  <strong>
                    {result.source}
                  </strong>
                </div>

                <div className="path-metric-card">
                  <span>Target</span>
                  <strong>
                    {result.target}
                  </strong>
                </div>

                <div className="path-metric-card">
                  <span>Path Length</span>
                  <strong>
                    {result.path_length} hops
                  </strong>
                </div>

                <div className="path-metric-card">
                  <span>Nodes in Path</span>
                  <strong>
                    {result.nodes_in_path}
                  </strong>
                </div>
              </div>

              <div className="path-chain">
                <h4>Discovered Path</h4>

                <div className="path-chain-list">
                  {result.path?.map(
                    (node, index) => (
                      <div
                        className="path-chain-item"
                        key={`${node}-${index}`}
                      >
                        <span className="path-node">
                          {node}
                        </span>

                        {index <
                          result.path.length - 1 && (
                          <span className="path-chain-arrow">
                            →
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="path-hops">
                <h4>
                  Relationship Details
                </h4>

                {result.hops?.map(
                  (hop, index) => (
                    <div
                      className="path-hop-card"
                      key={`${hop.from}-${hop.to}-${index}`}
                    >
                      <div className="path-hop-title">
                        <strong>
                          {hop.from} → {hop.to}
                        </strong>

                        <span>
                          Hop {index + 1}
                        </span>
                      </div>

                      {hop.relationships?.length >
                      0 ? (
                        <div className="path-relationship-list">
                          {hop.relationships.map(
                            (
                              relationship,
                              relationshipIndex
                            ) => (
                              <div
                                className="path-relationship"
                                key={`${relationship.source}-${relationship.target}-${relationshipIndex}`}
                              >
                                <span>
                                  {
                                    relationship.relationship
                                  }
                                </span>

                                <span>
                                  Weight:{" "}
                                  {
                                    relationship.weight
                                  }
                                </span>

                                <span>
                                  {
                                    relationship.timestamp
                                  }
                                </span>

                                <span>
                                  {
                                    relationship.direction
                                  }
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p>
                          No relationship metadata
                          available for this hop.
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="path-no-result">
              <strong>
                No path exists
              </strong>

              <p>
                {result.message}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}