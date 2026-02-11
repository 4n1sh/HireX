import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children, allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setSession(data.session);

        const role = data.session.user.user_metadata?.role;
        setUserRole(role);
      }

      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) return <p>Loading...</p>;

  if (!session) return <Navigate to="/" />;

  if (!userRole) return <Navigate to="/select-role" />;

  if (allowedRole && userRole !== allowedRole)
    return <Navigate to="/" />;

  return children;
}

export default ProtectedRoute;
