import { useEffect, useState } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Eye } from "lucide-react";

interface Invoice {
  id: string;
  numero_factura: string;
  paciente_id: string;
  monto: number;
  concepto: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: "pendiente" | "pagada" | "cancelada";
  notas: string | null;
  paciente?: {
    nombre: string;
    apellidos: string;
  };
}

interface Patient {
  id: string;
  nombre: string;
  apellidos: string;
}

export function BillingManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    paciente_id: "",
    monto: "",
    concepto: "",
    fecha_vencimiento: "",
    notas: "",
  });

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchPatients();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("facturas")
        .select("*")
        .eq("psicologo_id", user?.id)
        .order("fecha_emision", { ascending: false });

      if (error) throw error;

      // Fetch patient details separately
      if (data) {
        const patientIds = [...new Set(data.map((f) => f.paciente_id))];
        const { data: patientsData } = await supabase
          .from("profiles")
          .select("id, nombre, apellidos")
          .in("id", patientIds);

        const invoicesWithPatients = data.map((invoice) => ({
          ...invoice,
          paciente: patientsData?.find((p) => p.id === invoice.paciente_id),
        })) as Invoice[];

        setInvoices(invoicesWithPatients);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las facturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data: citasData } = await supabase
        .from("citas")
        .select("paciente_id")
        .eq("psicologo_id", user?.id);

      if (citasData) {
        const patientIds = [...new Set(citasData.map((c) => c.paciente_id))];
        const { data: patientsData } = await supabase
          .from("profiles")
          .select("id, nombre, apellidos")
          .in("id", patientIds);

        setPatients(patientsData || []);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: numeroData } = await supabase.rpc("generate_invoice_number");
      
      const { error } = await supabase.from("facturas").insert({
        psicologo_id: user?.id,
        paciente_id: formData.paciente_id,
        numero_factura: numeroData,
        monto: parseFloat(formData.monto),
        concepto: formData.concepto,
        fecha_vencimiento: formData.fecha_vencimiento,
        notas: formData.notas || null,
      });

      if (error) throw error;

      toast({
        title: "Factura creada",
        description: "La factura se ha creado correctamente",
      });

      setIsDialogOpen(false);
      setFormData({
        paciente_id: "",
        monto: "",
        concepto: "",
        fecha_vencimiento: "",
        notas: "",
      });
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la factura",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: "pendiente" | "pagada" | "cancelada") => {
    try {
      const { error } = await supabase
        .from("facturas")
        .update({ estado: newStatus })
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado de la factura se ha actualizado correctamente",
      });

      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la factura",
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendiente: "default",
      pagada: "secondary",
      cancelada: "destructive",
    };
    return <Badge variant={variants[estado]}>{estado}</Badge>;
  };

  if (loading) {
    return <div className="text-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Facturación</CardTitle>
            <CardDescription>Gestiona las facturas de tus pacientes</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Factura</DialogTitle>
                <DialogDescription>
                  Completa los datos para generar una nueva factura
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paciente">Paciente</Label>
                  <Select
                    value={formData.paciente_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paciente_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.nombre} {patient.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto (€)</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) =>
                      setFormData({ ...formData, monto: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concepto">Concepto</Label>
                  <Input
                    id="concepto"
                    value={formData.concepto}
                    onChange={(e) =>
                      setFormData({ ...formData, concepto: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_vencimiento: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas (Opcional)</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) =>
                      setFormData({ ...formData, notas: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Crear Factura
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay facturas registradas
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.numero_factura}</TableCell>
                    <TableCell>
                      {invoice.paciente?.nombre} {invoice.paciente?.apellidos}
                    </TableCell>
                    <TableCell>{invoice.concepto}</TableCell>
                    <TableCell>€{invoice.monto.toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.fecha_emision), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={invoice.estado}
                        onValueChange={(value) =>
                          handleUpdateStatus(invoice.id, value as "pendiente" | "pagada" | "cancelada")
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="pagada">Pagada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Detalles de la Factura</DialogTitle>
                          </DialogHeader>
                          {selectedInvoice && (
                            <div className="space-y-4">
                              <div>
                                <Label>Número de Factura</Label>
                                <p className="text-foreground">{selectedInvoice.numero_factura}</p>
                              </div>
                              <div>
                                <Label>Paciente</Label>
                                <p className="text-foreground">
                                  {selectedInvoice.paciente?.nombre} {selectedInvoice.paciente?.apellidos}
                                </p>
                              </div>
                              <div>
                                <Label>Concepto</Label>
                                <p className="text-foreground">{selectedInvoice.concepto}</p>
                              </div>
                              <div>
                                <Label>Monto</Label>
                                <p className="text-foreground">€{selectedInvoice.monto.toFixed(2)}</p>
                              </div>
                              <div>
                                <Label>Fecha de Emisión</Label>
                                <p className="text-foreground">
                                  {format(new Date(selectedInvoice.fecha_emision), "dd/MM/yyyy", { locale: es })}
                                </p>
                              </div>
                              <div>
                                <Label>Fecha de Vencimiento</Label>
                                <p className="text-foreground">
                                  {format(new Date(selectedInvoice.fecha_vencimiento), "dd/MM/yyyy", { locale: es })}
                                </p>
                              </div>
                              <div>
                                <Label>Estado</Label>
                                <div className="mt-1">{getEstadoBadge(selectedInvoice.estado)}</div>
                              </div>
                              {selectedInvoice.notas && (
                                <div>
                                  <Label>Notas</Label>
                                  <p className="text-foreground">{selectedInvoice.notas}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
