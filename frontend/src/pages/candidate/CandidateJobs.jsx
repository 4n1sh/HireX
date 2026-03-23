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

  // Reset gap open when job changes
  useEffect(() => { setGapOpen(false); }, [selectedJob]);

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
    <div className="jobs-page candidate-jobs">

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

                {/* ── Skill Gap ── */}
                {gap && (
                  <div className="skill-gap-section">
                    <button
                      className="skill-gap-toggle"
                      onClick={() => setGapOpen((v) => !v)}
                    >
                      <i className="fa-solid fa-magnifying-glass-chart" />
                      Skill Gap Analysis
                      <i className={`fa-solid fa-chevron-${gapOpen ? "up" : "down"} sgap-chevron`} />
                    </button>
                    {gapOpen && (
                      <div className="skill-gap-body">
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
