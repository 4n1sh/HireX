import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Navbar.css";

function Navbar() {
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
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo" aria-label="HireX home">
          <img src="/logo.png" alt="HireX logo" className="logo-image" />
          <span className="logo-text">HireX</span>
        </Link>

        <div className="nav-links">
          {user ? (
            <div className="nav-user">
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
