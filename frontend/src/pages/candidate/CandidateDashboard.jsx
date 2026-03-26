import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

const STATUS_META = {
  pending:     { label: "Pending",     color: "var(--muted)",  bg: "var(--bg)" },
  reviewed:    { label: "Reviewed",    color: "var(--brand)",  bg: "var(--brand-soft)" },
  shortlisted: { label: "Shortlisted", color: "var(--green)",  bg: "var(--green-bg)" },
  interview:   { label: "Interview",   color: "var(--purple)", bg: "var(--purple-bg)" },
  rejected:    { label: "Rejected",    color: "var(--red)",    bg: "var(--red-bg)" },
  hired:       { label: "Hired",       color: "var(--green)",  bg: "var(--green-bg)" },
};

function StatCard({ label, value, icon, color }) {
  return (
    <div className="admin-stat-card-v2">
      <div className={`admin-stat-icon ${color}`}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="admin-stat-num">{value}</div>
      <div className="admin-stat-lbl">{label}</div>
    </div>
  );
}

const timeAgo = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1w ago" : `${weeks}w ago`;
};

function CandidateDashboard() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName = user.full_name?.split(" ")[0] || "there";

  useEffect(() => {
    api.get("/api/jobs/me/applications")
      .then((res) => setApps(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pending = apps.filter((a) => a.status === "pending").length;
  const interview = apps.filter((a) => a.status === "interview").length;
  const shortlisted = apps.filter((a) => a.status === "shortlisted").length;
  const recent = apps.slice(0, 5);

  return (
    <div className="admin-page-content">
      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-sub">
            Welcome back, <strong>{firstName}</strong>. Here's your application overview.
          </p>
        </div>
        <Link
          to="/candidate/jobs"
          className="btn-primary"
          style={{ fontSize: 13, padding: "9px 18px", textDecoration: "none" }}
        >
          <i className="fa-solid fa-magnifying-glass" /> Browse Jobs
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
          Loading...
        </p>
      ) : (
        <>
          <div className="admin-stats-grid">
            <StatCard label="Total Applications" value={apps.length} icon="fa-file-lines" color="blue" />
            <StatCard label="Pending" value={pending} icon="fa-clock" color="orange" />
            <StatCard label="Interview" value={interview} icon="fa-calendar-check" color="purple" />
            <StatCard label="Shortlisted" value={shortlisted} icon="fa-star" color="green" />
          </div>

          <div className="admin-grid-2">
            {/* Quick actions */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Quick Actions</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to="/candidate/jobs" className="hr-quick-action" style={{ textDecoration: "none" }}>
                  <div className="hr-qa-icon blue">
                    <i className="fa-solid fa-magnifying-glass" />
                  </div>
                  <div className="hr-qa-text">
                    <strong>Browse Jobs</strong>
                    <span>Find and apply to new positions</span>
                  </div>
                  <i className="fa-solid fa-chevron-right hr-qa-arrow" />
                </Link>
                <Link to="/candidate/applications" className="hr-quick-action" style={{ textDecoration: "none" }}>
                  <div className="hr-qa-icon purple">
                    <i className="fa-solid fa-file-lines" />
                  </div>
                  <div className="hr-qa-text">
                    <strong>My Applications</strong>
                    <span>Track your application statuses</span>
                  </div>
                  <i className="fa-solid fa-chevron-right hr-qa-arrow" />
                </Link>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Application Status</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Pending", count: pending, cls: "blue" },
                  { label: "Interview", count: interview, cls: "purple" },
                  { label: "Shortlisted", count: shortlisted, cls: "green" },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="breakdown-row">
                    <span className="breakdown-label">{label}</span>
                    <div className="breakdown-bar">
                      <div
                        className={`breakdown-fill ${cls}`}
                        style={{
                          width: `${apps.length > 0
                            ? Math.max((count / apps.length) * 100, count > 0 ? 8 : 0)
                            : 0}%`,
                        }}
                      />
                    </div>
                    <span className="breakdown-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent applications */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>Recent Applications</h3>
              <span className="admin-card-badge">{apps.length} total</span>
            </div>
            {recent.length === 0 ? (
              <p style={{ color: "var(--faint)", fontSize: 14, margin: 0, textAlign: "center", padding: "24px 0" }}>
                No applications yet.{" "}
                <Link to="/candidate/jobs" style={{ color: "var(--brand)" }}>Browse jobs</Link> to get started!
              </p>
            ) : (
              <div className="admin-jobs-list">
                {recent.map((app) => {
                  const meta = STATUS_META[app.status] || STATUS_META.pending;
                  return (
                    <div key={app.id} className="admin-job-row">
                      <div className="admin-job-avatar">{(app.job_title || "?").charAt(0)}</div>
                      <div className="admin-job-info">
                        <strong>{app.job_title || "Unknown Job"}</strong>
                        <span>{timeAgo(app.applied_at)}</span>
                      </div>
                      {app.similarity_score != null && (
                        <div className="admin-job-apps">
                          <i className="fa-solid fa-chart-simple" />
                          {Math.round(app.similarity_score)}% match
                        </div>
                      )}
                      <span
                        className="myapp-status-badge"
                        style={{ color: meta.color, background: meta.bg }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CandidateDashboard;
