import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Pencil, Trash2, Users, Eye } from "lucide-react";
import { validateNIF } from "@/lib/nif-validator";

const patientSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
  nombre: z.string().min(1, "Nombre requerido"),
  apellidos: z.string().min(1, "Apellidos requeridos"),
  telefono: z.string().min(1, "Teléfono requerido"),
  nif_dni: z.string().optional().refine(
    (val) => !val || validateNIF(val),
    "NIF/DNI inválido"
  ),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  codigo_postal: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface Patient {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  created_at: string;
  total_citas?: number;
}

export const PatientsManager = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      email: "",
      password: "",
      nombre: "",
      apellidos: "",
      telefono: "",
      nif_dni: "",
      direccion: "",
      ciudad: "",
      provincia: "",
      codigo_postal: "",
    },
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles!inner(*)
      `)
      .eq("role", "paciente");

    if (error) {
      toast.error("Error al cargar pacientes");
      console.error(error);
    } else {
      // Fetch appointment counts for each patient
      const patientsWithCounts = await Promise.all(
        (data || []).map(async (item: any) => {
          const patient = item.profiles;
          const { count } = await supabase
            .from("citas")
            .select("*", { count: "exact", head: true })
            .eq("paciente_id", patient.id);

          return {
            ...patient,
            total_citas: count || 0,
          };
        })
      );

      // Sort by created_at descending
      patientsWithCounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPatients(patientsWithCounts);
    }
    setLoading(false);
  };

  const fetchPatientAppointments = async (patientId: string) => {
    const { data, error } = await supabase
      .from("citas")
      .select(`
        *,
        psicologo:profiles!psicologo_id(nombre, apellidos)
      `)
      .eq("paciente_id", patientId)
      .order("fecha_hora", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("Error al cargar citas del paciente");
      console.error(error);
    } else {
      setPatientAppointments(data || []);
    }
  };

  const onSubmit = async (data: PatientFormData) => {
    if (editingPatient) {
      // Update existing patient
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: data.nombre,
          apellidos: data.apellidos,
          telefono: data.telefono,
          nif_dni: data.nif_dni || null,
          direccion: data.direccion || null,
          ciudad: data.ciudad || null,
          provincia: data.provincia || null,
          codigo_postal: data.codigo_postal || null,
        })
        .eq("id", editingPatient.id);

      if (error) {
        toast.error(`Error al actualizar paciente: ${error.message}`);
      } else {
        toast.success("Paciente actualizado");
        fetchPatients();
        handleCloseDialog();
      }
    } else {
      // Create new patient
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password!,
        options: {
          data: {
            nombre: data.nombre,
            apellidos: data.apellidos,
            telefono: data.telefono,
            role: "paciente",
          },
        },
      });

      if (authError) {
        toast.error(`Error al crear paciente: ${authError.message}`);
      } else if (authData.user) {
        toast.success("Paciente creado exitosamente");
        fetchPatients();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este paciente?")) return;

    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      toast.error(`Error al eliminar: ${error.message}`);
    } else {
      toast.success("Paciente eliminado");
      fetchPatients();
    }
  };

  const handleEdit = async (patient: Patient) => {
    // Fetch full patient details including invoice fields
    const { data: patientData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", patient.id)
      .single();

    if (error) {
      toast.error("Error al cargar datos del paciente");
      console.error(error);
      return;
    }

    setEditingPatient(patient);
    form.reset({
      email: "",
      nombre: patientData.nombre,
      apellidos: patientData.apellidos,
      telefono: patientData.telefono || "",
      nif_dni: patientData.nif_dni || "",
      direccion: patientData.direccion || "",
      ciudad: patientData.ciudad || "",
      provincia: patientData.provincia || "",
      codigo_postal: patientData.codigo_postal || "",
    });
    setIsDialogOpen(true);
  };

  const handleView = (patient: Patient) => {
    setViewingPatient(patient);
    fetchPatientAppointments(patient.id);
    setIsViewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPatient(null);
    form.reset({
      email: "",
      password: "",
      nombre: "",
      apellidos: "",
      telefono: "",
      nif_dni: "",
      direccion: "",
      ciudad: "",
      provincia: "",
      codigo_postal: "",
    });
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Pacientes
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPatient(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingPatient ? "Editar Paciente" : "Nuevo Paciente"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {!editingPatient && (
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
                    name="nif_dni"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">NIF/DNI</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-background border-border text-foreground"
                            placeholder="12345678A"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Dirección</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-background border-border text-foreground"
                            placeholder="Calle, número, piso, puerta"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ciudad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Ciudad</FormLabel>
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
                      name="provincia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Provincia</FormLabel>
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
                  </div>
                  <FormField
                    control={form.control}
                    name="codigo_postal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Código Postal</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-background border-border text-foreground"
                            placeholder="28001"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingPatient ? "Actualizar" : "Crear"}
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
          {patients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay pacientes registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground">Total Citas</TableHead>
                  <TableHead className="text-muted-foreground">Fecha Registro</TableHead>
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id} className="border-border">
                    <TableCell className="text-foreground">
                      {patient.nombre} {patient.apellidos}
                    </TableCell>
                    <TableCell className="text-foreground">{patient.telefono}</TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="secondary">{patient.total_citas || 0} citas</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {new Date(patient.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleView(patient)}
                          title="Ver historial"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(patient)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(patient.id)}
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

      {/* View Patient Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Historial de {viewingPatient?.nombre} {viewingPatient?.apellidos}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="text-foreground font-medium">{viewingPatient?.telefono}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de citas</p>
                <p className="text-foreground font-medium">{viewingPatient?.total_citas || 0}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Últimas Citas</h3>
              {patientAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay citas registradas</p>
              ) : (
                <div className="space-y-2">
                  {patientAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-4 border border-border rounded-lg bg-background"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">
                            {new Date(appointment.fecha_hora).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Psicólogo: {appointment.psicologo?.nombre}{" "}
                            {appointment.psicologo?.apellidos}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Servicio: {appointment.servicio}
                          </p>
                        </div>
                        <Badge
                          variant={
                            appointment.estado === "programada"
                              ? "default"
                              : appointment.estado === "completada"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {appointment.estado}
                        </Badge>
                      </div>
                      {appointment.notas && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Notas: {appointment.notas}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
