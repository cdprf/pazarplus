import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthContext from '../contexts/authContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // If role-based protection is applied
      if (roles.length > 0 && !roles.includes(user?.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, loading, user, roles, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : null;
};

export default ProtectedRoute;
