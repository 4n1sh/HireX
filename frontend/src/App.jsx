import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import HRJobs from "./pages/hr/HRJobs";
import HRDashboard from "./pages/hr/HRDashboard";
import CandidateJobs from "./pages/candidate/CandidateJobs";
import MyApplications from "./pages/candidate/MyApplications";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLayout from "./layouts/AdminLayout";
import HRLayout from "./layouts/HRLayout";
import CandidateLayout from "./layouts/CandidateLayout";
import PublicRoute from "./components/PublicRoute";

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

        {/* Candidate — jobs is standalone (no sidebar), applications uses sidebar */}
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
          <Route element={<CandidateLayout />}>
            <Route path="applications" element={<MyApplications />} />
          </Route>
        </Route>

        {/* HR — sidebar layout, like admin */}
        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRole="hr">
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route element={<HRLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<HRDashboard />} />
            <Route path="jobs" element={<HRJobs />} />
          </Route>
        </Route>

        {/* Admin — sidebar layout */}
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
