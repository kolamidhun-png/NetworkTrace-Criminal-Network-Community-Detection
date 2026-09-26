import React, { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000/api";

export default function DatasetManager({ refreshKey = 0, onRestoreSuccess }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/dataset/status`);

      if (!response.ok) {
        throw new Error("Unable to load dataset status.");
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error("Dataset status error:", err);
      setError(err.message || "Unable to load dataset status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, [refreshKey]);

  function downloadDataset() {
    window.open(`${API}/dataset/download`, "_blank");
  }

  async function restorePrevious() {
    if (!status?.can_restore || restoring) {
      return;
    }

    const confirmed = window.confirm(
      "Restore the previous dataset? The current active dataset will become the previous backup."
    );

    if (!confirmed) {
      return;
    }

    setRestoring(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/dataset/restore`,
        {
          method: "POST",
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to restore the previous dataset."
        );
      }

      setStatus(data);

      if (onRestoreSuccess) {
        onRestoreSuccess(data);
      }
    } catch (err) {
      console.error("Dataset restore error:", err);
      setError(err.message || "Unable to restore dataset.");
    } finally {
      setRestoring(false);
    }
  }

  const active = status?.active;
  const previous = status?.previous;

  return (
    <section className="dataset-manager-section">
      <div className="dataset-manager-header">
        <div>
          <span className="section-kicker">
            ACTIVE DATASET
          </span>

          <h2>Dataset Management</h2>

          <p>
            View the active relationship dataset, download a copy,
            or restore the previous dataset.
          </p>
        </div>

        <div className="dataset-manager-status">
          {loading ? "Loading..." : "● Dataset Ready"}
        </div>
      </div>

      {error && (
        <div className="dataset-manager-error">
          <strong>Dataset management error</strong>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="dataset-manager-loading">
          Loading dataset information...
        </div>
      ) : (
        <div className="dataset-manager-content">
          <div className="dataset-active-card">
            <div className="dataset-active-top">
              <div>
                <small>ACTIVE FILE</small>
                <strong>
                  {active?.filename || "No active dataset"}
                </strong>
              </div>

              <span className="dataset-active-badge">
                Active
              </span>
            </div>

            <div className="dataset-manager-stats">
              <div>
                <small>RECORDS</small>
                <strong>{active?.records ?? 0}</strong>
              </div>

              <div>
                <small>NODES</small>
                <strong>{active?.nodes ?? 0}</strong>
              </div>

              <div>
                <small>EDGES</small>
                <strong>{active?.edges ?? 0}</strong>
              </div>

              <div>
                <small>DATE RANGE</small>
                <strong className="dataset-date-value">
                  {active?.date_range?.start || "—"}
                  {" → "}
                  {active?.date_range?.end || "—"}
                </strong>
              </div>
            </div>

            <div className="dataset-manager-actions">
              <button
                type="button"
                className="dataset-download-button"
                onClick={downloadDataset}
                disabled={!active?.exists}
              >
                ↓ Download Dataset
              </button>

              <button
                type="button"
                className="dataset-restore-button"
                onClick={restorePrevious}
                disabled={!status?.can_restore || restoring}
              >
                {restoring
                  ? "Restoring..."
                  : "↶ Restore Previous"}
              </button>
            </div>
          </div>

          <div className="dataset-previous-card">
            <div>
              <small>PREVIOUS DATASET</small>

              <strong>
                {previous?.exists
                  ? previous.filename
                  : "No previous dataset"}
              </strong>

              {previous?.exists && (
                <span>
                  {previous.records} records •{" "}
                  {previous.nodes} nodes •{" "}
                  {previous.edges} edges
                </span>
              )}
            </div>

            <span
              className={
                previous?.exists
                  ? "dataset-previous-available"
                  : "dataset-previous-unavailable"
              }
            >
              {previous?.exists
                ? "Available"
                : "Unavailable"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
