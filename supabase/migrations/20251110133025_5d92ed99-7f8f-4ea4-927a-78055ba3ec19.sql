-- Create user_roles table with proper security
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checks (avoiding recursion)
CREATE OR REPLACE FUNCTION public.has_role_v2(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role_v2(auth.uid(), 'admin'::app_role));

-- Update profiles table policies to prevent role modification
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;

CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing their own role
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = role
);

-- Update profiles RLS to require authentication
DROP POLICY IF EXISTS "Psicólogos y pacientes pueden ver perfiles de psicólogos" ON public.profiles;

CREATE POLICY "Authenticated users can view psychologist profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND role = 'psicologo'::app_role);

-- Update trigger to also create user_roles entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, nombre, apellidos, telefono, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'paciente')
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'paciente')
  );
  
  RETURN NEW;
END;
$$;