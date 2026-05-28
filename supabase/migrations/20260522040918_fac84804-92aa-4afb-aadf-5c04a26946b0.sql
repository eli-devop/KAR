
CREATE TABLE public.labor_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  email_sent_at timestamptz
);

CREATE INDEX idx_labor_alerts_created ON public.labor_alerts (created_at DESC);
CREATE INDEX idx_labor_alerts_severity ON public.labor_alerts (severity);

ALTER TABLE public.labor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read alerts" ON public.labor_alerts FOR SELECT USING (true);

CREATE TABLE public.dashboard_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at timestamptz NOT NULL DEFAULT now(),
  headline text NOT NULL,
  summary text NOT NULL,
  key_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  alert_count int NOT NULL DEFAULT 0
);

CREATE INDEX idx_dashboard_changes_detected ON public.dashboard_changes (detected_at DESC);

ALTER TABLE public.dashboard_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read changes" ON public.dashboard_changes FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.labor_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_changes;
