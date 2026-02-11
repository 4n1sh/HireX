import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SelectRole from "./pages/SelectRole";
import DashboardLayout from "./layouts/DashboardLayout";
import HRDashboard from "./pages/hr/HRDashboard";
import CandidateDashboard from "./pages/candidate/CandidateDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/select-role" element={<SelectRole />} />

        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRole="HR">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<HRDashboard />} />
        </Route>

        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowedRole="CANDIDATE">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<CandidateDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
