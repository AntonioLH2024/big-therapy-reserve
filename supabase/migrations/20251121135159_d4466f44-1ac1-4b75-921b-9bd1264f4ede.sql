-- Añadir campos de contacto del receptor a la tabla facturas
ALTER TABLE public.facturas 
ADD COLUMN receptor_telefono TEXT,
ADD COLUMN receptor_email TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.facturas.receptor_telefono IS 'Teléfono de contacto del receptor/cliente';
COMMENT ON COLUMN public.facturas.receptor_email IS 'Email de contacto del receptor/cliente';