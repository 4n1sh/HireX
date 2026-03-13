import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "candidate",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  const { fullName, email, password, role } = formData;

  try {
    const { data } = await api.post("/api/auth/signup", {
      full_name: fullName,
      email,
      password,
      role,
    });

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));

    navigate("/", { replace: true });
  } catch (err) {
    setError(err.response?.data?.detail || "Signup failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-header-text">
            <h2>Join the future of hiring</h2>
            <p className="subtitle">
              Choose your role and create your account to get started.
            </p>
          </div>
        </div>

        <div className="role-toggle" role="radiogroup" aria-label="Select role">
          <button
            type="button"
            className={`role-toggle-btn ${formData.role === "candidate" ? "active" : ""}`}
            onClick={() => setFormData((prev) => ({ ...prev, role: "candidate" }))}
            aria-pressed={formData.role === "candidate"}
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
            className={`role-toggle-btn ${formData.role === "hr" ? "active" : ""}`}
            onClick={() => setFormData((prev) => ({ ...prev, role: "hr" }))}
            aria-pressed={formData.role === "hr"}
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

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="signup-full-name">Full Name</label>
          <div className="field-with-icon">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="currentColor"/>
                <path d="M19 20C19 16.6863 15.866 14 12 14C8.13401 14 5 16.6863 5 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          <input
            id="signup-full-name"
            type="text"
            name="fullName"
            placeholder="John Doe"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
          </div>

          <label className="auth-label" htmlFor="signup-email">Work Email</label>
          <div className="field-with-icon">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
          <input
            id="signup-email"
            type="email"
            name="email"
            placeholder="name@company.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
          </div>

          <div className="password-label-row">
            <label className="auth-label" htmlFor="signup-password">Password</label>
            <span className="password-hint">Min. 8 characters</span>
          </div>
          <div className="password-field">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
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

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
            <span className="btn-arrow" aria-hidden="true">→</span>
          </button>
        </form>

        <p className="switch-auth">
          Already have an account? <Link to="/login">Log in</Link>
        </p>

        <p className="terms-text">
          By clicking "Create Account", you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
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

export default Signup;
