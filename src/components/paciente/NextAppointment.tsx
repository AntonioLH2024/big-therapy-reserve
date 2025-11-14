import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin, X, Edit } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentScheduler } from "./AppointmentScheduler";

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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  const handleCancel = async () => {
    if (!appointment) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("citas")
        .update({ estado: "cancelada" })
        .eq("id", appointment.id);

      if (error) throw error;

      toast.success("Cita cancelada exitosamente");
      setAppointment(null);
      setShowCancelDialog(false);
    } catch (error: any) {
      console.error("Error cancelling appointment:", error);
      toast.error("Error al cancelar la cita");
    } finally {
      setCancelling(false);
    }
  };

  const handleAppointmentScheduled = () => {
    setShowChangeDialog(false);
    fetchNextAppointment();
    toast.success("Cita actualizada exitosamente");
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
        
        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setShowChangeDialog(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Cambiar Cita
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={() => setShowCancelDialog(true)}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar Cita
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar cita?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cancelar tu cita del{" "}
              {format(new Date(appointment.fecha_hora), "d 'de' MMMM 'a las' HH:mm", { locale: es })}?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener cita</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelando..." : "Sí, cancelar cita"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cambiar Cita</DialogTitle>
          </DialogHeader>
          <AppointmentScheduler embedded onAppointmentScheduled={handleAppointmentScheduled} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
