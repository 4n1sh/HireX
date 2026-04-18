import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import HRJobs from "./pages/hr/HRJobs";
import HRDashboard from "./pages/hr/HRDashboard";
import HRApplicants from "./pages/hr/HRApplicants";
import BulkScreen from "./pages/hr/BulkScreen";
import CandidateDashboard from "./pages/candidate/CandidateDashboard";
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
import Profile from "./pages/Profile";

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

        {/* Candidate — all pages use sidebar layout */}
        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowedRole="candidate">
              <CandidateLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CandidateDashboard />} />
          <Route path="jobs" element={<CandidateJobs />} />
          <Route path="applications" element={<MyApplications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* HR — sidebar layout */}
        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRole="hr">
              <HRLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HRDashboard />} />
          <Route path="jobs" element={<HRJobs />} />
          <Route path="jobs/:jobId/applicants" element={<HRApplicants />} />
          <Route path="bulk-screen" element={<BulkScreen />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin — sidebar layout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
