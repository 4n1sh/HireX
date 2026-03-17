import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Login() {
  const navigate = useNavigate();

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

        <form onSubmit={handleLogin}>
          <label className="auth-label" htmlFor="login-email">Work Email</label>
          <div className="field-with-icon">
            <i className="fa-regular fa-envelope field-icon" aria-hidden="true" />
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
            <i className="fa-solid fa-lock field-icon" aria-hidden="true" />
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
            <i className="fa-solid fa-arrow-right btn-arrow" aria-hidden="true" />
          </button>
        </form>

        <p className="switch-auth">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>

        <p className="terms-text">
          By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>

      <div className="auth-page-footer" aria-label="Social links">
        <i className="fa-solid fa-globe footer-icon" aria-hidden="true" />
        <i className="fa-solid fa-circle-question footer-icon" aria-hidden="true" />
        <i className="fa-brands fa-facebook footer-icon" aria-hidden="true" />
      </div>
      <p className="copyright">© 2024 HireX Inc. All rights reserved.</p>
    </div>
  );
}

export default Login;