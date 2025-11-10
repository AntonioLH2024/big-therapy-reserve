import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";

const psychologistSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
  nombre: z.string().min(1, "Nombre requerido"),
  apellidos: z.string().min(1, "Apellidos requeridos"),
  telefono: z.string().min(1, "Teléfono requerido"),
  especialidad: z.string().optional(),
  biografia: z.string().optional(),
});

type PsychologistFormData = z.infer<typeof psychologistSchema>;

interface Psychologist {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  created_at: string;
  psicologo_detalles?: {
    especialidad: string[];
    biografia: string;
  };
}

export const PsychologistsManager = () => {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPsychologist, setEditingPsychologist] = useState<Psychologist | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<PsychologistFormData>({
    resolver: zodResolver(psychologistSchema),
    defaultValues: {
      email: "",
      password: "",
      nombre: "",
      apellidos: "",
      telefono: "",
      especialidad: "",
      biografia: "",
    },
  });

  useEffect(() => {
    fetchPsychologists();
  }, []);

  const fetchPsychologists = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        psicologo_detalles(especialidad, biografia)
      `)
      .eq("role", "psicologo")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar psicólogos");
      console.error(error);
    } else {
      // Transform data to match interface
      const transformedData = data?.map((item: any) => ({
        ...item,
        psicologo_detalles: Array.isArray(item.psicologo_detalles) 
          ? item.psicologo_detalles[0] 
          : item.psicologo_detalles
      })) || [];
      setPsychologists(transformedData);
    }
    setLoading(false);
  };

  const onSubmit = async (data: PsychologistFormData) => {
    if (editingPsychologist) {
      // Update existing psychologist
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nombre: data.nombre,
          apellidos: data.apellidos,
          telefono: data.telefono,
        })
        .eq("id", editingPsychologist.id);

      if (profileError) {
        toast.error(`Error al actualizar psicólogo: ${profileError.message}`);
        return;
      }

      // Update or insert psicologo_detalles
      const { error: detailsError } = await supabase
        .from("psicologo_detalles")
        .upsert({
          id: editingPsychologist.id,
          especialidad: data.especialidad ? [data.especialidad] : [],
          biografia: data.biografia || null,
        });

      if (detailsError) {
        toast.error("Error al actualizar detalles");
        console.error(detailsError);
      } else {
        toast.success("Psicólogo actualizado");
        fetchPsychologists();
        handleCloseDialog();
      }
    } else {
      // Create new psychologist
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password!,
        options: {
          data: {
            nombre: data.nombre,
            apellidos: data.apellidos,
            telefono: data.telefono,
            role: "psicologo",
          },
        },
      });

      if (authError) {
        toast.error(`Error al crear psicólogo: ${authError.message}`);
        return;
      }

      if (authData.user) {
        // Create psicologo_detalles
        const { error: detailsError } = await supabase
          .from("psicologo_detalles")
          .insert({
            id: authData.user.id,
            especialidad: data.especialidad ? [data.especialidad] : [],
            biografia: data.biografia || null,
          });

        if (detailsError) {
          console.error("Error creating details:", detailsError);
        }

        toast.success("Psicólogo creado exitosamente");
        fetchPsychologists();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este psicólogo?")) return;

    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      toast.error(`Error al eliminar: ${error.message}`);
    } else {
      toast.success("Psicólogo eliminado");
      fetchPsychologists();
    }
  };

  const handleEdit = (psychologist: Psychologist) => {
    setEditingPsychologist(psychologist);
    form.reset({
      email: "",
      nombre: psychologist.nombre,
      apellidos: psychologist.apellidos,
      telefono: psychologist.telefono,
      especialidad: psychologist.psicologo_detalles?.especialidad?.[0] || "",
      biografia: psychologist.psicologo_detalles?.biografia || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPsychologist(null);
    form.reset({
      email: "",
      password: "",
      nombre: "",
      apellidos: "",
      telefono: "",
      especialidad: "",
      biografia: "",
    });
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Gestión de Psicólogos
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPsychologist(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Psicólogo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingPsychologist ? "Editar Psicólogo" : "Nuevo Psicólogo"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {!editingPsychologist && (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              className="bg-background border-border text-foreground"
                              placeholder="email@ejemplo.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Contraseña</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              className="bg-background border-border text-foreground"
                              placeholder="Mínimo 6 caracteres"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Nombre</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-background border-border text-foreground"
                          {...field}
                        />
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
                      <FormLabel className="text-foreground">Apellidos</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-background border-border text-foreground"
                          {...field}
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
                      <FormLabel className="text-foreground">Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-background border-border text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="especialidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Especialidad</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-background border-border text-foreground"
                          placeholder="Ej: Ansiedad, Depresión"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="biografia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Biografía</FormLabel>
                      <FormControl>
                        <Textarea
                          className="bg-background border-border text-foreground"
                          placeholder="Breve descripción profesional..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingPsychologist ? "Actualizar" : "Crear"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {psychologists.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay psicólogos registrados</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-muted-foreground">Teléfono</TableHead>
                <TableHead className="text-muted-foreground">Especialidad</TableHead>
                <TableHead className="text-muted-foreground">Fecha Registro</TableHead>
                <TableHead className="text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {psychologists.map((psychologist) => (
                <TableRow key={psychologist.id} className="border-border">
                  <TableCell className="text-foreground">
                    {psychologist.nombre} {psychologist.apellidos}
                  </TableCell>
                  <TableCell className="text-foreground">{psychologist.telefono}</TableCell>
                  <TableCell className="text-foreground">
                    {psychologist.psicologo_detalles?.especialidad?.join(", ") || "N/A"}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {new Date(psychologist.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(psychologist)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(psychologist.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
