import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthContext from '../../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    
    // Check for role authorization
    if (!loading && isAuthenticated && roles.length > 0) {
      if (!roles.includes(user.role)) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, loading, user]);

  // Show loading or return children
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? children : null;
};

export default ProtectedRoute;
