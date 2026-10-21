# TaskFlow Pro ⚡ Production Full-Stack To-Do Web App

A production-ready full-stack Task & Project Management web application built with **Node.js, Express, SQLite (`better-sqlite3`), and React 18 + Vite + Tailwind CSS**. Features JWT authentication, bcrypt password hashing (12 rounds), transactional data restore, and an automated backup engine with scheduled cron snapshots, zip compression, and retention pruning.

---

## 🏗️ Architecture & Tech Stack

### Backend
- **Runtime & Server**: Node.js (ES Modules) + Express.js
- **Database**: SQLite via `better-sqlite3` (with WAL mode, foreign keys, and indexes)
- **Security & Validation**:
  - `bcrypt` (12 salt rounds)
  - `jsonwebtoken` (7-day expiration)
  - `helmet` (security headers)
  - `cors` (origin whitelisting)
  - `express-rate-limit` (general API & strict auth limiters)
  - `zod` (runtime schema validation)
  - Parameterized SQL queries only (zero SQL injection surface)
- **Backup & Storage Engine**:
  - `node-cron` (automated daily snapshots at 02:00 server time)
  - `archiver` (lossless ZIP compression of SQLite snapshots)
  - `multer` (in-memory streamed restore with 10MB limit)

### Frontend
- **Framework & Build**: React 18 + Vite
- **Styling**: Tailwind CSS (with bespoke dark/light mode switching)
- **State & Networking**: Axios (with JWT interceptors), React Router DOM v6
- **UI Components**: `lucide-react` icons, `react-hot-toast` notifications, `date-fns` formatting

---

## 📁 Repository Structure

```
todo-app/
├── .gitignore
├── README.md
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── backups/                 # Runtime generated, git-ignored
│   ├── middleware/
│   │   ├── auth.js              # verifyToken and requireAdmin
│   │   └── validate.js          # Zod schema validation
│   ├── routes/
│   │   ├── auth.js              # /api/auth (register, login, me)
│   │   ├── todos.js             # /api/todos CRUD, filters, bulk delete, stats
│   │   ├── backup.js            # /api/backup (create, list, download, delete)
│   │   └── export.js            # /api/export (json, csv) & /api/restore/json
│   ├── services/
│   │   ├── backupService.js     # Scheduled cron, zipping, retention policy
│   │   └── restoreService.js    # ACID transactional JSON restore
│   └── schemas/
│       └── index.js             # Zod input schemas
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/axios.js         # Axios client with JWT bearer interceptor
        ├── context/
        │   ├── AuthContext.jsx  # Authentication state & session recovery
        │   └── ThemeContext.jsx # Dark / Light theme toggle
        ├── components/
        │   ├── Navbar.jsx       # Header with user role badge & navigation
        │   ├── TaskCard.jsx     # Task item with priority stripe & actions
        │   ├── TaskForm.jsx     # Create/Edit task modal with presets
        │   ├── FilterBar.jsx    # Status pills, dropdowns, and search
        │   ├── StatsCard.jsx    # Dashboard KPI metrics
        │   ├── ProtectedRoute.jsx # Authentication gate
        │   ├── Skeleton.jsx     # Smooth loading placeholders
        │   └── BackupPanel.jsx  # Personal export/restore & admin backup controls
        └── pages/
            ├── Login.jsx        # Email authentication & fast demo access
            ├── Register.jsx     # Account creation with admin toggle
            ├── Dashboard.jsx    # Metrics, progress bar, and task management
            └── Settings.jsx     # Profile, database health & backup console
```

---

## ⚡ Local Setup & Execution

### 1. Backend Setup

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Install backend dependencies
npm install

# Start backend server (starts on http://localhost:5000)
npm run dev
```

### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server (starts on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Variables (.env)

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=production_super_secret_jwt_key_at_least_32_chars_long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
DB_PATH=./todos.db
BACKUP_DIR=./backups
```

### Frontend (`frontend/.env` or `.env.production`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🌐 Production Deployment Guide

### Deploying Backend to Render (with Persistent Disk)

1. Create a **New Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. **Attach a Persistent Disk** (Critical for SQLite and backups):
   - In the Render Dashboard, navigate to **Disks**.
   - Click **Add Disk**:
     - **Name**: `todo-data`
     - **Mount Path**: `/var/data`
     - **Size**: 1 GB (or as desired)
5. Set Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `<generate-a-strong-random-key>`
   - `JWT_EXPIRES_IN`: `7d`
   - `DB_PATH`: `/var/data/todos.db`
   - `BACKUP_DIR`: `/var/data/backups`
   - `CORS_ORIGIN`: `https://your-frontend.vercel.app`

### Deploying Frontend to Vercel

1. Create a **New Project** on [Vercel](https://vercel.com).
2. Connect your GitHub repository.
3. Configure project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
5. Click **Deploy**.

---

## 📦 GitHub Push Instructions

```bash
# Initialize git if not already initialized
git init

# Verify gitignore ignores node_modules, .env, *.db, backups/, and dist/
git status

# Stage all files
git add .

# Initial commit
git commit -m "feat: complete production-ready full-stack todo application with automated backups"

# Link to GitHub remote and push
git branch -M main
git remote add origin https://github.com/<your-username>/todo-app.git
git push -u origin main
```

---

## 🧪 Backup Testing Checklist

Verify your installation against all 10 core security and functionality requirements:

1. **Manual Backup Creation**:
   - Log in as admin, navigate to Settings, click **"Create Manual ZIP Backup"**.
   - Verify that `backup-manual-*.zip` is created inside `backups/` and registered in the database table.
2. **Download Backup**:
   - Click the download icon next to any backup in the admin list.
   - Verify a valid ZIP file downloads containing `todos.db`.
3. **Restore from JSON (Merge Mode)**:
   - Click **"Download my data (JSON)"** to get your current tasks.
   - Delete one task, then click **"Upload & Restore"** with mode set to `Merge`.
   - Verify the missing task is re-inserted and existing tasks are preserved.
4. **Restore from JSON (Replace Mode)**:
   - Upload a JSON export file with mode set to `Replace All`.
   - Verify existing tasks are completely replaced with the payload tasks inside an atomic database transaction.
5. **Corrupt File Rejection**:
   - Attempt to upload an invalid or malformed JSON file to `/api/restore/json`.
   - Verify that Zod validation rejects the request with a descriptive error message and the database transaction rolls back.
6. **Cron Schedule at 02:00**:
   - Scheduled via `node-cron` with `0 2 * * *`.
   - Can be simulated programmatically in tests by calling `createDailyBackup()`.
7. **Retention Policy (7 Daily, 4 Weekly, 500MB Cap)**:
   - Daily backups older than 7 days are automatically pruned from disk and deleted from the `backups` table.
   - Up to 4 Sunday backups are retained. A warning is logged if total backup directory size exceeds 500MB.
8. **Admin-Only Backup Access Control**:
   - Log in with a non-admin user account.
   - Attempt to call `GET /api/backup/download/:filename` or `DELETE /api/backup/:filename`.
   - Verify HTTP `403 Forbidden` is returned: `{"error": "Forbidden: Administrator privileges required"}`.
9. **Path Traversal Protection**:
   - Attempt to request `/api/backup/download/../../etc/passwd` or `/api/backup/download/..%2F..%2Fetc%2Fpasswd`.
   - Verify `path.basename` sanitization and directory resolution bounds prevent path traversal and return `404 Not Found`.
10. **Database Integrity Endpoint**:
    - Query `GET /api/health/db`.
    - Verify response returns `{"status": "ok", "lastBackup": "<timestamp>", "details": [{"integrity_check": "ok"}]}`.
