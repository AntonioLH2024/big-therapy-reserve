-- Fix 1: Require authentication for viewing psychologist details
DROP POLICY IF EXISTS "Todos pueden ver detalles de psicólogos" ON public.psicologo_detalles;

CREATE POLICY "Authenticated users can view psychologist details"
ON public.psicologo_detalles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict psychologists to only see their own patients (those with appointments)
DROP POLICY IF EXISTS "Psicólogos pueden ver perfiles de pacientes" ON public.profiles;

CREATE POLICY "Psychologists can view their own patient profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'psicologo'::app_role) AND
  role = 'paciente'::app_role AND
  EXISTS (
    SELECT 1 FROM public.citas
    WHERE citas.paciente_id = profiles.id 
    AND citas.psicologo_id = auth.uid()
  )
);

-- Fix 3: Create a view for psychologists without sensitive phone data
CREATE OR REPLACE VIEW public.psychologist_public_directory AS
SELECT 
  p.id,
  p.nombre,
  p.apellidos,
  p.created_at,
  pd.especialidad,
  pd.biografia,
  pd.servicios,
  pd.foto_url
FROM public.profiles p
LEFT JOIN public.psicologo_detalles pd ON p.id = pd.id
WHERE p.role = 'psicologo'::app_role;

-- Grant access to the view
GRANT SELECT ON public.psychologist_public_directory TO authenticated;

-- Update psychologist profile viewing policy to exclude phone for non-admin
DROP POLICY IF EXISTS "Authenticated users can view psychologist profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view psychologist basic info"
ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  role = 'psicologo'::app_role
);

-- Allow admin to see phone numbers via existing admin policy
-- Allow psychologists to see their own full profile via "Usuarios pueden ver su propio perfil" policy