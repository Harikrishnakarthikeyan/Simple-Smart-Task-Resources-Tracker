import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("teamsync.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('Admin', 'User')) DEFAULT 'User'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK(priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
    status TEXT CHECK(status IN ('To-Do', 'In Progress', 'Completed')) DEFAULT 'To-Do',
    deadline DATETIME,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    user_id INTEGER,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration_seconds INTEGER,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'Admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Admin User",
    "admin@teamsync.com",
    "admin123",
    "Admin"
  );
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Auth Routes
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim());
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Enter Correct Password" });
    }

    // Remove password before sending
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(name, email, password, role || 'User');
    res.json({ id: result.lastInsertRowid, name, email, role: role || 'User' });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// User Routes
app.get("/api/users", (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role,
    (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status != 'Completed') as workload
    FROM users u
  `).all();
  res.json(users);
});

app.put("/api/users/:id/role", (req, res) => {
  const { role } = req.body;
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  res.json({ success: true });
});

// Task Routes
app.get("/api/tasks", (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, u.name as assigned_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    ORDER BY t.deadline ASC
  `).all();
  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  const { title, description, priority, deadline, assigned_to } = req.body;
  const result = db.prepare("INSERT INTO tasks (title, description, priority, deadline, assigned_to) VALUES (?, ?, ?, ?, ?)").run(title, description, priority, deadline, assigned_to);
  res.json({ id: result.lastInsertRowid });
});

app.put("/api/tasks/:id", (req, res) => {
  const { title, description, priority, status, deadline, assigned_to } = req.body;
  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, deadline = ?, assigned_to = ?
    WHERE id = ?
  `).run(title, description, priority, status, deadline, assigned_to, req.params.id);
  res.json({ success: true });
});

app.delete("/api/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Time Tracking Routes
app.post("/api/time/start", (req, res) => {
  const { task_id, user_id } = req.body;
  const result = db.prepare("INSERT INTO time_logs (task_id, user_id) VALUES (?, ?)").run(task_id, user_id);
  res.json({ id: result.lastInsertRowid });
});

app.post("/api/time/stop", (req, res) => {
  const { log_id } = req.body;
  const now = new Date().toISOString();
  const log = db.prepare("SELECT start_time FROM time_logs WHERE id = ?").get(log_id);
  if (log) {
    const start = new Date(log.start_time);
    const end = new Date(now);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    db.prepare("UPDATE time_logs SET end_time = ?, duration_seconds = ? WHERE id = ?").run(now, duration, log_id);
    res.json({ success: true, duration });
  } else {
    res.status(404).json({ error: "Log not found" });
  }
});

app.get("/api/time/logs/:userId", (req, res) => {
  const logs = db.prepare(`
    SELECT tl.*, t.title as task_title
    FROM time_logs tl
    JOIN tasks t ON tl.task_id = t.id
    WHERE tl.user_id = ? AND tl.end_time IS NOT NULL
    ORDER BY tl.start_time DESC
  `).all(req.params.userId);
  res.json(logs);
});

// Reports & Dashboard
app.get("/api/stats", (req, res) => {
  const stats = {
    total: db.prepare("SELECT COUNT(*) as count FROM tasks").get().count,
    completed: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'").get().count,
    pending: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed'").get().count,
    overdue: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed' AND deadline < CURRENT_TIMESTAMP").get().count,
  };
  res.json(stats);
});

export default app;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Only listen if not running on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}
