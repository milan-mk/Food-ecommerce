import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

// Customer pages: must be logged in. The page they wanted is remembered so login can send them back.
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session..." className="min-h-[50vh]" />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

// Admin pages: must be an admin. (The API enforces this too; this only keeps customers out of the UI.)
export function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session..." className="min-h-[50vh]" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return user.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}
