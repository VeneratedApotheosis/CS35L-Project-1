
-- Issue 104: Lock habit goal columns after creation
-- RLS controls which rows users can modify
-- Column-level grants control which fields users can modify

-- 1. Remove permission to update any habit column
REVOKE UPDATE ON TABLE public.habits
FROM anon, authenticated;

-- 2. Allow editing only non-goal habit fields
GRANT UPDATE (name, description, plant_type)
ON TABLE public.habits
TO authenticated;

-- 3. Prevent users from modifying existing activity logs
REVOKE UPDATE ON TABLE public.activity_logs
FROM anon, authenticated;

-- INSERT and DELETE permissions are not revoked
-- Existing RLS policies still determine which rows each authenticated user can access