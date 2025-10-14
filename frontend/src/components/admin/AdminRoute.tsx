import { useAuth } from '@/context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if ((user.role) !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;