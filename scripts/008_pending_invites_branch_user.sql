-- Allow branch_user in pending_invites so HQ can invite Branch Users with region and branch.
-- Run this in Supabase SQL Editor after 004_pending_invites.sql.
-- Then run 009_handle_new_user_merged.sql so invited Branch Users get their role/region/branch.

ALTER TABLE public.pending_invites DROP CONSTRAINT IF EXISTS pending_invites_role_check;
ALTER TABLE public.pending_invites ADD CONSTRAINT pending_invites_role_check
  CHECK (role IN ('hq_admin', 'region_admin', 'branch_user'));
