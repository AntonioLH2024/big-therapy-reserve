import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Pencil, Trash2, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const appointmentSchema = z.object({
  estado: z.enum(["programada", "completada", "cancelada"]),
  notas: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Appointment {
  id: string;
  fecha_hora: string;
  servicio: string;
  estado: string;
  notas: string | null;
  paciente: {
    nombre: string;
    apellidos: string;
  };
  psicologo: {
    nombre: string;
    apellidos: string;
  };
}

export const AppointmentsManager = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      estado: "programada",
      notas: "",
    },
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, searchTerm, estadoFilter, dateFilter]);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("citas")
      .select(`
        *,
        paciente:profiles!paciente_id(nombre, apellidos),
        psicologo:profiles!psicologo_id(nombre, apellidos)
      `)
      .order("fecha_hora", { ascending: false });

    if (error) {
      toast.error("Error al cargar citas");
      console.error(error);
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.paciente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.paciente.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.psicologo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.psicologo.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.servicio.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Estado filter
    if (estadoFilter !== "all") {
      filtered = filtered.filter((apt) => apt.estado === estadoFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.fecha_hora);
        if (dateFilter === "today") {
          return aptDate >= today && aptDate < tomorrow;
        } else if (dateFilter === "week") {
          return aptDate >= today && aptDate < weekFromNow;
        } else if (dateFilter === "past") {
          return aptDate < today;
        }
        return true;
      });
    }

    setFilteredAppointments(filtered);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!editingAppointment) return;

    const { error } = await supabase
      .from("citas")
      .update({
        estado: data.estado,
        notas: data.notas || null,
      })
      .eq("id", editingAppointment.id);

    if (error) {
      toast.error(`Error al actualizar cita: ${error.message}`);
    } else {
      toast.success("Cita actualizada");
      fetchAppointments();
      handleCloseDialog();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta cita?")) return;

    const { error } = await supabase.from("citas").delete().eq("id", id);

    if (error) {
      toast.error(`Error al eliminar: ${error.message}`);
    } else {
      toast.success("Cita eliminada");
      fetchAppointments();
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    form.reset({
      estado: appointment.estado as "programada" | "completada" | "cancelada",
      notas: appointment.notas || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAppointment(null);
    form.reset({
      estado: "programada",
      notas: "",
    });
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "programada":
        return "default";
      case "completada":
        return "secondary";
      case "cancelada":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestión de Citas del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente, psicólogo o servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border text-foreground"
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="programada">Programada</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar por fecha" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="past">Pasadas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>
                {filteredAppointments.length} de {appointments.length} citas
              </span>
            </div>
          </div>

          {/* Table */}
          {filteredAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay citas que coincidan con los filtros
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Fecha y Hora</TableHead>
                    <TableHead className="text-muted-foreground">Paciente</TableHead>
                    <TableHead className="text-muted-foreground">Psicólogo</TableHead>
                    <TableHead className="text-muted-foreground">Servicio</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="border-border">
                      <TableCell className="text-foreground">
                        {format(new Date(appointment.fecha_hora), "PPp", { locale: es })}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {appointment.paciente.nombre} {appointment.paciente.apellidos}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {appointment.psicologo.nombre} {appointment.psicologo.apellidos}
                      </TableCell>
                      <TableCell className="text-foreground">{appointment.servicio}</TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadgeVariant(appointment.estado)}>
                          {appointment.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(appointment)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(appointment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Cita</DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Paciente:</strong> {editingAppointment.paciente.nombre}{" "}
                  {editingAppointment.paciente.apellidos}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Psicólogo:</strong> {editingAppointment.psicologo.nombre}{" "}
                  {editingAppointment.psicologo.apellidos}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Fecha:</strong>{" "}
                  {format(new Date(editingAppointment.fecha_hora), "PPp", { locale: es })}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Servicio:</strong> {editingAppointment.servicio}
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="programada">Programada</SelectItem>
                            <SelectItem value="completada">Completada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Notas</FormLabel>
                        <FormControl>
                          <Textarea
                            className="bg-background border-border text-foreground"
                            placeholder="Notas adicionales..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Actualizar
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
