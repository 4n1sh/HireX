import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./layouts/DashboardLayout";
import HRJobs from "./pages/hr/HRJobs";
import CandidateJobs from "./pages/candidate/CandidateJobs";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRole="hr">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="jobs" replace />} />
          <Route path="jobs" element={<HRJobs />} />
        </Route>

        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowedRole="candidate">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="jobs" replace />} />
          <Route path="jobs" element={<CandidateJobs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
