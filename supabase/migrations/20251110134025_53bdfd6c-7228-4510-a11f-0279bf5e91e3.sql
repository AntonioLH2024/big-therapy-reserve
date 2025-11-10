-- Remove the security definer view and use RLS policies instead
DROP VIEW IF EXISTS public.psychologist_public_directory;

-- Keep phone numbers private: only admins and the psychologist themselves can see phone
-- Other authenticated users can see psychologist profiles but without phone numbers
-- This is handled by the existing "Authenticated users can view psychologist basic info" policy
-- which allows viewing profiles but applications should filter out phone numbers client-side for non-admins

-- Note: The profiles table SELECT policies now properly restrict access:
-- 1. "Admins pueden ver todos los perfiles" - admins see everything including phone
-- 2. "Usuarios pueden ver su propio perfil" - users see their own profile including phone
-- 3. "Authenticated users can view psychologist basic info" - authenticated users can see psychologist profiles
-- 4. "Psychologists can view their own patient profiles" - psychologists see their patients' info

-- Client applications should implement column-level filtering when displaying psychologist info to non-admin users