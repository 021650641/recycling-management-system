import { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Truck,
  BookOpen,
  Shield,
  User,
} from 'lucide-react';

interface Section {
  key: string;
  icon: any;
  color: string;
}

function GuideSection({ section, isOpen, onToggle }: { section: Section; isOpen: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const Icon = section.icon;
  const howTo = t(`help.${section.key}.howTo`, { defaultValue: '' });
  const tips = t(`help.${section.key}.tips`, { defaultValue: '' });

  return (
    <div id={`section-${section.key}`} className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${section.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {t(`help.${section.key}.title`)}
          </h3>
          {!isOpen && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {t(`help.${section.key}.desc`)}
            </p>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4">
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {t(`help.${section.key}.desc`)}
            </p>
          </div>

          {howTo && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">{t('help.stepsLabel')}</h4>
              <ol className="text-sm text-blue-800 leading-relaxed space-y-1.5 list-decimal list-inside">
                {howTo.split('\n').filter(Boolean).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {tips && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">{t('help.tipsLabel')}</h4>
              <ul className="text-sm text-amber-800 leading-relaxed space-y-1.5 list-disc list-inside">
                {tips.split('\n').filter(Boolean).map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['gettingStarted']));

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenSections(new Set(sections.map((s) => s.key)));
  };

  const collapseAll = () => {
    setOpenSections(new Set());
  };

  const sections: Section[] = [
    { key: 'dashboard', icon: LayoutDashboard, color: 'text-blue-600 bg-blue-50' },
    { key: 'transactions', icon: ArrowLeftRight, color: 'text-green-600 bg-green-50' },
    { key: 'inventory', icon: Package, color: 'text-purple-600 bg-purple-50' },
    { key: 'reports', icon: BarChart3, color: 'text-orange-600 bg-orange-50' },
    { key: 'vendors', icon: UserCheck, color: 'text-teal-600 bg-teal-50' },
    { key: 'clients', icon: Building2, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'sources', icon: Home, color: 'text-pink-600 bg-pink-50' },
    { key: 'sales', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'delivery', icon: Truck, color: 'text-sky-600 bg-sky-50' },
    { key: 'traceability', icon: GitBranch, color: 'text-cyan-600 bg-cyan-50' },
    { key: 'pricing', icon: DollarSign, color: 'text-yellow-600 bg-yellow-50' },
    { key: 'admin', icon: Settings, color: 'text-gray-600 bg-gray-100' },
    { key: 'users', icon: Users, color: 'text-red-600 bg-red-50' },
    { key: 'profile', icon: User, color: 'text-slate-600 bg-slate-50' },
    { key: 'offlineMode', icon: WifiOff, color: 'text-amber-600 bg-amber-50' },
    { key: 'languageSettings', icon: Globe, color: 'text-violet-600 bg-violet-50' },
    { key: 'security', icon: Shield, color: 'text-rose-600 bg-rose-50' },
  ];

  const tocGroups = [
    {
      label: t('help.tocCore'),
      items: ['dashboard', 'transactions', 'inventory', 'reports'],
    },
    {
      label: t('help.tocCrm'),
      items: ['vendors', 'clients', 'sources'],
    },
    {
      label: t('help.tocSales'),
      items: ['sales', 'delivery', 'traceability'],
    },
    {
      label: t('help.tocAdmin'),
      items: ['pricing', 'admin', 'users'],
    },
    {
      label: t('help.tocOther'),
      items: ['profile', 'offlineMode', 'languageSettings', 'security'],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t('help.title')}</h1>
          </div>
          <p className="text-gray-500 mt-1 ml-10">{t('help.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('help.expandAll')}
          </button>
          <button
            onClick={collapseAll}
            className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('help.collapseAll')}
          </button>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-2">{t('help.gettingStarted')}</h2>
        <p className="text-primary-800 leading-relaxed">{t('help.gettingStartedDesc')}</p>
      </div>

      {/* Table of Contents */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-gray-900 mb-3">{t('help.tableOfContents')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {tocGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{group.label}</p>
              <ul className="space-y-1">
                {group.items.map((key) => (
                  <li key={key}>
                    <button
                      onClick={() => {
                        setOpenSections((prev) => new Set([...prev, key]));
                        document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      {t(`help.${key}.title`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <GuideSection
            key={section.key}
            section={section}
            isOpen={openSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pb-4">
        {t('help.version')}
      </div>
    </div>
  );
}
