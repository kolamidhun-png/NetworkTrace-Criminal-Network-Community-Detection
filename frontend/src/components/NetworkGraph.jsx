import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

const COMMUNITY_COLORS = [
  "#6f9cff",
  "#72d99d",
  "#d79bff",
  "#ffb86b",
  "#62c9d9",
  "#e68aa0",
  "#b5c66b",
  "#9b8cff",
];

function normalizeGraphResponse(data) {
  const rawNodes =
    data?.nodes ||
    data?.elements?.nodes ||
    data?.graph?.nodes ||
    [];

  const rawEdges =
    data?.edges ||
    data?.elements?.edges ||
    data?.graph?.edges ||
    [];

  const nodes = rawNodes.map((item) => {
    const source = item?.data || item;
    const id = String(
      source?.id ??
        source?.node ??
        source?.name ??
        ""
    );

    return {
      data: {
        id,
        label: String(
          source?.label ?? id
        ),
      },
    };
  }).filter((item) => item.data.id);

  const edges = rawEdges.map((item, index) => {
    const source = item?.data || item;

    return {
      data: {
        id: String(
          source?.id ??
            `${source?.source}-${source?.target}-${index}`
        ),
        source: String(
          source?.source ?? ""
        ),
        target: String(
          source?.target ?? ""
        ),
        relationship: source?.relationship ?? "",
        weight: Number(
          source?.weight ?? 1
        ),
      },
    };
  }).filter(
    (item) =>
      item.data.source &&
      item.data.target
  );

  return { nodes, edges };
}

export default function NetworkGraph({
  centrality = [],
  anomalies = [],
  communities = {},
  highlightedCommunity = null,
  pathResult = null,
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [baseGraph, setBaseGraph] = useState({
    nodes: [],
    edges: [],
  });

  const [relationshipTypes, setRelationshipTypes] =
    useState([]);

  const [filterForm, setFilterForm] = useState({
    relationship: "",
    node: "",
    community: "",
    start: "",
    end: "",
    minWeight: "",
    maxWeight: "",
  });

  const [activeFilters, setActiveFilters] =
    useState({
      relationship: "",
      node: "",
      community: "",
      start: "",
      end: "",
      minWeight: "",
      maxWeight: "",
    });

  const [filterSummary, setFilterSummary] =
    useState(null);

  const [filterLoading, setFilterLoading] =
    useState(false);

  const [filterError, setFilterError] =
    useState("");

  const [search, setSearch] = useState("");

  const [communityFilter, setCommunityFilter] =
    useState("all");

  const [anomaliesOnly, setAnomaliesOnly] =
    useState(false);

  const [selectedNode, setSelectedNode] =
    useState(null);

  const [graphError, setGraphError] =
    useState("");

  const [graphLoading, setGraphLoading] =
    useState(true);

  const centralityMap = useMemo(() => {
    const map = {};

    for (const item of centrality || []) {
      map[String(item.node)] = item;
    }

    return map;
  }, [centrality]);

  const anomalyMap = useMemo(() => {
    const map = {};

    for (const item of anomalies || []) {
      map[String(item.node)] = item;
    }

    return map;
  }, [anomalies]);

  const communityMap = useMemo(() => {
    const map = {};

    for (const [communityId, nodes] of Object.entries(
      communities || {}
    )) {
      for (const node of nodes || []) {
        map[String(node)] = String(
          communityId
        );
      }
    }

    return map;
  }, [communities]);

  const nodeOptions = useMemo(() => {
    return baseGraph.nodes
      .map((item) => item.data.id)
      .sort((a, b) =>
        a.localeCompare(b)
      );
  }, [baseGraph.nodes]);

  const communityOptions = useMemo(() => {
    return Object.keys(
      communities || {}
    ).sort((a, b) =>
      Number(a) - Number(b)
    );
  }, [communities]);

  function getCommunityColor(nodeId) {
    const communityId =
      communityMap[nodeId];

    if (
      communityId === undefined
    ) {
      return "#7c8aa5";
    }

    const index =
      Number(communityId) %
      COMMUNITY_COLORS.length;

    return COMMUNITY_COLORS[index];
  }

  function createElementsFromRows(rows) {
    const nodeIds = new Set();
    const edges = [];

    for (const row of rows || []) {
      const source = String(
        row.source
      );
      const target = String(
        row.target
      );

      nodeIds.add(source);
      nodeIds.add(target);

      edges.push({
        data: {
          id: `${source}-${target}-${row.timestamp}-${edges.length}`,
          source,
          target,
          relationship:
            row.relationship || "",
          timestamp:
            row.timestamp || "",
          weight:
            Number(row.weight) || 1,
        },
      });
    }

    return {
      nodes: Array.from(nodeIds).map(
        (id) => ({
          data: {
            id,
            label: id,
          },
        })
      ),
      edges,
    };
  }

  async function loadGraph() {
    setGraphLoading(true);
    setGraphError("");

    try {
      const response = await fetch(
        `${API}/graph`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load network graph."
        );
      }

      const data =
        await response.json();

      const normalized =
        normalizeGraphResponse(data);

      setBaseGraph(normalized);

      const types = new Set();

      for (const edge of normalized.edges) {
        if (
          edge.data.relationship
        ) {
          types.add(
            String(
              edge.data.relationship
            )
          );
        }
      }

      setRelationshipTypes(
        Array.from(types).sort()
      );

      setFilterSummary({
        records:
          normalized.edges.length,
        nodes:
          normalized.nodes.length,
        edges:
          normalized.edges.length,
      });
    } catch (error) {
      console.error(
        "Graph loading error:",
        error
      );

      setGraphError(
        "Unable to load the network graph."
      );
    } finally {
      setGraphLoading(false);
    }
  }

  useEffect(() => {
    loadGraph();
  }, []);

  async function applyAdvancedFilters() {
    setFilterLoading(true);
    setFilterError("");

    try {
      const params =
        new URLSearchParams();

      if (
        filterForm.relationship
      ) {
        params.set(
          "relationship",
          filterForm.relationship
        );
      }

      if (filterForm.node) {
        params.set(
          "node",
          filterForm.node
        );
      }

      if (filterForm.community) {
        params.set(
          "community",
          filterForm.community
        );
      }

      if (filterForm.start) {
        params.set(
          "start",
          filterForm.start
        );
      }

      if (filterForm.end) {
        params.set(
          "end",
          filterForm.end
        );
      }

      if (
        filterForm.minWeight !== ""
      ) {
        params.set(
          "min_weight",
          filterForm.minWeight
        );
      }

      if (
        filterForm.maxWeight !== ""
      ) {
        params.set(
          "max_weight",
          filterForm.maxWeight
        );
      }

      const query =
        params.toString();

      const response =
        await fetch(
          `${API}/relationships/filter${
            query
              ? `?${query}`
              : ""
          }`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail ===
            "string"
            ? data.detail
            : "Network filter request failed."
        );
      }

      setActiveFilters({
        ...filterForm,
      });

      setFilterSummary(data);

      if (
        Array.isArray(
          data.relationship_types
        )
      ) {
        setRelationshipTypes(
          data.relationship_types
        );
      }

      const filteredGraph =
        createElementsFromRows(
          data.rows || []
        );

      setBaseGraph(
        filteredGraph
      );

      setSelectedNode(null);
    } catch (error) {
      console.error(
        "Filter error:",
        error
      );

      setFilterError(
        error.message ||
          "Unable to apply network filters."
      );
    } finally {
      setFilterLoading(false);
    }
  }

  async function clearAdvancedFilters() {
    const empty = {
      relationship: "",
      node: "",
      community: "",
      start: "",
      end: "",
      minWeight: "",
      maxWeight: "",
    };

    setFilterForm(empty);
    setActiveFilters(empty);
    setFilterError("");

    await loadGraph();
  }

  function updateFilter(name, value) {
    setFilterForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  useEffect(() => {
    if (
      !containerRef.current
    ) {
      return;
    }

    if (
      cyRef.current
    ) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const elements = [
      ...baseGraph.nodes,
      ...baseGraph.edges,
    ];

    const cy =
      cytoscape({
        container:
          containerRef.current,

        elements,

        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color":
                "#6f9cff",
              color: "#dce4ef",
              "font-size": 8,
              "text-valign": "center",
              "text-halign": "center",
              "border-width": 1,
              "border-color":
                "#9db8e8",
              width: 18,
              height: 18,
              "text-outline-width": 2,
              "text-outline-color":
                "#09101c",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1,
              "line-color":
                "#52627e",
              opacity: 0.58,
              "curve-style":
                "bezier",
            },
          },
          {
            selector:
              ".anomaly-node",
            style: {
              "background-color":
                "#d96f82",
              "border-color":
                "#f2a0ad",
              "border-width": 2,
            },
          },
          {
            selector:
              ".selected-node",
            style: {
              "background-color":
                "#ffffff",
              "border-color":
                "#6f9cff",
              "border-width": 3,
              width: 24,
              height: 24,
            },
          },
          {
            selector:
              ".neighbor-node",
            style: {
              "border-color":
                "#8db1ff",
              "border-width": 2,
            },
          },
          {
            selector:
              ".highlight-edge",
            style: {
              "line-color":
                "#8db1ff",
              width: 2.5,
              opacity: 1,
            },
          },
          {
            selector:
              ".filtered",
            style: {
              display: "none",
            },
          },
          {
            selector:
              ".community-highlight",
            style: {
              "border-width": 4,
              "border-color": "#ffffff",
              width: 24,
              height: 24,
              opacity: 1,
            },
          },
          {
            selector:
              ".community-dimmed",
            style: {
              opacity: 0.18,
            },
          },
          {
            selector:
              "edge.community-dimmed",
            style: {
              opacity: 0.08,
            },
          },
          {
            selector:
              ".path-dimmed",
            style: {
              opacity: 0.10,
            },
          },
          {
            selector:
              "edge.path-dimmed",
            style: {
              opacity: 0.06,
            },
          },
          {
            selector:
              ".path-highlight",
            style: {
              opacity: 1,
              "border-width": 4,
              "border-color": "#ffffff",
              width: 27,
              height: 27,
              "background-color": "#6f9cff",
              "z-index": 20,
            },
          },
          {
            selector:
              ".path-endpoint",
            style: {
              opacity: 1,
              "border-width": 5,
              "border-color": "#fbbf24",
              width: 30,
              height: 30,
              "background-color": "#ffffff",
              "z-index": 30,
            },
          },
          {
            selector:
              "edge.path-highlight",
            style: {
              "line-color": "#fbbf24",
              width: 5,
              opacity: 1,
              "z-index": 25,
            },
          },
        ],

        layout: {
          name: "cose",
          animate: false,
          fit: true,
          padding: 35,
          nodeRepulsion: 8500,
          idealEdgeLength: 80,
          gravity: 0.7,
        },
      });

    cyRef.current = cy;

    cy.nodes().forEach(
      (node) => {
        const id =
          node.id();

        node.style(
          "background-color",
          getCommunityColor(id)
        );

        const anomaly =
          anomalyMap[id];

        if (
          anomaly?.is_anomaly
        ) {
          node.addClass(
            "anomaly-node"
          );
        }
      }
    );

    cy.on(
      "tap",
      "node",
      (event) => {
        const node =
          event.target;

        cy.nodes().removeClass(
          "selected-node neighbor-node"
        );

        cy.edges().removeClass(
          "highlight-edge"
        );

        node.addClass(
          "selected-node"
        );

        const neighbors =
          node.neighborhood(
            "node"
          );

        neighbors.addClass(
          "neighbor-node"
        );

        node
          .connectedEdges()
          .addClass(
            "highlight-edge"
          );

        const id =
          node.id();

        setSelectedNode({
          node: id,
          community:
            communityMap[id] ??
            "—",
          degree:
            centralityMap[id]
              ?.degree ?? 0,
          betweenness:
            centralityMap[id]
              ?.betweenness ?? 0,
          closeness:
            centralityMap[id]
              ?.closeness ?? 0,
          eigenvector:
            centralityMap[id]
              ?.eigenvector ?? 0,
          anomalyScore:
            anomalyMap[id]
              ?.anomaly_score ?? 0,
          isAnomaly:
            Boolean(
              anomalyMap[id]
                ?.is_anomaly
            ),
        });
      }
    );

    return () => {
      cy.destroy();

      if (
        cyRef.current === cy
      ) {
        cyRef.current = null;
      }
    };
  }, [
    baseGraph,
    centralityMap,
    anomalyMap,
    communityMap,
  ]);

  useEffect(() => {
    const cy =
      cyRef.current;

    if (!cy) {
      return;
    }

    const normalizedSearch =
      search
        .trim()
        .toLowerCase();

    cy.nodes().forEach(
      (node) => {
        const id =
          node.id();

        const communityId =
          communityMap[id];

        const matchesSearch =
          !normalizedSearch ||
          id
            .toLowerCase()
            .includes(
              normalizedSearch
            );

        const matchesCommunity =
          communityFilter ===
            "all" ||
          String(
            communityId
          ) ===
            String(
              communityFilter
            );

        const matchesAnomaly =
          !anomaliesOnly ||
          Boolean(
            anomalyMap[id]
              ?.is_anomaly
          );

        if (
          matchesSearch &&
          matchesCommunity &&
          matchesAnomaly
        ) {
          node.removeClass(
            "filtered"
          );
        } else {
          node.addClass(
            "filtered"
          );
        }
      }
    );

    cy.edges().forEach(
      (edge) => {
        const sourceVisible =
          !edge.source().hasClass(
            "filtered"
          );

        const targetVisible =
          !edge.target().hasClass(
            "filtered"
          );

        if (
          sourceVisible &&
          targetVisible
        ) {
          edge.removeClass(
            "filtered"
          );
        } else {
          edge.addClass(
            "filtered"
          );
        }
      }
    );
  }, [
    search,
    communityFilter,
    anomaliesOnly,
    communityMap,
    anomalyMap,
  ]);

  useEffect(() => {
    const cy = cyRef.current;

    if (!cy) {
      return;
    }

    cy.nodes().removeClass(
      "community-highlight community-dimmed"
    );

    cy.edges().removeClass(
      "community-dimmed"
    );

    if (
      highlightedCommunity === null ||
      highlightedCommunity === undefined ||
      String(highlightedCommunity).trim() === ""
    ) {
      return;
    }

    const selectedCommunity = String(
      highlightedCommunity
    );

    cy.nodes().forEach((node) => {
      const nodeCommunity = String(
        communityMap[node.id()] ?? ""
      );

      if (nodeCommunity === selectedCommunity) {
        node.addClass("community-highlight");
      } else {
        node.addClass("community-dimmed");
      }
    });

    cy.edges().forEach((edge) => {
      const sourceCommunity = String(
        communityMap[edge.source().id()] ?? ""
      );
      const targetCommunity = String(
        communityMap[edge.target().id()] ?? ""
      );

      if (
        sourceCommunity !== selectedCommunity ||
        targetCommunity !== selectedCommunity
      ) {
        edge.addClass("community-dimmed");
      }
    });
  }, [
    highlightedCommunity,
    communityMap,
    baseGraph,
  ]);

  useEffect(() => {
    const cy = cyRef.current;

    if (!cy) {
      return;
    }

    cy.nodes().removeClass(
      "path-highlight path-endpoint path-dimmed"
    );

    cy.edges().removeClass(
      "path-highlight path-dimmed"
    );

    if (
      !pathResult?.connected ||
      !Array.isArray(pathResult.path) ||
      pathResult.path.length === 0
    ) {
      return;
    }

    const pathNodes = pathResult.path.map(String);
    const pathNodeSet = new Set(pathNodes);

    cy.nodes().forEach((node) => {
      if (pathNodeSet.has(String(node.id()))) {
        node.removeClass("filtered");
        node.addClass("path-highlight");
      } else {
        node.addClass("path-dimmed");
      }
    });

    cy.edges().forEach((edge) => {
      const source = String(edge.source().id());
      const target = String(edge.target().id());

      const isPathEdge =
        pathNodeSet.has(source) &&
        pathNodeSet.has(target) &&
        pathNodes.some(
          (node, index) =>
            index < pathNodes.length - 1 &&
            (
              (
                node === source &&
                pathNodes[index + 1] === target
              ) ||
              (
                node === target &&
                pathNodes[index + 1] === source
              )
            )
        );

      if (isPathEdge) {
        edge.removeClass("filtered");
        edge.addClass("path-highlight");
      } else {
        edge.addClass("path-dimmed");
      }
    });

    const sourceNode = cy.getElementById(
      String(pathResult.source)
    );

    const targetNode = cy.getElementById(
      String(pathResult.target)
    );

    sourceNode.addClass("path-endpoint");
    targetNode.addClass("path-endpoint");

    const pathElements = cy.nodes().filter((node) =>
      pathNodeSet.has(String(node.id()))
    );

    if (pathElements.length > 0) {
      cy.fit(pathElements, 80);
    }
  }, [pathResult, baseGraph]);

  function fitNetwork() {
    if (
      cyRef.current
    ) {
      cyRef.current.fit(
        cyRef.current.elements(
          ":visible"
        ),
        40
      );
    }
  }

  function resetView() {
    setSearch("");
    setCommunityFilter(
      "all"
    );
    setAnomaliesOnly(
      false
    );
    setSelectedNode(null);

    if (
      cyRef.current
    ) {
      cyRef.current.nodes().removeClass(
        "selected-node neighbor-node filtered path-highlight path-endpoint path-dimmed"
      );

      cyRef.current.edges().removeClass(
        "highlight-edge filtered path-highlight path-dimmed"
      );

      cyRef.current.fit(
        cyRef.current.elements(),
        40
      );
    }
  }

  const visibleNodeCount =
    cyRef.current
      ? cyRef.current.nodes(
          ":visible"
        ).length
      : baseGraph.nodes.length;

  const visibleEdgeCount =
    cyRef.current
      ? cyRef.current.edges(
          ":visible"
        ).length
      : baseGraph.edges.length;

  const hasAdvancedFilters =
    Object.values(
      activeFilters
    ).some(
      (value) =>
        String(value).trim() !== ""
    );

  return (
    <section className="network-explorer-section">
      <div className="network-explorer-header">
        <div>
          <span className="section-kicker">
            NETWORK EXPLORER
          </span>

          <h2>
            Interactive Network Graph
          </h2>

          <p>
            Explore relationships, communities,
            anomaly signals and filtered network
            structure.
          </p>
        </div>

        <div className="network-explorer-status">
          {filterLoading
            ? "Filtering..."
            : "● Graph Ready"}
        </div>
      </div>

      {filterError && (
        <div className="network-filter-error">
          <strong>
            Filter error
          </strong>
          <span>
            {filterError}
          </span>
        </div>
      )}

      <div className="advanced-filter-panel">
        <div className="advanced-filter-heading">
          <div>
            <strong>
              Advanced Relationship Filters
            </strong>

            <span>
              Filters create a view of the active
              dataset without changing the CSV.
            </span>
          </div>

          {hasAdvancedFilters && (
            <span className="filter-active-badge">
              Filters Active
            </span>
          )}
        </div>

        <div className="advanced-filter-grid">
          <label>
            <span>
              Relationship Type
            </span>

            <select
              value={
                filterForm.relationship
              }
              onChange={(event) =>
                updateFilter(
                  "relationship",
                  event.target.value
                )
              }
            >
              <option value="">
                All Relationships
              </option>

              {relationshipTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Node
            </span>

            <select
              value={
                filterForm.node
              }
              onChange={(event) =>
                updateFilter(
                  "node",
                  event.target.value
                )
              }
            >
              <option value="">
                All Nodes
              </option>

              {nodeOptions.map(
                (node) => (
                  <option
                    key={node}
                    value={node}
                  >
                    {node}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Community
            </span>

            <select
              value={
                filterForm.community
              }
              onChange={(event) =>
                updateFilter(
                  "community",
                  event.target.value
                )
              }
            >
              <option value="">
                All Communities
              </option>

              {communityOptions.map(
                (community) => (
                  <option
                    key={community}
                    value={community}
                  >
                    Community {community}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Start Date
            </span>

            <input
              type="date"
              value={
                filterForm.start
              }
              onChange={(event) =>
                updateFilter(
                  "start",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              End Date
            </span>

            <input
              type="date"
              value={
                filterForm.end
              }
              onChange={(event) =>
                updateFilter(
                  "end",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              Min Weight
            </span>

            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Any"
              value={
                filterForm.minWeight
              }
              onChange={(event) =>
                updateFilter(
                  "minWeight",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              Max Weight
            </span>

            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Any"
              value={
                filterForm.maxWeight
              }
              onChange={(event) =>
                updateFilter(
                  "maxWeight",
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="advanced-filter-actions">
          <button
            type="button"
            className="filter-apply-button"
            onClick={
              applyAdvancedFilters
            }
            disabled={
              filterLoading
            }
          >
            {filterLoading
              ? "Applying..."
              : "Apply Filters"}
          </button>

          <button
            type="button"
            className="filter-clear-button"
            onClick={
              clearAdvancedFilters
            }
            disabled={
              filterLoading
            }
          >
            Clear Filters
          </button>
        </div>

        {filterSummary && (
          <div className="filter-result-summary">
            <div>
              <small>
                RECORDS
              </small>
              <strong>
                {filterSummary.records ??
                  0}
              </strong>
            </div>

            <div>
              <small>
                NODES
              </small>
              <strong>
                {filterSummary.nodes ??
                  0}
              </strong>
            </div>

            <div>
              <small>
                EDGES
              </small>
              <strong>
                {filterSummary.edges ??
                  0}
              </strong>
            </div>

            <div>
              <small>
                DENSITY
              </small>
              <strong>
                {Number(
                  filterSummary.density ??
                    0
                ).toFixed(6)}
              </strong>
            </div>

            <div>
              <small>
                COMPONENTS
              </small>
              <strong>
                {filterSummary.components ??
                  0}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className="network-toolbar">
        <div className="network-search">
          <input
            type="text"
            placeholder="Search node e.g. P049"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          <button
            type="button"
            onClick={() => {}}
          >
            Search
          </button>
        </div>

        <label className="network-community-filter">
          <span>
            Community
          </span>

          <select
            value={
              communityFilter
            }
            onChange={(event) =>
              setCommunityFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Communities
            </option>

            {communityOptions.map(
              (id) => (
                <option
                  key={id}
                  value={id}
                >
                  Community {id}
                </option>
              )
            )}
          </select>
        </label>

        <label className="network-anomaly-toggle">
          <input
            type="checkbox"
            checked={
              anomaliesOnly
            }
            onChange={(event) =>
              setAnomaliesOnly(
                event.target.checked
              )
            }
          />

          <span>
            Show anomalies only
          </span>
        </label>

        <button
          type="button"
          className="secondary-button"
          onClick={
            fitNetwork
          }
        >
          Fit Network
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={
            resetView
          }
        >
          Reset View
        </button>
      </div>

      <div className="network-count-bar">
        <span>
          Showing{" "}
          <strong>
            {visibleNodeCount}
          </strong>{" "}
          nodes ·{" "}
          <strong>
            {visibleEdgeCount}
          </strong>{" "}
          edges
        </span>

        {hasAdvancedFilters && (
          <span>
            Advanced filter applied
          </span>
        )}
      </div>

      {graphError ? (
        <div className="network-graph-error">
          {graphError}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="network-graph-container"
        />
      )}

      {selectedNode && (
        <div className="node-details-panel">
          <div className="node-details-header">
            <div>
              <span className="section-kicker">
                NODE DETAILS
              </span>

              <h3>
                {selectedNode.node}
              </h3>
            </div>

            <button
              type="button"
              className="node-details-close"
              onClick={() =>
                setSelectedNode(
                  null
                )
              }
            >
              ×
            </button>
          </div>

          <div className="node-details-grid">
            <div>
              <small>
                COMMUNITY
              </small>
              <strong>
                {selectedNode.community}
              </strong>
            </div>

            <div>
              <small>
                DEGREE
              </small>
              <strong>
                {Number(
                  selectedNode.degree
                ).toFixed(4)}
              </strong>
            </div>

            <div>
              <small>
                BETWEENNESS
              </small>
              <strong>
                {Number(
                  selectedNode.betweenness
                ).toFixed(4)}
              </strong>
            </div>

            <div>
              <small>
                CLOSENESS
              </small>
              <strong>
                {Number(
                  selectedNode.closeness
                ).toFixed(4)}
              </strong>
            </div>

            <div>
              <small>
                EIGENVECTOR
              </small>
              <strong>
                {Number(
                  selectedNode.eigenvector
                ).toFixed(4)}
              </strong>
            </div>

            <div>
              <small>
                ANOMALY SCORE
              </small>
              <strong>
                {Number(
                  selectedNode.anomalyScore
                ).toFixed(5)}
              </strong>
            </div>

            <div>
              <small>
                SIGNAL
              </small>

              <strong
                className={
                  selectedNode.isAnomaly
                    ? "node-signal-anomaly"
                    : "node-signal-normal"
                }
              >
                {selectedNode.isAnomaly
                  ? "Structural Signal"
                  : "Normal"}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
