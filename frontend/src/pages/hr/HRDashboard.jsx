import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

function StatCard({ label, value, icon, color }) {
  return (
    <div className="admin-stat-card-v2">
      <div className={`admin-stat-icon ${color}`}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="admin-stat-num">{value ?? "—"}</div>
      <div className="admin-stat-lbl">{label}</div>
    </div>
  );
}

const statusLabel = (s) =>
  ({ pending: "Pending", reviewed: "Reviewed", shortlisted: "Shortlisted", interview: "Interview", rejected: "Rejected", hired: "Hired" })[s] || s;
const statusTag = (s) =>
  ({ pending: "tag-gray", reviewed: "tag-blue", shortlisted: "tag-green", interview: "tag-purple", rejected: "tag-red", hired: "tag-green" })[s] || "tag-gray";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1w ago" : `${weeks}w ago`;
};

function HRDashboard() {
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName = user.full_name?.split(" ")[0] || "Recruiter";

  useEffect(() => {
    Promise.all([
      api.get("/api/hr/stats"),
      api.get("/api/hr/recent-applications"),
    ])
      .then(([sRes, aRes]) => {
        setStats(sRes.data);
        setRecentApps(aRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page-content">
      {/* Top bar */}
      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-sub">
            Welcome back, <strong>{firstName}</strong>. Here's your recruitment overview.
          </p>
        </div>
        <Link
          to="/hr/jobs"
          className="btn-primary"
          style={{ fontSize: 13, padding: "9px 18px", textDecoration: "none" }}
        >
          <i className="fa-solid fa-plus" /> Post New Job
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
          Loading stats...
        </p>
      ) : stats && (
        <>
          {/* Stat cards */}
          <div className="admin-stats-grid">
            <StatCard label="Total Jobs" value={stats.total_jobs} icon="fa-briefcase" color="blue" />
            <StatCard label="Active Jobs" value={stats.active_jobs} icon="fa-circle-check" color="green" />
            <StatCard label="Applications" value={stats.total_applications} icon="fa-file-lines" color="orange" />
            <StatCard label="Pending Review" value={stats.pending_applications} icon="fa-clock" color="purple" />
          </div>

          <div className="admin-grid-2">
            {/* Job overview */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Jobs Overview</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Active Jobs", count: stats.active_jobs, cls: "green" },
                  { label: "Closed Jobs", count: stats.closed_jobs, cls: "blue" },
                  { label: "Shortlisted", count: stats.shortlisted, cls: "purple" },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="breakdown-row">
                    <span className="breakdown-label">{label}</span>
                    <div className="breakdown-bar">
                      <div
                        className={`breakdown-fill ${cls}`}
                        style={{
                          width: `${
                            stats.total_jobs > 0
                              ? Math.max((count / Math.max(stats.total_jobs, stats.total_applications, 1)) * 100, count > 0 ? 8 : 0)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="breakdown-count">{count}</span>
                  </div>
                ))}

                <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Total Apps", value: stats.total_applications, icon: "fa-file-lines" },
                      { label: "Pending", value: stats.pending_applications, icon: "fa-clock" },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ background: "var(--bg)", borderRadius: "var(--r)", padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                          <i className={`fa-solid ${icon}`} style={{ marginRight: 5, color: "var(--brand)" }} />
                          {label}
                        </div>
                        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Quick Actions</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to="/hr/jobs" className="hr-quick-action" style={{ textDecoration: "none" }}>
                  <div className="hr-qa-icon blue">
                    <i className="fa-solid fa-plus" />
                  </div>
                  <div className="hr-qa-text">
                    <strong>Post a New Job</strong>
                    <span>Create a new job listing</span>
                  </div>
                  <i className="fa-solid fa-chevron-right hr-qa-arrow" />
                </Link>
                <Link to="/hr/jobs" className="hr-quick-action" style={{ textDecoration: "none" }}>
                  <div className="hr-qa-icon green">
                    <i className="fa-solid fa-list-check" />
                  </div>
                  <div className="hr-qa-text">
                    <strong>Manage Jobs</strong>
                    <span>Edit, close, or delete postings</span>
                  </div>
                  <i className="fa-solid fa-chevron-right hr-qa-arrow" />
                </Link>
                <Link to="/hr/jobs" className="hr-quick-action" style={{ textDecoration: "none" }}>
                  <div className="hr-qa-icon purple">
                    <i className="fa-solid fa-users" />
                  </div>
                  <div className="hr-qa-text">
                    <strong>Review Applicants</strong>
                    <span>View and score candidates</span>
                  </div>
                  <i className="fa-solid fa-chevron-right hr-qa-arrow" />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Applications */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>Recent Applications</h3>
              <span className="admin-card-badge">{stats.total_applications} total</span>
            </div>
            {recentApps.length === 0 ? (
              <p style={{ color: "var(--faint)", fontSize: 14, margin: 0, textAlign: "center", padding: "24px 0" }}>
                No applications received yet
              </p>
            ) : (
              <div className="admin-jobs-list">
                {recentApps.map((app) => (
                  <div key={app.id} className="admin-job-row">
                    <div className="admin-job-avatar">
                      <i className="fa-solid fa-user" style={{ fontSize: 14 }} />
                    </div>
                    <div className="admin-job-info">
                      <strong>{app.job_title}</strong>
                      <span>{timeAgo(app.applied_at)}</span>
                    </div>
                    {app.similarity_score != null && (
                      <div className="admin-job-apps">
                        <i className="fa-solid fa-chart-simple" />
                        {Math.round(app.similarity_score)}% match
                      </div>
                    )}
                    <span className={`tag ${statusTag(app.status)}`} style={{ fontSize: 11 }}>
                      {statusLabel(app.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default HRDashboard;
