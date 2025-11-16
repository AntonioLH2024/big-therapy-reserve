-- Allow admins to view all user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role_v2(auth.uid(), 'admin'));

-- Allow psychologists to view patient roles for their patients
CREATE POLICY "Psychologists can view patient roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role_v2(auth.uid(), 'psicologo') 
  AND role = 'paciente'
);