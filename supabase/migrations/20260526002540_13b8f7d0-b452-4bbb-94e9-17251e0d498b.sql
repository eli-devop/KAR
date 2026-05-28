-- 1. Scrub any leaked API key fragments from publicly readable forecast_runs.message
UPDATE public.forecast_runs
SET message = regexp_replace(message, 'key\s*[:=]\s*[A-Za-z0-9_\-]{8,}', 'key:[REDACTED]', 'gi')
WHERE message ~* 'key\s*[:=]\s*[A-Za-z0-9_\-]{8,}';

UPDATE public.forecast_runs
SET message = regexp_replace(message, 'Bearer\s+[A-Za-z0-9._\-]{10,}', 'Bearer [REDACTED]', 'gi')
WHERE message ~* 'Bearer\s+[A-Za-z0-9._\-]{10,}';

-- 2. Move pg_net out of public into a dedicated extensions schema.
-- pg_net rejects ALTER EXTENSION ... SET SCHEMA, so drop & recreate.
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
