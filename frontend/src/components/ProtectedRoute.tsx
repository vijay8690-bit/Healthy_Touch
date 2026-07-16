import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/api.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

/**
 * ProtectedRoute component that handles authentication and role-based access control
 * 
 * @param children - The component to render if access is granted
 * @param allowedRoles - Array of roles that are allowed to access this route (optional)
 * @param requireAuth - Whether authentication is required (default: true)
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = true
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not logged in, redirect to auth page
  if (requireAuth && !user) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    const authPath = location.pathname.startsWith('/admin')
      ? '/admin/login'
      : location.pathname.startsWith('/provider')
        ? '/provider/login'
        : '/auth';
    return <Navigate to={authPath} replace state={{ redirectTo }} />;
  }

  // If authentication is NOT required (public route) but user IS logged in,
  // redirect to their appropriate dashboard
  if (!requireAuth && user) {
    const dashboardPath = getDashboardPath(user.role);
    return <Navigate to={dashboardPath} replace />;
  }

  // If specific roles are required, check if user has the required role
  if (allowedRoles && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

/**
 * Helper function to get the dashboard path based on user role
 */
function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'patient':
      return '/patient/dashboard';
    case 'provider':
    case 'doctor':
    case 'nurse':
    case 'caretaker':
    case 'physiotherapy':
      return '/provider/dashboard';
    case 'admin': 
      return '/admin/dashboard';
    default:
      return '/';
  }
}
