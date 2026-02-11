import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  BarChart3,
  UserCheck,
  Building2,
  Home,
  ShoppingCart,
  GitBranch,
  Settings,
  Users,
  DollarSign,
  WifiOff,
  Globe,
} from 'lucide-react';

export default function Help() {
  const { t } = useTranslation();

  const sections = [
    { key: 'dashboard', icon: LayoutDashboard, color: 'text-blue-600 bg-blue-50' },
    { key: 'transactions', icon: ArrowLeftRight, color: 'text-green-600 bg-green-50' },
    { key: 'inventory', icon: Package, color: 'text-purple-600 bg-purple-50' },
    { key: 'reports', icon: BarChart3, color: 'text-orange-600 bg-orange-50' },
    { key: 'vendors', icon: UserCheck, color: 'text-teal-600 bg-teal-50' },
    { key: 'clients', icon: Building2, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'sources', icon: Home, color: 'text-pink-600 bg-pink-50' },
    { key: 'sales', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'traceability', icon: GitBranch, color: 'text-cyan-600 bg-cyan-50' },
    { key: 'pricing', icon: DollarSign, color: 'text-yellow-600 bg-yellow-50' },
    { key: 'admin', icon: Settings, color: 'text-gray-600 bg-gray-100' },
    { key: 'users', icon: Users, color: 'text-red-600 bg-red-50' },
    { key: 'offlineMode', icon: WifiOff, color: 'text-amber-600 bg-amber-50' },
    { key: 'languageSettings', icon: Globe, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('help.title')}</h1>
        <p className="text-gray-500 mt-1">{t('help.subtitle')}</p>
      </div>

      {/* Getting Started */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-2">{t('help.gettingStarted')}</h2>
        <p className="text-primary-800 leading-relaxed">{t('help.gettingStartedDesc')}</p>
      </div>

      {/* Feature Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.key} className="bg-white rounded-lg shadow p-5 flex gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${section.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {t(`help.${section.key}.title`)}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t(`help.${section.key}.desc`)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
