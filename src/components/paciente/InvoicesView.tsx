import { useEffect, useState } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Download, FileText } from "lucide-react";
import { jsPDF } from "jspdf";

interface Invoice {
  id: string;
  numero_factura: string;
  monto: number;
  concepto: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: "pendiente" | "pagada" | "cancelada";
  notas: string | null;
  psicologo?: {
    nombre: string;
    apellidos: string;
    telefono: string;
  };
}

export function InvoicesView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("facturas")
        .select("*")
        .eq("paciente_id", user?.id)
        .order("fecha_emision", { ascending: false });

      if (error) throw error;

      // Fetch psychologist details separately
      if (data) {
        const psychologistIds = [...new Set(data.map((f) => f.psicologo_id))];
        const { data: psychologistsData } = await supabase
          .from("profiles")
          .select("id, nombre, apellidos, telefono")
          .in("id", psychologistIds);

        const invoicesWithPsychologists = data.map((invoice) => ({
          ...invoice,
          psicologo: psychologistsData?.find((p) => p.id === invoice.psicologo_id),
        })) as Invoice[];

        setInvoices(invoicesWithPsychologists);
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

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURA", 105, 20, { align: "center" });
    
    // Invoice number and date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Número: ${invoice.numero_factura}`, 20, 35);
    doc.text(`Fecha de Emisión: ${format(new Date(invoice.fecha_emision), "dd/MM/yyyy", { locale: es })}`, 20, 42);
    doc.text(`Fecha de Vencimiento: ${format(new Date(invoice.fecha_vencimiento), "dd/MM/yyyy", { locale: es })}`, 20, 49);
    
    // Psychologist info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Datos del Profesional", 20, 65);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (invoice.psicologo) {
      doc.text(`Nombre: ${invoice.psicologo.nombre} ${invoice.psicologo.apellidos}`, 20, 73);
      doc.text(`Teléfono: ${invoice.psicologo.telefono}`, 20, 80);
    }
    
    // Invoice details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Detalles de la Factura", 20, 96);
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 104, 170, 8, "F");
    doc.setFontSize(10);
    doc.text("Concepto", 25, 109);
    doc.text("Importe", 160, 109);
    
    // Table content
    doc.setFont("helvetica", "normal");
    doc.text(invoice.concepto, 25, 119);
    doc.text(`€${invoice.monto.toFixed(2)}`, 160, 119);
    
    // Total
    doc.setFont("helvetica", "bold");
    doc.line(20, 126, 190, 126);
    doc.setFontSize(12);
    doc.text("TOTAL:", 140, 136);
    doc.text(`€${invoice.monto.toFixed(2)}`, 160, 136);
    
    // Status
    doc.setFontSize(10);
    doc.text(`Estado: ${invoice.estado.toUpperCase()}`, 20, 151);
    
    // Notes
    if (invoice.notas) {
      doc.setFont("helvetica", "bold");
      doc.text("Notas:", 20, 166);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(invoice.notas, 170);
      doc.text(splitNotes, 20, 174);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text("Gracias por su confianza", 105, 280, { align: "center" });
    
    // Save PDF
    doc.save(`Factura_${invoice.numero_factura}.pdf`);
    
    toast({
      title: "PDF generado",
      description: "La factura se ha descargado correctamente",
    });
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Mis Facturas</CardTitle>
            <CardDescription>Consulta y descarga tus facturas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Profesional</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No tienes facturas registradas
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.numero_factura}</TableCell>
                  <TableCell>
                    {invoice.psicologo?.nombre} {invoice.psicologo?.apellidos}
                  </TableCell>
                  <TableCell>{invoice.concepto}</TableCell>
                  <TableCell>€{invoice.monto.toFixed(2)}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.fecha_emision), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{getEstadoBadge(invoice.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generatePDF(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
                              <Button
                                onClick={() => generatePDF(selectedInvoice)}
                                className="w-full"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar PDF
                              </Button>
                              <div>
                                <Label>Número de Factura</Label>
                                <p className="text-foreground">{selectedInvoice.numero_factura}</p>
                              </div>
                              <div>
                                <Label>Profesional</Label>
                                <p className="text-foreground">
                                  {selectedInvoice.psicologo?.nombre} {selectedInvoice.psicologo?.apellidos}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
