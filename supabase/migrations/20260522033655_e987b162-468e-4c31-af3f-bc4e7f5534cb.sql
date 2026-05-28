
CREATE TABLE public.occupation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occ_code TEXT NOT NULL,
  series_id TEXT NOT NULL,
  value NUMERIC,
  period TEXT,
  period_name TEXT,
  year INT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snap_occ ON public.occupation_snapshots(occ_code);
CREATE INDEX idx_snap_fetched ON public.occupation_snapshots(fetched_at DESC);

CREATE TABLE public.forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occ_code TEXT NOT NULL,
  horizon TEXT NOT NULL,
  employment NUMERIC,
  employment_delta_pct NUMERIC,
  ai_exposure NUMERIC,
  wage NUMERIC,
  wage_delta_pct NUMERIC,
  outlook TEXT,
  rationale TEXT,
  confidence NUMERIC,
  drivers JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(occ_code, horizon)
);
CREATE INDEX idx_forecast_occ ON public.forecasts(occ_code);
CREATE INDEX idx_forecast_horizon ON public.forecasts(horizon);

CREATE TABLE public.forecast_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running',
  scope TEXT,
  occupations_count INT DEFAULT 0,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE public.market_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horizon TEXT NOT NULL UNIQUE,
  headline TEXT,
  summary TEXT,
  key_signals JSONB DEFAULT '[]'::jsonb,
  unemployment_rate NUMERIC,
  labor_force_participation NUMERIC,
  ai_displacement_index NUMERIC,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.occupation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read snapshots" ON public.occupation_snapshots FOR SELECT USING (true);
CREATE POLICY "public read forecasts" ON public.forecasts FOR SELECT USING (true);
CREATE POLICY "public read runs" ON public.forecast_runs FOR SELECT USING (true);
CREATE POLICY "public read narratives" ON public.market_narratives FOR SELECT USING (true);
