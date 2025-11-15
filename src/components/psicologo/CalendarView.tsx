import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, Check, ChevronsUpDown, Filter, Edit, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);

  // State for step-by-step confirmation modal
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedHora, setSelectedHora] = useState<string>("");
  const [selectedServicio, setSelectedServicio] = useState<string>("");
  const [selectedNotas, setSelectedNotas] = useState<string>("");
  const [isPatientPopoverOpen, setIsPatientPopoverOpen] = useState(false);
  const [occupiedHours, setOccupiedHours] = useState<string[]>([]);

  useEffect(() => {
    if (user && selectedDate) {
      fetchMonthAppointments();
      fetchPatients();
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (newAppointmentDate) {
      fetchOccupiedHours(newAppointmentDate);
    }
  }, [newAppointmentDate, appointments]);

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

  const fetchOccupiedHours = (date: Date) => {
    const selectedDateStr = format(date, "yyyy-MM-dd");
    const occupied = appointments
      .filter(apt => {
        const aptDate = format(new Date(apt.fecha_hora), "yyyy-MM-dd");
        return aptDate === selectedDateStr && apt.estado !== "cancelada";
      })
      .map(apt => format(new Date(apt.fecha_hora), "HH:mm"));
    
    setOccupiedHours(occupied);
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
      setAppointmentToEdit(null);
      setNewAppointmentDate(selectedDate);
      setIsDialogOpen(true);
      setSelectedPatientId("");
      setSelectedHora("");
      setSelectedServicio("");
      setSelectedNotas("");
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setAppointmentToEdit(appointment);
    setNewAppointmentDate(new Date(appointment.fecha_hora));
    setSelectedPatientId(appointment.paciente_id);
    setSelectedHora(format(new Date(appointment.fecha_hora), "HH:mm"));
    setSelectedServicio(appointment.servicio);
    setSelectedNotas(appointment.notas || "");
    setIsDialogOpen(true);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setIsCancelDialogOpen(true);
  };

  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    const { error } = await supabase
      .from("citas")
      .update({ estado: "cancelada" })
      .eq("id", appointmentToCancel.id);

    if (error) {
      toast.error("Error al anular la cita");
      console.error(error);
    } else {
      toast.success("Cita anulada exitosamente");
      fetchMonthAppointments();
    }

    setIsCancelDialogOpen(false);
    setAppointmentToCancel(null);
  };

  const handleConfirmAppointment = async () => {
    // Validation
    if (!selectedPatientId) {
      toast.error("Selecciona un paciente");
      return;
    }
    if (!selectedHora) {
      toast.error("Ingresa la hora");
      return;
    }
    if (!selectedServicio.trim()) {
      toast.error("Ingresa el servicio");
      return;
    }
    if (selectedServicio.trim().length > 200) {
      toast.error("El servicio debe tener menos de 200 caracteres");
      return;
    }
    if (selectedNotas.trim().length > 1000) {
      toast.error("Las notas deben tener menos de 1000 caracteres");
      return;
    }
    
    const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!horaRegex.test(selectedHora)) {
      toast.error("Formato de hora inválido (HH:mm)");
      return;
    }

    if (!newAppointmentDate) {
      toast.error("Selecciona una fecha");
      return;
    }

    const dateTime = new Date(newAppointmentDate);
    const [hours, minutes] = selectedHora.split(":");
    dateTime.setHours(parseInt(hours), parseInt(minutes));

    if (appointmentToEdit) {
      // Update existing appointment
      const { error } = await supabase
        .from("citas")
        .update({
          paciente_id: selectedPatientId,
          fecha_hora: dateTime.toISOString(),
          servicio: selectedServicio.trim(),
          notas: selectedNotas.trim() || null,
        })
        .eq("id", appointmentToEdit.id);

      if (error) {
        console.error("Error updating appointment:", error);
        toast.error(`Error al actualizar cita: ${error.message}`);
      } else {
        toast.success("Cita actualizada exitosamente");
        fetchMonthAppointments();
        setIsDialogOpen(false);
        setAppointmentToEdit(null);
        setSelectedPatientId("");
        setSelectedHora("");
        setSelectedServicio("");
        setSelectedNotas("");
      }
    } else {
      // Create new appointment
      const { error } = await supabase.from("citas").insert({
        psicologo_id: user?.id,
        paciente_id: selectedPatientId,
        fecha_hora: dateTime.toISOString(),
        servicio: selectedServicio.trim(),
        notas: selectedNotas.trim() || null,
        estado: "programada",
      });

      if (error) {
        console.error("Error creating appointment:", error);
        toast.error(`Error al crear cita: ${error.message}`);
      } else {
        toast.success("Cita creada exitosamente");
        fetchMonthAppointments();
        setIsDialogOpen(false);
        setSelectedPatientId("");
        setSelectedHora("");
        setSelectedServicio("");
        setSelectedNotas("");
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPatientId("");
    setSelectedHora("");
    setSelectedServicio("");
    setSelectedNotas("");
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
                  <div className="flex items-start justify-between mb-3">
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
                  {appointment.estado !== "cancelada" && appointment.estado !== "completada" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditAppointment(appointment)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Cambiar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancelAppointment(appointment)}
                        className="flex-1"
                      >
                        <X className="mr-2 h-3 w-3" />
                        Anular
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        setIsDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {appointmentToEdit ? "Cambiar Cita" : "Nueva Cita"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Select Patient */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Seleccionar Paciente
                {selectedPatientId && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </label>
              <Popover open={isPatientPopoverOpen} onOpenChange={setIsPatientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isPatientPopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedPatientId
                      ? patients.find((p) => p.id === selectedPatientId)?.nombre + " " + patients.find((p) => p.id === selectedPatientId)?.apellidos
                      : "Selecciona un paciente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar paciente..." />
                    <CommandList>
                      <CommandEmpty>No se encontró el paciente.</CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            value={`${patient.nombre} ${patient.apellidos}`}
                            onSelect={() => {
                              setSelectedPatientId(patient.id);
                              setIsPatientPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {patient.nombre} {patient.apellidos}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Service Type */}
            {selectedPatientId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Tipo de Servicio
                  {selectedServicio && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </label>
                <Input
                  value={selectedServicio}
                  onChange={(e) => setSelectedServicio(e.target.value)}
                  placeholder="Ej: Consulta Individual, Terapia de Parejas"
                  className="bg-background"
                />
              </div>
            )}

            {/* Calendar and Time Slots */}
            {selectedPatientId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Seleccionar Fecha y Hora
                  {newAppointmentDate && selectedHora && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </label>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Calendar */}
                  <div className="flex justify-center border border-border rounded-md p-4">
            <Calendar
              mode="single"
              selected={newAppointmentDate}
              onSelect={setNewAppointmentDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              locale={es}
              weekStartsOn={1}
              className="rounded-md pointer-events-auto"
            />
                  </div>

                  {/* Time Slots */}
                  {newAppointmentDate && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Horas Disponibles
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((slot) => {
                          const isOccupied = occupiedHours.includes(slot);
                          const isSelected = selectedHora === slot;
                          
                          return (
                            <Button
                              key={slot}
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => setSelectedHora(slot)}
                              disabled={isOccupied}
                              className={cn(
                                "w-full",
                                isOccupied && "bg-red-500 text-white border-red-500 opacity-60 cursor-not-allowed"
                              )}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {slot}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes (optional) */}
            {selectedPatientId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Notas (opcional)
                  {selectedNotas && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </label>
                <Textarea
                  value={selectedNotas}
                  onChange={(e) => setSelectedNotas(e.target.value)}
                  placeholder="Información adicional sobre la cita..."
                  className="bg-background"
                  rows={3}
                />
              </div>
            )}

            {/* Confirmation Summary and Button */}
            <div className="flex flex-col gap-4 pt-4 border-t border-border mt-6">
              {selectedPatientId && newAppointmentDate && selectedHora && selectedServicio && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-foreground mb-3">Resumen de la Cita</h3>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Paciente:</span>
                      <span className="font-medium text-foreground">
                        {patients.find((p) => p.id === selectedPatientId)?.nombre}{" "}
                        {patients.find((p) => p.id === selectedPatientId)?.apellidos}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span className="font-medium text-foreground">{format(newAppointmentDate, "PPP", { locale: es })}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Hora:</span>
                      <span className="font-medium text-foreground">{selectedHora}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Servicio:</span>
                      <span className="font-medium text-foreground">{selectedServicio}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {/* Confirmation Button - Always Visible */}
              <Button
                onClick={handleConfirmAppointment}
                disabled={!selectedPatientId || !selectedHora || !selectedServicio}
                size="lg"
                className="w-full"
              >
                {appointmentToEdit ? "Actualizar Cita" : "Aceptar y Confirmar Cita"}
              </Button>
              
              {(!selectedPatientId || !selectedHora || !selectedServicio) && (
                <p className="text-sm text-muted-foreground text-center">
                  Completa todos los campos para confirmar la cita
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Anular esta cita?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {appointmentToCancel && (
                <>
                  <p className="mb-2">
                    Estás a punto de anular la cita con{" "}
                    <span className="font-semibold text-foreground">
                      {appointmentToCancel.paciente.nombre} {appointmentToCancel.paciente.apellidos}
                    </span>
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Fecha:</span>{" "}
                    {format(new Date(appointmentToCancel.fecha_hora), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">Hora:</span>{" "}
                    {format(new Date(appointmentToCancel.fecha_hora), "HH:mm")}
                  </p>
                  <p>
                    <span className="font-semibold">Servicio:</span> {appointmentToCancel.servicio}
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-accent">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Anular Cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
