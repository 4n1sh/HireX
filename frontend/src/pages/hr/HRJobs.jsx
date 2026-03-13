import { useEffect, useState } from "react";
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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", location: "",
    job_type: "full_time", experience_level: "entry", deadline: "",
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/jobs");
      const mine = res.data.filter((j) => j.created_by === user.id);
      setJobs(mine);
      if (mine.length > 0 && !selectedJob) { setSelectedJob(mine[0]); fetchApplications(mine[0]); }
    } catch { setError("Failed to load jobs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.deadline) delete payload.deadline;
      await api.post("/api/jobs", payload);
      setForm({ title: "", description: "", location: "", job_type: "full_time", experience_level: "entry", deadline: "" });
      setShowForm(false);
      fetchJobs();
    } catch (err) { setError(err.response?.data?.detail || "Failed to post job"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this job posting?")) return;
    try {
      await api.delete(`/api/jobs/${id}`);
      if (selectedJob?.id === id) { setSelectedJob(null); setApplications([]); }
      fetchJobs();
    } catch { setError("Failed to delete job"); }
  };

  const startEdit = (job) => {
    setEditingId(job.id);
    setEditForm({
      title: job.title || "", description: job.description || "",
      location: job.location || "", job_type: job.job_type || "full_time",
      experience_level: job.experience_level || "entry",
      is_active: job.is_active, deadline: job.deadline || "",
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ ...editForm, [name]: type === "checkbox" ? checked : value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true); setError("");
    try {
      const payload = { ...editForm };
      if (!payload.deadline) delete payload.deadline;
      const res = await api.put(`/api/jobs/${editingId}`, payload);
      setSelectedJob(res.data);
      cancelEdit();
      fetchJobs();
    } catch (err) { setError(err.response?.data?.detail || "Failed to update"); }
    finally { setUpdating(false); }
  };

  const fetchApplications = async (job) => {
    setLoadingApps(true);
    try {
      const res = await api.get(`/api/jobs/${job.id}/applications`);
      setApplications(res.data);
    } catch { setApplications([]); }
    finally { setLoadingApps(false); }
  };

  const selectJob = (job) => { setSelectedJob(job); setEditingId(null); fetchApplications(job); };

  const typeLabel  = (t) => ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
  const typeTag    = (t) => ({ full_time: "tag-blue", part_time: "tag-green", contract: "tag-orange", internship: "tag-purple" })[t] || "tag-blue";
  const levelLabel = (l) => ({ entry: "Entry", mid: "Mid Level", senior: "Senior", lead: "Lead" })[l] || l;
  const statusLabel= (s) => ({ pending: "Pending", reviewed: "Reviewed", shortlisted: "Shortlisted", interview: "Interview", rejected: "Rejected", hired: "Hired" })[s] || s;

  const timeAgo = (d) => {
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    if (days < 7)  return `${days}d ago`;
    const w = Math.floor(days / 7);
    return w === 1 ? "1w ago" : `${w}w ago`;
  };

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return j.title.toLowerCase().includes(q) || (j.location || "").toLowerCase().includes(q);
  });

  return (
    <div className="jobs-page">

      {/* ── Top bar ── */}
      <div className="jobs-topbar">
        <div className="jobs-topbar-left">
          <h1>My Job Postings</h1>
          <p>{jobs.length} posting{jobs.length !== 1 ? "s" : ""}</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="jobs-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              placeholder="Search jobs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm
              ? <><i className="fa-solid fa-xmark" /> Cancel</>
              : <><i className="fa-solid fa-plus" /> Post Job</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="error-bar">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </div>
      )}

      {/* Post job form */}
      {showForm && (
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <div style={{ padding: "20px 28px" }}>
          <div className="form-sheet">
            <p className="form-sheet-title">
              <i className="fa-solid fa-pen-to-square" /> Create Job Posting
            </p>
            <div className="form-fields">
              <form onSubmit={handleSubmit} className="form-fields">
                <div className="field">
                  <label>Job Title *</label>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Senior React Developer" required />
                </div>
                <div className="form-row-2">
                  <div className="field">
                    <label>Location</label>
                    <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Remote, New York" />
                  </div>
                  <div className="field">
                    <label>Deadline</label>
                    <input type="date" name="deadline" value={form.deadline} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="field">
                    <label>Job Type</label>
                    <select name="job_type" value={form.job_type} onChange={handleChange}>
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Experience Level</label>
                    <select name="experience_level" value={form.experience_level} onChange={handleChange}>
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                      <option value="lead">Lead</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Description *</label>
                  <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the role, responsibilities, requirements…" rows={5} required />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting
                      ? <><i className="fa-solid fa-spinner fa-spin" /> Posting…</>
                      : <><i className="fa-solid fa-paper-plane" /> Post Job</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="jobs-loading">
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading…
        </div>
      ) : filtered.length === 0 && !showForm ? (
        <div className="jobs-empty">
          <i className="fa-solid fa-briefcase" />
          <p>No job postings yet — create your first one!</p>
        </div>
      ) : (
        <div className="jobs-body">

          {/* ── Left: list ── */}
          <div className="jobs-list-col">
            {filtered.map((job) => (
              <div
                key={job.id}
                className={`job-card${selectedJob?.id === job.id ? " active" : ""}`}
                onClick={() => selectJob(job)}
              >
                <div className="job-card-avatar">{job.title.charAt(0)}</div>
                <div className="job-card-body">
                  <h4 className="job-card-title">{job.title}</h4>
                  <div className="job-card-sub">
                    {job.location && (
                      <span>
                        <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                        {job.location}
                      </span>
                    )}
                    <span>
                      <i className="fa-solid fa-users" style={{ fontSize: 10 }} />
                      {job.application_count || 0} applicant{(job.application_count || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="job-card-tags">
                    {job.job_type && <span className={`tag ${typeTag(job.job_type)}`}>{typeLabel(job.job_type)}</span>}
                    <span className={`tag ${job.is_active ? "tag-green" : "tag-gray"}`}>
                      <i className={`fa-solid ${job.is_active ? "fa-circle-check" : "fa-circle-xmark"}`} style={{ fontSize: 9 }} />
                      {job.is_active ? "Active" : "Closed"}
                    </span>
                  </div>
                </div>
                <span className="job-card-time">{timeAgo(job.created_at)}</span>
              </div>
            ))}
          </div>

          {/* ── Right: detail ── */}
          <div className="jobs-detail-col">
            {selectedJob ? (
              <div className="detail-inner">

                {/* Header */}
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
                        <i className="fa-solid fa-briefcase" style={{ fontSize: 10 }} />
                        {typeLabel(selectedJob.job_type)}
                      </span>
                    )}
                    {selectedJob.experience_level && (
                      <span className="tag tag-gray">
                        <i className="fa-solid fa-layer-group" style={{ fontSize: 10 }} />
                        {levelLabel(selectedJob.experience_level)}
                      </span>
                    )}
                    <span className={`tag ${selectedJob.is_active ? "tag-green" : "tag-gray"}`}>
                      {selectedJob.is_active ? "Active" : "Closed"}
                    </span>
                  </div>

                  <div className="detail-actions">
                    <button
                      className="btn-outline"
                      onClick={() => editingId === selectedJob.id ? cancelEdit() : startEdit(selectedJob)}
                    >
                      {editingId === selectedJob.id
                        ? <><i className="fa-solid fa-xmark" /> Cancel</>
                        : <><i className="fa-solid fa-pen" /> Edit</>
                      }
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(selectedJob.id)}>
                      <i className="fa-solid fa-trash" /> Delete
                    </button>
                  </div>
                </div>

                {/* Edit form */}
                {editingId === selectedJob.id && (
                  <div className="form-sheet">
                    <p className="form-sheet-title">
                      <i className="fa-solid fa-pen-to-square" /> Edit Job Posting
                    </p>
                    <form onSubmit={handleUpdate} className="form-fields">
                      <div className="field">
                        <label>Job Title *</label>
                        <input name="title" value={editForm.title} onChange={handleEditChange} required />
                      </div>
                      <div className="form-row-2">
                        <div className="field">
                          <label>Location</label>
                          <input name="location" value={editForm.location} onChange={handleEditChange} />
                        </div>
                        <div className="field">
                          <label>Deadline</label>
                          <input type="date" name="deadline" value={editForm.deadline} onChange={handleEditChange} />
                        </div>
                      </div>
                      <div className="form-row-2">
                        <div className="field">
                          <label>Job Type</label>
                          <select name="job_type" value={editForm.job_type} onChange={handleEditChange}>
                            <option value="full_time">Full-time</option>
                            <option value="part_time">Part-time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>Experience Level</label>
                          <select name="experience_level" value={editForm.experience_level} onChange={handleEditChange}>
                            <option value="entry">Entry Level</option>
                            <option value="mid">Mid Level</option>
                            <option value="senior">Senior Level</option>
                            <option value="lead">Lead</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label>Description *</label>
                        <textarea name="description" value={editForm.description} onChange={handleEditChange} rows={5} required />
                      </div>
                      <div className="field">
                        <label className="field-check">
                          <input type="checkbox" name="is_active" checked={editForm.is_active} onChange={handleEditChange} />
                          Active (visible to candidates)
                        </label>
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-primary" disabled={updating}>
                          {updating
                            ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</>
                            : <><i className="fa-solid fa-floppy-disk" /> Save Changes</>
                          }
                        </button>
                        <button type="button" className="btn-outline" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Info grid */}
                <div className="detail-card">
                  <p className="detail-card-title">Job Details</p>
                  <div className="info-grid">
                    {selectedJob.job_type && (
                      <div className="info-cell">
                        <span className="info-cell-label">Type</span>
                        <span className="info-cell-value">{typeLabel(selectedJob.job_type)}</span>
                      </div>
                    )}
                    {selectedJob.experience_level && (
                      <div className="info-cell">
                        <span className="info-cell-label">Experience</span>
                        <span className="info-cell-value">{levelLabel(selectedJob.experience_level)}</span>
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
                      <span className="info-cell-value">{timeAgo(selectedJob.created_at)}</span>
                    </div>
                    <div className="info-cell">
                      <span className="info-cell-label">Applicants</span>
                      <span className="info-cell-value">{selectedJob.application_count || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="detail-card">
                  <p className="detail-card-title">Description</p>
                  <p className="detail-description">{selectedJob.description}</p>
                </div>

                {/* Applicants */}
                <div className="detail-card">
                  <p className="detail-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    Applicants
                    {applications.length > 0 && (
                      <span className="count-pill">{applications.length}</span>
                    )}
                  </p>

                  {loadingApps ? (
                    <div className="jobs-loading" style={{ padding: "20px 0" }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading…
                    </div>
                  ) : applications.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--faint)" }}>No applications yet.</p>
                  ) : (
                    <div className="applicant-list">
                      {applications.map((app) => (
                        <div key={app.id} className="applicant-row">
                          <div className="applicant-icon">
                            <i className="fa-solid fa-user" />
                          </div>
                          <div className="applicant-info">
                            <strong>Candidate</strong>
                            <span>
                              <i className="fa-regular fa-calendar" style={{ marginRight: 4 }} />
                              Applied {new Date(app.applied_at).toLocaleDateString()}
                            </span>
                          </div>
                          {app.resume_path && (
                            <a
                              href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${app.resume_path}`}
                              target="_blank" rel="noopener noreferrer"
                              className="applicant-cv"
                            >
                              <i className="fa-solid fa-file-arrow-down" /> CV
                            </a>
                          )}
                          <span className={`status status-${app.status}`}>{statusLabel(app.status)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="detail-empty">
                <i className="fa-regular fa-hand-pointer" />
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