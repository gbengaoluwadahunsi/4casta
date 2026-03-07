-- Update handle_new_user trigger to persist region_id and branch_id from sign-up metadata.
-- This ensures branch users who sign up with email confirmation get their branch assigned
-- when the profile is created (trigger runs on auth.users INSERT), not just when they
-- confirm and the client-side update runs.
-- Run this in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region_id UUID;
  v_branch_id UUID;
BEGIN
  v_region_id := NULL;
  v_branch_id := NULL;
  IF NEW.raw_user_meta_data ->> 'region_id' IS NOT NULL AND (NEW.raw_user_meta_data ->> 'region_id') != '' THEN
    v_region_id := (NEW.raw_user_meta_data ->> 'region_id')::uuid;
  END IF;
  IF NEW.raw_user_meta_data ->> 'branch_id' IS NOT NULL AND (NEW.raw_user_meta_data ->> 'branch_id') != '' THEN
    v_branch_id := (NEW.raw_user_meta_data ->> 'branch_id')::uuid;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, region_id, branch_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'branch_user'),
    v_region_id,
    v_branch_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
