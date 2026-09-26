import React, { useRef, useState } from "react";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

export default function DatasetUpload({ onUploadSuccess }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setResult(null);
    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Only CSV files are supported.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setFile(null);
      setError("CSV file is too large. Maximum size is 20 MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API}/dataset/upload`, {
        method: "POST",
        body: formData,
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok) {
        let message = "Dataset upload failed.";

        if (typeof data.detail === "string") {
          message = data.detail;
        } else if (data.detail?.message) {
          message = data.detail.message;

          if (data.detail.missing_columns?.length) {
            message += ` Missing columns: ${data.detail.missing_columns.join(
              ", "
            )}.`;
          }
        }

        throw new Error(message);
      }

      setResult(data);

      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      setError(err.message || "Unable to upload dataset.");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="dataset-upload-section">
      <div className="dataset-upload-header">
        <div>
          <span className="section-kicker">DATASET MANAGEMENT</span>

          <h2>Upload Relationship Dataset</h2>

          <p>
            Upload a validated CSV relationship dataset to rebuild the
            NetworkTrace analysis graph.
          </p>
        </div>

        <div className="dataset-format-badge">
          CSV • MAX 20 MB
        </div>
      </div>

      <div className="dataset-upload-body">
        <div className="dataset-upload-box">
          <div className="dataset-file-icon">↑</div>

          <div className="dataset-file-content">
            <strong>
              {file ? file.name : "Select a relationship CSV"}
            </strong>

            <span>
              Required columns:
              {" "}
              source, target, relationship, timestamp, weight
            </span>

            {file && (
              <small>
                {(file.size / 1024).toFixed(1)} KB selected
              </small>
            )}
          </div>

          <div className="dataset-file-actions">
            <label className="dataset-choose-button">
              Choose CSV
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                hidden
              />
            </label>

            <button
              type="button"
              className="dataset-upload-button"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "Uploading..." : "Upload Dataset"}
            </button>

            {(file || result || error) && (
              <button
                type="button"
                className="dataset-clear-button"
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="dataset-message dataset-error">
            <strong>Upload failed</strong>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="dataset-result">
            <div className="dataset-success-message">
              <div className="dataset-success-icon">✓</div>

              <div>
                <strong>Dataset uploaded successfully</strong>

                <span>
                  {result.message ||
                    "Dataset validated and activated successfully."}
                </span>
              </div>
            </div>

            <div className="dataset-stats">
              <div className="dataset-stat">
                <small>RECORDS</small>
                <strong>{result.records ?? 0}</strong>
              </div>

              <div className="dataset-stat">
                <small>NODES</small>
                <strong>{result.nodes ?? 0}</strong>
              </div>

              <div className="dataset-stat">
                <small>EDGES</small>
                <strong>{result.edges ?? 0}</strong>
              </div>

              <div className="dataset-stat">
                <small>DUPLICATES REMOVED</small>
                <strong>{result.duplicates_removed ?? 0}</strong>
              </div>
            </div>

            <div className="dataset-meta">
              <div>
                <span>Active file</span>
                <strong>{result.filename || file?.name}</strong>
              </div>

              <div>
                <span>Date range</span>
                <strong>
                  {result.date_range?.start || "—"}
                  {" → "}
                  {result.date_range?.end || "—"}
                </strong>
              </div>

              <div>
                <span>Graph status</span>
                <strong className="dataset-status-active">
                  Active
                </strong>
              </div>
            </div>

            <div className="dataset-refresh-note">
              ✓ Network analysis can now be refreshed using this dataset.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}