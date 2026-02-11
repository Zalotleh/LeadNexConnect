import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Authenticated but requires admin role
      if (requireAdmin && !isAdmin) {
        router.push('/dashboard'); // Redirect to dashboard if not admin
        return;
      }
    }
  }, [loading, isAuthenticated, isAdmin, requireAdmin, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Requires admin but user is not admin
  if (requireAdmin && !isAdmin) {
    return null; // Will redirect via useEffect
  }

  // Authenticated and authorized
  return <>{children}</>;
}
