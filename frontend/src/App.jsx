import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandingHeader from "./components/LandingHeader";
import HRJobs from "./pages/hr/HRJobs";
import CandidateJobs from "./pages/candidate/CandidateJobs";
import MyApplications from "./pages/candidate/MyApplications";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Dashboard from "./pages/hr/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLayout from "./layouts/AdminLayout";
import PublicRoute from "./components/PublicRoute";

function AppLayout() {
  return (
    <>
      <LandingHeader />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* HR + Candidate — top nav layout */}
        <Route element={<AppLayout />}>
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRole="hr">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="jobs" replace />} />
            <Route path="jobs" element={<HRJobs />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          <Route
            path="/candidate"
            element={
              <ProtectedRoute allowedRole="candidate">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="jobs" replace />} />
            <Route path="jobs" element={<CandidateJobs />} />
            <Route path="applications" element={<MyApplications />} />
          </Route>
        </Route>

        {/* Admin — sidebar layout, no LandingHeader */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
