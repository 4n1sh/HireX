import { Link } from "react-router-dom";
import "../Jobs.css";

function Dashboard({ role: roleProp }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = roleProp || user.role || "candidate";
  const isHR = role === "hr";
  const firstName = user.name?.split(" ")[0] || (isHR ? "Recruiter" : "there");

  return (
    <div className="dashboard-page" style={{ maxWidth: 1128, margin: "0 auto", padding: "24px 16px" }}>

      {/* ── Hero banner ── */}
      <div className="dash-hero">
        <div className="dash-hero-text">
          <p className="dash-eyebrow">
            <i className="fa-solid fa-circle-dot" />
            {isHR ? "HR Portal" : "Candidate Portal"}
          </p>
          <h1>Welcome back, <span>{firstName}</span></h1>
          <p className="dash-subtitle">
            {isHR
              ? "Manage your job postings and review applicants from one place."
              : "Find your next opportunity and track your applications."}
          </p>
          <Link to={isHR ? "/hr/jobs" : "/candidate/jobs"} className="dash-hero-btn">
            <i className={`fa-solid ${isHR ? "fa-briefcase" : "fa-magnifying-glass"}`} />
            {isHR ? "Go to Job Postings" : "Browse Open Jobs"}
          </Link>
        </div>
        <div className="dash-hero-graphic">
          <div className="dash-graphic-circle dash-gc1" />
          <div className="dash-graphic-circle dash-gc2" />
          <div className="dash-graphic-icon">
            <i className={`fa-solid ${isHR ? "fa-users-gear" : "fa-user-tie"}`} />
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <p className="dash-section-label">
        <i className="fa-solid fa-bolt" /> Quick Actions
      </p>

      <div className="dash-actions">
        {isHR ? (
          <>
            <Link to="/hr/jobs" className="dash-action-card">
              <div className="dac-icon blue"><i className="fa-solid fa-plus" /></div>
              <div className="dac-text">
                <span className="dac-title">Post a Job</span>
                <span className="dac-desc">Create a new job listing</span>
              </div>
              <i className="fa-solid fa-chevron-right dac-arrow" />
            </Link>

            <Link to="/hr/jobs" className="dash-action-card">
              <div className="dac-icon green"><i className="fa-solid fa-users" /></div>
              <div className="dac-text">
                <span className="dac-title">View Applicants</span>
                <span className="dac-desc">Review submitted applications</span>
              </div>
              <i className="fa-solid fa-chevron-right dac-arrow" />
            </Link>

            <Link to="/hr/jobs" className="dash-action-card">
              <div className="dac-icon orange"><i className="fa-solid fa-pen-to-square" /></div>
              <div className="dac-text">
                <span className="dac-title">Manage Postings</span>
                <span className="dac-desc">Edit or close active listings</span>
              </div>
              <i className="fa-solid fa-chevron-right dac-arrow" />
            </Link>
          </>
        ) : (
          <>
            <Link to="/candidate/jobs" className="dash-action-card">
              <div className="dac-icon blue"><i className="fa-solid fa-magnifying-glass" /></div>
              <div className="dac-text">
                <span className="dac-title">Browse Jobs</span>
                <span className="dac-desc">Explore all open positions</span>
              </div>
              <i className="fa-solid fa-chevron-right dac-arrow" />
            </Link>

            <Link to="/candidate/jobs" className="dash-action-card">
              <div className="dac-icon green"><i className="fa-solid fa-paper-plane" /></div>
              <div className="dac-text">
                <span className="dac-title">My Applications</span>
                <span className="dac-desc">Track what you've applied to</span>
              </div>
              <i className="fa-solid fa-chevron-right dac-arrow" />
            </Link>

            <Link to="/candidate/jobs" className="dash-action-card">
              <div className="dac-icon orange"><i className="fa-solid fa-bolt" /></div>
              <div className="dac-text">
                <span className="dac-title">Easy Apply</span>
                <span className="dac-desc">Apply instantly with your resume</span>
              </div>
              <i className="fa-solid fa-chevron-right dac-arrow" />
            </Link>
          </>
        )}
      </div>

      {/* ── Tip banner ── */}
      <div className="dash-tip">
        <div className="dash-tip-icon">
          <i className="fa-solid fa-lightbulb" />
        </div>
        <div className="dash-tip-body">
          <strong>{isHR ? "Pro tip:" : "Get noticed:"}</strong>
          {isHR
            ? " Write clear, specific job descriptions to attract better-matched candidates and reduce screening time."
            : " Upload an up-to-date resume when applying — it significantly improves your chances of being shortlisted."}
        </div>
      </div>

    </div>
  );
}

export default Dashboard;