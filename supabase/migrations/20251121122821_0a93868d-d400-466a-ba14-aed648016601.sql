-- Crear tabla de configuración de facturación para cada psicólogo
CREATE TABLE public.facturacion_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psicologo_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Datos del emisor
  razon_social TEXT NOT NULL,
  nif_cif TEXT NOT NULL,
  direccion TEXT NOT NULL,
  codigo_postal TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  provincia TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  web TEXT,
  -- Configuración visual
  logo_url TEXT,
  color_primario TEXT DEFAULT '#1e40af',
  color_secundario TEXT DEFAULT '#10b981',
  footer_text TEXT DEFAULT 'Gracias por confiar en nuestros servicios',
  -- Configuración fiscal
  iva_por_defecto NUMERIC(5,2) DEFAULT 0.00,
  irpf_por_defecto NUMERIC(5,2) DEFAULT 0.00,
  exento_iva BOOLEAN DEFAULT true,
  texto_exencion_iva TEXT DEFAULT 'Exento de IVA según Art. 20.Uno.3º Ley 37/1992',
  -- Numeración
  serie_factura TEXT DEFAULT 'F',
  proximo_numero INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(psicologo_id)
);

-- Actualizar tabla facturas con todos los campos necesarios
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS serie TEXT DEFAULT 'F',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada', 'pagada', 'cancelada')),
-- Datos del emisor
ADD COLUMN IF NOT EXISTS emisor_razon_social TEXT,
ADD COLUMN IF NOT EXISTS emisor_nif TEXT,
ADD COLUMN IF NOT EXISTS emisor_direccion TEXT,
ADD COLUMN IF NOT EXISTS emisor_codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS emisor_ciudad TEXT,
ADD COLUMN IF NOT EXISTS emisor_provincia TEXT,
-- Datos del receptor
ADD COLUMN IF NOT EXISTS receptor_razon_social TEXT,
ADD COLUMN IF NOT EXISTS receptor_nif TEXT,
ADD COLUMN IF NOT EXISTS receptor_direccion TEXT,
ADD COLUMN IF NOT EXISTS receptor_codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS receptor_ciudad TEXT,
ADD COLUMN IF NOT EXISTS receptor_provincia TEXT,
-- Datos fiscales
ADD COLUMN IF NOT EXISTS base_imponible NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iva_porcentaje NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iva_importe NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS irpf_porcentaje NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS irpf_importe NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS exento_iva BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS texto_exencion TEXT,
ADD COLUMN IF NOT EXISTS fecha_servicio TIMESTAMP WITH TIME ZONE;

-- Eliminar la columna antigua 'monto' si existe (ahora usamos base_imponible/total)
-- ALTER TABLE public.facturas DROP COLUMN IF EXISTS monto;

-- Crear tabla para líneas de factura (detalle de servicios)
CREATE TABLE IF NOT EXISTS public.facturas_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Añadir campos a la tabla profiles para datos fiscales de pacientes
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nif_dni TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS ciudad TEXT,
ADD COLUMN IF NOT EXISTS provincia TEXT;

-- Añadir campos fiscales a psicologo_detalles
ALTER TABLE public.psicologo_detalles
ADD COLUMN IF NOT EXISTS nif_cif TEXT,
ADD COLUMN IF NOT EXISTS razon_social TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS ciudad TEXT,
ADD COLUMN IF NOT EXISTS provincia TEXT;

-- Enable RLS
ALTER TABLE public.facturacion_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_lineas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para facturacion_config
CREATE POLICY "Psicólogos pueden ver su configuración"
ON public.facturacion_config FOR SELECT
USING (psicologo_id = auth.uid() AND has_role_v2(auth.uid(), 'psicologo'));

CREATE POLICY "Psicólogos pueden crear su configuración"
ON public.facturacion_config FOR INSERT
WITH CHECK (psicologo_id = auth.uid() AND has_role_v2(auth.uid(), 'psicologo'));

CREATE POLICY "Psicólogos pueden actualizar su configuración"
ON public.facturacion_config FOR UPDATE
USING (psicologo_id = auth.uid() AND has_role_v2(auth.uid(), 'psicologo'));

CREATE POLICY "Admins pueden ver todas las configuraciones"
ON public.facturacion_config FOR SELECT
USING (has_role_v2(auth.uid(), 'admin'));

CREATE POLICY "Admins pueden actualizar configuraciones"
ON public.facturacion_config FOR UPDATE
USING (has_role_v2(auth.uid(), 'admin'));

-- RLS Policies para facturas_lineas
CREATE POLICY "Psicólogos pueden ver líneas de sus facturas"
ON public.facturas_lineas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.facturas
    WHERE facturas.id = facturas_lineas.factura_id
    AND facturas.psicologo_id = auth.uid()
  )
);

CREATE POLICY "Psicólogos pueden crear líneas de sus facturas"
ON public.facturas_lineas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.facturas
    WHERE facturas.id = facturas_lineas.factura_id
    AND facturas.psicologo_id = auth.uid()
  )
);

CREATE POLICY "Psicólogos pueden actualizar líneas de sus facturas"
ON public.facturas_lineas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.facturas
    WHERE facturas.id = facturas_lineas.factura_id
    AND facturas.psicologo_id = auth.uid()
  )
);

CREATE POLICY "Psicólogos pueden eliminar líneas de sus facturas"
ON public.facturas_lineas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.facturas
    WHERE facturas.id = facturas_lineas.factura_id
    AND facturas.psicologo_id = auth.uid()
  )
);

CREATE POLICY "Pacientes pueden ver líneas de sus facturas"
ON public.facturas_lineas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.facturas
    WHERE facturas.id = facturas_lineas.factura_id
    AND facturas.paciente_id = auth.uid()
  )
);

CREATE POLICY "Admins pueden gestionar todas las líneas"
ON public.facturas_lineas FOR ALL
USING (has_role_v2(auth.uid(), 'admin'));

-- Función para generar número de factura con serie
CREATE OR REPLACE FUNCTION public.generate_invoice_number_with_serie(p_psicologo_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serie TEXT;
  v_numero INTEGER;
  v_year TEXT;
BEGIN
  -- Obtener serie y próximo número
  SELECT serie_factura, proximo_numero
  INTO v_serie, v_numero
  FROM public.facturacion_config
  WHERE psicologo_id = p_psicologo_id;
  
  -- Si no existe configuración, usar valores por defecto
  IF v_serie IS NULL THEN
    v_serie := 'F';
    v_numero := 1;
  END IF;
  
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Actualizar próximo número
  UPDATE public.facturacion_config
  SET proximo_numero = proximo_numero + 1
  WHERE psicologo_id = p_psicologo_id;
  
  RETURN v_serie || '-' || v_year || '-' || LPAD(v_numero::TEXT, 5, '0');
END;
$$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_facturacion_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_facturacion_config_timestamp
BEFORE UPDATE ON public.facturacion_config
FOR EACH ROW
EXECUTE FUNCTION public.update_facturacion_config_updated_at();