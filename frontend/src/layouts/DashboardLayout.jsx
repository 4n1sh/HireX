import { Outlet } from "react-router-dom";
import LandingHeader from "../components/LandingHeader";

function DashboardLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "#f3f2ef" }}>
      <LandingHeader />
      <main style={{ maxWidth: 1128, margin: "0 auto", padding: "24px 16px" }}>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
