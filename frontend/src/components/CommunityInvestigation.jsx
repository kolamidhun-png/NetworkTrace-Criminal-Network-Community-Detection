import React, { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000/api";

const communityColors = [
  "#6f9cff",
  "#8d7cff",
  "#59b98a",
  "#d59a5b",
  "#cf6f91",
  "#58b6c9",
  "#a58be0",
  "#8fae67",
];

function normalizeRows(data) {
  if (Array.isArray(data?.rows)) return data.rows;

  if (Array.isArray(data?.edges)) {
    return data.edges.map((edge) => ({
      source: edge.source ?? edge.data?.source,
      target: edge.target ?? edge.data?.target,
      relationship:
        edge.relationship ??
        edge.data?.relationship ??
        edge.type ??
        edge.data?.type ??
        "relationship",
      timestamp: edge.timestamp ?? edge.data?.timestamp ?? "",
      weight: edge.weight ?? edge.data?.weight ?? 1,
    }));
  }

  if (Array.isArray(data)) return data;
  return [];
}

function buildMetrics(communityId, members, rows, centrality) {
  const memberSet = new Set(members);

  const internalRows = rows.filter(
    (row) => memberSet.has(row.source) && memberSet.has(row.target)
  );

  const externalRows = rows.filter(
    (row) =>
      (memberSet.has(row.source) && !memberSet.has(row.target)) ||
      (memberSet.has(row.target) && !memberSet.has(row.source))
  );

  const internalWeights = internalRows.map((row) => Number(row.weight) || 0);
  const averageWeight = internalWeights.length
    ? internalWeights.reduce((sum, value) => sum + value, 0) /
      internalWeights.length
    : 0;

  const relationshipTypes = {};
  internalRows.forEach((row) => {
    const type = row.relationship || "relationship";
    relationshipTypes[type] = (relationshipTypes[type] || 0) + 1;
  });

  const degrees = members.map((node) => Number(centrality[node]?.degree) || 0);
  const averageDegree = degrees.length
    ? degrees.reduce((sum, value) => sum + value, 0) / degrees.length
    : 0;

  const possibleInternalEdges = (members.length * (members.length - 1)) / 2;
  const internalDensity =
    possibleInternalEdges > 0
      ? internalRows.length / possibleInternalEdges
      : 0;

  const externalNodes = new Set();
  externalRows.forEach((row) => {
    externalNodes.add(memberSet.has(row.source) ? row.target : row.source);
  });

  return {
    communityId,
    members,
    internalRows,
    externalRows,
    internalEdges: internalRows.length,
    externalEdges: externalRows.length,
    externalNodes: externalNodes.size,
    internalDensity,
    averageDegree,
    averageWeight,
    relationshipTypes,
  };
}

export default function CommunityInvestigation({
  communities = {},
  centrality = [],
  onHighlightCommunity,
}) {
  const communityEntries = useMemo(
    () =>
      Object.entries(communities || {}).sort(
        ([a], [b]) => Number(a) - Number(b)
      ),
    [communities]
  );

  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlighted, setHighlighted] = useState(false);

  const centralityMap = useMemo(() => {
    const map = {};
    centrality.forEach((item) => {
      map[item.node] = item;
    });
    return map;
  }, [centrality]);

  useEffect(() => {
    if (!selectedCommunity && communityEntries.length) {
      setSelectedCommunity(communityEntries[0][0]);
    }
  }, [communityEntries, selectedCommunity]);

  useEffect(() => {
    async function loadRelationships() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API}/community/investigation?community=${encodeURIComponent(
            selectedCommunity
          )}`
        );

        if (!response.ok) {
          throw new Error("Community investigation data could not be loaded.");
        }

        const data = await response.json();
        const selected = data.communities?.[0];

        if (selected) {
          setRows([
            ...(selected.internal_relationships || []),
            ...(selected.external_relationships || []),
          ]);
        } else {
          setRows([]);
        }
      } catch (err) {
        console.error("Community relationship loading error:", err);
        setError(
          "Community membership is available, but relationship-level metrics could not be loaded."
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    loadRelationships();
  }, [selectedCommunity]);

  const selectedMembers =
    communities?.[selectedCommunity] || [];

  const metrics = useMemo(
    () =>
      buildMetrics(
        selectedCommunity,
        selectedMembers,
        rows,
        centralityMap
      ),
    [selectedCommunity, selectedMembers, rows, centralityMap]
  );

  const memberRows = useMemo(
    () =>
      [...selectedMembers]
        .map((node) => ({
          node,
          degree: Number(centralityMap[node]?.degree) || 0,
          betweenness:
            Number(centralityMap[node]?.betweenness) || 0,
          closeness:
            Number(centralityMap[node]?.closeness) || 0,
          eigenvector:
            Number(centralityMap[node]?.eigenvector) || 0,
        }))
        .sort((a, b) => b.degree - a.degree),
    [selectedMembers, centralityMap]
  );

  const topMembers = memberRows.slice(0, 5);

  if (!communityEntries.length) {
    return (
      <section className="community-investigation">
        <div className="community-investigation-empty">
          <span className="section-kicker">COMMUNITY ANALYSIS</span>
          <h2>Community Investigation</h2>
          <p>No detected communities are available yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="community-investigation">
      <div className="community-investigation-header">
        <div>
          <span className="section-kicker">COMMUNITY ANALYSIS</span>
          <h2>Community Investigation</h2>
          <p>
            Inspect membership, internal connectivity, external links,
            relationship patterns, and node-level signals for a selected
            detected community.
          </p>
        </div>

        <div className="community-investigation-actions">
          <span className="community-analysis-status">
            {loading ? "● Loading relationships" : "● Analysis Ready"}
          </span>
          <button
            type="button"
            className={highlighted ? "community-highlight-active" : ""}
            onClick={() => {
              const nextHighlighted = !highlighted;
              setHighlighted(nextHighlighted);

              if (onHighlightCommunity) {
                onHighlightCommunity(
                  nextHighlighted ? selectedCommunity : null
                );
              }
            }}
          >
            {highlighted ? "Highlight Active" : "Highlight Community"}
          </button>
        </div>
      </div>

      <div className="community-selector-row">
        <div className="community-selector-wrap">
          <label htmlFor="community-investigation-select">
            SELECT COMMUNITY
          </label>
          <select
            id="community-investigation-select"
            value={selectedCommunity}
            onChange={(event) => {
              setSelectedCommunity(event.target.value);
              setHighlighted(false);

              if (onHighlightCommunity) {
                onHighlightCommunity(null);
              }
            }}
          >
            {communityEntries.map(([id, members]) => (
              <option value={id} key={id}>
                Community {id} • {members.length} nodes
              </option>
            ))}
          </select>
        </div>

        <div className="community-selector-summary">
          <span>Detected</span>
          <strong>{communityEntries.length}</strong>
          <small>communities</small>
        </div>

        <div className="community-selector-summary">
          <span>Selected</span>
          <strong>{selectedMembers.length}</strong>
          <small>members</small>
        </div>
      </div>

      {error && (
        <div className="community-investigation-error">
          {error}
        </div>
      )}

      <div className="community-investigation-main">
        <div className="community-profile-card">
          <div
            className="community-color-mark"
            style={{
              background:
                communityColors[
                  Number(selectedCommunity) % communityColors.length
                ],
            }}
          />

          <div>
            <small>SELECTED COMMUNITY</small>
            <h3>Community {selectedCommunity}</h3>
            <p>
              Structural profile of the selected detected community.
            </p>
          </div>

          <div className="community-profile-count">
            <strong>{selectedMembers.length}</strong>
            <span>members</span>
          </div>
        </div>

        <div className="community-metric-grid">
          <div className="community-metric-card">
            <small>INTERNAL RELATIONSHIPS</small>
            <strong>{metrics.internalEdges}</strong>
            <span>links between community members</span>
          </div>

          <div className="community-metric-card">
            <small>EXTERNAL RELATIONSHIPS</small>
            <strong>{metrics.externalEdges}</strong>
            <span>links connecting outside the community</span>
          </div>

          <div className="community-metric-card">
            <small>INTERNAL DENSITY</small>
            <strong>{metrics.internalDensity.toFixed(4)}</strong>
            <span>internal links / possible links</span>
          </div>

          <div className="community-metric-card">
            <small>EXTERNAL NODES</small>
            <strong>{metrics.externalNodes}</strong>
            <span>distinct nodes outside the community</span>
          </div>
        </div>

        <div className="community-analysis-grid">
          <div className="community-analysis-panel">
            <div className="community-panel-heading">
              <div>
                <h3>Community Members</h3>
                <p>Node-level structural signals within this community.</p>
              </div>
              <span>{memberRows.length} nodes</span>
            </div>

            <div className="community-member-list">
              {topMembers.map((item, index) => (
                <div className="community-member-row" key={item.node}>
                  <span className="community-rank">{index + 1}</span>
                  <strong>{item.node}</strong>
                  <span>
                    Degree {item.degree.toFixed(4)}
                  </span>
                  <span>
                    Betweenness {item.betweenness.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>

            {memberRows.length > 5 && (
              <div className="community-more-members">
                + {memberRows.length - 5} additional members
              </div>
            )}
          </div>

          <div className="community-analysis-panel">
            <div className="community-panel-heading">
              <div>
                <h3>Relationship Composition</h3>
                <p>Types of relationships observed inside the community.</p>
              </div>
              <span>{metrics.internalRows.length} internal</span>
            </div>

            <div className="relationship-composition">
              {Object.entries(metrics.relationshipTypes).length ? (
                Object.entries(metrics.relationshipTypes)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const percentage =
                      metrics.internalEdges > 0
                        ? (count / metrics.internalEdges) * 100
                        : 0;

                    return (
                      <div className="relationship-composition-row" key={type}>
                        <div>
                          <strong>{type}</strong>
                          <span>{count}</span>
                        </div>
                        <div className="relationship-composition-track">
                          <div
                            className="relationship-composition-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="community-no-data">
                  No internal relationship records available.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="community-connection-panel">
          <div className="community-panel-heading">
            <div>
              <h3>External Connections</h3>
              <p>
                Relationships crossing from this community to other nodes.
              </p>
            </div>
            <span>{metrics.externalRows.length} links</span>
          </div>

          {metrics.externalRows.length ? (
            <div className="community-connection-table-wrapper">
              <table className="community-connection-table">
                <thead>
                  <tr>
                    <th>MEMBER</th>
                    <th>EXTERNAL NODE</th>
                    <th>RELATIONSHIP</th>
                    <th>WEIGHT</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.externalRows.slice(0, 12).map((row, index) => {
                    const member = selectedMembers.includes(row.source)
                      ? row.source
                      : row.target;
                    const external = member === row.source
                      ? row.target
                      : row.source;

                    return (
                      <tr key={`${member}-${external}-${index}`}>
                        <td>{member}</td>
                        <td>{external}</td>
                        <td>{row.relationship || "relationship"}</td>
                        <td>{Number(row.weight || 0)}</td>
                        <td>{row.timestamp || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {metrics.externalRows.length > 12 && (
                <div className="community-table-note">
                  Showing 12 of {metrics.externalRows.length} external relationships.
                </div>
              )}
            </div>
          ) : (
            <div className="community-no-data">
              No external relationships were detected for this community.
            </div>
          )}
        </div>

        <div className="community-member-cloud">
          <div className="community-panel-heading">
            <div>
              <h3>Community Members</h3>
              <p>Complete membership list for the selected community.</p>
            </div>
          </div>

          <div className="community-member-tags">
            {selectedMembers.map((member) => (
              <span key={member}>{member}</span>
            ))}
          </div>
        </div>

        <div className="community-investigation-note">
          <strong>Analysis note:</strong>{" "}
          Community detection identifies structural groupings in the supplied
          network data. Community membership and graph metrics are analytical
          signals, not proof of real-world behavior or responsibility.
        </div>
      </div>
    </section>
  );
}
