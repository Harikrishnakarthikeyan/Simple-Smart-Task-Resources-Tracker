# 🚀 Deploying TeamSync to Vercel (Step-by-Step)

Deploying a full-stack application with an Express backend and a database to Vercel requires a few specific adjustments because Vercel is a **Serverless** platform.

---

## ⚠️ Step 0: The Database Problem
**SQLite (`teamsync.db`) will NOT work on Vercel.** Vercel's filesystem is temporary; your data will disappear every few minutes.

**Solution**: You MUST use a hosted database.
1.  Go to [Supabase](https://supabase.com/) or [Neon.tech](https://neon.tech/).
2.  Create a free project and get your **Database Connection String**.
3.  You will need to update `server.ts` to use `pg` (Postgres) instead of `better-sqlite3`.

---

## 🛠️ Step 1: Prepare the Backend for Vercel
Vercel doesn't run `node server.ts` continuously. It treats your server as a **Serverless Function**.

1.  **Install Vercel adapter**:
    ```bash
    npm install @vercel/node
    ```

2.  **Modify `server.ts`**:
    At the bottom of your `server.ts`, you must export the app instead of just calling `app.listen()`:
    ```typescript
    // Replace app.listen(...) with:
    export default app;
    ```

---

## 📄 Step 2: Create `vercel.json`
Create a file named `vercel.json` in your root folder to tell Vercel how to route requests to your backend.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

---

## 📤 Step 3: Deploy to GitHub
1.  Create a new repository on GitHub.
2.  Push your code:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git remote add origin <your-repo-url>
    git push -u origin main
    ```

---

## 🌐 Step 4: Connect to Vercel
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New"** -> **"Project"**.
3.  Import your GitHub repository.
4.  **Framework Preset**: Select `Vite`.
5.  **Environment Variables**:
    -   Add `DATABASE_URL` (from Supabase/Neon).
    -   Add `GEMINI_API_KEY` (if you are using AI features).
6.  Click **Deploy**.

---

## ✅ Summary Checklist
- [ ] Moved database from SQLite to a hosted Postgres (Supabase/Neon).
- [ ] Added `vercel.json` to the root directory.
- [ ] Exported `app` in `server.ts`.
- [ ] Added all API keys to Vercel Environment Variables.

**Note**: If you want an easier deployment that keeps SQLite exactly as it is, I highly recommend using **[Railway.app](https://railway.app)** instead of Vercel.
