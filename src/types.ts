export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  workload?: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To-Do' | 'In Progress' | 'Completed';
  deadline: string;
  assigned_to: number | null;
  assigned_name?: string;
  created_at: string;
}

export interface TimeLog {
  id: number;
  task_id: number;
  user_id: number;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  task_title?: string;
}

export interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}
