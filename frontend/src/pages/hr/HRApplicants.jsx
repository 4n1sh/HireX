import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

const timeAgo = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  return w === 1 ? "1w ago" : `${w}w ago`;
};

function HRApplicants() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [skillGapOpen, setSkillGapOpen] = useState({});
  const [questionsModal, setQuestionsModal] = useState(null);
  const [statusToast, setStatusToast] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/api/jobs/${jobId}`),
      api.get(`/api/jobs/${jobId}/applications`),
    ])
      .then(([jRes, aRes]) => {
        setJob(jRes.data);
        setApplications(aRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

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

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const shortlistedCount = applications.filter((a) => a.status === "shortlisted").length;

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
          <Link
            to="/hr/jobs"
            style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}
          >
            <i className="fa-solid fa-arrow-left" /> Back to Jobs
          </Link>
          <h1 className="admin-page-title">{job?.title || "Loading..."}</h1>
          <p className="admin-page-sub">
            {applications.length} applicant{applications.length !== 1 ? "s" : ""} for this position
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
          Loading applicants...
        </p>
      ) : (
        <>
          {/* Stats */}
          <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
            <div className="admin-stat-card-v2">
              <div className="admin-stat-icon blue"><i className="fa-solid fa-users" /></div>
              <div className="admin-stat-num">{applications.length}</div>
              <div className="admin-stat-lbl">Total</div>
            </div>
            <div className="admin-stat-card-v2">
              <div className="admin-stat-icon orange"><i className="fa-solid fa-clock" /></div>
              <div className="admin-stat-num">{pendingCount}</div>
              <div className="admin-stat-lbl">Pending</div>
            </div>
            <div className="admin-stat-card-v2">
              <div className="admin-stat-icon green"><i className="fa-solid fa-star" /></div>
              <div className="admin-stat-num">{shortlistedCount}</div>
              <div className="admin-stat-lbl">Shortlisted</div>
            </div>
            <div className="admin-stat-card-v2">
              <div className="admin-stat-icon purple"><i className="fa-solid fa-chart-simple" /></div>
              <div className="admin-stat-num">
                {applications.length > 0
                  ? Math.round(applications.reduce((s, a) => s + (a.similarity_score || 0), 0) / applications.length)
                  : 0}%
              </div>
              <div className="admin-stat-lbl">Avg Match</div>
            </div>
          </div>

          {/* Applicant list */}
          {applications.length === 0 ? (
            <div className="admin-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <i className="fa-solid fa-users" style={{ fontSize: 28, color: "var(--faint)", marginBottom: 12, display: "block" }} />
              <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>No applications yet</p>
            </div>
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
        </>
      )}
    </div>
  );
}

export default HRApplicants;
