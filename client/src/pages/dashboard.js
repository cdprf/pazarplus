import { useContext } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import AuthContext from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-white rounded shadow p-4">
          <p className="mb-4">Welcome, {user?.fullName || 'User'}!</p>
          
          {/* Dashboard content */}
          
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
