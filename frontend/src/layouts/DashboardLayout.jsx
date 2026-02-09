import { Outlet } from "react-router-dom";

function DashboardLayout() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>HireX</h2>
        <nav>
          <a href="/hr/dashboard">Dashboard</a>
          <a href="#">Candidates</a>
          <a href="#">Shortlisted</a>
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
