-- 1. Add a nullable timezone to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- 2. Validate timezone names against PostgreSQL's IANA timezone list
CREATE OR REPLACE FUNCTION public.validate_profile_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.timezone IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_timezone_names
       WHERE name = NEW.timezone
     )
  THEN
    RAISE EXCEPTION 'Invalid timezone: %', NEW.timezone;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_timezone_trigger
BEFORE INSERT OR UPDATE OF timezone
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_timezone();

-- 3. Allow users to update their own timezone
-- Existing RLS policies still restrict updates to their own profile
GRANT UPDATE (timezone)
ON public.profiles
TO authenticated;

-- 4. Remove the habit-specific timezone
ALTER TABLE public.habits
DROP COLUMN IF EXISTS timezone;

-- 5. Allow nullable num_periods (NULL means no fixed duration)
ALTER TABLE public.habits
ALTER COLUMN num_periods DROP NOT NULL;

-- 6. Ensure end_date is not stored
ALTER TABLE public.habits
DROP COLUMN IF EXISTS end_date;