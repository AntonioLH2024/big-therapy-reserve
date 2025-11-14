-- Tabla para almacenar la disponibilidad horaria de los psicólogos
CREATE TABLE public.psicologo_horarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psicologo_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(psicologo_id, fecha, hora)
);

-- Índice para mejorar consultas por psicólogo y fecha
CREATE INDEX idx_psicologo_horarios_psicologo_fecha ON public.psicologo_horarios(psicologo_id, fecha);

-- Enable Row Level Security
ALTER TABLE public.psicologo_horarios ENABLE ROW LEVEL SECURITY;

-- Política para que los psicólogos vean y gestionen su propia disponibilidad
CREATE POLICY "Psicólogos pueden ver su propia disponibilidad"
ON public.psicologo_horarios
FOR SELECT
USING (auth.uid() = psicologo_id);

CREATE POLICY "Psicólogos pueden crear su propia disponibilidad"
ON public.psicologo_horarios
FOR INSERT
WITH CHECK (auth.uid() = psicologo_id);

CREATE POLICY "Psicólogos pueden actualizar su propia disponibilidad"
ON public.psicologo_horarios
FOR UPDATE
USING (auth.uid() = psicologo_id);

CREATE POLICY "Psicólogos pueden eliminar su propia disponibilidad"
ON public.psicologo_horarios
FOR DELETE
USING (auth.uid() = psicologo_id);

-- Política para que pacientes puedan ver la disponibilidad de psicólogos
CREATE POLICY "Pacientes pueden ver disponibilidad de psicólogos"
ON public.psicologo_horarios
FOR SELECT
USING (disponible = true AND fecha >= CURRENT_DATE);

-- Política para que admins puedan gestionar toda la disponibilidad
CREATE POLICY "Admins pueden ver toda la disponibilidad"
ON public.psicologo_horarios
FOR SELECT
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins pueden actualizar toda la disponibilidad"
ON public.psicologo_horarios
FOR UPDATE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins pueden eliminar toda la disponibilidad"
ON public.psicologo_horarios
FOR DELETE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_psicologo_horarios_updated_at
BEFORE UPDATE ON public.psicologo_horarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();