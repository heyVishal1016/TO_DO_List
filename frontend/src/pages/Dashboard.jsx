import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import StatsCard from '../components/StatsCard';
import FilterBar from '../components/FilterBar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import { TaskSkeleton, StatsSkeleton } from '../components/Skeleton';
import toast from 'react-hot-toast';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  Plus
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    todayCount: 0,
    completionRate: 0
  });
  const [todos, setTodos] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTodos, setLoadingTodos] = useState(true);

  // Filters state
  const [filters, setFilters] = useState({
    filter: 'all',
    priority: 'all',
    range: 'all',
    search: ''
  });

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/todos/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTodos = useCallback(async () => {
    setLoadingTodos(true);
    try {
      const params = {};
      if (filters.filter !== 'all') params.filter = filters.filter;
      if (filters.priority !== 'all') params.priority = filters.priority;
      if (filters.range !== 'all') params.range = filters.range;
      if (filters.search.trim()) params.search = filters.search.trim();

      const res = await api.get('/todos', { params });
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : (res.data?.data?.todos || res.data?.todos || []);
      setTodos(list);
    } catch (err) {
      console.error('Failed to fetch todos:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoadingTodos(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleComplete = async (task) => {
    const nextCompleted = !task.completed;
    try {
      await api.patch(`/todos/${task.id}`, { completed: nextCompleted });
      if (nextCompleted) {
        toast.success('Task marked as completed! 🎉');
      }
      fetchTodos();
      fetchStats();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTask) {
        await api.patch(`/todos/${editingTask.id}`, formData);
        toast.success('Task updated successfully');
      } else {
        await api.post('/todos', formData);
        toast.success('Task created successfully');
      }
      setIsFormOpen(false);
      setEditingTask(null);
      fetchTodos();
      fetchStats();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Operation failed';
      toast.error(msg);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/todos/${id}`);
      toast.success('Task deleted');
      fetchTodos();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm('Are you sure you want to delete all completed tasks?')) return;
    try {
      const res = await api.delete('/todos/completed');
      toast.success(`Deleted ${res.data.data.deletedCount} completed tasks`);
      fetchTodos();
      fetchStats();
    } catch (err) {
      toast.error('Failed to clear completed tasks');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Dashboard Header & Overall Completion Bar */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Task Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Organize priorities, manage deadlines, and track your daily productivity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completion Velocity:</span>
            <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
              {stats.completionRate}%
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loadingStats ? (
          <>
            <StatsSkeleton />
            <StatsSkeleton />
            <StatsSkeleton />
            <StatsSkeleton />
            <StatsSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              title="Total"
              value={stats.total}
              icon={ListTodo}
              colorClass="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
              subtitle="All tasks"
            />
            <StatsCard
              title="Completed"
              value={stats.completed}
              icon={CheckCircle2}
              colorClass="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
              subtitle={`${stats.completionRate}% finished`}
            />
            <StatsCard
              title="Pending"
              value={stats.pending}
              icon={Clock}
              colorClass="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
              subtitle="Active tasks"
            />
            <StatsCard
              title="Overdue"
              value={stats.overdue}
              icon={AlertCircle}
              colorClass="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
              subtitle="Needs action"
            />
            <StatsCard
              title="Due Today"
              value={stats.todayCount}
              icon={CalendarDays}
              colorClass="bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
              subtitle="Scheduled today"
            />
          </>
        )}
      </div>

      {/* 3. Filter & Toolbar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onOpenCreate={() => {
          setEditingTask(null);
          setIsFormOpen(true);
        }}
        onClearCompleted={handleClearCompleted}
        hasCompletedTasks={stats.completed > 0}
      />

      {/* 4. Task List */}
      <div>
        {loadingTodos ? (
          <div className="space-y-3">
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
              <ListTodo className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No tasks match your filter</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              Create a new task to get started, or clear your active search and filters.
            </p>
            <button
              onClick={() => {
                setEditingTask(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {todos.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={(t) => {
                  setEditingTask(t);
                  setIsFormOpen(true);
                }}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Create / Edit Task Modal */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingTask}
      />

    </div>
  );
}
