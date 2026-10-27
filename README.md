# Mini-Rayyan Medical Screening Platform

An AI-assisted systematic review screening platform designed for clinical researchers and medical investigators. Formulate PICO queries, automatically fetch literature records from PubMed & Europe PMC, run multi-tier deduplication, and perform blinded screening with an immutable audit log.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** (or **bun** / **yarn** / **pnpm**)

### 2. Install Dependencies
```bash
npm install
```
*(Note: esbuild dependency has been streamlined so modern npm installs cleanly without ERESOLVE errors).*

### 3. Environment Variables (100% Optional)
Copy `.env.example` to `.env.local` if you wish to use remote Supabase:
```bash
cp .env.example .env.local
```
- **Localhost Mode (Default & Offline Ready):** If you don't configure any variables, the app runs entirely on its built-in relational Localhost Database with offline landmark clinical trial ingestion. Ideal for offline presentations!
- **Cloud Mode (Production):** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to sync to remote PostgreSQL.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏆 Hackathon Presentation & Dual-Engine Architecture

This project is specifically engineered with a **Dual-Engine Architecture** to excel in hackathon judging:

1. **Localhost Offline Mode (`http://localhost:3000`)**:
   - Runs with **zero external dependencies** — even if the hackathon venue has no WiFi or you are in airplane mode!
   - Full relational database emulation stored in the browser (users, sessions, protocols, queries $v_1 \rightarrow v_2$, deduplicated clusters, screening decisions, and immutable audit logs).
   - Ingests offline landmark clinical trial corpora (EMPA-REG, SUSTAIN-6, UKPDS 34, DELIVER, AcT stroke trial, etc.) with real PubMed/Europe PMC metadata.
2. **One-Click Demo Seeder (`Seed Demo` button)**:
   - Click the amber **`Seed Demo`** button in the header or on empty states to instantly populate a complete systematic review workspace:
     - Formulated PICO protocol for Cardiorenal outcomes in Type 2 Diabetes.
     - Iterative query versions ($v_1 \rightarrow v_2$) demonstrating the Level 2 diff loop.
     - Clustered trial pairs demonstrating Tier 1 (DOI), Tier 2 (PMID), and Tier 3 deduplication.
     - Pre-recorded decisions and live calculations for the **PRISMA 2020 SVG diagram**.
3. **Cloud Production Mode (Vercel + Supabase)**:
   - Ready for instant deployment on Vercel (`dist` SPA preset).
   - Direct PostgreSQL database integration via `supabase-schema.sql`.
   - Clear visual status badge in the header: `[● Local DB: Offline]` vs `[● Cloud: Supabase]`.

---

## 📦 Pushing to GitHub

Follow these steps from your terminal inside the project directory:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add all files
git add .

# 3. Create your initial commit
git commit -m "feat: Initial commit for Mini-Rayyan medical screening platform"

# 4. Set default branch to main
git branch -M main

# 5. Link your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# 6. Push to GitHub
git push -u origin main
```

---

## ▲ Deploying to Vercel

This repository is pre-configured for instant zero-config deployment on Vercel:
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **SPA Routing**: Handled via `vercel.json` rewrites

### Step-by-Step Vercel Deployment:

1. Go to [Vercel](https://vercel.com) and log in.
2. Click **"Add New..."** > **"Project"**.
3. Import your GitHub repository (`YOUR_REPOSITORY_NAME`).
4. Under **Build and Output Settings**, Vercel will automatically detect **Vite**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. *(Optional)* Add Environment Variables if you use Supabase or Gemini:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
6. Click **Deploy**. Your app will be live on an HTTPS `.vercel.app` domain in seconds!

---

## 🛠 Features

- **Auth & Session Persistence**: Secure email/password authentication with "Remember me" functionality across visits.
- **PICO Protocol Extraction**: Automatic parsing of Population, Intervention, Comparator, and Outcome from natural language clinical questions.
- **PubMed & Europe PMC Literature Ingestion**: Live query execution via E-utilities and REST APIs.
- **Multi-Tier Deduplication**: Hierarchical matching by Normalized DOI, PMID, and fuzzy Title + Author + Publication Year.
- **Screening Workspace**: Include / Exclude / Maybe decisions with exclusion reasons, inline abstract viewer with highlighted PICO terms, and CSV export.
- **PRISMA 2020 Flow**: Interactive PRISMA flow diagram and comprehensive screening audit logs.
- **Multi-Theme Support**: Bioluminescent Sage, Titanium Frost, Cyber Violet, and Amber Noir.

---

## 📄 Database Setup (Optional Supabase)

If you wish to use Supabase instead of the built-in local persistent store:
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `supabase-schema.sql` and run the script.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Vercel project environment variables.
