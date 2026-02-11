import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function SelectRole() {
  const navigate = useNavigate();
  const [role, setRole] = useState("CANDIDATE");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        navigate("/");
        return;
      }

      const existingRole = data.session.user.user_metadata?.role;
      if (existingRole === "HR") {
        navigate("/hr/dashboard");
      } else if (existingRole === "CANDIDATE") {
        navigate("/candidate/dashboard");
      }

      const pendingRole = localStorage.getItem("pendingRole");
      const pendingFullName = localStorage.getItem("pendingFullName");

      if (pendingRole) {
        setRole(pendingRole);
      }

      if (pendingFullName) {
        setFullName(pendingFullName);
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.updateUser({
      data: {
        role,
        ...(fullName ? { full_name: fullName } : {}),
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    localStorage.removeItem("pendingRole");
    localStorage.removeItem("pendingFullName");

    const updatedRole = data.user.user_metadata?.role;

    if (updatedRole === "HR") {
      navigate("/hr/dashboard");
    } else {
      navigate("/candidate/dashboard");
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
            <h2>Select your role</h2>
            <p className="subtitle">Tell us how you want to use HireX</p>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="fullName"
            placeholder="Full Name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="CANDIDATE">Candidate</option>
            <option value="HR">HR</option>
          </select>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SelectRole;
