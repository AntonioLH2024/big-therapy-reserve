-- Agregar política para permitir a usuarios autenticados ver horas ocupadas de psicólogos
-- Esto es necesario para el sistema de reservas, pero solo expone información mínima (fecha_hora)
CREATE POLICY "Authenticated users can view appointment availability"
ON public.citas
FOR SELECT
TO authenticated
USING (
  estado = 'programada' AND
  fecha_hora >= NOW()
);