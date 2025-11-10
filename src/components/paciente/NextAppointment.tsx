import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface Appointment {
  id: string;
  fecha_hora: string;
  servicio: string;
  estado: string;
  notas: string | null;
  psicologo: {
    nombre: string;
    apellidos: string;
  };
}

export const NextAppointment = () => {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNextAppointment();
    }
  }, [user]);

  const fetchNextAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from("citas")
        .select(`
          id,
          fecha_hora,
          servicio,
          estado,
          notas,
          psicologo:profiles!psicologo_id (
            nombre,
            apellidos
          )
        `)
        .eq("paciente_id", user?.id)
        .eq("estado", "programada")
        .gte("fecha_hora", new Date().toISOString())
        .order("fecha_hora", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setAppointment(data);
    } catch (error: any) {
      console.error("Error fetching appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Cargando...</div>;
  }

  if (!appointment) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Próxima Cita</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tienes citas programadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Próxima Cita</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-medium">
            {format(new Date(appointment.fecha_hora), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          <span>{format(new Date(appointment.fecha_hora), "HH:mm", { locale: es })} hrs</span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <User className="h-5 w-5 text-primary" />
          <span>Dr. {appointment.psicologo.nombre} {appointment.psicologo.apellidos}</span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="capitalize">{appointment.servicio}</span>
        </div>
        {appointment.notas && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground mb-1">Notas:</p>
            <p className="text-foreground">{appointment.notas}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
