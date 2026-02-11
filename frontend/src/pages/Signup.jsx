import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "CANDIDATE",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


const handleSubmit = async (e) => {
  e.preventDefault();

  const { fullName, email, password, role } = formData;

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Signup successful! Check email if confirmation enabled.");
  }
};
const handleGoogleSignup = async () => {
  localStorage.setItem("pendingRole", formData.role);
  if (formData.fullName) {
    localStorage.setItem("pendingFullName", formData.fullName);
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error("Google signup error:", error.message);
  }
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

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              onChange={handleChange}
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

<button className="google-btn" onClick={handleGoogleSignup}>
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
