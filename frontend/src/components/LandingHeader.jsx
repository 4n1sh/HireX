import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function LandingHeader() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const userInitials = useMemo(() => {
    if (!user) return "";

    const name = user.user_metadata?.full_name || user.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [user]);

  const userAvatarUrl = user?.user_metadata?.avatar_url || "";

  const handleToggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
  };

  return (
    <header className="landing-header">
      <div className="landing-shell header-inner">
        <Link to="/" className="brand" aria-label="HireX Home">
          <img src="/logo.png" alt="HireX logo" className="brand-logo" />
          <span className="brand-text">HireX</span>
        </Link>

        <nav className="header-nav" aria-label="Primary">
          <a href="#home">Home</a>
          <a href="#jobs">Jobs</a>
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
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt="User profile"
                  className="landing-avatar-image"
                />
              ) : (
                <span className="landing-avatar-initials">{userInitials}</span>
              )}
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