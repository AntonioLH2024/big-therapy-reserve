-- Crear tipo enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'psicologo', 'paciente');

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  telefono VARCHAR(20),
  role public.app_role NOT NULL DEFAULT 'paciente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de detalles de psicólogo
CREATE TABLE public.psicologo_detalles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  especialidad TEXT[],
  biografia TEXT,
  foto_url TEXT,
  servicios TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de citas
CREATE TABLE public.citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psicologo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  servicio VARCHAR(100) NOT NULL,
  estado VARCHAR(50) DEFAULT 'programada' CHECK (estado IN ('programada', 'completada', 'cancelada')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(paciente_id, fecha_hora),
  UNIQUE(psicologo_id, fecha_hora)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_citas_psicologo ON public.citas(psicologo_id);
CREATE INDEX idx_citas_paciente ON public.citas(paciente_id);
CREATE INDEX idx_citas_fecha ON public.citas(fecha_hora);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_psicologo_detalles_updated_at
  BEFORE UPDATE ON public.psicologo_detalles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_citas_updated_at
  BEFORE UPDATE ON public.citas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellidos, telefono, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'paciente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automático
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Función de seguridad para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si es el propietario o admin
CREATE OR REPLACE FUNCTION public.is_owner_or_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============= POLÍTICAS RLS =============

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psicologo_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Psicólogos y pacientes pueden ver perfiles de psicólogos"
  ON public.profiles FOR SELECT
  USING (role = 'psicologo');

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins pueden actualizar cualquier perfil"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Solo admins pueden crear perfiles manualmente"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Solo admins pueden eliminar perfiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para PSICOLOGO_DETALLES
CREATE POLICY "Todos pueden ver detalles de psicólogos"
  ON public.psicologo_detalles FOR SELECT
  USING (true);

CREATE POLICY "Psicólogos pueden actualizar sus propios detalles"
  ON public.psicologo_detalles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins pueden actualizar detalles de psicólogos"
  ON public.psicologo_detalles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins y psicólogos pueden crear detalles"
  ON public.psicologo_detalles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'psicologo'));

-- Políticas para CITAS
CREATE POLICY "Pacientes pueden ver sus propias citas"
  ON public.citas FOR SELECT
  USING (auth.uid() = paciente_id);

CREATE POLICY "Psicólogos pueden ver sus citas"
  ON public.citas FOR SELECT
  USING (auth.uid() = psicologo_id);

CREATE POLICY "Admins pueden ver todas las citas"
  ON public.citas FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pacientes pueden crear sus propias citas"
  ON public.citas FOR INSERT
  WITH CHECK (auth.uid() = paciente_id);

CREATE POLICY "Admins pueden crear cualquier cita"
  ON public.citas FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pacientes pueden actualizar sus citas (cancelar)"
  ON public.citas FOR UPDATE
  USING (auth.uid() = paciente_id);

CREATE POLICY "Psicólogos pueden actualizar sus citas"
  ON public.citas FOR UPDATE
  USING (auth.uid() = psicologo_id);

CREATE POLICY "Admins pueden actualizar cualquier cita"
  ON public.citas FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pacientes pueden eliminar sus citas"
  ON public.citas FOR DELETE
  USING (auth.uid() = paciente_id);

CREATE POLICY "Admins pueden eliminar cualquier cita"
  ON public.citas FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
