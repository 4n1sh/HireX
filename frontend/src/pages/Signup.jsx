import { useState } from "react";
import { Link } from "react-router-dom";

function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "CANDIDATE",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Signup:", formData);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <div className="logo-mark" aria-hidden="true" />
            <span className="logo-text">HireX</span>
          </div>
          <div className="auth-header-text">
            <h2>Create a new account</h2>
            <p className="subtitle">Start hiring or apply in minutes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />

          <select name="role" onChange={handleChange}>
            <option value="CANDIDATE">Candidate</option>
            <option value="HR">HR</option>
          </select>

          <button className="primary-btn" type="submit">
            Create Account
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button className="google-btn">
          Sign up with Google
        </button>

        <p className="switch-auth">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
