import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { syncService } from '@/lib/syncService';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  BarChart3,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Recycle,
  UserCheck,
  Building2,
  Home,
  ShoppingCart,
  GitBranch,
} from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - syncing data...');
      syncService.sync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline - changes will sync when reconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    try {
      await syncService.sync();
      toast.success('Sync completed successfully');
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const crmItems = [
    { path: '/vendors', label: 'Vendors', icon: UserCheck, roles: ['admin', 'manager', 'operator'] },
    { path: '/clients', label: 'Clients', icon: Building2, roles: ['admin', 'manager', 'operator'] },
    { path: '/sources', label: 'Sources', icon: Home, roles: ['admin', 'manager', 'operator'] },
    { path: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['admin', 'manager', 'operator'] },
    { path: '/traceability', label: 'Traceability', icon: GitBranch, roles: ['admin', 'manager'] },
  ];

  const adminItems = [
    { path: '/admin', label: 'Admin Panel', icon: Settings, roles: ['admin', 'manager'] },
    { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  ];

  const canAccess = (roles?: string[]) => {
    if (!roles) return true;
    return user && roles.includes(user.role);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Recycle className="w-8 h-8 text-primary-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">RecycleApp</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}

          {crmItems.filter((item) => canAccess(item.roles)).length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase px-4">CRM</p>
              </div>
              {crmItems
                .filter((item) => canAccess(item.roles))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </Link>
                  );
                })}
            </>
          )}

          {adminItems.filter((item) => canAccess(item.roles)).length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase px-4">Admin</p>
              </div>
              {adminItems
                .filter((item) => canAccess(item.roles))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </Link>
                  );
                })}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="mb-3 text-sm text-gray-600">
            <p className="font-medium">{user?.fullName}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4">
              {/* Sync status */}
              <div className="flex items-center gap-2 text-sm">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Manual sync button */}
              <button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync now"
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
