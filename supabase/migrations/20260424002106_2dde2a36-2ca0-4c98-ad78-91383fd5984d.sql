
CREATE OR REPLACE FUNCTION public.org_sync_in_progress()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_setting('app.org_sync_in_progress', true), 'off') = 'on';
$$;
