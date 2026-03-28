import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

const typeLabel = (t) =>
  ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
const levelLabel = (l) =>
  ({ entry: "Entry", mid: "Mid", senior: "Senior", lead: "Lead" })[l] || l;

const STATUS_META = {
  pending:     { label: "Pending",     color: "var(--muted)",   bg: "var(--bg)" },
  reviewed:    { label: "Reviewed",    color: "var(--brand)",   bg: "var(--brand-soft)" },
  shortlisted: { label: "Shortlisted", color: "var(--green)",   bg: "var(--green-bg)" },
  interview:   { label: "Interview",   color: "var(--purple)",  bg: "var(--purple-bg)" },
  rejected:    { label: "Rejected",    color: "var(--red)",     bg: "var(--red-bg)" },
  hired:       { label: "Hired",       color: "var(--green)",   bg: "var(--green-bg)" },
};

const STATUS_STEPS = ["pending", "reviewed", "shortlisted", "interview", "hired"];

function StatusTimeline({ status }) {
  const isRejected = status === "rejected";
  const activeIdx = STATUS_STEPS.indexOf(status);

  if (isRejected) {
    return (
      <div style={{ display: "flex", alignItems: "center", padding: "4px 0 16px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--red-bg, #fef2f2)", borderRadius: 10,
          padding: "10px 18px", width: "100%",
        }}>
          <i className="fa-solid fa-circle-xmark" style={{ color: "var(--red, #ef4444)", fontSize: 18 }} />
          <div>
            <div style={{ fontWeight: 700, color: "var(--red, #ef4444)", fontSize: 14 }}>Application Rejected</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>This application was not moved forward.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", padding: "4px 0 20px", overflowX: "auto" }}>
      {STATUS_STEPS.map((step, i) => {
        const done = i <= activeIdx;
        const current = i === activeIdx;
        const meta = STATUS_META[step] || STATUS_META.pending;
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : "none", minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 64 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? "var(--brand, #7c3aed)" : "var(--border, #e5e7eb)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: current ? "2.5px solid var(--brand, #7c3aed)" : "none",
                boxShadow: current ? "0 0 0 4px var(--brand-soft, #ede9fe)" : "none",
                transition: "all 200ms ease", flexShrink: 0,
              }}>
                {done
                  ? <i className="fa-solid fa-check" style={{ color: "#fff", fontSize: 11 }} />
                  : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--muted, #9ca3af)" }} />}
              </div>
              <span style={{
                fontSize: 10, fontWeight: current ? 700 : 500,
                color: done ? "var(--brand, #7c3aed)" : "var(--muted, #9ca3af)",
                textTransform: "capitalize", textAlign: "center", whiteSpace: "nowrap",
              }}>
                {meta.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 4px", marginBottom: 22,
                background: i < activeIdx ? "var(--brand, #7c3aed)" : "var(--border, #e5e7eb)",
                transition: "background 200ms ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreBreakdown({ breakdown, overall }) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    if (overall == null) return null;
    return (
      <div style={{ margin: "4px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>Overall Match</span>
          <span style={{ fontWeight: 700, color: "var(--brand)", fontSize: 14 }}>{Math.round(overall)}%</span>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 8, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.round(overall)}%`, height: "100%", background: "var(--brand)", borderRadius: 8, transition: "width 600ms ease" }} />
        </div>
      </div>
    );
  }

  const catLabel = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "4px 0 16px" }}>
      {Object.entries(breakdown).map(([key, val]) => {
        const pct = Math.min(Math.max(Math.round(typeof val === "number" ? val : 0), 0), 100);
        const color = pct >= 70 ? "var(--green, #22c55e)" : pct >= 40 ? "var(--brand, #7c3aed)" : "var(--red, #ef4444)";
        return (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>{catLabel(key)}</span>
              <span style={{ fontWeight: 700, color }}>{pct}%</span>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: 6, height: 7, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 600ms ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="myapp-card" style={{ cursor: "default", pointerEvents: "none" }}>
      <div className="myapp-card-header">
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton" style={{ height: 14, width: "60%" }} />
          <div className="skeleton" style={{ height: 11, width: "40%" }} />
        </div>
        <div className="skeleton" style={{ height: 22, width: 72, borderRadius: 20 }} />
      </div>
      <div className="myapp-card-footer">
        <div className="skeleton" style={{ height: 11, width: 90 }} />
        <div className="skeleton" style={{ height: 11, width: 70 }} />
      </div>
    </div>
  );
}

function ApplicationDetailModal({ app, onClose, onWithdraw }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const meta = STATUS_META[app.status] || STATUS_META.pending;

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await api.delete(`/api/jobs/me/applications/${app.id}`);
      onWithdraw(app.id);
    } catch {
      setWithdrawing(false);
      setConfirmWithdraw(false);
    }
  };

  const breakdown = app.extracted_data?.breakdown || null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "94%", maxWidth: 700,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,.18)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid var(--border, #e5e7eb)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              {app.job_title || "Application Details"}
            </h2>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {app.job_location && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  <i className="fa-solid fa-location-dot" style={{ marginRight: 4 }} />{app.job_location}
                </span>
              )}
              {app.job_type && <span style={{ fontSize: 12, color: "var(--muted)" }}>{typeLabel(app.job_type)}</span>}
              {app.experience_level && <span style={{ fontSize: 12, color: "var(--muted)" }}>{levelLabel(app.experience_level)}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span className="myapp-status-badge" style={{ color: meta.color, background: meta.bg, fontSize: 12 }}>
              {meta.label}
            </span>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted)", padding: 4, lineHeight: 1 }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Status timeline */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>
              Application Progress
            </div>
            <StatusTimeline status={app.status} />
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Applied", icon: "fa-calendar-plus", val: fmtDate(app.applied_at) },
              { label: "Last Updated", icon: "fa-rotate", val: fmtDate(app.updated_at) },
            ].map(({ label, icon, val }) => (
              <div key={label} style={{
                background: "var(--bg, #f9fafb)", borderRadius: 10, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <i className={`fa-solid ${icon}`} style={{ color: "var(--brand)", fontSize: 14 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Match score */}
          {(breakdown || app.similarity_score != null) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
                <i className="fa-solid fa-chart-simple" style={{ marginRight: 6, color: "var(--brand)" }} />
                Match Score{app.similarity_score != null ? ` — ${Math.round(app.similarity_score)}% overall` : ""}
              </div>
              <ScoreBreakdown breakdown={breakdown} overall={app.similarity_score} />
            </div>
          )}

          {/* Interview Details */}
          {app.status === "interview" && app.interview && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
                <i className="fa-solid fa-calendar-check" style={{ marginRight: 6, color: "var(--purple, #7c3aed)" }} />
                Your Interview
              </div>
              <div style={{
                background: "var(--purple-bg, #f5f3ff)", borderRadius: 12, padding: "16px",
                border: "1px solid rgba(124,58,237,.15)",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: app.interview.meeting_link ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Date & Time</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                      {new Date(app.interview.scheduled_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
                      {new Date(app.interview.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Duration</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{app.interview.duration_mins} minutes</div>
                  </div>
                </div>
                {app.interview.meeting_link && (
                  <a
                    href={app.interview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      background: "var(--purple, #7c3aed)", color: "#fff",
                      padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                      textDecoration: "none", marginTop: 4,
                    }}
                  >
                    <i className="fa-solid fa-video" /> Join Meeting
                  </a>
                )}
                {app.interview.notes && (
                  <div style={{
                    marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(124,58,237,.12)",
                    fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Notes · </span>
                    {app.interview.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HR Feedback */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              <i className="fa-solid fa-comment-dots" style={{ marginRight: 6, color: "var(--brand)" }} />
              HR Feedback
            </div>
            {app.hr_notes ? (
              <div style={{
                background: "var(--brand-soft, #ede9fe)", borderRadius: 10, padding: "14px 16px",
                fontSize: 14, color: "var(--ink)", lineHeight: 1.6,
                borderLeft: "3px solid var(--brand, #7c3aed)",
              }}>
                {app.hr_notes}
              </div>
            ) : (
              <div style={{
                background: "var(--bg, #f9fafb)", borderRadius: 10, padding: "14px 16px",
                fontSize: 13, color: "var(--muted)", fontStyle: "italic",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className="fa-regular fa-clock" />
                No feedback yet from the hiring team.
              </div>
            )}
          </div>
        </div>

        {/* Withdraw footer */}
        {app.status === "pending" && (
          <div style={{
            padding: "14px 24px", borderTop: "1px solid var(--border, #e5e7eb)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              You can withdraw this application while it is still pending.
            </span>
            {confirmWithdraw ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Are you sure?</span>
                <button
                  onClick={() => setConfirmWithdraw(false)}
                  style={{
                    background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ink-2)",
                    padding: "7px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                  }}
                >Cancel</button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  style={{
                    background: "var(--red, #ef4444)", color: "#fff", border: "none",
                    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: withdrawing ? "not-allowed" : "pointer", opacity: withdrawing ? 0.7 : 1,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {withdrawing ? <><i className="fa-solid fa-spinner fa-spin" /> Withdrawing…</> : "Confirm Withdraw"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmWithdraw(true)}
                style={{
                  background: "none", border: "1.5px solid var(--red, #ef4444)", color: "var(--red, #ef4444)",
                  padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}
              >
                <i className="fa-solid fa-trash-can" /> Withdraw
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/api/jobs/me/applications")
      .then((res) => setApps(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const timeAgo = (d) => {
    if (!d) return "";
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  };

  const filtered = apps.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (a.job_title || "").toLowerCase().includes(q) ||
      (a.job_location || "").toLowerCase().includes(q);
    const matchesStatus = !filterStatus || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleWithdraw = (id) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
    setSelected(null);
  };

  return (
    <div className="myapps-page">
      {selected && (
        <ApplicationDetailModal
          app={selected}
          onClose={() => setSelected(null)}
          onWithdraw={handleWithdraw}
        />
      )}

      <div className="myapps-topbar">
        <div>
          <h1 className="myapps-title">My Applications</h1>
          <p className="myapps-sub">{apps.length} application{apps.length !== 1 ? "s" : ""} submitted</p>
        </div>
        <div className="myapps-topbar-right">
          <div className="jobs-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="rejected">Rejected</option>
            <option value="hired">Hired</option>
          </select>
          <Link to="/candidate/jobs" className="btn-primary" style={{ whiteSpace: "nowrap", fontSize: 13 }}>
            <i className="fa-solid fa-magnifying-glass" /> Browse Jobs
          </Link>
        </div>
      </div>

      <div className="myapps-body">
        {loading ? (
          <div className="myapps-grid">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="myapps-empty">
            <i className="fa-solid fa-file-lines" />
            <p>{apps.length === 0 ? "No applications yet" : "No matching applications"}</p>
            {apps.length === 0 && (
              <Link to="/candidate/jobs" className="btn-primary" style={{ marginTop: 8 }}>
                <i className="fa-solid fa-magnifying-glass" /> Browse Jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="myapps-grid">
            {filtered.map((a) => {
              const meta = STATUS_META[a.status] || STATUS_META.pending;
              return (
                <div
                  key={a.id}
                  className="myapp-card myapp-card-clickable"
                  onClick={() => setSelected(a)}
                  title="Click to view details"
                >
                  <div className="myapp-card-header">
                    <div className="myapp-avatar">{(a.job_title || "?").charAt(0)}</div>
                    <div className="myapp-header-info">
                      <h4 className="myapp-title">{a.job_title || "Unknown Job"}</h4>
                      <div className="myapp-meta">
                        {a.job_location && (
                          <span><i className="fa-solid fa-location-dot" /> {a.job_location}</span>
                        )}
                        {a.job_type && <span>{typeLabel(a.job_type)}</span>}
                        {a.experience_level && <span>{levelLabel(a.experience_level)}</span>}
                      </div>
                    </div>
                    <span className="myapp-status-badge" style={{ color: meta.color, background: meta.bg }}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="myapp-card-footer">
                    <span className="myapp-date">
                      <i className="fa-regular fa-clock" /> Applied {timeAgo(a.applied_at)}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {a.hr_notes && (
                        <span style={{ fontSize: 11, color: "var(--brand)", display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="fa-solid fa-comment-dots" /> Feedback
                        </span>
                      )}
                      {a.similarity_score != null ? (
                        <span className="myapp-match">
                          <i className="fa-solid fa-chart-simple" />
                          {Math.round(a.similarity_score)}% match
                        </span>
                      ) : (
                        <span className="myapp-match muted">
                          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 10 }} /> scoring…
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyApplications;
