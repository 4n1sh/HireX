import { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import "../Jobs.css";

function CandidateJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [applyingTo, setApplyingTo] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [search, setSearch] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
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
      setAppliedIds(new Set(res.data.map((a) => a.job_id)));
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!resumeFile) return;
    setApplyingTo(selectedJob.id);
    setError("");
    try {
      const fd = new FormData();
      fd.append("resume", resumeFile);
      await api.post(`/api/jobs/${selectedJob.id}/apply`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAppliedIds((prev) => new Set([...prev, selectedJob.id]));
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
    return (
      j.title.toLowerCase().includes(q) ||
      (j.location || "").toLowerCase().includes(q)
    );
  });

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

  return (
    <div className="jobs-page">

      {/* ── Top Bar ── */}
      <div className="jobs-topbar">
        <div className="jobs-topbar-left">
          <h1>Jobs</h1>
          <p>
            {filteredJobs.length} result{filteredJobs.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="jobs-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search by title or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
      ) : filteredJobs.length === 0 ? (
        <div className="jobs-empty">
          <i className="fa-solid fa-briefcase" />
          <p>No open positions found</p>
        </div>
      ) : (
        <div className="jobs-body">

          {/* ── Left: List ── */}
          <div className="jobs-list-col">
            {filteredJobs.map((job) => (
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
                  </div>
                  <div className="job-card-tags">
                    {job.job_type && (
                      <span className={`tag ${typeTag(job.job_type)}`}>
                        {typeLabel(job.job_type)}
                      </span>
                    )}
                    {job.experience_level && (
                      <span className="tag tag-gray">
                        {levelLabel(job.experience_level)}
                      </span>
                    )}
                    {appliedIds.has(job.id) && (
                      <span className="tag-applied">
                        <i className="fa-solid fa-circle-check" /> Applied
                      </span>
                    )}
                  </div>
                </div>
                <span className="job-card-time">{timeAgo(job.created_at)}</span>
              </div>
            ))}
          </div>

          {/* ── Right: Detail ── */}
          <div className="jobs-detail-col">
            {selectedJob ? (
              <div className="detail-inner">

                {/* Header card */}
                <div className="detail-head">
                  <div className="detail-head-top">
                    <div className="detail-avatar">{selectedJob.title.charAt(0)}</div>
                    <div className="detail-head-info">
                      <h2>{selectedJob.title}</h2>
                      {selectedJob.location && (
                        <p className="detail-location">
                          <i className="fa-solid fa-location-dot" />
                          {selectedJob.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="detail-tags">
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

                  <div className="detail-actions">
                    {appliedIds.has(selectedJob.id) ? (
                      <button className="btn-success">
                        <i className="fa-solid fa-circle-check" /> Applied
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => setShowApplyForm(!showApplyForm)}
                      >
                        <i className="fa-solid fa-bolt" />
                        {showApplyForm ? "Cancel" : "Easy Apply"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Apply form */}
                {showApplyForm && !appliedIds.has(selectedJob.id) && (
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

                {/* Job details card */}
                <div className="detail-card">
                  <p className="detail-card-title">Job Details</p>
                  <div className="info-grid">
                    {selectedJob.job_type && (
                      <div className="info-cell">
                        <span className="info-cell-label">Job Type</span>
                        <span className="info-cell-value">
                          {typeLabel(selectedJob.job_type)}
                        </span>
                      </div>
                    )}
                    {selectedJob.experience_level && (
                      <div className="info-cell">
                        <span className="info-cell-label">Experience</span>
                        <span className="info-cell-value">
                          {levelLabel(selectedJob.experience_level)}
                        </span>
                      </div>
                    )}
                    {selectedJob.location && (
                      <div className="info-cell">
                        <span className="info-cell-label">Location</span>
                        <span className="info-cell-value">{selectedJob.location}</span>
                      </div>
                    )}
                    {selectedJob.deadline && (
                      <div className="info-cell">
                        <span className="info-cell-label">Deadline</span>
                        <span className="info-cell-value">{selectedJob.deadline}</span>
                      </div>
                    )}
                    <div className="info-cell">
                      <span className="info-cell-label">Posted</span>
                      <span className="info-cell-value">
                        {timeAgo(selectedJob.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description card */}
                <div className="detail-card">
                  <p className="detail-card-title">Description</p>
                  <p className="detail-description">{selectedJob.description}</p>
                </div>

              </div>
            ) : (
              <div className="detail-empty">
                <i className="fa-solid fa-briefcase" />
                <p>Select a job to view details</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default CandidateJobs;