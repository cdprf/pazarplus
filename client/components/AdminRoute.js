import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthContext from '../contexts/authContext';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (user?.role !== 'admin') {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, loading, user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated && user?.role === 'admin' ? children : null;
};

export default AdminRoute;
