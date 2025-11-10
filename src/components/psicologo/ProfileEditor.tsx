import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const profileSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(100, "Apellidos muy largos"),
  telefono: z.string().regex(/^[+]?[0-9\s-]{9,20}$/, "Teléfono inválido").optional().or(z.literal("")),
});

const detailsSchema = z.object({
  especialidad: z.string().max(500, "Especialidades muy largas").optional().or(z.literal("")),
  servicios: z.string().max(500, "Servicios muy largos").optional().or(z.literal("")),
  biografia: z.string().max(2000, "Biografía muy larga (máx 2000 caracteres)").optional().or(z.literal("")),
  foto_url: z.string().url("URL inválida").max(500, "URL muy larga").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type DetailsFormData = z.infer<typeof detailsSchema>;

export const ProfileEditor = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      telefono: "",
    },
  });

  const detailsForm = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      especialidad: "",
      servicios: "",
      biografia: "",
      foto_url: "",
    },
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
      profileForm.reset({
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
      detailsForm.reset({
        especialidad: (data.especialidad || []).join(", "),
        servicios: (data.servicios || []).join(", "),
        biografia: data.biografia || "",
        foto_url: data.foto_url || "",
      });
    }
  };

  const onSaveProfile = async (data: ProfileFormData) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: data.nombre,
          apellidos: data.apellidos,
          telefono: data.telefono || null,
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast.success("Perfil actualizado");
    } catch (error) {
      toast.error("Error al actualizar perfil");
    }
  };

  const onSaveDetails = async (data: DetailsFormData) => {
    try {
      const { data: existing } = await supabase
        .from("psicologo_detalles")
        .select("id")
        .eq("id", user?.id)
        .maybeSingle();

      const detailsData = {
        especialidad: data.especialidad ? data.especialidad.split(",").map(s => s.trim()).filter(Boolean) : [],
        servicios: data.servicios ? data.servicios.split(",").map(s => s.trim()).filter(Boolean) : [],
        biografia: data.biografia || null,
        foto_url: data.foto_url || null,
      };

      if (existing) {
        const { error } = await supabase
          .from("psicologo_detalles")
          .update(detailsData)
          .eq("id", user?.id);

        if (error) throw error;
        toast.success("Detalles actualizados");
      } else {
        const { error } = await supabase
          .from("psicologo_detalles")
          .insert({ ...detailsData, id: user?.id });

        if (error) throw error;
        toast.success("Detalles creados");
      }
    } catch (error) {
      toast.error("Error al guardar detalles");
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
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="apellidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="+34 600 000 000" className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={profileForm.formState.isSubmitting} className="w-full">
                {profileForm.formState.isSubmitting ? "Guardando..." : "Guardar Información Personal"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Perfil Profesional</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...detailsForm}>
            <form onSubmit={detailsForm.handleSubmit(onSaveDetails)} className="space-y-4">
              <FormField
                control={detailsForm.control}
                name="especialidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidades (separadas por coma)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ej: Terapia Cognitiva, Ansiedad, Depresión" 
                        className="bg-background" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={detailsForm.control}
                name="servicios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servicios (separados por coma)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ej: Terapia Individual, Terapia de Pareja" 
                        className="bg-background" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={detailsForm.control}
                name="biografia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografía (máx 2000 caracteres)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Cuéntanos sobre tu experiencia profesional..." 
                        rows={5} 
                        className="bg-background" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={detailsForm.control}
                name="foto_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de Foto de Perfil</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="url" 
                        placeholder="https://ejemplo.com/foto.jpg" 
                        className="bg-background" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={detailsForm.formState.isSubmitting} className="w-full">
                {detailsForm.formState.isSubmitting ? "Guardando..." : "Guardar Perfil Profesional"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
