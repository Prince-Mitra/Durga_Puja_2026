import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './States';

/** UX gate only - the real protection is the server rejecting every /api/admin call without a valid cookie. */
export default function ProtectedRoute() {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Checking session..." />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
