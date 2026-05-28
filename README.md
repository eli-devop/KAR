<img width="1254" height="1254" alt="kar" src="https://github.com/user-attachments/assets/98deed1d-4766-41eb-8741-5afe0b609ded" />

<div align="center">

# KAR — U.S. Labor Market AI Agent

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Live Website](https://img.shields.io/badge/demo-live-brightgreen)](https://laboreconomics.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TanStack](https://img.shields.io/badge/TanStack_Start-v1-FF4154)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-1.x-F9F1E1?logo=bun)](https://bun.sh/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

**Live BLS macro readings · AI-exposure forecasts across 342 U.S. occupations · Real-time AI/job-loss news**

[🌐 Live Website](https://laboreconomics.dev) · [📖 Docs](#quick-start) · [🐛 Report Bug](https://github.com/eli-devop/KAR/issues) · [✨ Request Feature](https://github.com/eli-devop/KAR/issues)

</div>

---

## ✨ What is KAR?

**KAR** (Karpathy AI Researcher) is an open-source, full-stack intelligence platform that maps the U.S. labor market through the lens of AI disruption. Inspired by [karpathy.ai/jobs](https://karpathy.ai/jobs/) by [Andrej Karpathy](https://karpathy.ai/), KAR connects live Bureau of Labor Statistics data with LLM-powered analysis to score every major U.S. occupation across six AI-exposure dimensions — giving workers, researchers, and policy-makers a real-time window into the future of work.

> 🔭 **Covering ~143M U.S. jobs across 342 occupations** — scored, mapped, and forecasted with AI.

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 📊 **Live BLS Macro Dashboard** | Real-time unemployment, labor-force participation, nonfarm payrolls & earnings, refreshed every 2 hours via the BLS public API |
| 🤖 **AI Exposure Scoring** | 342 occupations scored across 6 dimensions: cognitive load, digital dexterity, physical-world barrier, creative originality, social-emotional bandwidth, economic substitutability |
| 🔭 **Horizon Forecasting** | Employment, wage, and AI-exposure trajectories across 8 time horizons (30d to 5y) |
| 🗺️ **Labor Market Map** | Interactive grid visualization of occupations plotted by AI exposure vs. growth rate |
| 💬 **Ask KAR** | Conversational AI agent for querying any labor market data, forecasts, or occupation details |
| 📁 **Workforce Upload** | Upload and analyze custom workforce files for organizational planning and risk assessment |
| 🧠 **Software 3.0 Analysis** | Karpathy's Software 3.0 framework applied to labor market predictions |
| 🔔 **Anomaly Alerts** | Automatic detection of unusual labor market signals with LLM-generated narratives |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [TanStack Start v1](https://tanstack.com/start) — full-stack React 19 with SSR/SSG |
| **Build Tool** | [Vite 7](https://vitejs.dev/) |
| **UI** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Backend** | [Supabase](https://supabase.com/) — database, auth, storage, realtime |
| **Server Functions** | TanStack `createServerFn` (edge runtime) |
| **Data Fetching** | [TanStack Query v5](https://tanstack.com/query) |
| **Type Safety** | TypeScript 5.8 + Zod |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## ⚡ Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.0+ (preferred) or Node.js 20+
- A [Supabase](https://supabase.com) project (for backend features)

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/eli-devop/KAR.git
cd KAR

# 2. Install dependencies
bun install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start the dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the live dashboard.

### Build for Production

```bash
bun run build
bun run start
```

---

## 📁 Project Structure

```
KAR/
├── src/
│   ├── routes/                  # File-based routing (TanStack Router)
│   │   ├── index.tsx            # Dashboard — live BLS macro tiles, KPIs, news
│   │   ├── map.tsx              # Labor Market Map (occupation grid)
│   │   ├── chat.tsx             # Ask KAR (conversational AI agent)
│   │   ├── capabilities.tsx     # AI capability dimensions explorer
│   │   ├── scoring.tsx          # Scoring Studio
│   │   ├── workforce.tsx        # Workforce file upload & analysis
│   │   ├── reports.tsx          # Reports
│   │   └── __root.tsx           # Root layout (sidebar, nav, providers)
│   ├── components/
│   │   ├── kar/                 # KAR-specific components
│   │   └── ui/                  # shadcn/ui base components
│   ├── lib/                     # Business logic & server functions
│   │   ├── forecast.functions.ts
│   │   ├── news.functions.ts
│   │   └── alerts.functions.ts
│   ├── hooks/                   # Custom React hooks
│   ├── contexts/                # React contexts (HorizonContext)
│   ├── data/                    # Static data (occupations, BLS series IDs)
│   └── styles.css               # Tailwind v4 entry + design tokens
├── supabase/                    # Database migrations
├── public/                      # Static assets
└── html/                        # Static HTML reference pages
```

---

## 🔧 Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📈 How It Works

### Live Data Pipeline

Every 2 hours, KAR automatically:

1. **Fetches** the latest BLS macro series (unemployment, payrolls, participation, earnings)
2. **Scrapes** AI and job-loss news from trusted sources
3. **Detects** labor market anomalies and generates alerts
4. **Updates** forecast narratives using LLM analysis

You can also trigger a manual refresh from the dashboard or via the public API endpoint.

### AI Exposure Scoring Model

Each occupation is scored on a **0–100 scale** across six dimensions:

| Dimension | What It Measures |
|-----------|-----------------|
| 🧠 Cognitive Load | Abstract reasoning, problem-solving complexity |
| 💻 Digital Dexterity | Existing software/tech usage in the role |
| 🏗️ Physical-World Barrier | Degree of physical manipulation required |
| 🎨 Creative Originality | Novel ideation vs. pattern-based execution |
| 🤝 Social-Emotional Bandwidth | Empathy, leadership, human connection required |
| 💰 Economic Substitutability | Cost-benefit of automating vs. hiring |

### Horizon Forecasting

KAR projects across **8 time horizons** to support different planning cycles:

| Horizon | Use Case |
|---------|----------|
| **Now** | Current BLS readings + live news |
| **30d** | Near-term policy shifts, earnings season |
| **60d** | Quarterly rebalancing signals |
| **90d** | Budget-cycle impacts |
| **1y** | Annual planning, election-year policy |
| **2y** | Mid-cycle technology adoption |
| **3y** | Workforce restructuring, Fed targets |
| **4y** | Presidential term horizon |
| **5y** | Long-range strategic planning |

### Software 3.0 Framework

KAR is built on Andrej Karpathy's Software 3.0 vision — where natural-language prompts are the program. The platform shows how Software 1.0 (deterministic code), Software 2.0 (trained ML models), and Software 3.0 (LLM-powered reasoning) combine to produce actionable labor market intelligence.

---

## 🗺️ Roadmap

- [ ] OAuth login — save personal watchlists and custom forecasts
- [ ] Occupation comparison — side-by-side AI-exposure analysis
- [ ] CSV/PDF export — download full scoring reports
- [ ] API v1 — public REST endpoints for researchers
- [ ] Employer mode — bulk workforce analysis for HR teams
- [ ] Webhook alerts — push notifications on BLS data releases
- [ ] i18n support — multilingual labor market data

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! See [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for guidelines.

```bash
# Fork the repo, create a feature branch, then:
bun install
bun dev

# Before opening a PR:
bun run lint && bun run format
bunx tsc --noEmit
```

Please read our [Code of Conduct](./.github/CODE_OF_CONDUCT.md) before contributing.

---

## 🔒 Security

Found a vulnerability? Please **do not** open a public issue. Email the maintainer directly at dmesa@e-l-i.net. We take security seriously and will respond within 48 hours.

---

## 📄 License

[MIT](./LICENSE) © [eli-devop](https://github.com/eli-devop)

---

## 🙏 Acknowledgments

- [**Andrej Karpathy**](https://karpathy.ai/) — for [karpathy.ai/jobs](https://karpathy.ai/jobs/), the original inspiration and Software 3.0 framework
- [**U.S. Bureau of Labor Statistics**](https://www.bls.gov/ooh/) — for the Occupational Outlook Handbook data
- [**Supabase**](https://supabase.com) — for the open-source backend platform
- [**TanStack**](https://tanstack.com) — for the incredible full-stack React toolkit

---

<div align="center">

**If KAR helps you understand the future of work, please consider giving it a ⭐ — it helps more people find the project!**

[⭐ Star on GitHub](https://github.com/eli-devop/KAR) · [🌐 Live Demo](https://laboreconomics.dev) · [🐦 Follow Updates](https://github.com/eli-devop)

</div>
