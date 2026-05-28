
CREATE TABLE IF NOT EXISTS public.news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL UNIQUE,
  source text,
  summary text,
  category text NOT NULL DEFAULT 'ai_labor',
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_items_published_idx ON public.news_items (published_at DESC);
CREATE INDEX IF NOT EXISTS news_items_category_idx ON public.news_items (category);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read news" ON public.news_items FOR SELECT USING (true);
