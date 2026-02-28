import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import api from "../../api/axios";
import "../Jobs.css";

function HRJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    job_type: "full_time",
    experience_level: "entry",
    deadline: "",
  });

  const getHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    return {
      "x-user-id": user?.id || "",
      "x-user-role": user?.user_metadata?.role || "hr",
      "x-user-email": user?.email || "",
    };
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/jobs");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      const myJobs = res.data.filter((j) => j.created_by === userId);
      setJobs(myJobs);
      if (myJobs.length > 0 && !selectedJob) {
        setSelectedJob(myJobs[0]);
        fetchApplications(myJobs[0]);
      }
    } catch {
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const headers = await getHeaders();
      const payload = { ...form };
      if (!payload.deadline) delete payload.deadline;
      await api.post("/api/jobs", payload, { headers });
      setForm({ title: "", description: "", location: "", job_type: "full_time", experience_level: "entry", deadline: "" });
      setShowForm(false);
      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm("Delete this job posting?")) return;
    try {
      const headers = await getHeaders();
      await api.delete(`/api/jobs/${jobId}`, { headers });
      if (selectedJob?.id === jobId) { setSelectedJob(null); setApplications([]); }
      fetchJobs();
    } catch {
      setError("Failed to delete job");
    }
  };

  const fetchApplications = async (job) => {
    setLoadingApps(true);
    try {
      const headers = await getHeaders();
      const res = await api.get(`/api/jobs/${job.id}/applications`, { headers });
      setApplications(res.data);
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const selectJob = (job) => {
    setSelectedJob(job);
    fetchApplications(job);
  };

  const typeLabel = (t) =>
    ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
  const typeTag = (t) =>
    ({ full_time: "tag-blue", part_time: "tag-green", contract: "tag-orange", internship: "tag-purple" })[t] || "tag-blue";
  const levelLabel = (l) =>
    ({ entry: "Entry Level", mid: "Mid Level", senior: "Senior", lead: "Lead" })[l] || l;
  const statusLabel = (s) =>
    ({ pending: "Pending", reviewed: "Reviewed", shortlisted: "Shortlisted", interview: "Interview", rejected: "Rejected", hired: "Hired" })[s] || s;

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  };

  const filteredJobs = jobs.filter((j) => {
    const q = search.toLowerCase();
    return j.title.toLowerCase().includes(q) || (j.location || "").toLowerCase().includes(q);
  });

  return (
    <div className="jobs-page">
      <div className="jobs-page-header">
        <h1>My Job Postings</h1>
        <button className="btn-apply" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Post New Job"}
        </button>
      </div>

      {error && <div className="error-toast">⚠ {error}</div>}

      {/* Post new job form */}
      {showForm && (
        <div className="post-job-card">
          <h3>Create Job Posting</h3>
          <form onSubmit={handleSubmit} className="post-job-form">
            <div className="form-group">
              <label>Job Title *</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Senior React Developer" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Remote, New York" />
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input type="date" name="deadline" value={form.deadline} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Job Type</label>
                <select name="job_type" value={form.job_type} onChange={handleChange}>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div className="form-group">
                <label>Experience Level</label>
                <select name="experience_level" value={form.experience_level} onChange={handleChange}>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the role, responsibilities, requirements..." rows={5} required />
            </div>
            <button type="submit" className="btn-apply" disabled={submitting}>
              {submitting ? "Posting..." : "Post Job"}
            </button>
          </form>
        </div>
      )}

      <div className="jobs-search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="Search your jobs" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="loading-text">Loading jobs...</p>
      ) : filteredJobs.length === 0 && !showForm ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <p>No job postings yet. Create your first one!</p>
        </div>
      ) : (
        <div className="jobs-panels">
          {/* Left: job list */}
          <div className="jobs-list">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`job-list-item${selectedJob?.id === job.id ? " active" : ""}`}
                onClick={() => selectJob(job)}
              >
                <div className="job-list-icon">{job.title.charAt(0)}</div>
                <div className="job-list-info">
                  <h4 className="job-list-title">{job.title}</h4>
                  <div className="job-list-meta">
                    {job.location && <span>{job.location}</span>}
                    <span>{job.application_count || 0} applicant{(job.application_count || 0) !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="job-list-tags">
                    {job.job_type && <span className={`tag ${typeTag(job.job_type)}`}>{typeLabel(job.job_type)}</span>}
                    <span className={`tag ${job.is_active ? "tag-green" : "tag-gray"}`}>{job.is_active ? "Active" : "Closed"}</span>
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
                    <span className={`tag ${selectedJob.is_active ? "tag-green" : "tag-gray"}`}>{selectedJob.is_active ? "Active" : "Closed"}</span>
                  </div>
                  <div className="job-detail-actions">
                    <button className="btn-danger" onClick={() => handleDelete(selectedJob.id)}>Delete</button>
                  </div>
                </div>

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
                      <div className="job-detail-info-item">
                        <span className="info-label">Applicants</span>
                        <span className="info-value">{selectedJob.application_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="job-detail-section">
                    <h3>Description</h3>
                    <p>{selectedJob.description}</p>
                  </div>

                  {/* Applicants inline */}
                  <div className="applicants-section">
                    <h3>Applicants</h3>
                    {loadingApps ? (
                      <p className="loading-text">Loading applicants...</p>
                    ) : applications.length === 0 ? (
                      <p style={{ color: "#666", fontSize: "0.9rem" }}>No applications yet.</p>
                    ) : (
                      applications.map((app) => (
                        <div key={app.id} className="applicant-card">
                          <div className="applicant-left">
                            <strong>Candidate</strong>
                            <span className="applicant-date">Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                            {app.resume_path && (
                              <a href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${app.resume_path}`} target="_blank" rel="noopener noreferrer" className="resume-link">
                                📄 Download CV
                              </a>
                            )}
                          </div>
                          <span className={`status-badge status-${app.status}`}>{statusLabel(app.status)}</span>
                        </div>
                      ))
                    )}
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

export default HRJobs;
