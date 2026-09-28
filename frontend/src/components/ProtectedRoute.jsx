import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute - guards routes by authentication and (optionally) role.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen label="Checking your session..." />;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the user's own dashboard if they hit a forbidden route.
    const dash = { farmer: '/farmer', buyer: '/buyer', delivery: '/delivery', admin: '/admin' }[user.role];
    return <Navigate to={dash || '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
