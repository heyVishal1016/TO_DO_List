import React from 'react';
import { Search, Plus, Trash2, Filter } from 'lucide-react';

export default function FilterBar({
  filters,
  onFilterChange,
  onOpenCreate,
  onClearCompleted,
  hasCompletedTasks
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 flex flex-col gap-4">
      
      {/* Top Row: Search and Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title or description..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasCompletedTasks && (
            <button
              onClick={onClearCompleted}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors"
              title="Delete all completed tasks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Completed</span>
            </button>
          )}

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Status Tabs and Dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
        
        {/* Status Pills */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'all', label: 'All Tasks' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange('filter', tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filters.filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown Selects */}
        <div className="flex items-center gap-2">
          {/* Priority Select */}
          <div className="relative">
            <select
              value={filters.priority}
              onChange={(e) => onFilterChange('priority', e.target.value)}
              className="h-8 pl-3 pr-8 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="low">🔵 Low Priority</option>
            </select>
          </div>

          {/* Date Range Select */}
          <div className="relative">
            <select
              value={filters.range}
              onChange={(e) => onFilterChange('range', e.target.value)}
              className="h-8 pl-3 pr-8 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">📅 Due Today</option>
              <option value="week">🗓️ This Week</option>
              <option value="overdue">⚠️ Overdue</option>
            </select>
          </div>
        </div>

      </div>

    </div>
  );
}
