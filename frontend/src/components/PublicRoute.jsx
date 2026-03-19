import { Navigate } from "react-router-dom";

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  const userJson = localStorage.getItem("user");

  if (!token || !userJson) return children;

  try {
    const user = JSON.parse(userJson);
    const role = user?.role;
    const destination =
      role === "admin"
        ? "/admin/dashboard"
        : role === "hr"
          ? "/hr/jobs"
          : "/candidate/jobs";

    return <Navigate to={destination} replace />;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return children;
  }
}

export default PublicRoute;