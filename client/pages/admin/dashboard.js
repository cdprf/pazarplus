import { useContext } from 'react';
import AdminRoute from '../../components/AdminRoute';
import AuthContext from '../../contexts/authContext';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <AdminRoute>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="bg-white rounded shadow p-4">
          <p className="mb-4">Welcome, {user?.name}!</p>
          <p>You have administrator access to the system.</p>
          
          {/* Admin dashboard content */}
        </div>
      </div>
    </AdminRoute>
  );
};

export default AdminDashboard;
