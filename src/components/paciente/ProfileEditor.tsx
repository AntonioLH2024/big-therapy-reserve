import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const ProfileEditor = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("nombre, apellidos, telefono")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          nombre: data.nombre || "",
          apellidos: data.apellidos || "",
          telefono: data.telefono || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: profile.nombre,
          apellidos: profile.apellidos,
          telefono: profile.telefono,
        })
        .eq("id", user?.id);

      if (error) throw error;
      
      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      toast.error("Error al actualizar el perfil");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Datos Personales</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={profile.nombre}
              onChange={(e) => setProfile({ ...profile, nombre: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input
              id="apellidos"
              value={profile.apellidos}
              onChange={(e) => setProfile({ ...profile, apellidos: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              value={profile.telefono}
              onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
            {loading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
