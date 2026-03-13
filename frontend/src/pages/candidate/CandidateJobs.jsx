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
      <div className="jobs-page-header">
        <h1>Jobs</h1>
        <p>{filteredJobs.length} result{filteredJobs.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="jobs-search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          type="text"
          placeholder="Search by title or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="error-toast">⚠ {error}</div>}

      {loading ? (
        <p className="loading-text">Loading jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <p>No open positions found</p>
        </div>
      ) : (
        <div className="jobs-panels">
          {/* Left: list */}
          <div className="jobs-list">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`job-list-item${selectedJob?.id === job.id ? " active" : ""}`}
                onClick={() => { setSelectedJob(job); setShowApplyForm(false); setResumeFile(null); }}
              >
                <div className="job-list-icon">{job.title.charAt(0)}</div>
                <div className="job-list-info">
                  <h4 className="job-list-title">{job.title}</h4>
                  <div className="job-list-meta">
                    {job.location && <span>{job.location}</span>}
                  </div>
                  <div className="job-list-tags">
                    {job.job_type && <span className={`tag ${typeTag(job.job_type)}`}>{typeLabel(job.job_type)}</span>}
                    {job.experience_level && <span className="tag tag-gray">{levelLabel(job.experience_level)}</span>}
                    {appliedIds.has(job.id) && <span className="job-list-applied">✓ Applied</span>}
                  </div>
                </div>
                <span className="job-list-time">{timeAgo(job.created_at)}</span>
              </div>
            ))}
          </div>

          {/* Right: detail */}
          <div className="job-detail-panel">
            {selectedJob ? (
              <>
                <div className="job-detail-header">
                  <div className="job-detail-icon">{selectedJob.title.charAt(0)}</div>
                  <h2>{selectedJob.title}</h2>
                  {selectedJob.location && <p className="job-detail-company">{selectedJob.location}</p>}
                  <div className="job-detail-tags">
                    {selectedJob.job_type && <span className={`tag ${typeTag(selectedJob.job_type)}`}>{typeLabel(selectedJob.job_type)}</span>}
                    {selectedJob.experience_level && <span className="tag tag-gray">{levelLabel(selectedJob.experience_level)}</span>}
                  </div>
                  <div className="job-detail-actions">
                    {appliedIds.has(selectedJob.id) ? (
                      <button className="btn-applied">✓ Applied</button>
                    ) : (
                      <button className="btn-apply" onClick={() => setShowApplyForm(!showApplyForm)}>
                        {showApplyForm ? "Cancel" : "⚡ Easy Apply"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline apply form */}
                {showApplyForm && !appliedIds.has(selectedJob.id) && (
                  <div className="apply-section">
                    <h3>Upload your resume</h3>
                    <form onSubmit={handleApply} className="apply-upload">
                      {!resumeFile ? (
                        <div className="upload-area" onClick={() => fileRef.current?.click()}>
                          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files[0] || null)} />
                          <label>
                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span className="upload-text"><strong>Click to upload</strong> PDF, DOC, DOCX</span>
                          </label>
                        </div>
                      ) : (
                        <div className="file-selected">
                          📄 {resumeFile.name}
                          <button type="button" onClick={() => { setResumeFile(null); if (fileRef.current) fileRef.current.value = ""; }}>✕</button>
                        </div>
                      )}
                      <button type="submit" className="btn-apply" disabled={!resumeFile || applyingTo === selectedJob.id}>
                        {applyingTo === selectedJob.id ? "Submitting..." : "Submit Application"}
                      </button>
                    </form>
                  </div>
                )}

                <div className="job-detail-body">
                  <div className="job-detail-section">
                    <h3>Job Details</h3>
                    <div className="job-detail-info-grid">
                      {selectedJob.job_type && (
                        <div className="job-detail-info-item">
                          <span className="info-label">Job Type</span>
                          <span className="info-value">{typeLabel(selectedJob.job_type)}</span>
                        </div>
                      )}
                      {selectedJob.experience_level && (
                        <div className="job-detail-info-item">
                          <span className="info-label">Experience</span>
                          <span className="info-value">{levelLabel(selectedJob.experience_level)}</span>
                        </div>
                      )}
                      {selectedJob.location && (
                        <div className="job-detail-info-item">
                          <span className="info-label">Location</span>
                          <span className="info-value">{selectedJob.location}</span>
                        </div>
                      )}
                      {selectedJob.deadline && (
                        <div className="job-detail-info-item">
                          <span className="info-label">Deadline</span>
                          <span className="info-value">{selectedJob.deadline}</span>
                        </div>
                      )}
                      <div className="job-detail-info-item">
                        <span className="info-label">Posted</span>
                        <span className="info-value">{timeAgo(selectedJob.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="job-detail-section">
                    <h3>Description</h3>
                    <p>{selectedJob.description}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="job-detail-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
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
