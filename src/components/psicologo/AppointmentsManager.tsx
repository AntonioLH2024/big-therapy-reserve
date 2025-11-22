import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Pencil, Trash2, Check, ChevronsUpDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const AppointmentsManager = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | undefined>();
  const [selectedHora, setSelectedHora] = useState<string>("");
  const [selectedServicio, setSelectedServicio] = useState<string>("");
  const [selectedNotas, setSelectedNotas] = useState<string>("");
  const [openPatientPopover, setOpenPatientPopover] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);

  const availableHours = [
    "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00",
    "17:00", "18:00", "19:00", "20:00"
  ];

  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchPatients();
    }
  }, [user]);

  useEffect(() => {
    if (newAppointmentDate && user) {
      fetchExistingAppointments();
    }
  }, [newAppointmentDate, user]);

  const fetchExistingAppointments = async () => {
    if (!newAppointmentDate || !user) return;

    const startOfDay = new Date(newAppointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(newAppointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("citas")
      .select("*")
      .eq("psicologo_id", user.id)
      .neq("estado", "cancelada")
      .gte("fecha_hora", startOfDay.toISOString())
      .lte("fecha_hora", endOfDay.toISOString());

    if (error) {
      console.error("Error fetching existing appointments:", error);
    } else {
      setExistingAppointments(data || []);
    }
  };

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
      .from("user_roles")
      .select(`
        user_id,
        profiles!inner(*)
      `)
      .eq("role", "paciente");

    if (error) {
      toast.error("Error al cargar pacientes");
    } else {
      setPatients((data || []).map((item: any) => item.profiles));
    }
  };

  const handleConfirmAppointment = async () => {
    if (!selectedPatientId || !newAppointmentDate || !selectedHora || !selectedServicio) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    const dateTime = new Date(newAppointmentDate);
    const [hours, minutes] = selectedHora.split(":");
    dateTime.setHours(parseInt(hours), parseInt(minutes));

    if (editingAppointment) {
      const { error } = await supabase
        .from("citas")
        .update({
          paciente_id: selectedPatientId,
          fecha_hora: dateTime.toISOString(),
          servicio: selectedServicio,
          notas: selectedNotas || null,
        })
        .eq("id", editingAppointment.id);

      if (error) {
        console.error("Error updating appointment:", error);
        toast.error(`Error al actualizar cita: ${error.message}`);
      } else {
        toast.success("Cita actualizada");
        fetchAppointments();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase.from("citas").insert({
        psicologo_id: user?.id,
        paciente_id: selectedPatientId,
        fecha_hora: dateTime.toISOString(),
        servicio: selectedServicio,
        notas: selectedNotas || null,
        estado: "programada",
      });

      if (error) {
        console.error("Error creating appointment:", error);
        toast.error(`Error al crear cita: ${error.message}`);
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
    setSelectedPatientId(appointment.paciente_id);
    setNewAppointmentDate(date);
    setSelectedHora(format(date, "HH:mm"));
    setSelectedServicio(appointment.servicio);
    setSelectedNotas(appointment.notas || "");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAppointment(null);
    setSelectedPatientId("");
    setNewAppointmentDate(undefined);
    setSelectedHora("");
    setSelectedServicio("");
    setSelectedNotas("");
    setOpenPatientPopover(false);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Citas del Día</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={() => { setEditingAppointment(null); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
          <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground text-xl">
                {editingAppointment ? "Editar Cita" : "Nueva Cita"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Seleccionar Paciente */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {selectedPatientId && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <h3 className="font-semibold text-foreground">Seleccionar Paciente</h3>
                </div>
                <Popover open={openPatientPopover} onOpenChange={setOpenPatientPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between bg-background border-border text-foreground",
                        !selectedPatientId && "text-muted-foreground"
                      )}
                    >
                      {selectedPatientId
                        ? (() => {
                            const patient = patients.find((p) => p.id === selectedPatientId);
                            return patient ? `${patient.nombre} ${patient.apellidos}` : "Selecciona un paciente";
                          })()
                        : "Selecciona un paciente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
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
                                setSelectedPatientId(patient.id);
                                setOpenPatientPopover(false);
                              }}
                              className="text-foreground hover:bg-accent cursor-pointer"
                            >
                              {patient.nombre} {patient.apellidos}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  patient.id === selectedPatientId ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tipo de Servicio */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {selectedServicio && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <h3 className="font-semibold text-foreground">Tipo de Servicio</h3>
                </div>
                <Input
                  placeholder="Ej: Terapia Individual, Terapia de Pareja..."
                  value={selectedServicio}
                  onChange={(e) => setSelectedServicio(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* Seleccionar Fecha y Hora */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {newAppointmentDate && selectedHora && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <h3 className="font-semibold text-foreground">Seleccionar Fecha y Hora</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <Calendar
                      mode="single"
                      selected={newAppointmentDate}
                      onSelect={setNewAppointmentDate}
                      className="rounded-md border border-border bg-background pointer-events-auto"
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={es}
                      weekStartsOn={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Hora disponible</p>
                    <div className="grid grid-cols-3 gap-2">
                      {availableHours.map((hora) => {
                        const isOccupied = existingAppointments.some((apt) => {
                          const aptDate = new Date(apt.fecha_hora);
                          const aptHour = `${aptDate.getHours().toString().padStart(2, '0')}:${aptDate.getMinutes().toString().padStart(2, '0')}`;
                          return aptHour === hora && apt.id !== editingAppointment?.id;
                        });

                        return (
                          <Button
                            key={hora}
                            variant={selectedHora === hora ? "default" : "outline"}
                            className={cn(
                              "w-full",
                              selectedHora === hora && "bg-primary text-primary-foreground",
                              isOccupied && "bg-red-500 text-white border-red-500 opacity-60 cursor-not-allowed hover:bg-red-500"
                            )}
                            onClick={() => !isOccupied && setSelectedHora(hora)}
                            disabled={isOccupied}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            {hora}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas Adicionales */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {selectedNotas && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <h3 className="font-semibold text-foreground">Notas Adicionales (Opcional)</h3>
                </div>
                <Textarea
                  placeholder="Agregar notas sobre la cita..."
                  value={selectedNotas}
                  onChange={(e) => setSelectedNotas(e.target.value)}
                  className="bg-background border-border text-foreground min-h-[100px]"
                />
              </div>

              {/* Resumen de la Cita */}
              {selectedPatientId && newAppointmentDate && selectedHora && selectedServicio && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                  <h3 className="font-semibold text-foreground">Resumen de la Cita</h3>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Paciente:</span>{" "}
                      {(() => {
                        const patient = patients.find((p) => p.id === selectedPatientId);
                        return patient ? `${patient.nombre} ${patient.apellidos}` : "";
                      })()}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Servicio:</span> {selectedServicio}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Fecha:</span>{" "}
                      {format(newAppointmentDate, "PPP", { locale: es })}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Hora:</span> {selectedHora}
                    </p>
                    {selectedNotas && (
                      <p>
                        <span className="font-medium text-foreground">Notas:</span> {selectedNotas}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleConfirmAppointment}
                  disabled={!selectedPatientId || !newAppointmentDate || !selectedHora || !selectedServicio}
                  className="flex-1"
                >
                  {editingAppointment ? "Actualizar Cita" : "Aceptar y Confirmar Cita"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
              </div>
            </div>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
