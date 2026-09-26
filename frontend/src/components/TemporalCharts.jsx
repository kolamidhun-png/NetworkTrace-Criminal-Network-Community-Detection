import React from "react";

function buildPoints(data, key, width = 760, height = 250) {
  if (!data || data.length === 0) {
    return "";
  }

  const values = data.map((item) => Number(item[key]) || 0);

  const max = Math.max(...values);
  const min = Math.min(...values);

  const range = max - min || 1;

  const paddingX = 45;
  const paddingY = 30;

  return data
    .map((item, index) => {
      const x =
        data.length === 1
          ? width / 2
          : paddingX +
            (index * (width - paddingX * 2)) /
              (data.length - 1);

      const value = Number(item[key]) || 0;

      const y =
        height -
        paddingY -
        ((value - min) / range) *
          (height - paddingY * 2);

      return `${x},${y}`;
    })
    .join(" ");
}

function getYPosition(value, data, height = 250) {
  const values = data.map((item) => Number(item) || 0);

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const paddingY = 30;

  return (
    height -
    paddingY -
    ((value - min) / range) *
      (height - paddingY * 2)
  );
}

function MetricChart({
  title,
  description,
  data,
  dataKey,
  suffix = "",
  decimals = 0,
}) {
  const width = 760;
  const height = 250;

  if (!data || data.length === 0) {
    return (
      <div className="temporal-chart-card">
        <h3>{title}</h3>
        <p>{description}</p>

        <div className="chart-empty">
          No data available.
        </div>
      </div>
    );
  }

  const values = data.map(
    (item) => Number(item[dataKey]) || 0
  );

  const points = buildPoints(
    data,
    dataKey,
    width,
    height
  );

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  return (
    <div className="temporal-chart-card">
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <strong>
          {maxValue.toFixed(decimals)}
          {suffix}
        </strong>
      </div>

      <div className="chart-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="temporal-svg"
        >
          {/* Grid lines */}

          <line
            x1="45"
            y1="30"
            x2="715"
            y2="30"
            className="chart-grid-line"
          />

          <line
            x1="45"
            y1="125"
            x2="715"
            y2="125"
            className="chart-grid-line"
          />

          <line
            x1="45"
            y1="220"
            x2="715"
            y2="220"
            className="chart-grid-line"
          />

          {/* Main line */}

          <polyline
            points={points}
            fill="none"
            className="chart-line"
          />

          {/* Data points */}

          {data.map((item, index) => {
            const x =
              data.length === 1
                ? width / 2
                : 45 +
                  (index * (width - 90)) /
                    (data.length - 1);

            const value =
              Number(item[dataKey]) || 0;

            const y = getYPosition(
              value,
              values,
              height
            );

            return (
              <g key={`${item.period}-${dataKey}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  className="chart-point"
                />

                <text
                  x={x}
                  y={height - 7}
                  textAnchor="middle"
                  className="chart-label"
                >
                  {item.period}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="chart-value-row">
          <span>
            Min:{" "}
            {minValue.toFixed(decimals)}
            {suffix}
          </span>

          <span>
            Max:{" "}
            {maxValue.toFixed(decimals)}
            {suffix}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TemporalCharts({
  timeline = [],
}) {
  return (
    <div className="temporal-charts">
      <MetricChart
        title="Relationships Over Time"
        description="Monthly relationship activity across the network."
        data={timeline}
        dataKey="records"
      />

      <MetricChart
        title="Active Nodes Over Time"
        description="Number of nodes participating in each monthly snapshot."
        data={timeline}
        dataKey="nodes"
      />

      <MetricChart
        title="Network Density"
        description="Structural density calculated for each monthly snapshot."
        data={timeline}
        dataKey="density"
        decimals={6}
      />

      <MetricChart
        title="Connected Components"
        description="Number of connected components in each monthly snapshot."
        data={timeline}
        dataKey="components"
      />
    </div>
  );
}