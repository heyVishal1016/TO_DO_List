import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  Shield,
  Database,
  RefreshCw,
  Trash2,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function BackupPanel({ onRestoreSuccess }) {
  const { user } = useAuth();
  const [dbStatus, setDbStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreMode, setRestoreMode] = useState('merge');
  const [restoring, setRestoring] = useState(false);

  // Fetch database integrity and admin backups
  const loadIntegrityAndBackups = async () => {
    try {
      const healthRes = await api.get('/health/db');
      setDbStatus(healthRes.data);
    } catch (_) {
      setDbStatus({ status: 'corrupted' });
    }

    if (user?.is_admin) {
      setLoadingBackups(true);
      try {
        const backupRes = await api.get('/backup/list');
        setBackups(backupRes.data.data.backups || []);
      } catch (err) {
        console.error('Failed to load backup list:', err);
      } finally {
        setLoadingBackups(false);
      }
    }
  };

  useEffect(() => {
    loadIntegrityAndBackups();
  }, [user]);

  // Download user data as JSON
  const handleExportJson = async () => {
    try {
      const res = await api.get('/export/json', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-tasks-${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Tasks exported as JSON');
    } catch (err) {
      toast.error('Failed to export tasks as JSON');
    }
  };

  // Download user data as CSV
  const handleExportCsv = async () => {
    try {
      const res = await api.get('/export/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Tasks exported as CSV');
    } catch (err) {
      toast.error('Failed to export tasks as CSV');
    }
  };

  // Restore user data from JSON file
  const handleFileRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a valid .json backup file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setRestoring(true);
    try {
      const res = await api.post(`/restore/json?mode=${restoreMode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data.data;
      toast.success(
        `Successfully restored ${data.restoredCount} tasks (${restoreMode === 'replace' ? 'replaced existing' : 'merged'})`
      );
      if (onRestoreSuccess) onRestoreSuccess();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to restore tasks';
      toast.error(errorMsg);
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  // Admin: Create manual zip backup
  const handleCreateManualBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await api.post('/backup/create');
      toast.success(`Backup created: ${res.data.data.filename}`);
      loadIntegrityAndBackups();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Admin: Download backup archive
  const handleDownloadBackup = async (filename) => {
    try {
      const res = await api.get(`/backup/download/${encodeURIComponent(filename)}`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Backup archive downloaded');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download backup');
    }
  };

  // Admin: Delete backup archive
  const handleDeleteBackup = async (filename) => {
    if (!confirm(`Are you sure you want to delete backup "${filename}"?`)) return;

    try {
      await api.delete(`/backup/${encodeURIComponent(filename)}`);
      toast.success('Backup deleted');
      setBackups(prev => prev.filter(b => b.filename !== filename));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete backup');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Database Health Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Database Health & Storage</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SQLite storage with WAL concurrency and automated daily snapshots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {dbStatus?.status === 'ok' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> Integrity OK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" /> Corrupted / Error
              </span>
            )}

            {dbStatus?.lastBackup && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Clock className="w-3 h-3" /> Last: {format(parseISO(dbStatus.lastBackup), 'MMM d, HH:mm')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. User Data Export & Restore */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Personal Data Management</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download your task history or restore tasks from an exported JSON file.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-slate-800 dark:text-slate-200 text-sm font-semibold group"
          >
            <FileText className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
            <span>Download my data (JSON)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-slate-800 dark:text-slate-200 text-sm font-semibold group"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span>Download my data (CSV)</span>
          </button>
        </div>

        {/* Restore Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Upload & Restore</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import tasks from a previously saved JSON export file.
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Restore Mode:</span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setRestoreMode('merge')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    restoreMode === 'merge'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Merge
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreMode('replace')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    restoreMode === 'replace'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Replace All
                </button>
              </div>
            </div>
          </div>

          <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all">
            <Upload className="w-6 h-6 text-indigo-500 mb-2" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {restoring ? 'Restoring tasks...' : 'Choose JSON file to restore'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1">Accepts valid TaskFlow JSON (Max 10MB)</span>
            <input
              type="file"
              accept=".json"
              disabled={restoring}
              onChange={handleFileRestore}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 3. Administrator System Backups Section */}
      {user?.is_admin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Admin System Backups</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage automated 02:00 daily snapshots and manual zipped archives.
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateManualBackup}
              disabled={creatingBackup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all"
            >
              <HardDrive className="w-4 h-4" />
              <span>{creatingBackup ? 'Creating Snapshot...' : 'Create Manual ZIP Backup'}</span>
            </button>
          </div>

          {/* Backup Archives Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {loadingBackups ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading system backups...</div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No backups available yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Filename</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {backups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-100 font-medium">
                          {b.filename}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              b.type === 'manual'
                                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {b.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {(b.sizeBytes / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {format(parseISO(b.createdAt), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownloadBackup(b.filename)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Download backup"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(b.filename)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete backup"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
