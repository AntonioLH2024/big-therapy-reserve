import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Phone, Calendar, Clock } from "lucide-react";

export const PatientsManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user]);

  const fetchPatients = async () => {
    const { data: citasData, error: citasError } = await supabase
      .from("citas")
      .select("paciente_id")
      .eq("psicologo_id", user?.id);

    if (citasError) {
      toast.error("Error al cargar pacientes");
      setLoading(false);
      return;
    }

    const patientIds = [...new Set(citasData?.map((c) => c.paciente_id) || [])];

    if (patientIds.length === 0) {
      setPatients([]);
      setLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", patientIds);

    if (profilesError) {
      toast.error("Error al cargar información de pacientes");
    } else {
      const patientsWithAppointments = await Promise.all(
        (profilesData || []).map(async (patient) => {
          const { count } = await supabase
            .from("citas")
            .select("*", { count: "exact", head: true })
            .eq("psicologo_id", user?.id)
            .eq("paciente_id", patient.id);

          return { ...patient, totalAppointments: count || 0 };
        })
      );
      setPatients(patientsWithAppointments);
    }
    setLoading(false);
  };

  const handlePatientClick = async (patient: any) => {
    setSelectedPatient(patient);
    setIsDialogOpen(true);

    // Fetch patient's appointments
    const { data, error } = await supabase
      .from("citas")
      .select("*")
      .eq("psicologo_id", user?.id)
      .eq("paciente_id", patient.id)
      .order("fecha_hora", { ascending: false });

    if (error) {
      toast.error("Error al cargar historial de citas");
    } else {
      setPatientAppointments(data || []);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Mis Pacientes</CardTitle>
          <CardDescription>Haz clic en un paciente para ver sus detalles</CardDescription>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tienes pacientes registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground">Total Citas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow 
                    key={patient.id} 
                    className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handlePatientClick(patient)}
                  >
                    <TableCell className="text-foreground">
                      {patient.nombre} {patient.apellidos}
                    </TableCell>
                    <TableCell className="text-foreground">{patient.telefono || "N/A"}</TableCell>
                    <TableCell className="text-foreground">{patient.totalAppointments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-2xl">Información del Paciente</DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-6">
              {/* Patient Info Card */}
              <Card className="bg-background/50 border-border">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre completo</p>
                        <p className="font-medium text-foreground">
                          {selectedPatient.nombre} {selectedPatient.apellidos}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium text-foreground">
                          {selectedPatient.telefono || "No disponible"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total de citas</p>
                        <p className="font-medium text-foreground">
                          {selectedPatient.totalAppointments}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Paciente desde</p>
                        <p className="font-medium text-foreground">
                          {format(new Date(selectedPatient.created_at), "MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Appointments History */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Historial de Citas</h3>
                {patientAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No hay citas registradas</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {patientAppointments.map((appointment) => (
                      <Card key={appointment.id} className="bg-background/50 border-border">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {format(new Date(appointment.fecha_hora), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(appointment.fecha_hora), "HH:mm")} - {appointment.servicio}
                              </p>
                              {appointment.notas && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Notas: {appointment.notas}
                                </p>
                              )}
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
