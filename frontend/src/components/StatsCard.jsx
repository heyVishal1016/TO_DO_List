import React from 'react';

export default function StatsCard({ title, label, value, icon: Icon, colorClass, accentClass, subtitle }) {
  const displayTitle = label || title;
  const displayClass = accentClass || colorClass || 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{displayTitle}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${displayClass}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
