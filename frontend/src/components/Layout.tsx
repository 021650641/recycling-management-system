import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { syncService } from '@/lib/syncService';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  BarChart3,
  Settings,
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
  Globe,
  HelpCircle,
} from 'lucide-react';
import packageJson from '../../package.json';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success(t('common.online'));
      syncService.sync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error(t('common.offline'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error(t('common.offline'));
      return;
    }

    setIsSyncing(true);
    try {
      await syncService.sync();
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
    { path: '/inventory', label: t('nav.inventory'), icon: Package },
    { path: '/reports', label: t('nav.reports'), icon: BarChart3 },
  ];

  const crmItems = [
    { path: '/vendors', label: t('nav.vendors'), icon: UserCheck, roles: ['admin', 'manager', 'operator'] },
    { path: '/clients', label: t('nav.clients'), icon: Building2, roles: ['admin', 'manager', 'operator'] },
    { path: '/sources', label: t('nav.sources'), icon: Home, roles: ['admin', 'manager', 'operator'] },
    { path: '/sales', label: t('nav.sales'), icon: ShoppingCart, roles: ['admin', 'manager', 'operator'] },
    { path: '/traceability', label: t('nav.traceability'), icon: GitBranch, roles: ['admin', 'manager'] },
  ];

  const adminItems = [
    { path: '/admin', label: t('nav.adminPanel'), icon: Settings, roles: ['admin', 'manager'] },
  ];

  const helpItems = [
    { path: '/help', label: t('nav.help'), icon: HelpCircle },
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
              <span className="text-xl font-bold text-gray-900">{t('appName')}</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
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
                <p className="text-xs font-semibold text-gray-400 uppercase px-4">{t('nav.crm')}</p>
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
                <p className="text-xs font-semibold text-gray-400 uppercase px-4">{t('nav.admin')}</p>
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

          {/* Help */}
          <div className="pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase px-4">{t('nav.helpSection')}</p>
          </div>
          {helpItems.map((item) => {
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
            {t('common.logout')}
          </button>
          <div className="mt-3 pt-3 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">v{packageJson.version}</p>
            <p className="text-[10px] text-gray-400">&copy; {new Date().getFullYear()} Panacea</p>
          </div>
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
              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Espanol'}
              >
                <Globe className="w-4 h-4" />
                <span className="font-medium uppercase">{i18n.language === 'es' ? 'EN' : 'ES'}</span>
              </button>

              {/* Sync status */}
              <div className="flex items-center gap-2 text-sm">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? t('common.online') : t('common.offline')}
                </span>
              </div>

              {/* Manual sync button */}
              <button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('common.syncNow')}
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
