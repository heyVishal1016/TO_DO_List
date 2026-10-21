import React from 'react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { Check, Calendar, Edit2, Trash2 } from 'lucide-react';

export default function TaskCard({ task, onToggleComplete, onEdit, onDelete }) {
  const isCompleted = Boolean(task.completed);

  // Format due date badge
  let dueDateBadge = null;
  if (task.due_date) {
    try {
      const parsed = parseISO(task.due_date);
      const isOverdue = isPast(parsed) && !isToday(parsed) && !isCompleted;
      const dueToday = isToday(parsed);

      let text = format(parsed, 'MMM d, yyyy');
      if (dueToday) text = 'Due Today';
      if (isOverdue) text = `Overdue (${format(parsed, 'MMM d')})`;

      dueDateBadge = (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
            isOverdue
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
              : dueToday
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-3 h-3" />
          {text}
        </span>
      );
    } catch (_) {}
  }

  // Priority color tags
  const priorityConfig = {
    high: {
      label: 'HIGH',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40',
      stripeClass: 'bg-rose-500'
    },
    med: {
      label: 'MEDIUM',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
      stripeClass: 'bg-amber-500'
    },
    low: {
      label: 'LOW',
      badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/40',
      stripeClass: 'bg-sky-500'
    }
  };

  const currentPriority = priorityConfig[task.priority] || priorityConfig.med;

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all overflow-hidden flex items-start gap-4 ${
        isCompleted
          ? 'border-slate-200/60 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60'
      }`}
    >
      {/* Priority colored left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${currentPriority.stripeClass}`} />

      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(task)}
        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
          isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/25'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800'
        }`}
        aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
      >
        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-base font-semibold text-slate-900 dark:text-white leading-snug break-words ${
            isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
          }`}
        >
          {task.title}
        </h4>

        {task.description && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-line leading-relaxed break-words">
            {task.description}
          </p>
        )}

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span
            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${currentPriority.badgeClass}`}
          >
            {currentPriority.label}
          </span>
          {dueDateBadge}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Edit task"
          aria-label="Edit task"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Delete task"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
