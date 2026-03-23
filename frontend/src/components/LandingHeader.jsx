import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../pages/Landing.css";

function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;

  const userInitials = useMemo(() => {
    if (!user) return "";

    const name = user.full_name || user.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [user]);

  const navLinks = useMemo(() => {
    if (!user) {
      return [
        { to: "/#home", label: "Home" },
        { to: "/#features", label: "Features" },
        { to: "/login", label: "Jobs" },
      ];
    }
    switch (user.role) {
      case "admin":
        return [
          { to: "/admin/dashboard", label: "Dashboard" },
          { to: "/admin/users", label: "Users" },
        ];
      case "hr":
        return [
          { to: "/hr/dashboard", label: "Dashboard" },
          { to: "/hr/jobs", label: "Jobs" },
        ];
      case "candidate":
      default:
        return [
          { to: "/", label: "Home" },
          { to: "/candidate/jobs", label: "Jobs" },
          { to: "/candidate/applications", label: "My Applications" },
        ];
    }
  }, [user]);

  const handleToggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="landing-header">
      <div className="landing-shell header-inner">
        <Link to="/" className="brand" aria-label="HireX Home">
          <img src="/logo.jpg" alt="HireX logo" className="brand-logo" />
          <span className="brand-text">HireX</span>
        </Link>

        <nav className="header-nav" aria-label="Primary">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to}>{label}</Link>
          ))}
        </nav>

        {user ? (
          <div className="landing-user">
            <button
              type="button"
              className="landing-avatar-button"
              onClick={handleToggleMenu}
              title={user.email || "User"}
              aria-label="User menu"
              aria-expanded={menuOpen}
            >
              <span className="landing-avatar-initials">{userInitials}</span>
            </button>

            {menuOpen && (
              <div className="landing-menu" role="menu">
                <button
                  type="button"
                  className="landing-menu-item"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="header-actions">
            <Link to="/login" className="text-link-btn">
              Login
            </Link>
            <Link to="/signup" className="solid-btn">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default LandingHeader;
