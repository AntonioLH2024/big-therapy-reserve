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
import { Calendar as CalendarIcon, Clock } from "lucide-react";
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

export const AppointmentScheduler = () => {
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
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      if (!existingAppointments?.includes(hour)) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
      }
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

      const [hours, minutes] = selectedTime.split(":").map(Number);
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase.from("citas").insert({
        paciente_id: user.id,
        psicologo_id: selectedPsychologist,
        fecha_hora: appointmentDateTime.toISOString(),
        servicio: validation.data.servicio,
        notas: validation.data.notas || null,
        estado: "programada",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cita programada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["next-appointment"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-history"] });
      setOpen(false);
      setSelectedPsychologist("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setServicio("");
      setNotas("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al programar la cita");
    },
  });

  const handleSubmit = () => {
    if (!selectedPsychologist || !selectedDate || !selectedTime) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (!servicio.trim()) {
      toast.error("Por favor especifica el tipo de servicio");
      return;
    }
    createAppointment.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <CalendarIcon className="mr-2 h-4 w-4" />
          Buscar Psicólogo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programar Nueva Cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Select Psychologist */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Seleccionar Psicólogo
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

          {/* Calendar */}
          {selectedPsychologist && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Seleccionar Fecha
              </label>
              <div className="flex justify-center border border-border rounded-md p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={es}
                  className="rounded-md"
                />
              </div>
            </div>
          )}

          {/* Service Type */}
          {selectedPsychologist && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Tipo de Servicio
              </label>
              <Input
                value={servicio}
                onChange={(e) => setServicio(e.target.value)}
                placeholder="Ej: Consulta Individual, Terapia de Parejas"
                className="bg-background"
              />
            </div>
          )}

          {/* Notes (optional) */}
          {selectedPsychologist && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notas (opcional)
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

          {/* Time Slots */}
          {selectedPsychologist && selectedDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Seleccionar Hora
              </label>
              <div className="grid grid-cols-3 gap-2">
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
                {availableSlots().length === 0 && (
                  <p className="col-span-3 text-center text-muted-foreground py-4">
                    No hay horarios disponibles para esta fecha
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {selectedPsychologist && selectedDate && selectedTime && servicio && (
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Psicólogo:</strong>{" "}
                  {psychologists?.find((p) => p.id === selectedPsychologist)?.nombre}{" "}
                  {psychologists?.find((p) => p.id === selectedPsychologist)?.apellidos}
                </p>
                <p>
                  <strong>Fecha:</strong> {format(selectedDate, "PPP", { locale: es })}
                </p>
                <p>
                  <strong>Hora:</strong> {selectedTime}
                </p>
                <p>
                  <strong>Servicio:</strong> {servicio}
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={createAppointment.isPending}
                className="w-full"
              >
                {createAppointment.isPending ? "Programando..." : "Confirmar Cita"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
