-- Permitir a los psicólogos crear citas para ellos mismos
CREATE POLICY "Psicólogos pueden crear sus propias citas"
ON public.citas
FOR INSERT
WITH CHECK (
  auth.uid() = psicologo_id AND
  has_role(auth.uid(), 'psicologo')
);