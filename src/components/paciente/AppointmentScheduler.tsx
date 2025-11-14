import { useState, useEffect } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { z } from "zod";

const appointmentSchema = z.object({
  servicio: z.string().trim().min(1, "Servicio requerido").max(200, "Servicio muy largo"),
  notas: z.string().max(500, "Notas muy largas").optional().or(z.literal("")),
});

interface Psychologist {
  id: string;
  nombre: string;
  apellidos: string;
}

interface AppointmentSchedulerProps {
  embedded?: boolean;
  onAppointmentScheduled?: () => void;
}

export const AppointmentScheduler = ({ embedded = false, onAppointmentScheduled }: AppointmentSchedulerProps = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [servicio, setServicio] = useState<string>("");
  const [notas, setNotas] = useState<string>("");

  // Load selected service from localStorage when dialog opens
  useEffect(() => {
    if (open) {
      const savedService = localStorage.getItem("selectedService");
      if (savedService) {
        setServicio(savedService);
        localStorage.removeItem("selectedService");
      }
    }
  }, [open]);

  // Fetch psychologists
  const { data: psychologists, isLoading: loadingPsychologists } = useQuery({
    queryKey: ["psychologists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, apellidos")
        .eq("role", "psicologo")
        .order("apellidos");

      if (error) throw error;
      return data as Psychologist[];
    },
  });

  // Fetch existing appointments for selected psychologist and date
  const { data: existingAppointments } = useQuery({
    queryKey: ["psychologist-appointments", selectedPsychologist, selectedDate],
    queryFn: async () => {
      if (!selectedPsychologist || !selectedDate) return [];

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("citas")
        .select("fecha_hora")
        .eq("psicologo_id", selectedPsychologist)
        .gte("fecha_hora", startOfDay.toISOString())
        .lte("fecha_hora", endOfDay.toISOString())
        .eq("estado", "programada");

      if (error) throw error;
      return data.map((apt) => new Date(apt.fecha_hora).getHours());
    },
    enabled: !!selectedPsychologist && !!selectedDate,
  });

  // Generate available time slots
  const availableSlots = () => {
    if (!selectedDate) return [];
    
    const slots = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    for (let hour = 9; hour <= 17; hour++) {
      // Skip if hour is already taken
      if (existingAppointments?.includes(hour)) {
        continue;
      }
      
      // Skip past hours for today
      if (isToday && hour <= now.getHours()) {
        continue;
      }
      
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  };

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async () => {
      if (!user || !selectedPsychologist || !selectedDate || !selectedTime) {
        throw new Error("Faltan datos requeridos");
      }

      // Validate form data
      const validation = appointmentSchema.safeParse({ servicio, notas });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const [hour] = selectedTime.split(":");
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(parseInt(hour), 0, 0, 0);

      // Double-check for conflicts before inserting
      const { data: conflictCheck, error: conflictError } = await supabase
        .from("citas")
        .select("id")
        .eq("psicologo_id", selectedPsychologist)
        .eq("fecha_hora", appointmentDate.toISOString())
        .eq("estado", "programada")
        .maybeSingle();

      if (conflictError) {
        console.error("Error checking conflicts:", conflictError);
      }

      if (conflictCheck) {
        throw new Error("Este horario ya no está disponible. Por favor selecciona otro horario.");
      }

      const { data, error } = await supabase.from("citas").insert({
        paciente_id: user.id,
        psicologo_id: selectedPsychologist,
        fecha_hora: appointmentDate.toISOString(),
        servicio: validation.data.servicio,
        notas: validation.data.notas || null,
        estado: "programada",
      }).select(`
        id,
        fecha_hora,
        servicio,
        psicologo_id,
        psicologo:profiles!psicologo_id (
          nombre,
          apellidos
        )
      `).single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast.success("Cita programada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["psychologist-appointments"] });
      
      // Send notification
      if (data) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const pacienteEmail = authData?.user?.email;

          if (pacienteEmail) {
            const appointmentDate = new Date(data.fecha_hora);
            
            await supabase.functions.invoke("send-appointment-notification", {
              body: {
                appointmentId: data.id,
                type: "scheduled",
                pacienteEmail,
                psicologoEmail: "psicologo@example.com",
                appointmentDetails: {
                  fecha: format(appointmentDate, "EEEE, d 'de' MMMM yyyy", { locale: es }),
                  hora: format(appointmentDate, "HH:mm", { locale: es }),
                  servicio: data.servicio,
                  pacienteNombre: authData?.user?.email?.split('@')[0] || "Paciente",
                  psicologoNombre: `${data.psicologo.nombre} ${data.psicologo.apellidos}`,
                },
              },
            });
          }
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      }
      
      if (!embedded) {
        setOpen(false);
      }
      setSelectedPsychologist("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setServicio("");
      setNotas("");
      
      if (onAppointmentScheduled) {
        onAppointmentScheduled();
      }
    },
    onError: (error: Error) => {
      console.error("Error creating appointment:", error);
      toast.error(error.message || "Error al programar la cita");
      
      // Refresh available slots in case of conflict
      queryClient.invalidateQueries({ queryKey: ["psychologist-appointments"] });
    },
  });

  const handleSubmit = () => {
    if (!servicio.trim()) {
      toast.error("Por favor especifica el tipo de servicio");
      return;
    }
    createAppointment.mutate();
  };

  const formContent = (
    <div className="space-y-6">
      {/* Select Psychologist */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          Seleccionar Psicólogo
          {selectedPsychologist && (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </label>
        <Select value={selectedPsychologist} onValueChange={setSelectedPsychologist}>
          <SelectTrigger>
            <SelectValue placeholder="Elige un psicólogo" />
          </SelectTrigger>
          <SelectContent>
            {loadingPsychologists ? (
              <SelectItem value="loading" disabled>
                Cargando...
              </SelectItem>
            ) : (
              psychologists?.map((psy) => (
                <SelectItem key={psy.id} value={psy.id}>
                  {psy.nombre} {psy.apellidos}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Service Type */}
      {selectedPsychologist && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            Tipo de Servicio
            {servicio && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </label>
          <Input
            value={servicio}
            onChange={(e) => setServicio(e.target.value)}
            placeholder="Ej: Consulta Individual, Terapia de Parejas"
            className="bg-background"
          />
        </div>
      )}

      {/* Calendar and Time Slots */}
      {selectedPsychologist && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            Seleccionar Fecha y Hora
            {selectedDate && selectedTime && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </label>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="flex justify-center border border-border rounded-md p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                locale={es}
                className="rounded-md pointer-events-auto"
              />
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Horas Disponibles
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {availableSlots().map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? "default" : "outline"}
                      onClick={() => setSelectedTime(slot)}
                      className="w-full"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {slot}
                    </Button>
                  ))}
                </div>
                {availableSlots().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay horarios disponibles para esta fecha
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes (optional) */}
      {selectedPsychologist && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            Notas (opcional)
            {notas && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </label>
          <Textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Información adicional sobre la cita..."
            className="bg-background"
            rows={3}
          />
        </div>
      )}

      {/* Confirmation Summary and Button - Always Visible */}
      <div className="flex flex-col gap-4 pt-4 border-t border-border mt-6">
        {selectedPsychologist && selectedDate && selectedTime && servicio && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground mb-3">Resumen de la Cita</h3>
            <div className="text-sm space-y-1">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Psicólogo:</span>
                <span className="font-medium text-foreground">
                  {psychologists?.find((p) => p.id === selectedPsychologist)?.nombre}{" "}
                  {psychologists?.find((p) => p.id === selectedPsychologist)?.apellidos}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium text-foreground">{format(selectedDate, "PPP", { locale: es })}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Hora:</span>
                <span className="font-medium text-foreground">{selectedTime}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-medium text-foreground">{servicio}</span>
              </p>
            </div>
          </div>
        )}
        
        {/* Confirmation Button - Always Visible */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedPsychologist || !selectedDate || !selectedTime || !servicio || createAppointment.isPending}
          size="lg"
          className="w-full"
        >
          {createAppointment.isPending ? "Programando..." : "Aceptar y Confirmar Cita"}
        </Button>
        
        {(!selectedPsychologist || !selectedDate || !selectedTime || !servicio) && (
          <p className="text-sm text-muted-foreground text-center">
            Completa todos los campos para confirmar la cita
          </p>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <CalendarIcon className="mr-2 h-4 w-4" />
          Buscar Psicólogo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programar Nueva Cita</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
