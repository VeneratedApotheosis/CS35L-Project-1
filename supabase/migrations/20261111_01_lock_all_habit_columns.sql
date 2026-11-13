-- Lock every column of habits: a habit cannot be edited after it is created.
--
-- Accountability comes before flexibility. A habit is a commitment, so users
-- can create and delete one but never change it. This replaces the grant from
-- 20261104_03_lock_habit_goals.sql, which still allowed name, description and
-- plant_type to be updated.
--
-- Safe to run more than once. Run it in the Supabase SQL Editor.

REVOKE UPDATE ON TABLE public.habits
FROM anon, authenticated;

-- Column-level grants are an allow-list, so nothing is granted back.
-- INSERT, SELECT and DELETE are unchanged, and the RLS policies still decide
-- which rows each user can reach.
