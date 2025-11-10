import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const ProfileEditor = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
  });
  const [details, setDetails] = useState({
    especialidad: [] as string[],
    servicios: [] as string[],
    biografia: "",
    foto_url: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDetails();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (error) {
      toast.error("Error al cargar perfil");
    } else if (data) {
      setProfile({
        nombre: data.nombre || "",
        apellidos: data.apellidos || "",
        telefono: data.telefono || "",
      });
    }
    setLoading(false);
  };

  const fetchDetails = async () => {
    const { data, error } = await supabase
      .from("psicologo_detalles")
      .select("*")
      .eq("id", user?.id)
      .maybeSingle();

    if (!error && data) {
      setDetails({
        especialidad: data.especialidad || [],
        servicios: data.servicios || [],
        biografia: data.biografia || "",
        foto_url: data.foto_url || "",
      });
    }
  };

  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", user?.id);

    if (error) {
      toast.error("Error al actualizar perfil");
    } else {
      toast.success("Perfil actualizado");
    }
  };

  const handleSaveDetails = async () => {
    const { data: existing } = await supabase
      .from("psicologo_detalles")
      .select("id")
      .eq("id", user?.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("psicologo_detalles")
        .update(details)
        .eq("id", user?.id);

      if (error) {
        toast.error("Error al actualizar detalles");
      } else {
        toast.success("Detalles actualizados");
      }
    } else {
      const { error } = await supabase
        .from("psicologo_detalles")
        .insert({ ...details, id: user?.id });

      if (error) {
        toast.error("Error al crear detalles");
      } else {
        toast.success("Detalles creados");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-foreground">Nombre</Label>
            <Input
              className="bg-background border-border text-foreground"
              value={profile.nombre}
              onChange={(e) => setProfile({ ...profile, nombre: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-foreground">Apellidos</Label>
            <Input
              className="bg-background border-border text-foreground"
              value={profile.apellidos}
              onChange={(e) => setProfile({ ...profile, apellidos: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-foreground">Teléfono</Label>
            <Input
              className="bg-background border-border text-foreground"
              value={profile.telefono}
              onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
            />
          </div>
          <Button onClick={handleSaveProfile} className="w-full">
            Guardar Información Personal
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Perfil Profesional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-foreground">Especialidades (separadas por coma)</Label>
            <Input
              className="bg-background border-border text-foreground"
              value={details.especialidad.join(", ")}
              onChange={(e) => setDetails({ ...details, especialidad: e.target.value.split(",").map(s => s.trim()) })}
              placeholder="Ej: Terapia Cognitiva, Ansiedad, Depresión"
            />
          </div>
          <div>
            <Label className="text-foreground">Servicios (separados por coma)</Label>
            <Input
              className="bg-background border-border text-foreground"
              value={details.servicios.join(", ")}
              onChange={(e) => setDetails({ ...details, servicios: e.target.value.split(",").map(s => s.trim()) })}
              placeholder="Ej: Terapia Individual, Terapia de Pareja"
            />
          </div>
          <div>
            <Label className="text-foreground">Biografía</Label>
            <Textarea
              className="bg-background border-border text-foreground"
              value={details.biografia}
              onChange={(e) => setDetails({ ...details, biografia: e.target.value })}
              placeholder="Cuéntanos sobre tu experiencia profesional..."
              rows={5}
            />
          </div>
          <div>
            <Label className="text-foreground">URL de Foto de Perfil</Label>
            <Input
              className="bg-background border-border text-foreground"
              value={details.foto_url}
              onChange={(e) => setDetails({ ...details, foto_url: e.target.value })}
              placeholder="https://ejemplo.com/foto.jpg"
            />
          </div>
          <Button onClick={handleSaveDetails} className="w-full">
            Guardar Perfil Profesional
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
