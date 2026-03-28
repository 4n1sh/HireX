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

const fmtInterview = (isoStr) => {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return (
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
};

const EMPTY_FORM = { date: "", time: "", duration_mins: 60, meeting_link: "", notes: "" };

function SkeletonApplicant() {
  return (
    <div className="hr-applicant-card" style={{ pointerEvents: "none" }}>
      <div className="hr-applicant-row">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton" style={{ height: 13, width: "30%" }} />
          <div className="skeleton" style={{ height: 11, width: "20%" }} />
        </div>
        <div className="skeleton" style={{ height: 30, width: 60, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 30, width: 80, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 30, width: 110, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function HRApplicants() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [savingNotes, setSavingNotes] = useState(null);
  const [skillGapOpen, setSkillGapOpen] = useState({});
  const [questionsModal, setQuestionsModal] = useState(null);
  const [statusToast, setStatusToast] = useState(null);
  const [notes, setNotes] = useState({});
  const [interviews, setInterviews] = useState({});        // { [appId]: interviewObj }
  const [scheduleModal, setScheduleModal] = useState(null); // null | appId
  const [scheduleForm, setScheduleForm] = useState(EMPTY_FORM);
  const [schedulingId, setSchedulingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/api/jobs/${jobId}`),
      api.get(`/api/jobs/${jobId}/applications`),
    ])
      .then(([jRes, aRes]) => {
        setJob(jRes.data);
        setApplications(aRes.data);
        const initialNotes = {};
        const initialInterviews = {};
        aRes.data.forEach((a) => {
          initialNotes[a.id] = a.hr_notes || "";
          if (a.interview) initialInterviews[a.id] = a.interview;
        });
        setNotes(initialNotes);
        setInterviews(initialInterviews);
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
      await api.put(`/api/hr/applications/${appId}/status`, {
        status: newStatus,
        hr_notes: notes[appId] || null,
      });
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

  const handleSaveNotes = async (app) => {
    setSavingNotes(app.id);
    try {
      await api.put(`/api/hr/applications/${app.id}/status`, {
        status: app.status,
        hr_notes: notes[app.id] || null,
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, hr_notes: notes[app.id] } : a))
      );
      showToast("Notes saved");
    } catch {
      showToast("Failed to save notes", "error");
    } finally {
      setSavingNotes(null);
    }
  };

  const openScheduleModal = (appId) => {
    const existing = interviews[appId];
    if (existing) {
      const dt = new Date(existing.scheduled_at);
      const pad = (n) => String(n).padStart(2, "0");
      setScheduleForm({
        date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
        time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
        duration_mins: existing.duration_mins,
        meeting_link: existing.meeting_link || "",
        notes: existing.notes || "",
      });
    } else {
      setScheduleForm(EMPTY_FORM);
    }
    setScheduleModal(appId);
  };

  const handleScheduleInterview = async () => {
    const appId = scheduleModal;
    if (!scheduleForm.date || !scheduleForm.time) return;
    setSchedulingId(appId);
    try {
      const scheduled_at = `${scheduleForm.date}T${scheduleForm.time}:00`;
      const res = await api.post(`/api/hr/applications/${appId}/interview`, {
        scheduled_at,
        duration_mins: Number(scheduleForm.duration_mins),
        meeting_link: scheduleForm.meeting_link || null,
        notes: scheduleForm.notes || null,
      });
      setInterviews((prev) => ({ ...prev, [appId]: res.data }));
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "interview" } : a))
      );
      setScheduleModal(null);
      showToast("Interview scheduled — email sent to candidate");
    } catch {
      showToast("Failed to schedule interview", "error");
    } finally {
      setSchedulingId(null);
    }
  };

  const handleCancelInterview = async (appId) => {
    const iv = interviews[appId];
    if (!iv) return;
    setCancellingId(appId);
    try {
      await api.delete(`/api/hr/interviews/${iv.id}`);
      setInterviews((prev) => { const n = { ...prev }; delete n[appId]; return n; });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "shortlisted" } : a))
      );
      showToast("Interview cancelled");
    } catch {
      showToast("Failed to cancel interview", "error");
    } finally {
      setCancellingId(null);
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
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="admin-page-content">
      {/* Toast */}
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
                <button onClick={copyAllQuestions} style={{
                  background: "#7c3aed", border: "none", color: "#fff",
                  padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 13,
                  fontWeight: 600, display: "flex", alignItems: "center", gap: 7,
                }}>
                  Copy All <i className="fa-solid fa-copy" style={{ fontSize: 12 }} />
                </button>
                <button onClick={() => setQuestionsModal(null)} style={{
                  background: "none", border: "none", color: "#9ca3af",
                  fontSize: 26, cursor: "pointer", padding: 0, lineHeight: 1, fontWeight: 700,
                }}>&times;</button>
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

      {/* Schedule Interview modal */}
      {scheduleModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setScheduleModal(null)}>
          <div style={{
            background: "var(--card-bg, #fff)", borderRadius: 16,
            width: "94%", maxWidth: 520,
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,.22)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "18px 24px", borderBottom: "1px solid var(--border, #e5e7eb)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
                <i className="fa-solid fa-calendar-plus" style={{ color: "var(--purple, #7c3aed)" }} />
                {interviews[scheduleModal] ? "Reschedule Interview" : "Schedule Interview"}
              </div>
              <button onClick={() => setScheduleModal(null)} style={{
                background: "none", border: "none", color: "var(--muted)", fontSize: 22,
                cursor: "pointer", padding: 0, lineHeight: 1,
              }}>&times;</button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                    Date <span style={{ color: "var(--red, #ef4444)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, date: e.target.value }))}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                      border: "1.5px solid var(--border, #e5e7eb)", background: "var(--bg)",
                      color: "var(--ink)", boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                    Time <span style={{ color: "var(--red, #ef4444)" }}>*</span>
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, time: e.target.value }))}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                      border: "1.5px solid var(--border, #e5e7eb)", background: "var(--bg)",
                      color: "var(--ink)", boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                  Duration
                </label>
                <select
                  value={scheduleForm.duration_mins}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, duration_mins: Number(e.target.value) }))}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                    border: "1.5px solid var(--border, #e5e7eb)", background: "var(--bg)",
                    color: "var(--ink)", cursor: "pointer", outline: "none",
                  }}
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                  Meeting Link
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={scheduleForm.meeting_link}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, meeting_link: e.target.value }))}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                    border: "1.5px solid var(--border, #e5e7eb)", background: "var(--bg)",
                    color: "var(--ink)", boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                  Prep Notes{" "}
                  <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — sent in email)</span>
                </label>
                <textarea
                  placeholder="Topics to cover, things to ask about their experience…"
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                    border: "1.5px solid var(--border, #e5e7eb)", background: "var(--bg)",
                    color: "var(--ink)", resize: "vertical", boxSizing: "border-box",
                    fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: "16px 24px", borderTop: "1px solid var(--border, #e5e7eb)",
              display: "flex", justifyContent: "flex-end", gap: 10,
            }}>
              <button onClick={() => setScheduleModal(null)} style={{
                background: "var(--bg)", border: "1.5px solid var(--border)", color: "var(--ink-2)",
                padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Cancel
              </button>
              <button
                onClick={handleScheduleInterview}
                disabled={!scheduleForm.date || !scheduleForm.time || schedulingId === scheduleModal}
                style={{
                  background: "var(--purple, #7c3aed)", border: "none", color: "#fff",
                  padding: "9px 22px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: (!scheduleForm.date || !scheduleForm.time || schedulingId === scheduleModal) ? "not-allowed" : "pointer",
                  opacity: (!scheduleForm.date || !scheduleForm.time || schedulingId === scheduleModal) ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {schedulingId === scheduleModal
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Scheduling…</>
                  : <><i className="fa-solid fa-calendar-check" /> {interviews[scheduleModal] ? "Reschedule" : "Schedule & Notify"}</>}
              </button>
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
        <>
          <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="admin-stat-card-v2">
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
                <div className="skeleton" style={{ height: 28, width: 50, margin: "8px auto 4px" }} />
                <div className="skeleton" style={{ height: 12, width: 60, margin: "0 auto" }} />
              </div>
            ))}
          </div>
          <div className="hr-applicant-list">
            {[1, 2, 3].map((i) => <SkeletonApplicant key={i} />)}
          </div>
        </>
      ) : (
        <>
          {/* Stats */}
          <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
            <div className="admin-stat-card-v2 accent-blue">
              <div className="admin-stat-icon blue"><i className="fa-solid fa-users" /></div>
              <div className="admin-stat-num">{applications.length}</div>
              <div className="admin-stat-lbl">Total</div>
            </div>
            <div className="admin-stat-card-v2 accent-orange">
              <div className="admin-stat-icon orange"><i className="fa-solid fa-clock" /></div>
              <div className="admin-stat-num">{pendingCount}</div>
              <div className="admin-stat-lbl">Pending</div>
            </div>
            <div className="admin-stat-card-v2 accent-green">
              <div className="admin-stat-icon green"><i className="fa-solid fa-star" /></div>
              <div className="admin-stat-num">{shortlistedCount}</div>
              <div className="admin-stat-lbl">Shortlisted</div>
            </div>
            <div className="admin-stat-card-v2 accent-purple">
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
                const noteVal = notes[app.id] ?? "";
                const noteChanged = noteVal !== (app.hr_notes || "");
                const iv = interviews[app.id];

                return (
                  <div key={app.id} className="hr-applicant-card">
                    <div className="hr-applicant-row">
                      <div className="hr-applicant-icon">
                        <i className="fa-solid fa-user" />
                      </div>
                      <div className="hr-applicant-info">
                        <strong>Candidate</strong>
                        <span>Applied {timeAgo(app.applied_at)}</span>
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
                          : <><i className="fa-solid fa-clipboard-question" /> Questions</>}
                      </button>

                      {!iv && (
                        <button
                          className="hr-schedule-btn"
                          onClick={() => openScheduleModal(app.id)}
                          title="Schedule an interview"
                        >
                          <i className="fa-solid fa-calendar-plus" /> Schedule
                        </button>
                      )}

                      <select
                        className="app-status-select"
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        disabled={updatingStatus === app.id}
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="shortlisted">Shortlisted</option>
                        {app.status === "interview" && (
                          <option value="interview" disabled>Interview ✓</option>
                        )}
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                      </select>
                    </div>

                    {/* HR Notes */}
                    <div className="hr-notes-row">
                      <textarea
                        className="hr-notes-input"
                        placeholder="Add notes about this candidate (visible to candidate after saving)…"
                        value={noteVal}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                        rows={2}
                      />
                      {noteChanged && (
                        <button
                          className="hr-notes-save-btn"
                          onClick={() => handleSaveNotes(app)}
                          disabled={savingNotes === app.id}
                        >
                          {savingNotes === app.id
                            ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</>
                            : <><i className="fa-solid fa-floppy-disk" /> Save Notes</>}
                        </button>
                      )}
                    </div>

                    {/* Scheduled interview card */}
                    {iv && (
                      <div className="hr-interview-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <i className="fa-solid fa-calendar-check" style={{ color: "var(--purple, #7c3aed)", fontSize: 15 }} />
                            <strong style={{ fontSize: 13, color: "var(--ink)" }}>Interview Scheduled</strong>
                            <span style={{
                              background: "var(--purple, #7c3aed)", color: "#fff",
                              fontSize: 10, fontWeight: 700, borderRadius: 20,
                              padding: "2px 8px", letterSpacing: ".04em",
                            }}>CONFIRMED</span>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => openScheduleModal(app.id)}
                              style={{
                                background: "none", border: "1px solid var(--border)", color: "var(--ink-2)",
                                padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                              }}
                            >
                              <i className="fa-solid fa-pen" /> Reschedule
                            </button>
                            <button
                              onClick={() => handleCancelInterview(app.id)}
                              disabled={cancellingId === app.id}
                              style={{
                                background: "none", border: "1px solid var(--red, #ef4444)", color: "var(--red, #ef4444)",
                                padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                cursor: cancellingId === app.id ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: 5,
                                opacity: cancellingId === app.id ? 0.6 : 1,
                              }}
                            >
                              {cancellingId === app.id
                                ? <><i className="fa-solid fa-spinner fa-spin" /> Cancelling…</>
                                : <><i className="fa-solid fa-xmark" /> Cancel</>}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                          <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "8px 12px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Date & Time</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{fmtInterview(iv.scheduled_at)}</div>
                          </div>
                          <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "8px 12px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Duration</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{iv.duration_mins} min</div>
                          </div>
                          {iv.meeting_link && (
                            <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "8px 12px" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Meeting</div>
                              <a
                                href={iv.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 13, fontWeight: 600, color: "var(--purple, #7c3aed)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                              >
                                Join Link <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />
                              </a>
                            </div>
                          )}
                        </div>

                        {iv.notes && (
                          <div style={{
                            marginTop: 10, background: "rgba(255,255,255,.6)", borderRadius: 8,
                            padding: "8px 12px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5,
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Notes · </span>
                            {iv.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Skill gap */}
                    {gap && gapOpen && (
                      <div className="hr-skill-gap">
                        {gap.matched?.length > 0 && (
                          <div className="skill-gap-row">
                            <span className="skill-gap-label matched">Matched</span>
                            <div className="skill-tags">
                              {gap.matched.map((s) => <span key={s} className="skill-tag matched">{s}</span>)}
                            </div>
                          </div>
                        )}
                        {gap.partial?.length > 0 && (
                          <div className="skill-gap-row">
                            <span className="skill-gap-label partial">Partial</span>
                            <div className="skill-tags">
                              {gap.partial.map((s) => <span key={s} className="skill-tag partial">{s}</span>)}
                            </div>
                          </div>
                        )}
                        {gap.missing?.length > 0 && (
                          <div className="skill-gap-row">
                            <span className="skill-gap-label missing">Missing</span>
                            <div className="skill-tags">
                              {gap.missing.map((s) => <span key={s} className="skill-tag missing">{s}</span>)}
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
