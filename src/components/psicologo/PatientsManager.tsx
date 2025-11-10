import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const PatientsManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Mis Pacientes</CardTitle>
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
                <TableRow key={patient.id} className="border-border">
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
  );
};
