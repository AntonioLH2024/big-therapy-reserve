import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { validateNIF } from "@/lib/nif-validator";

const profileSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  apellidos: z.string().trim().min(1, "Apellidos requeridos").max(100, "Apellidos muy largos"),
  nif_dni: z.string()
    .trim()
    .min(1, "NIF/DNI requerido")
    .refine((val) => validateNIF(val), {
      message: "NIF/DNI inválido. Debe ser un NIF/NIE/CIF español válido",
    }),
  telefono: z.string().trim().regex(/^[+]?[0-9\s-]{9,20}$/, "Teléfono inválido (ej: +34 600 000 000)"),
  direccion: z.string().trim().min(1, "Dirección requerida").max(200, "Dirección muy larga"),
  codigo_postal: z.string().trim().regex(/^[0-9]{5}$/, "Código postal inválido (5 dígitos)"),
  ciudad: z.string().trim().min(1, "Ciudad requerida").max(100, "Ciudad muy larga"),
  provincia: z.string().trim().min(1, "Provincia requerida").max(100, "Provincia muy larga"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileEditor = () => {
  const { user } = useAuth();
  const [userEmail, setUserEmail] = useState<string>("");

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      nif_dni: "",
      telefono: "",
      direccion: "",
      codigo_postal: "",
      ciudad: "",
      provincia: "",
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      setUserEmail(user.email || "");
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("nombre, apellidos, nif_dni, telefono, direccion, codigo_postal, ciudad, provincia")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      if (data) {
        form.reset({
          nombre: data.nombre || "",
          apellidos: data.apellidos || "",
          nif_dni: data.nif_dni || "",
          telefono: data.telefono || "",
          direccion: data.direccion || "",
          codigo_postal: data.codigo_postal || "",
          ciudad: data.ciudad || "",
          provincia: data.provincia || "",
        });
      }
    } catch (error: any) {
      toast.error("Error al cargar perfil");
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: data.nombre,
          apellidos: data.apellidos,
          nif_dni: data.nif_dni,
          telefono: data.telefono,
          direccion: data.direccion,
          codigo_postal: data.codigo_postal,
          ciudad: data.ciudad,
          provincia: data.provincia,
        })
        .eq("id", user?.id);

      if (error) throw error;
      
      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      toast.error("Error al actualizar el perfil");
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Datos Personales</CardTitle>
        <CardDescription className="text-muted-foreground">
          Complete todos sus datos para la emisión de facturas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background" placeholder="Juan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos *</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background" placeholder="García López" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nif_dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIF/DNI *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-background" 
                          placeholder="12345678A" 
                          maxLength={9}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono *</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="+34 600 000 000" className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email
                  </label>
                  <Input 
                    value={userEmail} 
                    disabled 
                    className="bg-muted cursor-not-allowed" 
                  />
                  <p className="text-xs text-muted-foreground">
                    El email no se puede cambiar desde aquí
                  </p>
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Dirección de Facturación</h3>
              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-background" 
                        placeholder="Calle Principal, 123, 1º A" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="codigo_postal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-background" 
                          placeholder="28001" 
                          maxLength={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad *</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background" placeholder="Madrid" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provincia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia *</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background" placeholder="Madrid" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting} 
              className="w-full bg-primary hover:bg-primary/90"
            >
              {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
