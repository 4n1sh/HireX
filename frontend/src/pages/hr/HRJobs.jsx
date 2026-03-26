import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

const typeLabel = (t) =>
  ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
const typeTag = (t) =>
  ({ full_time: "tag-blue", part_time: "tag-green", contract: "tag-orange", internship: "tag-purple" })[t] || "tag-blue";
const levelLabel = (l) =>
  ({ entry: "Entry", mid: "Mid Level", senior: "Senior", lead: "Lead" })[l] || l;

const timeAgo = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  return w === 1 ? "1w ago" : `${w}w ago`;
};

function HRJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // Expanded job detail
  const [expandedId, setExpandedId] = useState(null);

  // Edit
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
    } catch {
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.deadline) delete payload.deadline;
      await api.post("/api/jobs", payload);
      setForm({ title: "", description: "", location: "", job_type: "full_time", experience_level: "entry", deadline: "" });
      setShowForm(false);
      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this job posting?")) return;
    try {
      await api.delete(`/api/jobs/${id}`);
      if (expandedId === id) setExpandedId(null);
      if (editingId === id) { setEditingId(null); setEditForm({}); }
      fetchJobs();
    } catch {
      setError("Failed to delete job");
    }
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
    setUpdating(true);
    setError("");
    try {
      const payload = { ...editForm };
      if (!payload.deadline) delete payload.deadline;
      await api.put(`/api/jobs/${editingId}`, payload);
      cancelEdit();
      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const toggleExpand = (job) => {
    if (expandedId === job.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(job.id);
    setEditingId(null);
  };

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchesSearch = j.title.toLowerCase().includes(q) || (j.location || "").toLowerCase().includes(q);
    if (filter === "active") return matchesSearch && j.is_active;
    if (filter === "closed") return matchesSearch && !j.is_active;
    return matchesSearch;
  });

  const totalApps = jobs.reduce((sum, j) => sum + (j.application_count || 0), 0);
  const activeCount = jobs.filter((j) => j.is_active).length;
  const closedCount = jobs.filter((j) => !j.is_active).length;

  return (
    <div className="admin-page-content">
      {/* Top bar */}
      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">My Job Postings</h1>
          <p className="admin-page-sub">
            Manage your job listings and review applicants.
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ fontSize: 13, padding: "9px 18px" }}
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
        >
          {showForm
            ? <><i className="fa-solid fa-xmark" /> Cancel</>
            : <><i className="fa-solid fa-plus" /> Post Job</>
          }
        </button>
      </div>

      {error && (
        <div className="error-bar" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </div>
      )}

      {/* Post job form */}
      {showForm && (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <div className="form-sheet" style={{ background: "transparent", border: "none", padding: 0 }}>
            <p className="form-sheet-title">
              <i className="fa-solid fa-pen-to-square" /> Create Job Posting
            </p>
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
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the role, responsibilities, requirements..." rows={5} required />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting
                    ? <><i className="fa-solid fa-spinner fa-spin" /> Posting...</>
                    : <><i className="fa-solid fa-paper-plane" /> Post Job</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats row */}
      {!loading && (
        <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon blue"><i className="fa-solid fa-briefcase" /></div>
            <div className="admin-stat-num">{jobs.length}</div>
            <div className="admin-stat-lbl">Total Jobs</div>
          </div>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon green"><i className="fa-solid fa-circle-check" /></div>
            <div className="admin-stat-num">{activeCount}</div>
            <div className="admin-stat-lbl">Active</div>
          </div>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon orange"><i className="fa-solid fa-circle-xmark" /></div>
            <div className="admin-stat-num">{closedCount}</div>
            <div className="admin-stat-lbl">Closed</div>
          </div>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon purple"><i className="fa-solid fa-file-lines" /></div>
            <div className="admin-stat-num">{totalApps}</div>
            <div className="admin-stat-lbl">Applications</div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="hr-filter-bar">
        <div className="jobs-search" style={{ flex: 1, maxWidth: 320 }}>
          <i className="fa-solid fa-magnifying-glass" />
          <input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="user-role-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Jobs</option>
          <option value="active">Active Only</option>
          <option value="closed">Closed Only</option>
        </select>
      </div>

      {/* Job list */}
      {loading ? (
        <p style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
          Loading jobs...
        </p>
      ) : filtered.length === 0 ? (
        <div className="admin-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <i className="fa-solid fa-briefcase" style={{ fontSize: 28, color: "var(--faint)", marginBottom: 12, display: "block" }} />
          <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>
            {search || filter !== "all" ? "No jobs match your filters" : "No job postings yet — create your first one!"}
          </p>
        </div>
      ) : (
        <div className="hr-jobs-list">
          {filtered.map((job) => (
            <div key={job.id} className={`hr-job-card${expandedId === job.id ? " expanded" : ""}`}>
              {/* Job row */}
              <div className="hr-job-row" onClick={() => toggleExpand(job)}>
                <div className="admin-job-avatar">{job.title.charAt(0)}</div>
                <div className="hr-job-main">
                  <div className="hr-job-title">{job.title}</div>
                  <div className="hr-job-meta">
                    {job.location && (
                      <span>
                        <i className="fa-solid fa-location-dot" /> {job.location}
                      </span>
                    )}
                    <span>
                      <i className="fa-solid fa-users" /> {job.application_count || 0} applicant{(job.application_count || 0) !== 1 ? "s" : ""}
                    </span>
                    <span>
                      <i className="fa-regular fa-clock" /> {timeAgo(job.created_at)}
                    </span>
                  </div>
                </div>
                <div className="hr-job-tags">
                  {job.job_type && (
                    <span className={`tag ${typeTag(job.job_type)}`}>{typeLabel(job.job_type)}</span>
                  )}
                  {job.experience_level && (
                    <span className="tag tag-gray">{levelLabel(job.experience_level)}</span>
                  )}
                  <span className={`user-status-badge ${job.is_active ? "active" : "blacklisted"}`}>
                    {job.is_active ? "Active" : "Closed"}
                  </span>
                </div>
                <div className="user-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="user-action-btn"
                    title="Edit"
                    onClick={() => {
                      if (expandedId !== job.id) toggleExpand(job);
                      editingId === job.id ? cancelEdit() : startEdit(job);
                    }}
                  >
                    <i className={`fa-solid ${editingId === job.id ? "fa-xmark" : "fa-pen"}`} />
                  </button>
                  <button
                    className="user-action-btn danger"
                    title="Delete"
                    onClick={() => handleDelete(job.id)}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
                <i className={`fa-solid fa-chevron-${expandedId === job.id ? "up" : "down"} hr-job-chevron`} />
              </div>

              {/* Expanded detail */}
              {expandedId === job.id && (
                <div className="hr-job-detail">
                  {/* Edit form */}
                  {editingId === job.id && (
                    <div className="form-sheet" style={{ marginBottom: 16 }}>
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
                          <textarea name="description" value={editForm.description} onChange={handleEditChange} rows={4} required />
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
                              ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                              : <><i className="fa-solid fa-floppy-disk" /> Save Changes</>
                            }
                          </button>
                          <button type="button" className="btn-outline" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Job info grid */}
                  <div className="hr-detail-grid">
                    {job.job_type && (
                      <div className="hr-detail-cell">
                        <span className="hr-detail-label">Type</span>
                        <span className="hr-detail-value">{typeLabel(job.job_type)}</span>
                      </div>
                    )}
                    {job.experience_level && (
                      <div className="hr-detail-cell">
                        <span className="hr-detail-label">Experience</span>
                        <span className="hr-detail-value">{levelLabel(job.experience_level)}</span>
                      </div>
                    )}
                    {job.location && (
                      <div className="hr-detail-cell">
                        <span className="hr-detail-label">Location</span>
                        <span className="hr-detail-value">{job.location}</span>
                      </div>
                    )}
                    {job.deadline && (
                      <div className="hr-detail-cell">
                        <span className="hr-detail-label">Deadline</span>
                        <span className="hr-detail-value">{job.deadline}</span>
                      </div>
                    )}
                    <div className="hr-detail-cell">
                      <span className="hr-detail-label">Posted</span>
                      <span className="hr-detail-value">{timeAgo(job.created_at)}</span>
                    </div>
                    <div className="hr-detail-cell">
                      <span className="hr-detail-label">Applicants</span>
                      <span className="hr-detail-value">{job.application_count || 0}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {job.description && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="hr-detail-section-title">Description</div>
                      <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                        {job.description}
                      </p>
                    </div>
                  )}

                  {/* View Applicants button */}
                  <Link
                    to={`/hr/jobs/${job.id}/applicants`}
                    className="btn-primary"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      textDecoration: "none", fontSize: 13, padding: "10px 20px",
                    }}
                  >
                    <i className="fa-solid fa-users" />
                    View Applicants ({job.application_count || 0})
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HRJobs;
