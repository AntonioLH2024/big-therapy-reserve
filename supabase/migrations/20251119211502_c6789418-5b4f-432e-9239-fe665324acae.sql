-- Crear tabla de facturas
CREATE TABLE public.facturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psicologo_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cita_id UUID REFERENCES public.citas(id) ON DELETE SET NULL,
  numero_factura TEXT NOT NULL UNIQUE,
  monto DECIMAL(10, 2) NOT NULL,
  concepto TEXT NOT NULL,
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_facturas_psicologo_id ON public.facturas(psicologo_id);
CREATE INDEX idx_facturas_paciente_id ON public.facturas(paciente_id);
CREATE INDEX idx_facturas_estado ON public.facturas(estado);
CREATE INDEX idx_facturas_fecha_emision ON public.facturas(fecha_emision);

-- Habilitar RLS
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

-- Política: Los psicólogos pueden ver sus propias facturas
CREATE POLICY "Psicólogos pueden ver sus facturas"
ON public.facturas
FOR SELECT
USING (
  psicologo_id = auth.uid() AND has_role_v2(auth.uid(), 'psicologo')
);

-- Política: Los psicólogos pueden crear sus propias facturas
CREATE POLICY "Psicólogos pueden crear facturas"
ON public.facturas
FOR INSERT
WITH CHECK (
  psicologo_id = auth.uid() AND has_role_v2(auth.uid(), 'psicologo')
);

-- Política: Los psicólogos pueden actualizar sus propias facturas
CREATE POLICY "Psicólogos pueden actualizar sus facturas"
ON public.facturas
FOR UPDATE
USING (
  psicologo_id = auth.uid() AND has_role_v2(auth.uid(), 'psicologo')
);

-- Política: Los psicólogos pueden eliminar sus propias facturas
CREATE POLICY "Psicólogos pueden eliminar sus facturas"
ON public.facturas
FOR DELETE
USING (
  psicologo_id = auth.uid() AND has_role_v2(auth.uid(), 'psicologo')
);

-- Política: Los pacientes pueden ver sus propias facturas
CREATE POLICY "Pacientes pueden ver sus facturas"
ON public.facturas
FOR SELECT
USING (
  paciente_id = auth.uid() AND has_role_v2(auth.uid(), 'paciente')
);

-- Política: Los administradores pueden ver todas las facturas
CREATE POLICY "Administradores pueden ver todas las facturas"
ON public.facturas
FOR SELECT
USING (has_role_v2(auth.uid(), 'admin'));

-- Política: Los administradores pueden modificar todas las facturas
CREATE POLICY "Administradores pueden modificar todas las facturas"
ON public.facturas
FOR ALL
USING (has_role_v2(auth.uid(), 'admin'));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_facturas_updated_at
BEFORE UPDATE ON public.facturas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar número de factura automático
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.facturas
  WHERE numero_factura LIKE year_prefix || '%';
  
  RETURN year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$;