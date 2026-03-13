import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/api/auth/login", { email, password });

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-header-text">
            <h2>Welcome back</h2>
            <p className="subtitle">Sign in to continue your hiring journey.</p>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="role-toggle" role="radiogroup" aria-label="Select role">
          <button
            type="button"
            className={`role-toggle-btn ${role === "candidate" ? "active" : ""}`}
            onClick={() => setRole("candidate")}
            aria-pressed={role === "candidate"}
          >
            <span className="role-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="currentColor"/>
                <path d="M19 20C19 16.6863 15.866 14 12 14C8.13401 14 5 16.6863 5 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            I am a Candidate
          </button>

          <button
            type="button"
            className={`role-toggle-btn ${role === "hr" ? "active" : ""}`}
            onClick={() => setRole("hr")}
            aria-pressed={role === "hr"}
          >
            <span className="role-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7" stroke="currentColor" strokeWidth="2"/>
                <path d="M4 12H20" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            I am an HR/Recruiter
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <label className="auth-label" htmlFor="login-email">Work Email</label>
          <div className="field-with-icon">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
          <input
            id="login-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          </div>

          <label className="auth-label" htmlFor="login-password">Password</label>
          <div className="password-field">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="toggle-password"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
            <span className="btn-arrow" aria-hidden="true">→</span>
          </button>
        </form>

        <p className="switch-auth">
          Don’t have an account? <Link to="/signup">Create one</Link>
        </p>

        <p className="terms-text">
          By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>

      <div className="auth-page-footer" aria-label="Social links">
        <span className="footer-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 12H21" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 3C14.2091 5.46089 15.4642 8.5973 15.54 12C15.4642 15.4027 14.2091 18.5391 12 21" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 3C9.79086 5.46089 8.53584 8.5973 8.46 12C8.53584 15.4027 9.79086 18.5391 12 21" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </span>
        <span className="footer-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M10 9.5C10 8.4 10.9 7.5 12 7.5C13.1 7.5 14 8.4 14 9.5C14 11 12 11.5 12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16.5" r="1" fill="currentColor"/>
          </svg>
        </span>
        <span className="footer-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M13.5 8.5H15V6H13.5C11.8431 6 10.5 7.34315 10.5 9V10.5H9V13H10.5V18H13V13H15L15.5 10.5H13V9C13 8.72386 13.2239 8.5 13.5 8.5Z" fill="currentColor"/>
          </svg>
        </span>
      </div>
      <p className="copyright">© 2024 HireX Inc. All rights reserved.</p>
    </div>
  );
}

export default Login;
