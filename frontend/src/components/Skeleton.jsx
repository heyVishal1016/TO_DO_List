import React from 'react';

export function TaskSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm animate-pulse flex items-start gap-4">
      <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 flex-shrink-0 mt-0.5"></div>
      <div className="flex-1 space-y-2.5">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2"></div>
        <div className="flex gap-2 pt-1">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
          <div className="h-5 bg-slate-100 dark:bg-slate-800/60 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm animate-pulse flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
        <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-14"></div>
      </div>
      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
    </div>
  );
}

export default function Skeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <TaskSkeleton key={index} />
      ))}
    </div>
  );
}
