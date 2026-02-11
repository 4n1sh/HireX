import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/candidate")
    ? "/candidate"
    : "/hr";
  const dashboardPath = `${basePath}/dashboard`;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>HireX</h2>
        <nav>
          <Link to={dashboardPath}>Dashboard</Link>
          <a href="#">Candidates</a>
          <a href="#">Shortlisted</a>
        </nav>
        <button className="primary-btn" type="button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
