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
            <i className="fa-solid fa-user role-icon" aria-hidden="true" />
            I am a Candidate
          </button>

          <button
            type="button"
            className={`role-toggle-btn ${formData.role === "hr" ? "active" : ""}`}
            onClick={() => setFormData((prev) => ({ ...prev, role: "hr" }))}
            aria-pressed={formData.role === "hr"}
          >
            <i className="fa-solid fa-briefcase role-icon" aria-hidden="true" />
            I am an HR/Recruiter
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="signup-full-name">Full Name</label>
          <div className="field-with-icon">
            <i className="fa-solid fa-user field-icon" aria-hidden="true" />
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
            <i className="fa-regular fa-envelope field-icon" aria-hidden="true" />
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
            <i className="fa-solid fa-lock field-icon" aria-hidden="true" />
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
            <i className="fa-solid fa-arrow-right btn-arrow" aria-hidden="true" />
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
        <i className="fa-solid fa-globe footer-icon" aria-hidden="true" />
        <i className="fa-solid fa-circle-question footer-icon" aria-hidden="true" />
        <i className="fa-brands fa-facebook footer-icon" aria-hidden="true" />
      </div>
      <p className="copyright">© 2024 HireX Inc. All rights reserved.</p>
    </div>
  );
}

export default Signup;