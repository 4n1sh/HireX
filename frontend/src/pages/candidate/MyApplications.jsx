import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "../Jobs.css";

function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/api/jobs/me/applications")
      .then((res) => setApps(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typeLabel = (t) =>
    ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" })[t] || t;
  const levelLabel = (l) =>
    ({ entry: "Entry", mid: "Mid", senior: "Senior", lead: "Lead" })[l] || l;
  const statusLabel = (s) =>
    ({ pending: "Pending", reviewed: "Reviewed", shortlisted: "Shortlisted", interview: "Interview", rejected: "Rejected", hired: "Hired" })[s] || s;

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
    return (
      (a.job_title || "").toLowerCase().includes(q) ||
      (a.job_location || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="apps-page">
      <div className="apps-topbar">
        <h1>My Applications</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="jobs-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link to="/candidate/jobs" className="btn-primary" style={{ whiteSpace: "nowrap" }}>
            <i className="fa-solid fa-magnifying-glass" /> Browse Jobs
          </Link>
        </div>
      </div>

      <div className="apps-body">
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: 60 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
            Loading applications...
          </p>
        ) : filtered.length === 0 ? (
          <div className="apps-empty">
            <i className="fa-solid fa-file-lines" />
            <p>{apps.length === 0 ? "No applications yet" : "No matching applications"}</p>
            {apps.length === 0 && (
              <Link to="/candidate/jobs" className="btn-primary" style={{ marginTop: 8 }}>
                <i className="fa-solid fa-magnifying-glass" /> Browse Jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="apps-list">
            {filtered.map((a) => (
              <Link
                key={a.id}
                to="/candidate/jobs"
                className="app-card"
              >
                <div className="app-card-avatar">
                  {(a.job_title || "?").charAt(0)}
                </div>
                <div className="app-card-info">
                  <h4>{a.job_title || "Unknown Job"}</h4>
                  <span>
                    {a.job_location && (
                      <>
                        <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                        {a.job_location}
                      </>
                    )}
                    {a.job_type && <>{a.job_location ? " · " : ""}{typeLabel(a.job_type)}</>}
                    {a.experience_level && <> · {levelLabel(a.experience_level)}</>}
                    <> · Applied {timeAgo(a.applied_at)}</>
                  </span>
                </div>
                <span className={`status status-${a.status}`}>
                  {statusLabel(a.status)}
                </span>
                {a.similarity_score != null ? (
                  <div className="app-score-ring">
                    {Math.round(a.similarity_score)}%
                  </div>
                ) : (
                  <span className="app-card-scoring">
                    <i className="fa-solid fa-spinner fa-spin" /> Scoring
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyApplications;
