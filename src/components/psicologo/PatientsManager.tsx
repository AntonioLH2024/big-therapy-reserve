import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Phone, Calendar, Clock, Search, Plus, Pencil } from "lucide-react";
import { z } from "zod";
import { validateNIF } from "@/lib/nif-validator";

const patientSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellidos: z.string().min(1, "Los apellidos son requeridos"),
  telefono: z.string().min(9, "El teléfono debe tener al menos 9 dígitos"),
  nif_dni: z.string().optional().refine(
    (val) => !val || validateNIF(val),
    "NIF/DNI inválido"
  ),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  codigo_postal: z.string().optional(),
});

export const PatientsManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
    nif_dni: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    codigo_postal: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const openAddPatientDialog = () => {
    setEditingPatient(null);
    setFormData({
      nombre: "",
      apellidos: "",
      telefono: "",
      nif_dni: "",
      direccion: "",
      ciudad: "",
      provincia: "",
      codigo_postal: "",
    });
    setFormErrors({});
    setIsFormDialogOpen(true);
  };

  const openEditPatientDialog = (patient: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setFormData({
      nombre: patient.nombre || "",
      apellidos: patient.apellidos || "",
      telefono: patient.telefono || "",
      nif_dni: patient.nif_dni || "",
      direccion: patient.direccion || "",
      ciudad: patient.ciudad || "",
      provincia: patient.provincia || "",
      codigo_postal: patient.codigo_postal || "",
    });
    setFormErrors({});
    setIsFormDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      patientSchema.parse(formData);

      if (editingPatient) {
        // Update existing patient
        const { error } = await supabase
          .from("profiles")
          .update(formData)
          .eq("id", editingPatient.id);

        if (error) throw error;
        toast.success("Paciente actualizado correctamente");
      } else {
        // For adding new patient, we need to create a user first
        toast.error("La funcionalidad de añadir nuevos pacientes requiere que el paciente se registre primero en el sistema");
        return;
      }

      setIsFormDialogOpen(false);
      fetchPatients();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);
      } else {
        toast.error("Error al guardar el paciente");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${patient.nombre} ${patient.apellidos}`.toLowerCase();
    const phone = patient.telefono?.toLowerCase() || "";
    
    return (
      fullName.includes(searchLower) ||
      phone.includes(searchLower)
    );
  });

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Mis Pacientes</CardTitle>
              <CardDescription>Haz clic en un paciente para ver sus detalles</CardDescription>
            </div>
            <Button onClick={openAddPatientDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Paciente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tienes pacientes registrados</p>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {filteredPatients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No se encontraron pacientes</p>
              ) : (
                <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground">Total Citas</TableHead>
                  <TableHead className="text-muted-foreground w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => openEditPatientDialog(patient, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              )}
            </>
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

      {/* Add/Edit Patient Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-2xl">
              {editingPatient ? "Editar Paciente" : "Añadir Paciente"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={formErrors.nombre ? "border-destructive" : ""}
                />
                {formErrors.nombre && (
                  <p className="text-sm text-destructive">{formErrors.nombre}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  className={formErrors.apellidos ? "border-destructive" : ""}
                />
                {formErrors.apellidos && (
                  <p className="text-sm text-destructive">{formErrors.apellidos}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className={formErrors.telefono ? "border-destructive" : ""}
                />
                {formErrors.telefono && (
                  <p className="text-sm text-destructive">{formErrors.telefono}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nif_dni">NIF/DNI</Label>
                <Input
                  id="nif_dni"
                  value={formData.nif_dni}
                  onChange={(e) => setFormData({ ...formData, nif_dni: e.target.value })}
                  className={formErrors.nif_dni ? "border-destructive" : ""}
                />
                {formErrors.nif_dni && (
                  <p className="text-sm text-destructive">{formErrors.nif_dni}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={formData.provincia}
                  onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo_postal">Código Postal</Label>
                <Input
                  id="codigo_postal"
                  value={formData.codigo_postal}
                  onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPatient ? "Guardar Cambios" : "Añadir Paciente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
