<img width="1254" height="1254" alt="kar" src="https://github.com/user-attachments/assets/98deed1d-4766-41eb-8741-5afe0b609ded" />
# KAR — U.S. Labor Market Agent

> **Live BLS macro readings, AI-exposure forecasts across 342 U.S. occupations, and real-time AI / job-loss news.**

Inspired by [karpathy.ai/jobs](https://karpathy.ai/jobs/) by [Andrej Karpathy](https://karpathy.ai/). KAR is an enterprise AI agent researcher that maps the Bureau of Labor Statistics Occupational Outlook Handbook — covering ~143M U.S. jobs — and uses LLM-powered analysis to score and color each occupation by AI exposure, growth trajectory, and financial autonomy potential.

**Live WEBSITE at:** [laboreconomics.dev](https://laboreconomics.dev)

---

## What is KAR?

KAR (Karpathy AI Researcher) is a full-stack intelligence platform for exploring the U.S. labor market through the lens of AI disruption:

- **Live BLS Macro Dashboard** — Real-time unemployment, labor-force participation, nonfarm payrolls, and earnings from the Bureau of Labor Statistics API, refreshed every 2 hours.
- **AI Exposure Scoring** — 342 occupations scored across 6 dimensions (cognitive load, digital dexterity, physical-world barrier, creative originality, social-emotional bandwidth, economic substitutability).
- **Horizon Forecasting** — Project employment, wage, and AI-exposure trajectories across 30-day, 60-day, 90-day, 1-year, 2-year, 3-year, 4-year, and 5-year horizons.
- **Labor Market Map** — Interactive grid visualization of occupations by AI exposure vs. growth rate.
- **Ask KAR** — Conversational AI agent for querying labor market data and forecasts.
- **Workforce Upload** — Upload and analyze custom workforce files for organizational planning.
- **Software 3.0 Analysis** — Andrej Karpathy's Software 3.0 framework applied to labor market predictions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [TanStack Start v1](https://tanstack.com/start) — full-stack React 19 with SSR/SSG |
| Build Tool | [Vite 7](https://vitejs.dev/) |
| UI | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/) primitives |
| Charts | [Recharts](https://recharts.org/) |
| Backend | [Lovable Cloud](https://lovable.dev) — database, auth, storage, realtime |
| Server Functions | TanStack `createServerFn` (edge runtime) |
| Data Fetching | [TanStack Query v5](https://tanstack.com/query) |
| Type Safety | TypeScript 5.8 + Zod |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (preferred) or Node.js 20+
- A [Lovable Cloud](https://lovable.dev) project (for backend features)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/eli-devop/KAR.git
cd KAR

# Install dependencies
bun install

# Start the dev server
bun dev
```

The dev server will start at `http://localhost:3000`.

### Build for Production

```bash
bun run build
```

---

## Project Structure

```text
src/
  routes/              # File-based routing (TanStack Router)
    index.tsx           # Dashboard (live BLS macro tiles, KPIs, news)
    map.tsx             # Labor Market Map (occupation grid)
    chat.tsx            # Ask KAR (conversational agent)
    capabilities.tsx    # AI capability dimensions
    scoring.tsx         # Scoring Studio
    workforce.tsx       # Workforce file upload & analysis
    reports.tsx         # Reports
    __root.tsx          # Root layout (sidebar, nav, providers)
  components/
    kar/                # KAR-specific components (StatCard, HorizonSelector, etc.)
    ui/                 # shadcn/ui components
  lib/                  # Business logic & server functions
    forecast.functions.ts
    news.functions.ts
    alerts.functions.ts
  hooks/                # Custom React hooks
  contexts/             # React contexts (HorizonContext)
  data/                 # Static data (occupations, BLS series IDs)
  styles.css            # Tailwind v4 entry + design tokens
supabase/               # Database migrations
public/                 # Static assets
```

---

## Environment Variables

The following variables are pre-configured via Lovable Cloud:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Lovable Cloud project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (never expose to client) |

> **Note:** The `.env` file is auto-generated and should not be edited manually.

---

## Key Features

### Live Data Pipeline

Every 2 hours, KAR automatically:

1. Fetches the latest BLS macro series (unemployment, payrolls, participation, earnings)
2. Scrapes AI and job-loss news from trusted sources
3. Detects labor market anomalies and generates alerts
4. Updates forecast narratives using LLM analysis

Trigger a manual refresh from the dashboard or via API.

### Horizon Forecasting

KAR projects across 8 time horizons:

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

KAR incorporates Andrej Karpathy's [Software 3.0](https://karpathy.ai/software3.0) vision — using natural language prompts to "program" LLMs for labor market analysis. The platform demonstrates how Software 1.0 (traditional code), Software 2.0 (ML models), and Software 3.0 (prompt-driven reasoning) combine to produce actionable labor market intelligence.

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](./.github/CONTRIBUTING.md) and [Code of Conduct](./.github/CODE_OF_CONDUCT.md).

### Before Submitting

1. **Lint & format:** `bun run lint && bun run format`
2. **Type-check:** `bunx tsc --noEmit`
3. **Test your changes** locally with `bun dev`

### Security

If you discover a security vulnerability, please email the maintainers directly rather than opening a public issue.

---

## License

[MIT](./LICENSE) © [eli-devop](https://github.com/eli-devop)

---

## Acknowledgments

- [Andrej Karpathy](https://karpathy.ai/) — for [karpathy.ai/jobs](https://karpathy.ai/jobs/), the original inspiration
- [U.S. Bureau of Labor Statistics](https://www.bls.gov/ooh/) — for the Occupational Outlook Handbook data
- [Lovable](https://lovable.dev) — for the full-stack development platform
