import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./layouts/DashboardLayout";
import HRDashboard from "./pages/hr/HRDashboard";
import CandidateDashboard from "./pages/candidate/CandidateDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/hr" element={<DashboardLayout />}>
          <Route path="dashboard" element={<HRDashboard />} />
        </Route>

        <Route path="/candidate" element={<DashboardLayout />}>
          <Route path="dashboard" element={<CandidateDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
