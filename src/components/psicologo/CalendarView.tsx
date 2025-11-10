import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Check, ChevronsUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  fecha_hora: string;
  servicio: string;
  estado: string;
  notas?: string | null;
  paciente_id: string;
  paciente: {
    nombre: string;
    apellidos: string;
  };
}

const appointmentSchema = z.object({
  paciente_id: z.string().min(1, "Selecciona un paciente"),
  hora: z.string().min(1, "Ingresa la hora").regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:mm)"),
  servicio: z.string().trim().min(1, "Ingresa el servicio").max(200, "El servicio debe tener menos de 200 caracteres"),
  notas: z.string().trim().max(1000, "Las notas deben tener menos de 1000 caracteres").optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export const CalendarView = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentDates, setAppointmentDates] = useState<Date[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [patients, setPatients] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | undefined>();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      paciente_id: "",
      hora: "",
      servicio: "",
      notas: "",
    },
  });

  useEffect(() => {
    if (user && selectedDate) {
      fetchMonthAppointments();
      fetchPatients();
    }
  }, [user, selectedDate]);

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

  const fetchMonthAppointments = async () => {
    if (!selectedDate) return;

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    const { data, error } = await supabase
      .from("citas")
      .select(`
        *,
        paciente:profiles!citas_paciente_id_fkey(nombre, apellidos)
      `)
      .eq("psicologo_id", user?.id)
      .gte("fecha_hora", monthStart.toISOString())
      .lte("fecha_hora", monthEnd.toISOString())
      .order("fecha_hora");

    if (error) {
      toast.error("Error al cargar citas");
      console.error(error);
    } else {
      setAppointments(data || []);
      
      // Extract unique dates that have appointments
      const dates = (data || []).map((apt) => {
        const date = new Date(apt.fecha_hora);
        date.setHours(0, 0, 0, 0);
        return date;
      });
      setAppointmentDates(dates);
    }
    setLoading(false);
  };

  const getAppointmentsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    let filtered = appointments.filter((apt) => {
      const aptDate = new Date(apt.fecha_hora);
      return (
        aptDate.getDate() === selectedDate.getDate() &&
        aptDate.getMonth() === selectedDate.getMonth() &&
        aptDate.getFullYear() === selectedDate.getFullYear()
      );
    });

    // Apply status filter
    if (statusFilter !== "todas") {
      filtered = filtered.filter((apt) => apt.estado === statusFilter);
    }

    return filtered;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleNewAppointment = () => {
    if (selectedDate) {
      setNewAppointmentDate(selectedDate);
      setIsDialogOpen(true);
      form.reset({
        paciente_id: "",
        hora: "",
        servicio: "",
        notas: "",
      });
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!newAppointmentDate) {
      toast.error("Selecciona una fecha");
      return;
    }

    const dateTime = new Date(newAppointmentDate);
    const [hours, minutes] = data.hora.split(":");
    dateTime.setHours(parseInt(hours), parseInt(minutes));

    const { error } = await supabase.from("citas").insert({
      psicologo_id: user?.id,
      paciente_id: data.paciente_id,
      fecha_hora: dateTime.toISOString(),
      servicio: data.servicio,
      notas: data.notas || null,
      estado: "programada",
    });

    if (error) {
      console.error("Error creating appointment:", error);
      toast.error(`Error al crear cita: ${error.message}`);
    } else {
      toast.success("Cita creada exitosamente");
      fetchMonthAppointments();
      setIsDialogOpen(false);
      form.reset();
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset();
  };

  const selectedDateAppointments = getAppointmentsForSelectedDate();

  if (loading) {
    return <div className="text-center py-8">Cargando calendario...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Calendario de Citas</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Selecciona una fecha para ver las citas programadas
            </p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={es}
              className="pointer-events-auto rounded-md border border-border"
              modifiers={{
                booked: appointmentDates,
              }}
              modifiersClassNames={{
                booked: "bg-primary/20 text-primary font-bold",
              }}
              onMonthChange={setSelectedDate}
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-foreground">
                Citas del {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : ""}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-background border-border">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="programada">Programadas</SelectItem>
                      <SelectItem value="completada">Completadas</SelectItem>
                      <SelectItem value="cancelada">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleNewAppointment} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir Cita
                </Button>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          {selectedDateAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay citas para este día
            </p>
          ) : (
            <div className="space-y-4">
              {selectedDateAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {format(new Date(appointment.fecha_hora), "HH:mm")}
                      </p>
                      <p className="text-sm text-foreground">
                        {appointment.paciente.nombre} {appointment.paciente.apellidos}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.servicio}
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Nueva Cita - {newAppointmentDate ? format(newAppointmentDate, "d 'de' MMMM 'de' yyyy", { locale: es }) : ""}
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
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Cita
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
