import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../pages/Jobs.css";

function HRLayout() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const initials = (name, email) => {
    const src = name || email || "H";
    const parts = src.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return src.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { to: "/hr/dashboard", icon: "fa-house", label: "Dashboard" },
    { to: "/hr/jobs", icon: "fa-briefcase", label: "My Jobs" },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <img
            src="/logo.jpg"
            alt="HireX logo"
            className="admin-sidebar-logo-image"
          />
          <div>
            <div className="admin-sidebar-logo-text">HireX</div>
            <div className="admin-sidebar-logo-badge hr-badge">HR Portal</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section">Recruitment</div>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}
            >
              <i className={`fa-solid ${icon}`} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-user">
          <div className="admin-sidebar-user-avatar">
            {initials(user.full_name, user.email)}
          </div>
          <div className="admin-sidebar-user-info">
            <strong>{user.full_name || user.email}</strong>
            <span>HR Manager</span>
          </div>
          <button
            className="admin-logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            <i className="fa-solid fa-arrow-right-from-bracket" />
          </button>
        </div>
      </aside>

      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default HRLayout;
