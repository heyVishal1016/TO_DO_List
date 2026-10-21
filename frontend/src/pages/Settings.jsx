import React from 'react';
import { useAuth } from '../context/AuthContext';
import BackupPanel from '../components/BackupPanel';
import { User, Shield, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>System Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Settings & Backups
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account profile, export personal data, and control system backups.
        </p>
      </div>

      {/* User Profile Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-indigo-500/25">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user?.email}</h3>
                {user?.is_admin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Shield className="w-3 h-3" /> ADMIN
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Member</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Account ID #{user?.id}
                </span>
                {user?.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Member since {format(parseISO(user.created_at), 'MMMM yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup and Restore Management Panel */}
      <BackupPanel onRestoreSuccess={() => {}} />

    </div>
  );
}
