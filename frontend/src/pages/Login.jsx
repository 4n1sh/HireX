import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    // MOCK LOGIN (replace with API later)
    setTimeout(() => {
      const fakeResponse = {
        token: "mock-jwt-token",
        role: "HR", // or "CANDIDATE"
      };

      localStorage.setItem("token", fakeResponse.token);
      localStorage.setItem("role", fakeResponse.role);

      setLoading(false);

      if (fakeResponse.role === "HR") {
        navigate("/hr/dashboard");
      } else {
        navigate("/candidate/dashboard");
      }
    }, 1000);
  };

  const handleGoogleLogin = () => {
    alert("Google OAuth will be integrated here.");
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="logo">
          <span className="logo-icon">H</span>
          <span className="logo-text">HireX</span>
        </div>

        <h2>Welcome to HireX</h2>
        <p className="subtitle">Login to continue</p>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button className="google-btn" onClick={handleGoogleLogin}>
          Continue with Google
        </button>

        <p className="switch-auth">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
