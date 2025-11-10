import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const appointmentSchema = z.object({
  paciente_id: z.string().min(1, "Selecciona un paciente"),
  fecha_hora: z.date({ required_error: "Selecciona fecha y hora" }),
  hora: z.string().min(1, "Ingresa la hora"),
  servicio: z.string().min(1, "Ingresa el servicio"),
  notas: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export const AppointmentsManager = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  });

  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchPatients();
    }
  }, [user]);

  const fetchAppointments = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from("citas")
      .select(`
        *,
        paciente:profiles!citas_paciente_id_fkey(nombre, apellidos)
      `)
      .eq("psicologo_id", user?.id)
      .gte("fecha_hora", today.toISOString())
      .lt("fecha_hora", tomorrow.toISOString())
      .order("fecha_hora");

    if (error) {
      toast.error("Error al cargar citas");
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "paciente");

    if (error) {
      toast.error("Error al cargar pacientes");
    } else {
      setPatients(data || []);
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    const dateTime = new Date(data.fecha_hora);
    const [hours, minutes] = data.hora.split(":");
    dateTime.setHours(parseInt(hours), parseInt(minutes));

    if (editingAppointment) {
      const { error } = await supabase
        .from("citas")
        .update({
          paciente_id: data.paciente_id,
          fecha_hora: dateTime.toISOString(),
          servicio: data.servicio,
          notas: data.notas,
        })
        .eq("id", editingAppointment.id);

      if (error) {
        toast.error("Error al actualizar cita");
      } else {
        toast.success("Cita actualizada");
        fetchAppointments();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase.from("citas").insert({
        psicologo_id: user?.id,
        paciente_id: data.paciente_id,
        fecha_hora: dateTime.toISOString(),
        servicio: data.servicio,
        notas: data.notas,
        estado: "programada",
      });

      if (error) {
        toast.error("Error al crear cita");
      } else {
        toast.success("Cita creada");
        fetchAppointments();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("citas").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar cita");
    } else {
      toast.success("Cita eliminada");
      fetchAppointments();
    }
  };

  const handleEdit = (appointment: any) => {
    setEditingAppointment(appointment);
    const date = new Date(appointment.fecha_hora);
    form.reset({
      paciente_id: appointment.paciente_id,
      fecha_hora: date,
      hora: format(date, "HH:mm"),
      servicio: appointment.servicio,
      notas: appointment.notas || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAppointment(null);
    form.reset({
      paciente_id: "",
      fecha_hora: undefined,
      hora: "",
      servicio: "",
      notas: "",
    });
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Citas del Día</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingAppointment(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingAppointment ? "Editar Cita" : "Nueva Cita"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="paciente_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-foreground">Paciente</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between bg-background border-border text-foreground",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? patients.find((patient) => patient.id === field.value)
                                    ? `${patients.find((patient) => patient.id === field.value)?.nombre} ${patients.find((patient) => patient.id === field.value)?.apellidos}`
                                    : "Selecciona un paciente"
                                : "Selecciona un paciente"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-card border-border" align="start">
                          <Command className="bg-card">
                            <CommandInput placeholder="Buscar paciente..." className="h-9 bg-background text-foreground" />
                            <CommandList>
                              <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
                                No se encontraron pacientes.
                              </CommandEmpty>
                              <CommandGroup>
                                {patients.map((patient) => (
                                  <CommandItem
                                    key={patient.id}
                                    value={`${patient.nombre} ${patient.apellidos}`}
                                    onSelect={() => {
                                      form.setValue("paciente_id", patient.id);
                                    }}
                                    className="text-foreground hover:bg-accent cursor-pointer"
                                  >
                                    {patient.nombre} {patient.apellidos}
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        patient.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fecha_hora"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-foreground">Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal bg-background border-border",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Selecciona una fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Hora</FormLabel>
                      <FormControl>
                        <Input type="time" className="bg-background border-border text-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Servicio</FormLabel>
                      <FormControl>
                        <Input className="bg-background border-border text-foreground" placeholder="Ej: Terapia Individual" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Notas</FormLabel>
                      <FormControl>
                        <Textarea className="bg-background border-border text-foreground" placeholder="Notas opcionales..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingAppointment ? "Actualizar" : "Crear"}
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
        {appointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay citas para hoy</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Hora</TableHead>
                <TableHead className="text-muted-foreground">Paciente</TableHead>
                <TableHead className="text-muted-foreground">Servicio</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id} className="border-border">
                  <TableCell className="text-foreground">{format(new Date(appointment.fecha_hora), "HH:mm")}</TableCell>
                  <TableCell className="text-foreground">
                    {appointment.paciente?.nombre} {appointment.paciente?.apellidos}
                  </TableCell>
                  <TableCell className="text-foreground">{appointment.servicio}</TableCell>
                  <TableCell className="text-foreground">{appointment.estado}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(appointment)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(appointment.id)}>
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
