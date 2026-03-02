ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS reason_category TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_content_reports_reason_category ON public.content_reports(reason_category);
