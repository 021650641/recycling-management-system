import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { syncService } from '@/lib/syncService';

// Layout
import Layout from '@/components/Layout';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import NewTransaction from '@/pages/NewTransaction';
import Inventory from '@/pages/Inventory';
import Reports from '@/pages/Reports';
import AdminPanel from '@/pages/AdminPanel';
import Vendors from '@/pages/Vendors';
import Clients from '@/pages/Clients';
import Sources from '@/pages/Sources';
import Traceability from '@/pages/Traceability';
import Help from '@/pages/Help';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { loadUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncService.initialize();
    }

    // Cleanup function - no stopSync method needed
    return () => {
      // Sync service will clean up automatically when component unmounts
    };
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/new" element={<NewTransaction />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="clients" element={<Clients />} />
          <Route path="sources" element={<Sources />} />
          <Route path="help" element={<Help />} />
          <Route
            path="traceability"
            element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <Traceability />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
