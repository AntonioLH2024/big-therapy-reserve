-- Eliminar constraint anterior
ALTER TABLE public.facturas DROP CONSTRAINT IF EXISTS facturas_estado_check;

-- Crear nueva constraint con todos los estados necesarios
ALTER TABLE public.facturas 
ADD CONSTRAINT facturas_estado_check 
CHECK (estado IN ('borrador', 'pendiente', 'enviada', 'pagada', 'cancelada'));

-- Actualizar valor por defecto
ALTER TABLE public.facturas 
ALTER COLUMN estado SET DEFAULT 'borrador';