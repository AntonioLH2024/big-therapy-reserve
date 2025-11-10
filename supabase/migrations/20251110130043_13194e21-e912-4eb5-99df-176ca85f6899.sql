-- Permitir a los psicólogos ver perfiles de pacientes para crear citas
CREATE POLICY "Psicólogos pueden ver perfiles de pacientes"
ON public.profiles
FOR SELECT
USING (
  role = 'paciente' AND 
  has_role(auth.uid(), 'psicologo')
);