-- Permitir a usuarios autenticados ver qué usuarios tienen el rol de psicólogo
-- Esto es necesario para que los pacientes puedan buscar y agendar citas con psicólogos
CREATE POLICY "Authenticated users can view psychologist roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'psicologo'::app_role);