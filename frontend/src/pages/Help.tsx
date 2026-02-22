import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Repeat,
  TrendingUp,
  Truck,
  Settings,
  WifiOff,
} from 'lucide-react';

interface Workflow {
  key: string;
  icon: any;
  color: string;
}

function WorkflowSection({ workflow, isOpen, onToggle }: { workflow: Workflow; isOpen: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const Icon = workflow.icon;

  const stepsRaw = t(`help.workflows.${workflow.key}.steps`, { defaultValue: '' });
  const steps = stepsRaw.split('\n').filter(Boolean);

  const notesRaw = t(`help.workflows.${workflow.key}.notes`, { defaultValue: '' });
  const notes = notesRaw.split('\n').filter(Boolean);

  return (
    <div id={`wf-${workflow.key}`} className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${workflow.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">
            {t(`help.workflows.${workflow.key}.title`)}
          </h3>
          {!isOpen && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {t(`help.workflows.${workflow.key}.summary`)}
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
              {t(`help.workflows.${workflow.key}.summary`)}
            </p>
          </div>

          {steps.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <ol className="text-sm text-blue-900 leading-relaxed space-y-2.5 list-none">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {notes.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">{t('help.notesLabel')}</h4>
              <ul className="text-sm text-amber-800 leading-relaxed space-y-1.5 list-disc list-inside">
                {notes.map((note, i) => (
                  <li key={i}>{note}</li>
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

  const workflows: Workflow[] = [
    { key: 'firstTimeSetup', icon: Settings, color: 'text-gray-600 bg-gray-100' },
    { key: 'dailyPricing', icon: ClipboardList, color: 'text-yellow-600 bg-yellow-50' },
    { key: 'recordPurchase', icon: Repeat, color: 'text-green-600 bg-green-50' },
    { key: 'sellMaterials', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'deliverSale', icon: Truck, color: 'text-sky-600 bg-sky-50' },
    { key: 'trackPayments', icon: ClipboardList, color: 'text-purple-600 bg-purple-50' },
    { key: 'generateReport', icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
    { key: 'traceOrigin', icon: Repeat, color: 'text-cyan-600 bg-cyan-50' },
    { key: 'manageVendors', icon: ClipboardList, color: 'text-teal-600 bg-teal-50' },
    { key: 'manageClients', icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'manageSources', icon: ClipboardList, color: 'text-pink-600 bg-pink-50' },
    { key: 'manageUsers', icon: Settings, color: 'text-red-600 bg-red-50' },
    { key: 'changePassword', icon: Settings, color: 'text-slate-600 bg-slate-50' },
    { key: 'useOffline', icon: WifiOff, color: 'text-amber-600 bg-amber-50' },
    { key: 'switchLanguage', icon: Settings, color: 'text-violet-600 bg-violet-50' },
  ];

  const allKeys = workflows.map(w => w.key);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([allKeys[0]]));

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(allKeys));
  const collapseAll = () => setOpenSections(new Set());

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

      {/* Quick Navigation */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-gray-900 mb-3">{t('help.quickNav')}</h2>
        <div className="flex flex-wrap gap-2">
          {workflows.map((wf) => (
            <button
              key={wf.key}
              onClick={() => {
                setOpenSections((prev) => new Set([...prev, wf.key]));
                document.getElementById(`wf-${wf.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-full transition-colors border border-gray-200"
            >
              {t(`help.workflows.${wf.key}.title`)}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Sections */}
      <div className="space-y-3">
        {workflows.map((wf) => (
          <WorkflowSection
            key={wf.key}
            workflow={wf}
            isOpen={openSections.has(wf.key)}
            onToggle={() => toggleSection(wf.key)}
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
