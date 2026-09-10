import { Navigate, useLocation } from "react-router-dom";
import { canAccessPath, getCurrentSession, getDefaultPath } from "../../config/localAuth";
import AdminLayout from "./AdminLayout";

export default function ProtectedAdminPage({ children }) {
  const location = useLocation();
  const session = getCurrentSession();

  if (!session.loggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPath(session, location.pathname)) {
    return <Navigate to={getDefaultPath(session)} replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}