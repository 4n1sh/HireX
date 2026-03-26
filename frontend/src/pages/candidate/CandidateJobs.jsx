import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import "../Jobs.css";

function CandidateJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applications, setApplications] = useState({});
  const [applyingTo, setApplyingTo] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [gapOpen, setGapOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState(null); // { text, pdfUrl, loading }
  const [clPreview, setClPreview] = useState(false);
  const [aiToolsOpen, setAiToolsOpen] = useState(false);
  const fileRef = useRef(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/jobs");
      const active = res.data.filter((j) => j.is_active);
      setJobs(active);
      if (active.length > 0 && !selectedJob) setSelectedJob(active[0]);
    } catch {
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await api.get("/api/jobs/me/applications");
      const map = {};
      res.data.forEach((a) => { map[a.job_id] = a; });
      setApplications(map);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
  }, []);

  // Poll for pending similarity scores
  useEffect(() => {
    const hasPending = Object.values(applications).some(
      (a) => a.similarity_score == null
    );
    if (!hasPending) return;
    const interval = setInterval(fetchMyApplications, 4000);
    return () => clearInterval(interval);
  }, [applications]);

  // Reset gap open + cover letter when job changes
  useEffect(() => { setGapOpen(false); setCoverLetter(null); setClPreview(false); setAiToolsOpen(false); }, [selectedJob]);

  const buildCoverLetterPdf = (text, candidateName, jobTitle) => {
    // Minimal PDF builder — no external deps
    const margin = 72; // 1 inch
    const pageW = 595; const pageH = 842; // A4
    const lineH = 16; const fontSize = 11;
    const maxW = pageW - margin * 2;

    // Rough word-wrap: split text into lines that fit ~80 chars
    const wrapLine = (line) => {
      const words = line.split(" ");
      const lines = []; let cur = "";
      for (const w of words) {
        if ((cur + " " + w).length > 80 && cur) { lines.push(cur); cur = w; }
        else { cur = cur ? cur + " " + w : w; }
      }
      if (cur) lines.push(cur);
      return lines.length ? lines : [""];
    };

    const paragraphs = text.split("\n");
    const allLines = [];
    for (const p of paragraphs) {
      if (p.trim() === "") { allLines.push(""); continue; }
      allLines.push(...wrapLine(p));
    }

    // Build PDF content
    const textLines = allLines.map((l, i) => {
      const y = pageH - margin - i * lineH;
      const escaped = l.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      return `BT /F1 ${fontSize} Tf ${margin} ${y} Td (${escaped}) Tj ET`;
    }).join("\n");

    const stream = `q\n${textLines}\nQ`;
    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pageW} ${pageH}]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${stream.length}>>
stream
${stream}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000300 00000 n
0000000${(400 + stream.length).toString().padStart(3, "0")} 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
${450 + stream.length}
%%EOF`;

    return new Blob([pdf], { type: "application/pdf" });
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedJob) return;
    setCoverLetter({ text: "", pdfUrl: null, loading: true });
    try {
      const res = await api.post(`/api/jobs/${selectedJob.id}/generate-cover-letter`);
      const text = res.data.cover_letter;
      const blob = buildCoverLetterPdf(text, res.data.candidate_name, res.data.job_title);
      const pdfUrl = URL.createObjectURL(blob);
      setCoverLetter({ text, pdfUrl, loading: false, candidateName: res.data.candidate_name });
    } catch {
      setCoverLetter(null);
      setError("Failed to generate cover letter");
    }
  };

  const downloadCoverLetter = () => {
    if (!coverLetter?.pdfUrl) return;
    const a = document.createElement("a");
    a.href = coverLetter.pdfUrl;
    a.download = `Cover_Letter_${selectedJob?.title?.replace(/\s+/g, "_") || "job"}.pdf`;
    a.click();
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!resumeFile) return;
    setApplyingTo(selectedJob.id);
    setError("");
    try {
      const fd = new FormData();
      fd.append("resume", resumeFile);
      const res = await api.post(`/api/jobs/${selectedJob.id}/apply`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setApplications((prev) => ({ ...prev, [selectedJob.id]: res.data }));
      setShowApplyForm(false);
      setResumeFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to apply");
    } finally {
      setApplyingTo(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchesSearch =
      j.title.toLowerCase().includes(q) ||
      (j.location || "").toLowerCase().includes(q);
    const matchesType = !filterType || j.job_type === filterType;
    const matchesLevel = !filterLevel || j.experience_level === filterLevel;
    return matchesSearch && matchesType && matchesLevel;
  });

  useEffect(() => {
    if (selectedJob && !filteredJobs.find((j) => j.id === selectedJob.id)) {
      setSelectedJob(filteredJobs[0] || null);
    }
  }, [filterType, filterLevel, search]);

  const typeLabel = (t) =>
    ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
  const typeTag = (t) =>
    ({ full_time: "tag-blue", part_time: "tag-green", contract: "tag-orange", internship: "tag-purple" })[t] || "tag-blue";
  const levelLabel = (l) =>
    ({ entry: "Entry Level", mid: "Mid Level", senior: "Senior", lead: "Lead" })[l] || l;

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  };

  const app = applications[selectedJob?.id];
  const gap = app?.extracted_data?.skill_gap;

  return (
    <div className="jobs-page candidate-jobs" style={{ height: "100%", minHeight: 0 }}>
    {/* ── Cover Letter preview modal ── */}
    {clPreview && coverLetter?.text && (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,.45)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
        onClick={() => setClPreview(false)}
      >
        <div
          style={{
            background: "#fff", borderRadius: 14, width: "94%", maxWidth: 860,
            height: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,.25)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 22px", borderBottom: "1px solid #e5e7eb", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600, color: "#111827" }}>
              <i className="fa-solid fa-file-lines" style={{ color: "#7c3aed", fontSize: 18 }} />
              Cover Letter
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={downloadCoverLetter}
                style={{
                  background: "#7c3aed", border: "none", color: "#fff",
                  padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 13,
                  fontWeight: 600, display: "flex", alignItems: "center", gap: 7,
                }}
              >
                Download <i className="fa-solid fa-download" style={{ fontSize: 12 }} />
              </button>
              <button
                onClick={() => setClPreview(false)}
                style={{
                  background: "none", border: "none", color: "#9ca3af",
                  fontSize: 26, cursor: "pointer", padding: 0, lineHeight: 1,
                  fontWeight: 700,
                }}
              >
                &times;
              </button>
            </div>
          </div>

          {/* Letter content */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "36px 48px",
          }}>
            {coverLetter.text.split("\n").map((line, i) => (
              <p key={i} style={{
                margin: line.trim() === "" ? "16px 0" : "4px 0",
                fontSize: 15, lineHeight: 1.7, color: "#1f2937",
                fontWeight: (line.startsWith("Dear ") || line.startsWith("Sincerely")) ? 600 : 400,
              }}>
                {line || "\u00A0"}
              </p>
            ))}
          </div>
        </div>
      </div>
    )}

      {/* ── Top Bar ── */}
      <div className="jobs-topbar">
        <div className="topbar-left">
          <div className="jobs-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="jobs-filters">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="filter-select"
            >
              <option value="">All Levels</option>
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Error Bar ── */}
      {error && (
        <div className="error-bar">
          <i className="fa-solid fa-triangle-exclamation" />
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <p className="jobs-loading">Loading jobs...</p>
      ) : (
        <>
          {/* ── Left: List ── */}
          <div className="jobs-list-col">
            <div className="jobs-list-header">
              <span className="jobs-count">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} found
              </span>
            </div>
            {filteredJobs.length === 0 ? (
              <div className="jobs-empty">
                <i className="fa-solid fa-briefcase" />
                <p>No matching jobs</p>
              </div>
            ) : filteredJobs.map((job) => {
              const jobApp = applications[job.id];
              return (
                <div
                  key={job.id}
                  className={`job-card${selectedJob?.id === job.id ? " active" : ""}`}
                  onClick={() => {
                    setSelectedJob(job);
                    setShowApplyForm(false);
                    setResumeFile(null);
                  }}
                >
                  <div className="job-card-avatar">{job.title.charAt(0)}</div>
                  <div className="job-card-body">
                    <h4 className="job-card-title">{job.title}</h4>
                    <div className="job-card-sub">
                      {job.location && (
                        <span>
                          <i className="fa-solid fa-location-dot" />
                          {job.location}
                        </span>
                      )}
                      <span className="job-card-time">{timeAgo(job.created_at)}</span>
                    </div>
                    <div className="job-card-tags">
                      {job.job_type && (
                        <span className={`tag ${typeTag(job.job_type)}`}>
                          {typeLabel(job.job_type)}
                        </span>
                      )}
                      {jobApp && (
                        <span className="tag-applied">
                          <i className="fa-solid fa-circle-check" /> Applied
                          {jobApp.similarity_score != null && (
                            <span className="match-badge">
                              · {Math.round(jobApp.similarity_score)}% match
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Detail ── */}
          <div className="jobs-detail-col">
            {selectedJob ? (
              <div className="detail-inner">

                {/* Header */}
                <div className="detail-header-row">
                  <div className="detail-avatar">{selectedJob.title.charAt(0)}</div>
                  <div className="detail-header-info">
                    <h2>{selectedJob.title}</h2>
                    <div className="detail-meta">
                      {selectedJob.location && (
                        <span>
                          <i className="fa-solid fa-location-dot" />
                          {selectedJob.location}
                        </span>
                      )}
                      {selectedJob.job_type && (
                        <span className={`tag ${typeTag(selectedJob.job_type)}`}>
                          {typeLabel(selectedJob.job_type)}
                        </span>
                      )}
                      {selectedJob.experience_level && (
                        <span className="tag tag-gray">
                          {levelLabel(selectedJob.experience_level)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="detail-actions">
                    {app ? (
                      <button className="btn-success">
                        <i className="fa-solid fa-circle-check" /> Applied
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => setShowApplyForm(!showApplyForm)}
                      >
                        <i className="fa-solid fa-bolt" />
                        {showApplyForm ? "Cancel" : "Quick Apply"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Apply form */}
                {showApplyForm && !app && (
                  <div className="apply-card">
                    <p className="apply-card-title">
                      <i className="fa-solid fa-file-arrow-up" />
                      Upload your resume
                    </p>

                    <form onSubmit={handleApply}>
                      {!resumeFile ? (
                        <div
                          className="upload-zone"
                          onClick={() => fileRef.current?.click()}
                        >
                          <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) =>
                              setResumeFile(e.target.files[0] || null)
                            }
                          />
                          <label className="upload-zone-label">
                            <i className="fa-solid fa-cloud-arrow-up" />
                            <span className="upload-zone-text">
                              <strong>Click to upload</strong> — PDF, DOC, DOCX
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="file-pill">
                          <i className="fa-solid fa-file-pdf" />
                          {resumeFile.name}
                          <button
                            type="button"
                            onClick={() => {
                              setResumeFile(null);
                              if (fileRef.current) fileRef.current.value = "";
                            }}
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ marginTop: 14, width: "100%", justifyContent: "center" }}
                        disabled={!resumeFile || applyingTo === selectedJob.id}
                      >
                        {applyingTo === selectedJob.id
                          ? "Submitting..."
                          : "Submit Application"}
                      </button>
                    </form>
                  </div>
                )}

                {/* ── Match score ── */}
                {app && (
                  <div className="match-ring-wrap">
                    {app.similarity_score != null ? (
                      <div className="match-ring">{Math.round(app.similarity_score)}%</div>
                    ) : (
                      <div className="match-ring scoring">
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 14 }} />
                      </div>
                    )}
                    <span className="match-ring-label">Resume Match</span>
                  </div>
                )}

                {/* ── AI Tools (collapsible) ── */}
                {app && app.similarity_score != null && (
                  <div className="skill-gap-section">
                    <button
                      className="skill-gap-toggle"
                      onClick={() => setAiToolsOpen((v) => !v)}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" />
                      AI Tools
                      <i className={`fa-solid fa-chevron-${aiToolsOpen ? "up" : "down"} sgap-chevron`} />
                    </button>
                    {aiToolsOpen && (
                      <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 12 }}>

                        {/* Skill Gap */}
                        {gap && (
                          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                            <button
                              style={{
                                background: "none", border: "none", cursor: "pointer", width: "100%",
                                display: "flex", alignItems: "center", gap: 8, padding: 0,
                                fontSize: 13, fontWeight: 600, color: "var(--ink)",
                              }}
                              onClick={() => setGapOpen((v) => !v)}
                            >
                              <i className="fa-solid fa-magnifying-glass-chart" style={{ color: "var(--brand)" }} />
                              Skill Gap Analysis
                              <i className={`fa-solid fa-chevron-${gapOpen ? "up" : "down"}`} style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }} />
                            </button>
                            {gapOpen && (
                              <div className="skill-gap-body" style={{ marginTop: 10 }}>
                                {gap.matched?.length > 0 && (
                                  <div className="skill-gap-row">
                                    <span className="skill-gap-label matched">Matched</span>
                                    <div className="skill-tags">
                                      {gap.matched.map((s) => (
                                        <span key={s} className="skill-tag matched">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {gap.partial?.length > 0 && (
                                  <div className="skill-gap-row">
                                    <span className="skill-gap-label partial">Partial</span>
                                    <div className="skill-tags">
                                      {gap.partial.map((s) => (
                                        <span key={s} className="skill-tag partial">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {gap.missing?.length > 0 && (
                                  <div className="skill-gap-row">
                                    <span className="skill-gap-label missing">Missing</span>
                                    <div className="skill-tags">
                                      {gap.missing.map((s) => (
                                        <span key={s} className="skill-tag missing">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cover Letter */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14 }}>
                          {!coverLetter ? (
                            <button
                              className="btn-outline"
                              style={{ width: "100%", justifyContent: "center", gap: 8 }}
                              onClick={handleGenerateCoverLetter}
                            >
                              <i className="fa-solid fa-file-pen" /> Generate Cover Letter
                            </button>
                          ) : coverLetter.loading ? (
                            <div style={{ textAlign: "center", padding: "12px 0", color: "var(--muted)", fontSize: 13 }}>
                              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                              Generating cover letter...
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 12px", borderRadius: 8,
                                background: "var(--bg-2, #f9fafb)", cursor: "pointer",
                              }}
                              onClick={() => setClPreview(true)}
                            >
                              <i className="fa-solid fa-file-pdf" style={{ fontSize: 28, color: "#e74c3c" }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                                  Cover_Letter_{selectedJob?.title?.replace(/\s+/g, "_") || "job"}.pdf
                                </div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                  Click to preview
                                </div>
                              </div>
                              <button
                                className="btn-outline"
                                style={{ fontSize: 11, padding: "5px 10px" }}
                                onClick={(e) => { e.stopPropagation(); downloadCoverLetter(); }}
                              >
                                <i className="fa-solid fa-download" /> Download
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="detail-card">
                  <p className="detail-card-title">Job Description</p>
                  <p className="detail-description">{selectedJob.description}</p>
                </div>

                {/* Job details */}
                {(selectedJob.deadline || selectedJob.created_at) && (
                  <div className="detail-card">
                    <p className="detail-card-title">Details</p>
                    <div className="detail-info-list">
                      {selectedJob.job_type && (
                        <div className="detail-info-item">
                          <span className="detail-info-label">Type</span>
                          <span className="detail-info-value">{typeLabel(selectedJob.job_type)}</span>
                        </div>
                      )}
                      {selectedJob.experience_level && (
                        <div className="detail-info-item">
                          <span className="detail-info-label">Level</span>
                          <span className="detail-info-value">{levelLabel(selectedJob.experience_level)}</span>
                        </div>
                      )}
                      {selectedJob.location && (
                        <div className="detail-info-item">
                          <span className="detail-info-label">Location</span>
                          <span className="detail-info-value">{selectedJob.location}</span>
                        </div>
                      )}
                      {selectedJob.deadline && (
                        <div className="detail-info-item">
                          <span className="detail-info-label">Deadline</span>
                          <span className="detail-info-value">{selectedJob.deadline}</span>
                        </div>
                      )}
                      <div className="detail-info-item">
                        <span className="detail-info-label">Posted</span>
                        <span className="detail-info-value">{timeAgo(selectedJob.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="detail-empty">
                <i className="fa-solid fa-briefcase" />
                <p>Select a job to view details</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CandidateJobs;
