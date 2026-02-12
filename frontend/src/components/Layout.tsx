import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { syncService } from '@/lib/syncService';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
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
  GitBranch,
  Globe,
  HelpCircle,
  ChevronDown,
  User,
  Lock,
  Pencil,
} from 'lucide-react';
import packageJson from '../../package.json';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
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
    { path: '/traceability', label: t('nav.traceability'), icon: GitBranch, roles: ['admin', 'manager'] },
  ];

  const adminItems = [
    { path: '/admin', label: t('nav.adminPanel'), icon: Settings, roles: ['admin', 'manager'] },
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

        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
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
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <p className="text-[10px] text-gray-400 text-center">v{packageJson.version} &mdash; &copy; {new Date().getFullYear()} Panacea</p>
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

            <div className="flex items-center gap-3">
              {/* Help / User Guide */}
              <Link
                to="/help"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('nav.help')}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t('nav.help')}</span>
              </Link>

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
              <div className="flex items-center gap-1.5 text-sm">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className={`hidden sm:inline ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
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
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gray-200" />

              {/* User menu dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="hidden sm:inline text-gray-500">{t('common.welcome')},</span>
                  <span className="font-medium">{user?.firstName || 'User'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      {t('common.viewProfile')}
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowPasswordModal(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Lock className="w-4 h-4" />
                      {t('common.changePassword')}
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('common.logout')}
                    </button>
                  </div>
                )}
              </div>
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}

// ===== Change Password Modal =====
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('common.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('common.passwordTooShort'));
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success(t('common.passwordChanged'));
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{t('common.changePassword')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Profile Modal =====
function ProfileModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { t } = useTranslation();
  const { setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authAPI.getCurrentUser();
      setProfile(res.data);
      setForm({ firstName: res.data.firstName, lastName: res.data.lastName, email: res.data.email });
    } catch {
      // Use local user data as fallback
      if (user) {
        setProfile(user);
        setForm({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '' });
      }
    }
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error(t('common.required'));
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      setProfile(res.data);
      setUser({ id: res.data.id, email: res.data.email, firstName: res.data.firstName, lastName: res.data.lastName, role: res.data.role, locationId: res.data.locationId });
      toast.success(t('common.updated'));
      setEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ firstName: profile?.firstName || '', lastName: profile?.lastName || '', email: profile?.email || '' });
    setEditing(false);
  };

  const p = profile || user;
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '-';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? t('common.editProfile') : t('common.viewProfile')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {/* Avatar header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{p?.firstName} {p?.lastName}</p>
              <p className="text-sm text-gray-500 capitalize">{p?.role}</p>
            </div>
          </div>

          {editing ? (
            /* Edit mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('vendors.firstName')}</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('vendors.lastName')}</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              {/* Read-only fields */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">{t('users.role')}</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{p?.role || '-'}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                >
                  {saving ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t('vendors.firstName')}</span>
                  <span className="text-sm font-medium text-gray-900">{p?.firstName || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t('vendors.lastName')}</span>
                  <span className="text-sm font-medium text-gray-900">{p?.lastName || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t('common.email')}</span>
                  <span className="text-sm font-medium text-gray-900">{p?.email || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t('users.role')}</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{p?.role || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t('common.lastLogin')}</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(p?.lastLogin)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t('common.memberSince')}</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(p?.createdAt)}</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {t('common.close')}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                  {t('common.edit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
