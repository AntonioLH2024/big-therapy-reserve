-- Fix therapy notes exposure: Remove hard delete, keep soft delete only
-- Patients should only be able to cancel (update estado to 'cancelada'), not permanently delete appointments with medical records

DROP POLICY IF EXISTS "Pacientes pueden eliminar sus citas" ON public.citas;

-- Patients can only cancel their appointments (soft delete via status update)
-- This preserves medical records while allowing patients to cancel
CREATE POLICY "Pacientes solo pueden cancelar sus citas (soft delete)"
ON public.citas
FOR UPDATE
USING (
  auth.uid() = paciente_id 
  AND estado != 'cancelada'
)
WITH CHECK (
  auth.uid() = paciente_id 
  AND estado IN ('programada', 'cancelada')
);