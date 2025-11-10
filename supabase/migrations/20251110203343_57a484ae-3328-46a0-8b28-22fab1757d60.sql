-- ============================================
-- SECURITY FIX: Update RLS policies to prevent privilege escalation
-- ============================================

-- 1. Update all policies to use has_role_v2 instead of has_role
-- This prevents recursive policy checks on the profiles table

-- DROP old policies that use has_role on profiles table
DROP POLICY IF EXISTS "Admins pueden actualizar cualquier perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Solo admins pueden crear perfiles manualmente" ON public.profiles;
DROP POLICY IF EXISTS "Solo admins pueden eliminar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Psicólogos y pacientes pueden ver perfiles de psicólogos" ON public.profiles;

-- CREATE new policies using has_role_v2
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create profiles"
ON public.profiles FOR INSERT
WITH CHECK (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

-- 2. Update policy to require authentication for viewing psychologist profiles
DROP POLICY IF EXISTS "Authenticated users can view psychologist basic info" ON public.profiles;
CREATE POLICY "Authenticated users can view psychologist profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND role = 'psicologo'::app_role);

-- Keep existing user policies
-- "Users can update their own profile (except role)" - already exists
-- "Usuarios pueden ver su propio perfil" - already exists
-- "Psychologists can view their own patient profiles" - already exists

-- 3. Update citas policies to use has_role_v2
DROP POLICY IF EXISTS "Admins pueden actualizar cualquier cita" ON public.citas;
DROP POLICY IF EXISTS "Admins pueden crear cualquier cita" ON public.citas;
DROP POLICY IF EXISTS "Admins pueden eliminar cualquier cita" ON public.citas;
DROP POLICY IF EXISTS "Admins pueden ver todas las citas" ON public.citas;
DROP POLICY IF EXISTS "Psicólogos pueden crear sus propias citas" ON public.citas;

CREATE POLICY "Admins can view all appointments"
ON public.citas FOR SELECT
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any appointment"
ON public.citas FOR UPDATE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create any appointment"
ON public.citas FOR INSERT
WITH CHECK (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any appointment"
ON public.citas FOR DELETE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Psychologists can create their appointments"
ON public.citas FOR INSERT
WITH CHECK (auth.uid() = psicologo_id AND has_role_v2(auth.uid(), 'psicologo'::app_role));

-- Keep existing policies for patients and psychologists on citas
-- "Pacientes pueden ver sus propias citas" - already exists
-- "Pacientes pueden actualizar sus citas (cancelar)" - already exists
-- "Pacientes pueden crear sus propias citas" - already exists
-- "Pacientes pueden eliminar sus citas" - already exists
-- "Psicólogos pueden ver sus citas" - already exists
-- "Psicólogos pueden actualizar sus citas" - already exists

-- 4. Update psicologo_detalles policies to use has_role_v2
DROP POLICY IF EXISTS "Admins pueden actualizar detalles de psicólogos" ON public.psicologo_detalles;
DROP POLICY IF EXISTS "Admins y psicólogos pueden crear detalles" ON public.psicologo_detalles;

CREATE POLICY "Admins can update psychologist details"
ON public.psicologo_detalles FOR UPDATE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and psychologists can create details"
ON public.psicologo_detalles FOR INSERT
WITH CHECK (has_role_v2(auth.uid(), 'admin'::app_role) OR has_role_v2(auth.uid(), 'psicologo'::app_role));

-- Keep existing policy
-- "Psicólogos pueden actualizar sus propios detalles" - already exists
-- "Authenticated users can view psychologist details" - already exists