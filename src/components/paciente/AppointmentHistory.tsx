import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { XCircle } from "lucide-react";

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

export const AppointmentHistory = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
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
        .order("fecha_hora", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      toast.error("Error al cargar el historial");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("citas")
        .update({ estado: "cancelada" })
        .eq("id", appointmentId);

      if (error) throw error;
      
      toast.success("Cita cancelada correctamente");
      fetchAppointments();
    } catch (error: any) {
      toast.error("Error al cancelar la cita");
      console.error("Error:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      programada: "default",
      completada: "secondary",
      cancelada: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Historial de Citas</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-muted-foreground">No tienes citas registradas</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Psicólogo</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {format(new Date(appointment.fecha_hora), "dd/MM/yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    Dr. {appointment.psicologo.nombre} {appointment.psicologo.apellidos}
                  </TableCell>
                  <TableCell className="capitalize">{appointment.servicio}</TableCell>
                  <TableCell>{getStatusBadge(appointment.estado)}</TableCell>
                  <TableCell>
                    {appointment.estado === "programada" && 
                     new Date(appointment.fecha_hora) > new Date() && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Cancelar cita?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción cancelará tu cita. ¿Estás seguro?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>No, mantener</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancel(appointment.id)}>
                              Sí, cancelar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
