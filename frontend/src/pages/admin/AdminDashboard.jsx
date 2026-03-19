import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

function BarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 500, H = 160, padL = 10, padR = 10, padT = 26, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = data.length;
  const step = plotW / n;
  const barW = Math.min(38, step * 0.55);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {data.map((d, i) => {
        const cx = padL + step * i + step / 2;
        const bh = max > 0 ? Math.max((d.count / max) * plotH, d.count > 0 ? 4 : 0) : 0;
        const by = padT + plotH - bh;
        const isLatest = i === n - 1;
        return (
          <g key={i}>
            <rect
              x={cx - barW / 2} y={by}
              width={barW} height={bh}
              rx={5}
              fill={isLatest ? "#2563eb" : "#bfdbfe"}
            />
            {d.count > 0 && (
              <text x={cx} y={by - 5} textAnchor="middle"
                fontSize={10} fontFamily="DM Sans" fill="#334155" fontWeight="600">
                {d.count}
              </text>
            )}
            <text x={cx} y={H - 6} textAnchor="middle"
              fontSize={11} fontFamily="DM Sans" fill="#94a3b8">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

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

const typeLabel = (t) =>
  ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
const typeTag = (t) =>
  ({ full_time: "tag-blue", part_time: "tag-green", contract: "tag-orange", internship: "tag-purple" })[t] || "tag-blue";

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

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [regData, setRegData] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName = user.full_name?.split(" ")[0] || "Admin";

  useEffect(() => {
    Promise.all([
      api.get("/api/admin/stats"),
      api.get("/api/admin/registrations"),
      api.get("/api/admin/recent-jobs"),
    ])
      .then(([sRes, rRes, jRes]) => {
        setStats(sRes.data);
        setRegData(rRes.data);
        setRecentJobs(jRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page-content">
      {/* Top bar */}
      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">Platform Overview</h1>
          <p className="admin-page-sub">
            Welcome back, <strong>{firstName}</strong>. Here's what's happening today.
          </p>
        </div>
        <Link to="/admin/users" className="btn-primary"
          style={{ fontSize: 13, padding: "9px 18px", textDecoration: "none" }}>
          <i className="fa-solid fa-users-gear" /> Manage Users
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
          Loading stats…
        </p>
      ) : stats && (
        <>
          {/* Stat cards */}
          <div className="admin-stats-grid">
            <StatCard label="Total Users" value={stats.total_users} icon="fa-users" color="blue" />
            <StatCard label="HR Managers" value={stats.total_hr} icon="fa-user-tie" color="purple" />
            <StatCard label="Active Jobs" value={stats.active_jobs} icon="fa-briefcase" color="green" />
            <StatCard label="Applications" value={stats.total_applications} icon="fa-file-lines" color="orange" />
          </div>

          {/* Charts row */}
          <div className="admin-grid-2">
            {/* Bar chart */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Registration Growth</h3>
                <span className="admin-card-badge">Last 7 months</span>
              </div>
              <BarChart data={regData} />
            </div>

            {/* Breakdown */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>User Breakdown</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Candidates", count: stats.total_candidates, cls: "blue" },
                  { label: "HR Managers", count: stats.total_hr, cls: "purple" },
                  { label: "Admins", count: stats.total_admins, cls: "green" },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="breakdown-row">
                    <span className="breakdown-label">{label}</span>
                    <div className="breakdown-bar">
                      <div
                        className={`breakdown-fill ${cls}`}
                        style={{ width: `${stats.total_users > 0 ? (count / stats.total_users) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="breakdown-count">{count}</span>
                  </div>
                ))}

                <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Total Jobs", value: stats.total_jobs, icon: "fa-briefcase" },
                      { label: "Active Jobs", value: stats.active_jobs, icon: "fa-circle-check" },
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
          </div>

          {/* Recent Job Postings */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>Recent Job Postings</h3>
              <span className="admin-card-badge">{stats.total_jobs} total</span>
            </div>
            {recentJobs.length === 0 ? (
              <p style={{ color: "var(--faint)", fontSize: 14, margin: 0, textAlign: "center", padding: "24px 0" }}>
                No jobs posted yet
              </p>
            ) : (
              <div className="admin-jobs-list">
                {recentJobs.map((job) => (
                  <div key={job.id} className="admin-job-row">
                    <div className="admin-job-avatar">{job.title.charAt(0)}</div>
                    <div className="admin-job-info">
                      <strong>{job.title}</strong>
                      <span>{timeAgo(job.created_at)}</span>
                    </div>
                    {job.job_type && (
                      <span className={`tag ${typeTag(job.job_type)}`} style={{ fontSize: 11 }}>
                        {typeLabel(job.job_type)}
                      </span>
                    )}
                    <div className="admin-job-apps">
                      <i className="fa-solid fa-users" />
                      {job.applicant_count} applicant{job.applicant_count !== 1 ? "s" : ""}
                    </div>
                    <span className={`user-status-badge ${job.is_active ? "active" : "blacklisted"}`}>
                      {job.is_active ? "Active" : "Inactive"}
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

export default AdminDashboard;
