-- Agregar foreign key para facturas.paciente_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'facturas_paciente_id_fkey'
  ) THEN
    ALTER TABLE public.facturas
    ADD CONSTRAINT facturas_paciente_id_fkey 
    FOREIGN KEY (paciente_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Agregar foreign key para facturas.psicologo_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'facturas_psicologo_id_fkey'
  ) THEN
    ALTER TABLE public.facturas
    ADD CONSTRAINT facturas_psicologo_id_fkey 
    FOREIGN KEY (psicologo_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;