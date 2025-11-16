-- Paso 1: Eliminar todas las políticas que dependen de profiles.role
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
DROP POLICY IF EXISTS "Psychologists can view their own patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view psychologist profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Users can view their own login attempts" ON public.login_attempts;

-- Paso 2: Ahora sí, eliminar el campo role de profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Paso 3: Recrear políticas de profiles usando user_roles
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Psychologists can view their patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role_v2(auth.uid(), 'psicologo') 
  AND public.has_role_v2(id, 'paciente')
  AND EXISTS (
    SELECT 1 FROM public.citas
    WHERE citas.paciente_id = profiles.id 
    AND citas.psicologo_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can view psychologist profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.has_role_v2(id, 'psicologo')
);

-- Paso 4: Arreglar políticas de login_attempts
CREATE POLICY "Admins can manage all login attempts"
ON public.login_attempts
FOR ALL
TO authenticated
USING (public.has_role_v2(auth.uid(), 'admin'));

CREATE POLICY "Users can view own login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = email);

-- Paso 5: Actualizar trigger handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert into profiles (sin role)
  INSERT INTO public.profiles (id, nombre, apellidos, telefono)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', '')
  );
  
  -- Insert into user_roles (única fuente de verdad)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'paciente')
  );
  
  RETURN NEW;
END;
$$;