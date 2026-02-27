# 🚀 Deploying TeamSync to Render.com (Step-by-Step)

Render is an excellent choice for deploying full-stack Express + React applications. It is very "free-tier" friendly.

---

## ⚠️ Important Note on SQLite
Render's **Free Tier** for Web Services uses an "ephemeral" disk. This means:
- Your `teamsync.db` file will work perfectly while the app is running.
- **HOWEVER**, every time you deploy new code or the app restarts (which happens at least once a day on the free tier), **all your data will be reset**.

**To keep your data permanently**, you would need to:
1.  Upgrade to a "Starter" plan ($7/mo) to use a **Persistent Disk**.
2.  **OR** use Render's **Free PostgreSQL** database instead of SQLite (requires code changes).

---

## 🛠️ Step 1: Prepare your Code
I have already updated your `server.ts` to use `process.env.PORT`, which is required for Render to work.

1.  **Push your code to GitHub**:
    - Create a repository on GitHub.
    - Push all your files there.

---

## 🌐 Step 2: Create a Web Service on Render
1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **"New +"** and select **"Web Service"**.
3.  Connect your GitHub account and select your **TeamSync** repository.

---

## ⚙️ Step 3: Configure the Service
Fill in the following details:
- **Name**: `teamsync` (or any name you like)
- **Region**: Select the one closest to you (e.g., Oregon or Frankfurt)
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start` (I have ensured your `package.json` has the correct start script)

---

## 🔑 Step 4: Set Environment Variables
This is the most important part for your question!

1.  In the Render setup screen, click on the **"Advanced"** button or go to the **"Environment"** tab after creating the service.
2.  Add the following variables:
    -   `NODE_ENV`: `production`
    -   `GEMINI_API_KEY`: (Your Google Gemini API Key)
    -   `PORT`: `10000` (Render usually sets this automatically, but you can define it if needed).

---

## 🚀 Step 5: Deploy
1.  Click **"Create Web Service"**.
2.  Render will start building your app. It will:
    -   Install all dependencies.
    -   Build the React frontend into the `dist` folder.
    -   Start the Express server.
3.  Once the logs say `Server running on http://localhost:10000`, your app is LIVE!

---

## ✅ Summary Checklist for Environment
On Render, you don't use a `.env` file. You enter the keys directly into the **"Environment"** tab in their dashboard. This keeps your secrets safe and hidden from the public.
