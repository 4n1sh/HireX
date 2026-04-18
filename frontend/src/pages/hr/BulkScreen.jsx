import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import "../Jobs.css";

const scoreColor = (s) => {
  if (s == null) return "#9ca3af";
  if (s >= 70) return "#16a34a";
  if (s >= 45) return "#d97706";
  return "#dc2626";
};

function BulkScreen() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState("");

  const [bulk, setBulk] = useState({ results: [], processing: 0, total: 0 });
  const [bulkUploading, setBulkUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // Load HR's own jobs
  useEffect(() => {
    api.get("/api/jobs")
      .then((res) => {
        const mine = res.data.filter((j) => String(j.created_by) === String(user.id));
        setJobs(mine);
        if (mine.length === 1) setSelectedJobId(mine[0].id);
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, []);

  // Load results when job is selected
  useEffect(() => {
    if (!selectedJobId) { setBulk({ results: [], processing: 0, total: 0 }); return; }
    api.get(`/api/hr/jobs/${selectedJobId}/bulk-screenings`)
      .then((res) => setBulk(res.data))
      .catch(() => {});
  }, [selectedJobId]);

  // Poll while processing
  useEffect(() => {
    if (!selectedJobId || bulk.processing === 0) return;
    const id = setInterval(fetchResults, 3000);
    return () => clearInterval(id);
  }, [selectedJobId, bulk.processing]);

  const fetchResults = async () => {
    if (!selectedJobId) return;
    try {
      const res = await api.get(`/api/hr/jobs/${selectedJobId}/bulk-screenings`);
      setBulk(res.data);
    } catch { /* ignore */ }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUpload = async (files) => {
    if (!selectedJobId) { showToast("Select a job first", "error"); return; }
    if (!files?.length) return;
    const allowed = ["pdf", "doc", "docx"];
    const valid = Array.from(files).filter((f) => allowed.includes(f.name.toLowerCase().split(".").pop()));
    if (!valid.length) { showToast("Only PDF, DOC, DOCX files accepted", "error"); return; }

    setBulkUploading(true);
    try {
      const formData = new FormData();
      valid.forEach((f) => formData.append("files", f));
      await api.post(`/api/hr/jobs/${selectedJobId}/bulk-screen`, formData);
      await fetchResults();
      showToast(`Processing ${valid.length} resume${valid.length > 1 ? "s" : ""}…`);
    } catch {
      showToast("Upload failed", "error");
    } finally {
      setBulkUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/hr/bulk-screenings/${id}`);
      setBulk((prev) => ({ ...prev, results: prev.results.filter((r) => r.id !== id), total: prev.total - 1 }));
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const doneResults       = bulk.results.filter((r) => r.status === "done").sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const processingResults = bulk.results.filter((r) => r.status === "processing");
  const failedResults     = bulk.results.filter((r) => r.status === "failed");

  return (
    <div className="admin-page-content">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? "#ef4444" : "#22c55e",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)", fontSize: 14, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`fas ${toast.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`} />
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">Bulk Resume Screening</h1>
          <p className="admin-page-sub">Upload multiple resumes and rank candidates against a job description</p>
        </div>
      </div>

      {/* Job selector */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 8 }}>
          Select Job to Screen Against
        </label>
        {jobsLoading ? (
          <div className="skeleton" style={{ height: 38, borderRadius: 8, width: "100%" }} />
        ) : jobs.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>No active jobs found. Create a job first.</p>
        ) : (
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14,
              border: "1.5px solid var(--border)", background: "var(--bg)",
              color: "var(--ink)", cursor: "pointer", outline: "none",
            }}
          >
            <option value="">— Choose a job —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        )}
      </div>

      {selectedJobId && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            onClick={() => !bulkUploading && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--purple, #7c3aed)" : "var(--border, #e5e7eb)"}`,
              borderRadius: 14, padding: "40px 24px", textAlign: "center",
              cursor: bulkUploading ? "default" : "pointer",
              background: dragOver ? "var(--purple-bg, #f5f3ff)" : "var(--card-bg, #fff)",
              transition: "border-color 150ms, background 150ms",
              marginBottom: 24,
            }}
          >
            <input
              ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => handleUpload(e.target.files)}
            />
            {bulkUploading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: "var(--purple, #7c3aed)", marginBottom: 12, display: "block" }} />
                <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>Uploading resumes…</p>
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 36, color: dragOver ? "var(--purple, #7c3aed)" : "var(--muted)", marginBottom: 12, display: "block" }} />
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--ink)", fontSize: 16 }}>
                  Drop resumes here or click to select
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                  PDF, DOC, DOCX — select as many files as you want
                </p>
              </>
            )}
          </div>

          {/* Progress bar */}
          {bulk.processing > 0 && (
            <div style={{ background: "var(--card-bg, #fff)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--purple, #7c3aed)", fontSize: 16 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Analysing resumes…</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{bulk.total - bulk.processing} of {bulk.total} done</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "var(--border, #e5e7eb)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    background: "var(--purple, #7c3aed)",
                    width: `${bulk.total > 0 ? ((bulk.total - bulk.processing) / bulk.total) * 100 : 0}%`,
                    transition: "width 600ms ease",
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {bulk.results.length > 0 ? (
            <div style={{ background: "var(--card-bg, #fff)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
                  Screening Results
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>
                    {doneResults.length} scored · {processingResults.length} pending · {failedResults.length} failed
                  </span>
                </span>
                <button
                  onClick={async () => {
                    if (!window.confirm("Clear all screening results for this job?")) return;
                    await Promise.all(bulk.results.map((r) => handleDelete(r.id)));
                  }}
                  style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                >
                  Clear All
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-2, #f9fafb)" }}>
                      {["#", "Name", "Email", "Phone", "Score", "Matched", "Missing", "File", ""].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...doneResults, ...processingResults, ...failedResults].map((r, i) => {
                      const gap = r.extracted_data?.skill_gap;
                      const isProcessing = r.status === "processing";
                      const isFailed = r.status === "failed";
                      return (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border, #e5e7eb)", opacity: isFailed ? 0.5 : 1 }}>
                          <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600, width: 36 }}>
                            {isProcessing ? <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--purple, #7c3aed)" }} /> : i + 1}
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
                            {r.candidate_name || <span style={{ color: "var(--muted)", fontWeight: 400 }}>{isProcessing ? "Extracting…" : "—"}</span>}
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--ink-2)" }}>
                            {r.candidate_email || <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--ink-2)" }}>
                            {r.candidate_phone || <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                            {isProcessing ? (
                              <span style={{ color: "var(--muted)", fontSize: 12 }}>scoring…</span>
                            ) : isFailed ? (
                              <span style={{ color: "#dc2626", fontSize: 12 }}>failed</span>
                            ) : (
                              <span style={{ fontWeight: 700, fontSize: 14, color: scoreColor(r.score) }}>
                                {r.score != null ? `${Math.round(r.score)}%` : "—"}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {gap?.matched?.length > 0
                              ? <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 12 }}>✓ {gap.matched.length}</span>
                              : <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {gap?.missing?.length > 0
                              ? <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12 }}>✗ {gap.missing.length}</span>
                              : <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--muted)", fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.filename}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <button onClick={() => handleDelete(r.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }} title="Remove">
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !bulkUploading && (
            <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--muted)", fontSize: 14 }}>
              <i className="fa-solid fa-file-magnifying-glass" style={{ fontSize: 32, marginBottom: 10, display: "block" }} />
              Upload resumes above to start screening candidates
            </div>
          )}
        </>
      )}

      {!selectedJobId && !jobsLoading && jobs.length > 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)", fontSize: 14 }}>
          <i className="fa-solid fa-layer-group" style={{ fontSize: 36, marginBottom: 12, display: "block", color: "#cbd5e1" }} />
          Select a job above to start bulk screening
        </div>
      )}
    </div>
  );
}

export default BulkScreen;
