-- Migration: Create categories table for prediction categories
-- Phase 5A: Categories data source

-- Ensure gen_random_uuid() is available
-- (Supabase typically has this enabled, but this makes the migration more robust.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for enabled categories lookup
CREATE INDEX IF NOT EXISTS idx_categories_enabled_sort 
  ON public.categories (is_enabled, sort_order) 
  WHERE is_enabled = true;

-- Create index for slug lookup
CREATE INDEX IF NOT EXISTS idx_categories_slug 
  ON public.categories (slug);

-- Add category_id column to predictions table (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'predictions'
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.predictions ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for category_id lookups
CREATE INDEX IF NOT EXISTS idx_predictions_category_id 
  ON public.predictions (category_id) 
  WHERE category_id IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers don't support IF NOT EXISTS, so guard with a catalog check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'categories_updated_at'
  ) THEN
    CREATE TRIGGER categories_updated_at
      BEFORE UPDATE ON public.categories
      FOR EACH ROW
      EXECUTE FUNCTION update_categories_updated_at();
  END IF;
END $$;
