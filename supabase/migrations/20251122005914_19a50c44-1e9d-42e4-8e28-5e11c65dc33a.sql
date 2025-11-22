-- Eliminar la restricción única que impide reservar en horarios previamente cancelados
ALTER TABLE public.citas DROP CONSTRAINT IF EXISTS citas_paciente_id_fecha_hora_key;

-- Crear un índice único parcial que solo aplique a citas programadas
-- Esto permite cancelar y volver a reservar, pero previene doble reserva de citas activas
CREATE UNIQUE INDEX citas_paciente_psicologo_fecha_hora_programada_idx 
ON public.citas (paciente_id, psicologo_id, fecha_hora) 
WHERE estado = 'programada';

-- Comentario explicativo
COMMENT ON INDEX citas_paciente_psicologo_fecha_hora_programada_idx IS 
'Previene que un paciente tenga múltiples citas programadas con el mismo psicólogo a la misma hora, pero permite reutilizar horarios de citas canceladas';