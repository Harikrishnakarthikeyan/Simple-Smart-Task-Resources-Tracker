import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play,
  CheckCircle,
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Clock, 
  BarChart3, 
  LogOut, 
  Plus, 
  Timer, 
  TimerOff, 
  Trash2, 
  Edit2,
  AlertCircle,
  Calendar,
  ChevronRight,
  User as UserIcon,
  Bell,
  Eye,
  EyeOff,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Task, TimeLog, DashboardStats } from './types';

// --- Helpers ---

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  // SQLite CURRENT_TIMESTAMP doesn't have 'Z', so we append it to treat as UTC
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  return date.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const formatDateOnly = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  return date.toLocaleDateString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatTimeOnly = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  return date.toLocaleTimeString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const formatForInput = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  // Get local time for the input field
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
  const variants: any = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'text-gray-500 hover:bg-gray-100',
    subtle: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  };
  
  const hasPadding = className.includes('p-') || className.includes('px-') || className.includes('py-');
  const paddingClass = hasPadding ? '' : 'px-4 py-2';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${paddingClass} rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string, key?: React.Key }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const Input = ({ label, type, ...props }: any) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          {...props}
          type={inputType}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      {...props}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ logId: number, taskId: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [taskFilter, setTaskFilter] = useState<number | null>(null);

  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'User' });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setUser(null);
    setAuthForm({ name: '', email: '', password: '', role: 'User' });
    setAuthError(null);
    setTaskFilter(null);
    setActiveTab('dashboard');
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [tasksRes, usersRes, statsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/users'),
        fetch('/api/stats')
      ]);
      setTasks(await tasksRes.json());
      setUsers(await usersRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authForm,
          email: authForm.email.trim()
        })
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
      }
      
      if (res.ok) {
        setUser(data);
      } else {
        const errMsg = data?.error || "Authentication failed";
        setAuthError(errMsg);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const errMsg = err.message.includes("Unexpected token") 
        ? "Server error: The backend returned an invalid response."
        : `Connection error: ${err.message || "Please try again."}`;
      setAuthError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const role = formData.get('role');
    
    try {
      const res = await fetch(`/api/users/${editingUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        setShowRoleModal(false);
        setEditingUser(null);
        fetchData();
      }
    } catch (e) {
      alert("Failed to update role");
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const taskData: any = Object.fromEntries(formData.entries());
    
    // Convert local deadline to UTC ISO string
    if (taskData.deadline) {
      taskData.deadline = new Date(taskData.deadline).toISOString();
    }
    
    const method = editingTask ? 'PUT' : 'POST';
    const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (res.ok) {
        setShowTaskModal(false);
        setEditingTask(null);
        fetchData();
      }
    } catch (e) {
      alert("Failed to save task");
    }
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const startTimer = async (taskId: number) => {
    const res = await fetch('/api/time/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, user_id: user?.id })
    });
    const data = await res.json();
    setActiveTimer({ logId: data.id, taskId });
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    await fetch('/api/time/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: activeTimer.logId })
    });
    setActiveTimer(null);
    fetchData();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <LayoutDashboard size={28} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">TeamSync</h1>
            <p className="text-gray-500 text-center mb-8">
              {authMode === 'login' ? 'Welcome back! Please login.' : 'Create your account to get started.'}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  {authError}
                </div>
              )}
              {authMode === 'register' && (
                <Input 
                  label="Full Name" 
                  required 
                  value={authForm.name}
                  onChange={(e: any) => setAuthForm({ ...authForm, name: e.target.value })}
                />
              )}
              <Input 
                label="Email Address" 
                type="email" 
                required 
                value={authForm.email}
                onChange={(e: any) => setAuthForm({ ...authForm, email: e.target.value })}
              />
              <Input 
                label="Password" 
                type="password" 
                required 
                value={authForm.password}
                onChange={(e: any) => setAuthForm({ ...authForm, password: e.target.value })}
              />
              {authMode === 'register' && (
                <Select 
                  label="Role"
                  options={[
                    { value: 'User', label: 'Team Member' },
                    { value: 'Admin', label: 'Manager / Admin' }
                  ]}
                  value={authForm.role}
                  onChange={(e: any) => setAuthForm({ ...authForm, role: e.target.value })}
                />
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : authMode === 'login' ? 'Login' : 'Register'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-indigo-600 hover:underline text-sm font-medium"
              >
                {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label, adminOnly = false }: any) => {
    if (adminOnly && user.role !== 'Admin') return null;
    const active = activeTab === id;
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          active ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        <Icon size={20} />
        <span>{label}</span>
        {active && <motion.div layoutId="nav-active" className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={20} />
          </div>
          <span className="text-xl font-bold text-gray-900">TeamSync</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 p-6 flex flex-col z-50 transition-transform duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen
      `}>
        <div className="hidden lg:flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={20} />
          </div>
          <span className="text-xl font-bold text-gray-900">TeamSync</span>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="tasks" icon={CheckSquare} label="Tasks" />
          <NavItem id="resources" icon={Users} label="Team" adminOnly />
          <NavItem id="time" icon={Clock} label="Time Logs" />
          <NavItem id="reports" icon={BarChart3} label="Reports" adminOnly />
        </nav>

        <div className="pt-6 border-t border-gray-100">
          <button 
            onClick={() => {
              setActiveTab('profile');
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 px-2 mb-4 w-full text-left hover:bg-gray-50 p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-indigo-50 ring-1 ring-indigo-100' : ''}`}
          >
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 shrink-0">
              <UserIcon size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </button>
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
            <p className="text-gray-500 text-sm">Manage your team's productivity efficiently.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            {activeTimer && (
              <div className="flex items-center gap-3 bg-indigo-600 text-white px-4 py-2 rounded-lg animate-pulse flex-1 sm:flex-none justify-center">
                <Timer size={18} />
                <span className="font-mono font-medium">Timer Active</span>
                <button onClick={stopTimer} className="hover:bg-indigo-700 p-1 rounded">
                  <TimerOff size={18} />
                </button>
              </div>
            )}
            <button className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200">
              <Bell size={20} />
            </button>
            {user.role === 'Admin' && (
              <Button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="flex-1 sm:flex-none">
                <Plus size={18} />
                <span>New Task</span>
              </Button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Tasks', value: stats?.total || 0, icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Completed', value: stats?.completed || 0, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Overdue', value: stats?.overdue || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                  ].map((stat, i) => (
                    <Card key={i} className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                        <stat.icon size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Tasks */}
                  <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-gray-900">Recent Tasks</h3>
                      <button onClick={() => setActiveTab('tasks')} className="text-indigo-600 text-sm font-medium hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {tasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-xl hover:bg-gray-50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${
                              task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <div>
                              <p className="font-semibold text-gray-900">{task.title}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar size={12} /> {formatDateOnly(task.deadline)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                              task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status}
                            </span>
                            <ChevronRight size={16} className="text-gray-300" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Team Workload */}
                  <Card>
                    <h3 className="font-bold text-gray-900 mb-6">Team Workload</h3>
                    <div className="space-y-6">
                      {users.slice(0, 5).map(u => (
                        <div key={u.id}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">{u.name}</span>
                            <span className="text-gray-500">{u.workload} tasks</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((u.workload || 0) * 20, 100)}%` }}
                              className={`h-full rounded-full ${
                                (u.workload || 0) > 4 ? 'bg-red-500' : (u.workload || 0) > 2 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-900">Task List</h3>
                  {taskFilter && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Filtering by: <span className="font-bold text-indigo-600">{users.find(u => u.id === taskFilter)?.name}</span></span>
                      <button 
                        onClick={() => setTaskFilter(null)}
                        className="text-xs text-red-500 hover:underline font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-bottom border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="pb-4 font-semibold">Task</th>
                        <th className="pb-4 font-semibold">Assigned To</th>
                        <th className="pb-4 font-semibold">Priority</th>
                        <th className="pb-4 font-semibold">Status</th>
                        <th className="pb-4 font-semibold">Deadline</th>
                        <th className="pb-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tasks
                        .filter(t => !taskFilter || t.assigned_to === taskFilter)
                        .map(task => (
                        <tr key={task.id} className="group">
                          <td className="py-4">
                            <p className="font-semibold text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</p>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {task.assigned_name?.charAt(0) || '?'}
                              </div>
                              <span className="text-sm text-gray-700">{task.assigned_name || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              task.priority === 'High' ? 'bg-red-50 text-red-600' : 
                              task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                              task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-gray-600">
                            {formatDateOnly(task.deadline)}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2 flex-wrap max-w-[300px] ml-auto">
                              {task.status === 'Completed' && (
                                <Button 
                                  variant="subtle" 
                                  className="text-[11px] py-1 px-2 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200" 
                                  onClick={() => updateTaskStatus(task.id, 'To-Do')}
                                >
                                  <Clock size={12} />
                                  <span>Re-open</span>
                                </Button>
                              )}
                              
                              {task.status !== 'Completed' && (
                                <>
                                  {task.status !== 'In Progress' && (
                                    <Button 
                                      variant="subtle" 
                                      className="text-[11px] py-1 px-2 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200" 
                                      onClick={() => updateTaskStatus(task.id, 'In Progress')}
                                    >
                                      <Play size={12} />
                                      <span>Start</span>
                                    </Button>
                                  )}
                                  <Button 
                                    variant="subtle" 
                                    className="text-[11px] py-1 px-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200" 
                                    onClick={() => updateTaskStatus(task.id, 'Completed')}
                                  >
                                    <CheckCircle size={12} />
                                    <span>Complete</span>
                                  </Button>
                                </>
                              )}
                              
                              {activeTimer?.taskId === task.id ? (
                                <Button 
                                  variant="subtle" 
                                  className="text-[11px] py-1 px-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200" 
                                  onClick={stopTimer}
                                >
                                  <TimerOff size={12} />
                                  <span>Stop</span>
                                </Button>
                              ) : (
                                <Button 
                                  variant="subtle" 
                                  className="text-[11px] py-1 px-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200" 
                                  onClick={() => startTimer(task.id)}
                                >
                                  <Timer size={12} />
                                  <span>Timer</span>
                                </Button>
                              )}
                              
                              {user.role === 'Admin' && (
                                <>
                                  <Button 
                                    variant="subtle" 
                                    className="text-[11px] py-1 px-2 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200" 
                                    onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                                  >
                                    <Edit2 size={12} />
                                    <span>Edit</span>
                                  </Button>
                                  <Button 
                                    variant="subtle" 
                                    className="text-[11px] py-1 px-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200" 
                                    onClick={() => deleteTask(task.id)}
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'resources' && user.role === 'Admin' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(u => (
                  <Card key={u.id} className="relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{u.name}</h4>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <div className="ml-auto">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Current Workload</span>
                          <span className="font-bold text-gray-900">{u.workload} Active Tasks</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            (u.workload || 0) > 4 ? 'bg-red-500' : (u.workload || 0) > 2 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} style={{ width: `${Math.min((u.workload || 0) * 20, 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          className="flex-1 text-xs py-1.5"
                          onClick={() => {
                            setTaskFilter(u.id);
                            setActiveTab('tasks');
                          }}
                        >
                          View Tasks
                        </Button>
                        <Button 
                          variant="secondary" 
                          className="flex-1 text-xs py-1.5"
                          onClick={() => {
                            setEditingUser(u);
                            setShowRoleModal(true);
                          }}
                        >
                          Edit Role
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'time' && (
              <TimeLogsView userId={user.id} />
            )}

            {activeTab === 'reports' && user.role === 'Admin' && (
              <ReportsView tasks={tasks} users={users} />
            )}

            {activeTab === 'profile' && (
              <ProfileView user={user} tasks={tasks} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Task Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg"
            >
              <Card className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                <form onSubmit={handleTaskSubmit} className="space-y-4">
                  <Input label="Task Title" name="title" required defaultValue={editingTask?.title} />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                      name="description" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                      defaultValue={editingTask?.description}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select 
                      label="Priority" 
                      name="priority" 
                      defaultValue={editingTask?.priority || 'Medium'}
                      options={[
                        { value: 'High', label: 'High' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'Low', label: 'Low' }
                      ]} 
                    />
                    <Select 
                      label="Status" 
                      name="status" 
                      defaultValue={editingTask?.status || 'To-Do'}
                      options={[
                        { value: 'To-Do', label: 'To-Do' },
                        { value: 'In Progress', label: 'In Progress' },
                        { value: 'Completed', label: 'Completed' }
                      ]} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Deadline" name="deadline" type="datetime-local" required defaultValue={formatForInput(editingTask?.deadline)} />
                    <Select 
                      label="Assign To" 
                      name="assigned_to" 
                      defaultValue={editingTask?.assigned_to || ''}
                      options={[
                        { value: '', label: 'Unassigned' },
                        ...users.map(u => ({ value: u.id, label: u.name }))
                      ]} 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowTaskModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1">Save Task</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Edit User Role</h3>
                  <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>
                <form onSubmit={handleRoleUpdate} className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-lg mb-4">
                    <p className="text-sm font-medium text-gray-700">User: <span className="font-bold">{editingUser?.name}</span></p>
                    <p className="text-xs text-gray-500">{editingUser?.email}</p>
                  </div>
                  <Select 
                    label="Role"
                    name="role"
                    defaultValue={editingUser?.role}
                    options={[
                      { value: 'User', label: 'Team Member' },
                      { value: 'Admin', label: 'Manager / Admin' }
                    ]}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowRoleModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1">Update Role</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileView({ user, tasks }: { user: User, tasks: Task[] }) {
  const completedTasks = tasks.filter(t => t.assigned_to === user.id && t.status === 'Completed');
  
  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600">
            <UserIcon size={40} />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
            <p className="text-gray-500">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full uppercase">
              {user.role}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="flex flex-col space-y-6">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock size={20} className="text-indigo-600" />
            Recent Time Logs
          </h4>
          <TimeLogsView userId={user.id} className="flex-1" />
        </div>

        <div className="flex flex-col space-y-6">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-600" />
            Completed Tasks
          </h4>
          <Card className="p-0 overflow-hidden flex-1">
            {completedTasks.length === 0 ? (
              <div className="text-center py-12 h-full flex flex-col justify-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-3">
                  <CheckSquare size={24} />
                </div>
                <p className="text-gray-500 text-sm">No completed tasks yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {completedTasks.map(task => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 transition-all">
                    <p className="font-semibold text-gray-900">{task.title}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        Deadline: {formatDateOnly(task.deadline)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimeLogsView({ userId, className = '' }: { userId: number, className?: string }) {
  const [logs, setLogs] = useState<TimeLog[]>([]);

  useEffect(() => {
    fetch(`/api/time/logs/${userId}`).then(res => res.json()).then(setLogs);
  }, [userId]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  };

  return (
    <Card className={`${className} flex flex-col`}>
      <div className="space-y-4 flex-1">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8 h-full flex items-center justify-center">No time logs found.</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900">{log.task_title}</p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(log.start_time)} - {log.end_time ? formatTimeOnly(log.end_time) : 'Active'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-indigo-600">{formatDuration(log.duration_seconds)}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Duration</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function ReportsView({ tasks, users }: { tasks: Task[], users: User[] }) {
  const completionRate = tasks.length > 0 ? (tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100 : 0;
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <h3 className="font-bold text-gray-900 mb-6">Task Completion Rate</h3>
          <div className="flex items-center justify-center py-8">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-100 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                <motion.circle 
                  initial={{ strokeDasharray: "0 251.2" }}
                  animate={{ strokeDasharray: `${(completionRate / 100) * 251.2} 251.2` }}
                  className="text-indigo-600 stroke-current" 
                  strokeWidth="10" 
                  strokeLinecap="round" 
                  fill="transparent" 
                  r="40" cx="50" cy="50" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{Math.round(completionRate)}%</span>
                <span className="text-xs text-gray-500 uppercase">Completed</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-6">Priority Distribution</h3>
          <div className="space-y-4">
            {['High', 'Medium', 'Low'].map(p => {
              const count = tasks.filter(t => t.priority === p).length;
              const pct = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
              return (
                <div key={p}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{p} Priority</span>
                    <span className="text-gray-500">{count} tasks</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      p === 'High' ? 'bg-red-500' : p === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-gray-900 mb-6">User Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-4">Team Member</th>
                <th className="pb-4">Active Tasks</th>
                <th className="pb-4">Completed Tasks</th>
                <th className="pb-4">Workload Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const userTasks = tasks.filter(t => t.assigned_to === u.id);
                const active = userTasks.filter(t => t.status !== 'Completed').length;
                const completed = userTasks.filter(t => t.status === 'Completed').length;
                return (
                  <tr key={u.id}>
                    <td className="py-4 font-medium text-gray-900">{u.name}</td>
                    <td className="py-4 text-gray-600">{active}</td>
                    <td className="py-4 text-gray-600">{completed}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        active > 4 ? 'bg-red-100 text-red-700' : 
                        active > 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {active > 4 ? 'Overloaded' : active > 2 ? 'Busy' : 'Optimal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
