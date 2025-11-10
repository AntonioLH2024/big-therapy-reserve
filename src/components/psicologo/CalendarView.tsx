import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface Appointment {
  id: string;
  fecha_hora: string;
  servicio: string;
  estado: string;
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

  useEffect(() => {
    if (user && selectedDate) {
      fetchMonthAppointments();
    }
  }, [user, selectedDate]);

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
    
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.fecha_hora);
      return (
        aptDate.getDate() === selectedDate.getDate() &&
        aptDate.getMonth() === selectedDate.getMonth() &&
        aptDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  };

  const selectedDateAppointments = getAppointmentsForSelectedDate();

  if (loading) {
    return <div className="text-center py-8">Cargando calendario...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Calendario de Citas</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
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
          <CardTitle className="text-foreground">
            Citas del {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : ""}
          </CardTitle>
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
  );
};
