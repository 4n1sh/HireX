import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const role = user?.user_metadata?.role;
  const jobsPath = role === "hr" ? "/hr/jobs" : "/candidate/jobs";

  const userInitials = useMemo(() => {
    if (!user) return "";
    const name = user.user_metadata?.full_name || user.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [user]);

  const userAvatarUrl = user?.user_metadata?.avatar_url || "";

  const handleToggleMenu = () => setMenuOpen((prev) => !prev);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo" aria-label="HireX home">
          <img src="/logo.png" alt="HireX logo" className="logo-image" />
          <span className="logo-text">HireX</span>
        </Link>

        <div className="nav-links">
          {user ? (
            <div className="nav-user">
              <Link to={jobsPath} className="nav-link nav-link-active">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                Jobs
              </Link>
              <button
                type="button"
                className="nav-avatar-button"
                onClick={handleToggleMenu}
                title={user.email || "User"}
                aria-label="User menu"
                aria-expanded={menuOpen}
              >
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt="User profile"
                    className="nav-avatar-image"
                  />
                ) : (
                  <span className="nav-avatar-initials">{userInitials}</span>
                )}
              </button>

              {menuOpen && (
                <div className="nav-menu" role="menu">
                  <button
                    type="button"
                    className="nav-menu-item"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>

              <Link to="/signup" className="btn-primary small">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
