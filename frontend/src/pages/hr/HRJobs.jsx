import { useEffect, useState } from "react";
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
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null); // app id being updated
  const [skillGapOpen, setSkillGapOpen] = useState({}); // app id -> bool
  const [statusToast, setStatusToast] = useState(null); // { message, type }
  const [questionsModal, setQuestionsModal] = useState(null); // { appId, questions, loading }


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
      if (expandedId === id) { setExpandedId(null); setApplications([]); }
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

  const showToast = (message, type = "success") => {
    setStatusToast({ message, type });
    setTimeout(() => setStatusToast(null), 3500);
  };

  const handleStatusChange = async (appId, newStatus) => {
    setUpdatingStatus(appId);
    try {
      await api.put(`/api/hr/applications/${appId}/status`, { status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      showToast("Status updated — email sent to candidate");
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleSkillGap = (appId) =>
    setSkillGapOpen((prev) => ({ ...prev, [appId]: !prev[appId] }));

  const handleGenerateQuestions = async (appId) => {
    setQuestionsModal({ appId, questions: [], loading: true });
    try {
      const res = await api.post(`/api/hr/applications/${appId}/interview-questions`);
      setQuestionsModal({ appId, questions: res.data.questions, loading: false });
    } catch {
      showToast("Failed to generate questions", "error");
      setQuestionsModal(null);
    }
  };

  const copyAllQuestions = () => {
    if (!questionsModal?.questions?.length) return;
    const text = questionsModal.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    navigator.clipboard.writeText(text);
    showToast("Questions copied to clipboard");
  };

  const toggleExpand = async (job) => {
    if (expandedId === job.id) {
      setExpandedId(null);
      setApplications([]);
      return;
    }
    setExpandedId(job.id);
    setEditingId(null);
    setLoadingApps(true);
    try {
      const res = await api.get(`/api/jobs/${job.id}/applications`);
      setApplications(res.data);
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
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
      {/* Status toast */}
      {statusToast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: statusToast.type === "error" ? "#ef4444" : "#22c55e",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)", fontSize: 14, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`fas ${statusToast.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`} />
          {statusToast.message}
        </div>
      )}

      {/* Interview questions modal */}
      {questionsModal && !questionsModal.loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setQuestionsModal(null)}>
          <div style={{
            background: "var(--card-bg, #fff)", borderRadius: 14,
            maxWidth: 860, width: "94%", height: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,.25)",
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 22px", borderBottom: "1px solid #e5e7eb", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600, color: "var(--ink, #111827)" }}>
                <i className="fa-solid fa-clipboard-question" style={{ color: "var(--primary, #7c3aed)", fontSize: 18 }} />
                Interview Questions
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={copyAllQuestions}
                  style={{
                    background: "#7c3aed", border: "none", color: "#fff",
                    padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 13,
                    fontWeight: 600, display: "flex", alignItems: "center", gap: 7,
                  }}
                >
                  Copy All <i className="fa-solid fa-copy" style={{ fontSize: 12 }} />
                </button>
                <button
                  onClick={() => setQuestionsModal(null)}
                  style={{
                    background: "none", border: "none", color: "#9ca3af",
                    fontSize: 26, cursor: "pointer", padding: 0, lineHeight: 1, fontWeight: 700,
                  }}
                >&times;</button>
              </div>
            </div>
            {/* Questions list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "36px 48px" }}>
              <ol style={{ margin: 0, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 18 }}>
                {questionsModal.questions.map((q, i) => (
                  <li key={i} style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-2, #1f2937)" }}>{q}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">My Job Postings</h1>
          <p className="admin-page-sub">
            Manage your job listings, edit details, and review applicants.
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

                  {/* Applicants */}
                  <div>
                    <div className="hr-detail-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      Applicants
                      {applications.length > 0 && (
                        <span className="count-pill">{applications.length}</span>
                      )}
                    </div>

                    {loadingApps ? (
                      <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, padding: "12px 0" }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading...
                      </p>
                    ) : applications.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: "var(--faint)" }}>No applications yet.</p>
                    ) : (
                      <div className="hr-applicant-list">
                        {applications.map((app) => {
                          const gap = app.extracted_data?.skill_gap;
                          const gapOpen = skillGapOpen[app.id];
                          return (
                          <div key={app.id} className="hr-applicant-card">
                            <div className="hr-applicant-row">
                              <div className="hr-applicant-icon">
                                <i className="fa-solid fa-user" />
                              </div>
                              <div className="hr-applicant-info">
                                <strong>Candidate</strong>
                                <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                              </div>
                              {app.similarity_score != null ? (
                                <div className="hr-match-score">
                                  <i className="fa-solid fa-chart-simple" />
                                  {Math.round(app.similarity_score)}%
                                </div>
                              ) : (
                                <div className="hr-match-score muted">
                                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 10 }} /> scoring
                                </div>
                              )}
                              {app.resume_path && (
                                <a
                                  href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${app.resume_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hr-cv-btn"
                                >
                                  <i className="fa-solid fa-file-arrow-down" /> CV
                                </a>
                              )}
                              {gap && (
                                <button
                                  className="hr-gap-btn"
                                  onClick={() => toggleSkillGap(app.id)}
                                  title="View skill gap"
                                >
                                  <i className={`fa-solid fa-chevron-${gapOpen ? "up" : "down"}`} />
                                  Skills
                                </button>
                              )}
                              <button
                                className="hr-gap-btn"
                                onClick={() => handleGenerateQuestions(app.id)}
                                title="Generate interview questions"
                                disabled={questionsModal?.loading && questionsModal?.appId === app.id}
                              >
                                {questionsModal?.loading && questionsModal?.appId === app.id
                                  ? <><i className="fa-solid fa-spinner fa-spin" /> Generating...</>
                                  : <><i className="fa-solid fa-clipboard-question" /> Questions</>
                                }
                              </button>
                              <select
                                className="app-status-select"
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                disabled={updatingStatus === app.id}
                              >
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="interview">Interview</option>
                                <option value="rejected">Rejected</option>
                                <option value="hired">Hired</option>
                              </select>
                            </div>
                            {gap && gapOpen && (
                              <div className="hr-skill-gap">
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
                          );
                        })}
                      </div>
                    )}
                  </div>
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
