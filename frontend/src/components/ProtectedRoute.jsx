import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const userJson = localStorage.getItem("user");

  if (!token || !userJson) return <Navigate to="/login" />;

  const user = JSON.parse(userJson);

  if (allowedRole && user.role !== allowedRole)
    return <Navigate to="/" />;

  return children;
}

export default ProtectedRoute;
