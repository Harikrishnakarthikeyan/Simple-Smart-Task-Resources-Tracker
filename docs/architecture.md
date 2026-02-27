# TeamSync Architecture Overview

This document explains the technical architecture, languages, and tools used to build the TeamSync application.

## 🏗️ Architecture Type: Full-Stack Monolith
The application is built as a **Full-Stack Monolith** using a "Single Repo" approach. This means both the frontend (user interface) and the backend (server/database) live in the same project and run together.

### 1. Frontend (Client-Side)
- **Library**: React 19
- **Build Tool**: Vite (Fast development and optimized production builds)
- **Styling**: Tailwind CSS (Utility-first CSS framework)
- **Animations**: Framer Motion (for smooth transitions and UI interactions)
- **Icons**: Lucide React

### 2. Backend (Server-Side)
- **Framework**: Express.js (Node.js)
- **Runtime**: Node.js
- **API Type**: RESTful API (JSON-based communication)

### 3. Database (Storage)
- **Engine**: SQLite (via `better-sqlite3`)
- **Type**: Relational Database
- **Storage**: Local file-based storage (`teamsync.db`)

---

## 💻 Language & Framework
**Is this TypeScript or Next.js?**

This application is built using **TypeScript (TS)**.

- **TypeScript**: Used for both the frontend (`.tsx` files) and the backend (`server.ts`). It provides type safety, which prevents many common coding errors.
- **Framework**: It uses **React + Express**, which is a classic full-stack combination. 
- **Note**: This is **NOT** a Next.js application. While Next.js is a popular framework for React, this project uses a custom Express server to handle the backend logic and SQLite integration directly.

---

## 📂 Folder Structure
- `/src`: Contains all frontend React code (Components, Pages, Styles).
- `/server.ts`: The main entry point for the backend server.
- `/teamsync.db`: The local database file where all your tasks and users are saved.
- `/package.json`: Manages all dependencies and scripts.

---

## 🔄 Data Flow
1. **User Action**: A user clicks a button in the React UI (e.g., "Start Timer").
2. **API Request**: React sends a `POST` request to the Express server (`/api/time/start`).
3. **Database Operation**: The Express server receives the request and executes a SQL command to the SQLite database.
4. **Response**: The server sends back a JSON confirmation.
5. **UI Update**: React receives the confirmation and updates the screen instantly.
