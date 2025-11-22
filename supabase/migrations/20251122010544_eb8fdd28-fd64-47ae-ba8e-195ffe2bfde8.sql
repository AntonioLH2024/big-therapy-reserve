-- Eliminar la restricción única de psicólogo-fecha que impide reutilizar horarios cancelados
ALTER TABLE public.citas DROP CONSTRAINT IF EXISTS citas_psicologo_id_fecha_hora_key;

-- Crear índice único parcial para psicólogo-fecha solo en citas programadas
-- Esto permite que un psicólogo tenga múltiples registros históricos (cancelados) en el mismo horario
-- pero previene doble-reserva de citas activas
CREATE UNIQUE INDEX citas_psicologo_fecha_hora_programada_idx 
ON public.citas (psicologo_id, fecha_hora) 
WHERE estado = 'programada';

COMMENT ON INDEX citas_psicologo_fecha_hora_programada_idx IS 
'Previene que un psicólogo tenga múltiples citas programadas al mismo tiempo, pero permite registros históricos de citas canceladas en el mismo horario';