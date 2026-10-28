# 🔬 Mini-Rayyan: Clinical Systematic Review & AI Evidence Synthesis Workbench

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-Google_Gen_AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![PRISMA](https://img.shields.io/badge/PRISMA-2020_Compliant-10B981)](#-scientific-standards--compliance)

**Mini-Rayyan** is an open-source, clinical-grade systematic literature review workbench inspired by the industry-standard **Rayyan.ai**. Built for medical researchers, epidemiologists, clinicians, and health data scientists, Mini-Rayyan streamlines the exhaustive systematic review pipeline: from natural language clinical question formulation and automated PICO extraction to multi-source literature aggregation, deterministic deduplication, blinded dual screening, and **AI-powered clinical evidence synthesis** using Google Gemini 2.5 Flash with offline heuristic fallback.

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [End-to-End System Architecture](#-end-to-end-system-architecture)
3. [The 8 Literature Sources (Adapter Pattern)](#-the-8-literature-sources-adapter-pattern)
4. [AI Clinical Evidence Synthesizer](#-ai-clinical-evidence-synthesizer)
5. [3-Tier Deterministic Deduplication Engine](#-3-tier-deterministic-deduplication-engine)
6. [Level 2 Query Versioning Loop ("The Version Thing")](#-level-2-query-versioning-loop-the-version-thing)
7. [Directory Structure](#-directory-structure)
8. [Local Development Setup](#-local-development-setup)
9. [Environment Variables](#-environment-variables)
10. [Deployment Guide (Vercel & Full-Stack)](#-deployment-guide-vercel--full-stack)
11. [Screening Workflow & Keyboard Shortcuts](#-screening-workflow--keyboard-shortcuts)
12. [Scientific Standards & Compliance](#-scientific-standards--compliance)

---

## ✨ Key Features

- **Automated PICO Parsing**: Type any clinical research question in plain English. The clinical NLP parser extracts **P** (Population), **I** (Intervention), **C** (Comparator), and **O** (Outcome) and compiles Boolean search syntax for biomedical databases.
- **8 Literature Sources via Adapter Pattern**: Query **OpenAlex** (250M+ works), **Crossref** (official DOI registry), **Semantic Scholar** (Allen AI), **PubMed** (NLM MEDLINE), **Europe PMC**, **arXiv** preprints, **DOAJ** (open access journals), and **CORE** repositories.
- **Polite Pool Compliance**: Implements respectful rate limiting and automatic `?mailto=...` polite pool routing for high-throughput academic access.
- **3-Tier Deterministic Deduplication**: Zero hard deletions. Clusters identical records across databases using Normalized DOI (Tier 1), PMID (Tier 2), and Fuzzy Title + Year + First Author (Tier 3) while preserving full PRISMA provenance.
- **Blinded Dual Screening**: Screen abstracts with dynamic PICO keyword highlighting. Support for **Include**, **Exclude** (with customizable clinical exclusion reasons such as Wrong Population, Animal Study, Wrong Intervention), and **Maybe**.
- **Gemini 2.5 Flash Evidence Synthesizer**: Click **"Conclude with AI"** to analyze all included papers. Generates an executive clinical verdict, GRADE certainty rating, step-by-step reasoning, biological mechanisms, per-study support/oppose matrix, actionable clinical guidance, and plain-English layperson digests.
- **Deterministic Offline Fallback**: Works 100% offline without an API key. If the user has no internet connection or no Gemini API key configured, the system seamlessly falls back to a deterministic client-side clinical evidence synthesizer.
- **Level 2 Query Versioning Loop**: Search queries are saved as immutable versions ($v_1, v_2, v_3\dots$). Modifying queries preserves past screening decisions, so you never screen the same paper twice. Side-by-side PRISMA diffs between query versions.
- **PRISMA 2020 SVG Flow Chart & Multi-Format Export**: Real-time interactive PRISMA flow chart and one-click export to CSV and JSON for reference managers (EndNote, Zotero, Mendeley).
- **Dual UI Modes**:
  - **Simple Mode**: A streamlined 1-question screener for rapid clinical exploration.
  - **Advanced Mode**: Full multi-protocol workspace with protocol books, query versioning, deduplication inspector, and blinded consensus screening.

---

## 🏛 End-to-End System Architecture

Mini-Rayyan is designed with a **Local-First, Dual-Engine Architecture** that guarantees full operational capability both in production cloud environments and in zero-network offline scenarios.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT BROWSER                                   │
│                                                                                 │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────────┐  │
│  │ Simple PICO Screener  │  │  Advanced Workspace    │  │ Platform Guide /   │  │
│  │ (1-Question Fastflow) │  │  (5-Phase PRISMA Book) │  │ "How It Works"     │  │
│  └───────────┬───────────┘  └───────────┬────────────┘  └─────────┬──────────┘  │
│              │                          │                         │             │
│              ▼                          ▼                         ▼             │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │               Search Service Orchestrator (GoF Adapter Pattern)            │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │  │
│  │  │ OpenAlex API │ │ Crossref API │ │ SemScholar   │ │ PubMed / EurPMC  │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘  │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │  │
│  │  │  arXiv API   │ │   DOAJ API   │ │   CORE API   │ │ Offline Corpus   │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘  │  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
│                                         │ CanonicalRecords                      │
│                                         ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                  3-Tier Deterministic Deduplication Engine                │  │
│  │       Tier 1: Normalized DOI  │  Tier 2: PMID  │  Tier 3: Title+Author    │  │
│  │                        Zero Hard Deletions Audit Log                      │  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
│                                         │ Study Clusters                        │
│                                         ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        Screening & Decision Hub                           │  │
│  │      Include / Exclude (with clinical reasons) / Maybe / Blinded Review   │  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
│                                         │ Included Papers                       │
│                                         ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │              Evidence Synthesizer Dispatcher (Dual-Engine)                │  │
│  │                                                                           │  │
│  │    [Online + API Key]                     [Offline / Local / No API Key]  │  │
│  │            │                                             │                │  │
│  │            ▼                                             ▼                │  │
│  │  POST /api/synthesize-conclusion           Deterministic Local Heuristic  │  │
│  │  (Vercel Serverless / Express)             Evidence Synthesizer           │  │
│  │  Google Gemini 2.5 Flash SDK               Client-side extraction of      │  │
│  │  GRADE rating & clinical reasoning         endpoints, sample sizes & bias │  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
│                                         │                                       │
│                                         ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                     Supabase PostgreSQL Database Engine                   │  │
│  │   • Production & Local: Supabase PostgreSQL with Row Level Security (RLS)  │  │
│  │   • Complete Schema Migration: supabase-schema.sql with 7 relational tables│  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 The 8 Literature Sources (Adapter Pattern)

The search layer is structured around the `SearchAdapter` interface (`src/services/search/types.ts`), providing modular, decoupled access to academic databases:

| Source | Identifier | Scope / Collection | Rate Limits & Polite Pool | Authentication |
| :--- | :--- | :--- | :--- | :--- |
| **OpenAlex** | `openalex` | 250M+ global scholarly works, successor to MAG | Polite pool: 100,000 req/day with `?mailto=` | Free, No key |
| **Crossref** | `crossref` | 150M+ official publisher records, DOIs | Polite pool via `User-Agent` / mailto header | Free, No key |
| **Semantic Scholar** | `semanticscholar` | 200M+ academic papers with citation graphs | 100 requests per 5 minutes unauthenticated | Free Public Tier |
| **PubMed (NCBI)** | `pubmed` | 36M+ biomedical citations, MEDLINE, MeSH | 3 req/sec public, 10 req/sec with key | Free, Key optional |
| **Europe PMC** | `europe_pmc` | 40M+ life sciences articles, preprints & full text | Standard HTTP connection pooling | Free, No key |
| **arXiv** | `arxiv` | 2.4M+ preprints in quantitative biology, AI, stats | Polite pool: 1 req/3 sec | Completely Open |
| **DOAJ** | `doaj` | 10M+ curated peer-reviewed open access papers | Unrestricted REST query endpoint | Free, No key |
| **CORE** | `core` | 200M+ institutional university repository papers | Free registration tier for API key | Free Key |

---

## 🧠 AI Clinical Evidence Synthesizer

Once the researcher has screened articles and finalized their included studies, clicking **"Conclude with AI"** initiates evidence synthesis:

### 1. Dual-Engine Execution Pipeline
- **Serverless API Route (`/api/synthesize-conclusion.ts`)**: When deployed to Vercel or running on Node.js with `GEMINI_API_KEY`, the server calls Google Gemini 2.5 Flash via `@google/genai`.
- **Client-Side Deterministic Fallback (`src/services/evidenceSynthesizer.ts`)**: If the app is offline or the environment lacks an API key, the built-in clinical heuristic engine analyzes study methodologies, sample sizes, and endpoints client-side without failing or throwing network errors.

### 2. Clinical Output Structure
The synthesis outputs a structured clinical evidence report adhering to Cochrane and GRADE criteria:
- **Overall Verdict**: Affirmative, Probable, Inconclusive, or Negative.
- **GRADE Certainty**: High, Moderate, Low, or Very Low with explicit rationale.
- **Executive Answer**: A definitive 2-sentence clinical conclusion answering the user's primary query.
- **Step-by-Step Clinical Reasoning**: Biological mechanisms of action and consistency analysis across trials.
- **Per-Study Evidence Matrix**: Categorizes each paper as **Supports**, **Neutral**, or **Opposes**, detailing specific endpoints (e.g., $p$-values, risk ratios, reduction percentages).
- **Clinical Recommendations**: Actionable, evidence-based guidelines.
- **Plain-English Layperson Summary**: Non-technical summary suitable for patient communication.

---

## 🔍 3-Tier Deterministic Deduplication Engine

Systematic reviews pulling from multiple repositories frequently retrieve duplicate records. Mini-Rayyan eliminates duplicates without data loss:

1. **Tier 1 (100% Confidence) · Normalized DOI**:
   - Strips `https://doi.org/`, `http://dx.doi.org/`, trailing slashes, and lowercases the string.
   - Example: `10.1016/S0140-6736(98)07019-6` $\equiv$ `https://doi.org/10.1016/s0140-6736(98)07019-6`.
2. **Tier 2 (99.9% Confidence) · PMID Match**:
   - Matches official National Library of Medicine PubMed identifiers.
3. **Tier 3 (Fuzzy Heuristic) · Title + Year + First Author**:
   - Strips all punctuation, accents, and whitespace from titles, checking against publication year and the first author's surname.
4. **Zero Hard Deletions**:
   - Identical records are merged into a single representative **Study Cluster**.
   - Duplicates are hidden from the active screening queue, but their full raw metadata and origins remain available in the PRISMA audit log.

---

## 🔁 Level 2 Query Versioning Loop ("The Version Thing")

In standard review software, tweaking a search string destroys previous screening decisions or forces reviewers to re-read papers.

In Mini-Rayyan:
- Every query modification is saved as an immutable version ($v_1, v_2, v_3\dots$) with a timestamp and PICO parameters.
- Screening decisions (Include, Exclude, Maybe, Notes) are attached to **Study Clusters**, not to the search string.
- If $v_2$ returns a paper you previously screened in $v_1$, your existing decision is automatically preserved.
- The **Query Loop & Diff** view allows reviewers to compare $v_1$ vs $v_2$ side-by-side to inspect newly added or removed papers.

---

## 📁 Directory Structure

```
├── api/                                # Vercel Serverless Functions
│   ├── health.ts                       # Health check endpoint
│   └── synthesize-conclusion.ts        # Gemini 2.5 Flash Evidence Synthesizer endpoint
├── src/
│   ├── components/
│   │   ├── auth/                       # Authentication modal & session controls
│   │   ├── common/                     # Header, navigation, and persistent layout
│   │   ├── dashboard/                  # Research Books & Protocol manager
│   │   ├── fetch/                      # Literature fetcher & multi-source selector
│   │   ├── guide/                      # "How It Works" interactive platform manual
│   │   ├── loop/                       # Level 2 Query Versioning & side-by-side diff
│   │   ├── query/                      # PICO builder & Boolean query compiler
│   │   ├── screening/                  # Blinded Screening Hub, AI Conclusion Modal, PRISMA
│   │   ├── simple/                     # SimplePicoFlow (1-question rapid screener)
│   │   └── ui/                         # ThemeSwitcher, modals, buttons, badges
│   ├── lib/
│   │   ├── deduplication.ts            # 3-Tier deterministic deduplication algorithm
│   │   ├── literatureApi.ts            # Biomedical literature search engine & corpus
│   │   ├── picoParser.ts               # Clinical grammar NLP extraction engine
│   │   ├── screeningRules.ts           # Inclusion/Exclusion validation rules
│   │   └── supabase.ts                 # Local-first relational store & Supabase client
│   ├── services/
│   │   ├── evidenceSynthesizer.ts      # Clinical evidence synthesizer (Gemini + Heuristic)
│   │   └── search/                     # GoF Search Service Adapter pattern
│   │       ├── adapters/               # OpenAlex, Crossref, SemScholar, PubMed adapters
│   │       ├── SearchService.ts        # Parallel query dispatcher & polite pool manager
│   │       └── types.ts                # Adapter interfaces & metadata types
│   ├── types/
│   │   ├── database.ts                 # CanonicalRecord, StudyCluster, ScreeningDecision
│   │   └── theme.ts                    # Theme definitions (Bioluminescent Sage, etc.)
│   ├── App.tsx                         # Primary routing & view mode controller
│   ├── index.css                       # Tailwind CSS & theme tokens
│   └── main.tsx                        # React 19 entry point
├── server.ts                           # Full-stack Express server with Vite middleware
├── vercel.json                         # Vercel deployment & serverless routing config
├── vite.config.ts                      # Vite build configuration & pre-bundling rules
└── package.json                        # Dependencies and scripts
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 2. Clone and Install
```bash
git clone https://github.com/YOUR_USERNAME/mini-rayyan.git
cd mini-rayyan
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Offline Guarantee**: Mini-Rayyan starts immediately in **Localhost Mode**. It does not require internet access, API keys, or remote database accounts to formulate PICO queries, screen clinical trials, test deduplication, or run the AI evidence synthesizer!

---

## 🔑 Environment Variables

To configure external cloud providers, create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

| Variable | Required? | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | Google Gemini API key. Enables Gemini 2.5 Flash in `/api/synthesize-conclusion`. If omitted, the app automatically uses the client-side clinical heuristic evidence synthesizer. |
| `VITE_SUPABASE_URL` | Optional | Remote Supabase project URL for multi-device cloud synchronization. |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase anonymous public key. |
| `PORT` | Optional | Port for the full-stack Express server (defaults to `3000`). |

---

## ☁️ Deployment Guide (Vercel & Full-Stack)

### Deploying to Vercel (Recommended)

This repository includes a pre-configured `vercel.json` supporting both the Vite SPA and serverless API endpoints:

1. Push your repository to **GitHub** or **GitLab**.
2. Go to [Vercel](https://vercel.com) and click **"Add New..."** > **"Project"**.
3. Select your repository. Vercel will automatically detect the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` *(optional, for live Gemini 2.5 Flash inference)*
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` *(optional, if using Supabase)*
5. Click **Deploy**. Your app will be live with HTTPS and global edge routing.

### Running as a Full-Stack Node Server
```bash
# 1. Build the frontend
npm run build

# 2. Run the production server
npm start
```

---

## ⌨️ Screening Workflow & Keyboard Shortcuts

Mini-Rayyan is optimized for high-velocity abstract screening:

| Key | Action | Function |
| :---: | :--- | :--- |
| <kbd>I</kbd> | **Include** | Marks the active paper as Included and advances to the next unread abstract. |
| <kbd>E</kbd> | **Exclude** | Opens the clinical exclusion reason picker (e.g., Wrong Population, Animal Study, Wrong Dose). |
| <kbd>M</kbd> | **Maybe** | Flags the study for secondary reviewer full-text consensus. |
| <kbd>&darr;</kbd> | **Next** | Advances to the next abstract without making a screening decision. |
| <kbd>&uarr;</kbd> | **Previous** | Returns to the previous abstract in the queue. |
| <kbd>Esc</kbd> | **Close** | Dismisses active modals or detail views. |

---

## 📜 Scientific Standards & Compliance

- **PRISMA 2020**: Complies with the *Preferred Reporting Items for Systematic Reviews and Meta-Analyses* (Page MJ, et al. BMJ 2021;372:n71). Generates standard SVG flow charts tracking Identification, Screening, Eligibility, and Inclusion.
- **Cochrane Handbook for Systematic Reviews of Interventions**: Follows Cochrane guidelines for PICO question formulation, multi-database searching, and blinded dual screening.
- **GRADE Working Group**: Evidence certainty assessments generated by the AI synthesizer adhere to GRADE definitions: High ($A$), Moderate ($B$), Low ($C$), and Very Low ($D$).

---

## 📄 License & Attribution

Distributed under the **Apache-2.0 License**. See `LICENSE` for details.

*Academic Citation*: If using Mini-Rayyan in systematic reviews, clinical trials, or publications, please cite this tool alongside the PRISMA 2020 statement.
