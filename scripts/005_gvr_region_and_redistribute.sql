-- Add GVR REGION and move branches 30, 31, 33, 36 from Pacific to GVR.
-- Run this in Supabase SQL Editor if you already have the old 6 regions and 49 branches.

-- 1. Add GVR REGION if it doesn't exist
INSERT INTO public.regions (name)
VALUES ('GVR REGION')
ON CONFLICT (name) DO NOTHING;

-- 2. Move branches 030, 031, 033, 036 from Pacific to GVR
UPDATE public.branches
SET region_id = (SELECT id FROM public.regions WHERE name = 'GVR REGION')
WHERE code IN ('030', '031', '033', '036');
