import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

const typeLabel = (t) =>
  ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
const levelLabel = (l) =>
  ({ entry: "Entry", mid: "Mid", senior: "Senior", lead: "Lead" })[l] || l;

const STATUS_META = {
  pending:     { label: "Pending",     color: "var(--muted)",  bg: "var(--bg)" },
  reviewed:    { label: "Reviewed",    color: "var(--brand)",  bg: "var(--brand-soft)" },
  shortlisted: { label: "Shortlisted", color: "var(--green)",  bg: "var(--green-bg)" },
  interview:   { label: "Interview",   color: "var(--purple)", bg: "var(--purple-bg)" },
  rejected:    { label: "Rejected",    color: "var(--red)",    bg: "var(--red-bg)" },
  hired:       { label: "Hired",       color: "var(--green)",  bg: "var(--green-bg)" },
};

function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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

  return (
    <div className="myapps-page">
      {/* Top bar */}
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
          <div className="myapps-empty">
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: "var(--brand)" }} />
            <p>Loading applications...</p>
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
                <div key={a.id} className="myapp-card">
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
                    <span
                      className="myapp-status-badge"
                      style={{ color: meta.color, background: meta.bg }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="myapp-card-footer">
                    <span className="myapp-date">
                      <i className="fa-regular fa-clock" /> Applied {timeAgo(a.applied_at)}
                    </span>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyApplications;
