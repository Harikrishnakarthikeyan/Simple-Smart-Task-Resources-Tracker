import express from "express";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use DATABASE_URL for Supabase/Neon, fallback to local for dev if needed
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === "production") {
  console.error("CRITICAL: DATABASE_URL is not set in production environment!");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize Database
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('Admin', 'User')) DEFAULT 'User'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT CHECK(priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
      status TEXT CHECK(status IN ('To-Do', 'In Progress', 'Completed')) DEFAULT 'To-Do',
      deadline TIMESTAMP,
      assigned_to INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS time_logs (
      id SERIAL PRIMARY KEY,
      task_id INTEGER,
      user_id INTEGER,
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      duration_seconds INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Enable RLS to satisfy Supabase Advisor
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
  `);

  // Seed Admin if not exists
  const adminExists = await pool.query("SELECT * FROM users WHERE role = 'Admin'");
  if (adminExists.rowCount === 0) {
    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
      ["Admin User", "admin@teamsync.com", "admin123", "Admin"]
    );
  }
}

initDb().catch(console.error);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Auth Routes
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.trim()]);
    const user = result.rows[0];
    
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

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, email, password, role || 'User']
    );
    res.json({ id: result.rows[0].id, name, email, role: role || 'User' });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// User Routes
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role,
      (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status != 'Completed') as workload
      FROM users u
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/role", async (req, res) => {
  const { role } = req.body;
  await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, req.params.id]);
  res.json({ success: true });
});

// Task Routes
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as assigned_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY t.deadline ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title, description, priority, deadline, assigned_to } = req.body;
  const result = await pool.query(
    "INSERT INTO tasks (title, description, priority, deadline, assigned_to) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [title, description, priority, deadline, assigned_to]
  );
  res.json({ id: result.rows[0].id });
});

app.put("/api/tasks/:id", async (req, res) => {
  const { title, description, priority, status, deadline, assigned_to } = req.body;
  await pool.query(`
    UPDATE tasks SET title = $1, description = $2, priority = $3, status = $4, deadline = $5, assigned_to = $6
    WHERE id = $7
  `, [title, description, priority, status, deadline, assigned_to, req.params.id]);
  res.json({ success: true });
});

app.delete("/api/tasks/:id", async (req, res) => {
  await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// Time Tracking Routes
app.post("/api/time/start", async (req, res) => {
  const { task_id, user_id } = req.body;
  const result = await pool.query(
    "INSERT INTO time_logs (task_id, user_id) VALUES ($1, $2) RETURNING id",
    [task_id, user_id]
  );
  res.json({ id: result.rows[0].id });
});

app.post("/api/time/stop", async (req, res) => {
  const { log_id } = req.body;
  const now = new Date().toISOString();
  const result = await pool.query("SELECT start_time FROM time_logs WHERE id = $1", [log_id]);
  const log = result.rows[0];
  if (log) {
    const start = new Date(log.start_time);
    const end = new Date(now);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    await pool.query("UPDATE time_logs SET end_time = $1, duration_seconds = $2 WHERE id = $3", [now, duration, log_id]);
    res.json({ success: true, duration });
  } else {
    res.status(404).json({ error: "Log not found" });
  }
});

app.get("/api/time/logs/:userId", async (req, res) => {
  const result = await pool.query(`
    SELECT tl.*, t.title as task_title
    FROM time_logs tl
    JOIN tasks t ON tl.task_id = t.id
    WHERE tl.user_id = $1 AND tl.end_time IS NOT NULL
    ORDER BY tl.start_time DESC
  `, [req.params.userId]);
  res.json(result.rows);
});

// Reports & Dashboard
app.get("/api/stats", async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) as count FROM tasks");
    const completed = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'");
    const pending = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed'");
    const overdue = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed' AND deadline < CURRENT_TIMESTAMP");
    
    const stats = {
      total: parseInt(total.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      overdue: parseInt(overdue.rows[0].count),
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
