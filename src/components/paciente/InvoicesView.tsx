import { useEffect, useState } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Download, FileText } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdf-generator";

interface InvoiceLine {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  numero_factura: string;
  serie: string;
  monto: number;
  concepto: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_servicio: string | null;
  estado: string;
  notas: string | null;
  
  // Emisor
  emisor_razon_social: string;
  emisor_nif: string;
  emisor_direccion: string;
  emisor_codigo_postal: string;
  emisor_ciudad: string;
  emisor_provincia: string;
  emisor_telefono?: string;
  emisor_email?: string;
  emisor_web?: string;
  
  // Receptor
  receptor_razon_social: string;
  receptor_nif: string;
  receptor_direccion?: string | null;
  receptor_codigo_postal?: string | null;
  receptor_ciudad?: string | null;
  receptor_provincia?: string | null;
  receptor_telefono?: string | null;
  receptor_email?: string | null;
  
  // Importes
  base_imponible: number;
  iva_porcentaje: number;
  iva_importe: number;
  total: number;
  exento_iva: boolean;
  texto_exencion?: string;
  
  // Configuración
  logo_url?: string;
  color_primario?: string;
  color_secundario?: string;
  footer_text?: string;
  
  // Líneas
  lineas?: InvoiceLine[];
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
      const { data: invoicesData, error } = await supabase
        .from("facturas")
        .select("*")
        .eq("paciente_id", user?.id)
        .order("fecha_emision", { ascending: false });

      if (error) throw error;

      if (!invoicesData || invoicesData.length === 0) {
        setInvoices([]);
        return;
      }

      // Fetch invoice lines, billing config, and psychologist details
      const invoicesWithDetails = await Promise.all(
        invoicesData.map(async (invoice) => {
          // Fetch invoice lines
          const { data: lineasData } = await supabase
            .from("facturas_lineas")
            .select("descripcion, cantidad, precio_unitario, subtotal")
            .eq("factura_id", invoice.id)
            .order("orden");

          // Fetch billing config
          const { data: configData } = await supabase
            .from("facturacion_config")
            .select("*")
            .eq("psicologo_id", invoice.psicologo_id)
            .single();

          return {
            ...invoice,
            lineas: lineasData || [],
            logo_url: configData?.logo_url,
            color_primario: configData?.color_primario,
            color_secundario: configData?.color_secundario,
            footer_text: configData?.footer_text,
            emisor_telefono: configData?.telefono,
            emisor_email: configData?.email,
            emisor_web: configData?.web,
          } as Invoice;
        })
      );

      setInvoices(invoicesWithDetails);
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
    try {
      const doc = generateInvoicePDF({
        numero_factura: invoice.numero_factura,
        serie: invoice.serie,
        fecha_emision: invoice.fecha_emision,
        fecha_servicio: invoice.fecha_servicio || undefined,
        
        emisor_razon_social: invoice.emisor_razon_social,
        emisor_nif: invoice.emisor_nif,
        emisor_direccion: invoice.emisor_direccion,
        emisor_codigo_postal: invoice.emisor_codigo_postal,
        emisor_ciudad: invoice.emisor_ciudad,
        emisor_provincia: invoice.emisor_provincia,
        emisor_telefono: invoice.emisor_telefono,
        emisor_email: invoice.emisor_email,
        emisor_web: invoice.emisor_web,
        
        receptor_razon_social: invoice.receptor_razon_social,
        receptor_nif: invoice.receptor_nif,
        receptor_direccion: invoice.receptor_direccion,
        receptor_codigo_postal: invoice.receptor_codigo_postal,
        receptor_ciudad: invoice.receptor_ciudad,
        receptor_provincia: invoice.receptor_provincia,
        receptor_telefono: invoice.receptor_telefono,
        receptor_email: invoice.receptor_email,
        
        lineas: invoice.lineas || [],
        
        base_imponible: invoice.base_imponible,
        iva_porcentaje: invoice.iva_porcentaje,
        iva_importe: invoice.iva_importe,
        total: invoice.total,
        exento_iva: invoice.exento_iva,
        texto_exencion: invoice.texto_exencion,
        
        logo_url: invoice.logo_url,
        color_primario: invoice.color_primario,
        color_secundario: invoice.color_secundario,
        footer_text: invoice.footer_text,
      });
      
      doc.save(`Factura_${invoice.numero_factura}.pdf`);
      
      toast({
        title: "PDF generado",
        description: "La factura se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      borrador: "default",
      pendiente: "default",
      enviada: "default",
      pagada: "secondary",
      cancelada: "destructive",
    };
    return <Badge variant={variants[estado] || "default"}>{estado}</Badge>;
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
              <TableHead>Emisor</TableHead>
              <TableHead>Total</TableHead>
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
                  <TableCell>{invoice.emisor_razon_social}</TableCell>
                  <TableCell>€{invoice.total.toFixed(2)}</TableCell>
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
                        title="Descargar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[80vh] overflow-y-auto">
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
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Número de Factura</Label>
                                  <p className="text-foreground">{selectedInvoice.numero_factura}</p>
                                </div>
                                <div>
                                  <Label>Estado</Label>
                                  <div className="mt-1">{getEstadoBadge(selectedInvoice.estado)}</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
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
                              </div>

                              <div>
                                <Label className="text-sm font-semibold">Emisor</Label>
                                <div className="mt-2 space-y-1 text-sm">
                                  <p className="text-foreground">{selectedInvoice.emisor_razon_social}</p>
                                  <p className="text-muted-foreground">NIF: {selectedInvoice.emisor_nif}</p>
                                  <p className="text-muted-foreground">{selectedInvoice.emisor_direccion}</p>
                                  <p className="text-muted-foreground">
                                    {selectedInvoice.emisor_codigo_postal} {selectedInvoice.emisor_ciudad} ({selectedInvoice.emisor_provincia})
                                  </p>
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm font-semibold">Receptor</Label>
                                <div className="mt-2 space-y-1 text-sm">
                                  <p className="text-foreground">{selectedInvoice.receptor_razon_social}</p>
                                  <p className="text-muted-foreground">NIF: {selectedInvoice.receptor_nif}</p>
                                  {selectedInvoice.receptor_direccion && (
                                    <p className="text-muted-foreground">{selectedInvoice.receptor_direccion}</p>
                                  )}
                                  {(selectedInvoice.receptor_codigo_postal || selectedInvoice.receptor_ciudad) && (
                                    <p className="text-muted-foreground">
                                      {selectedInvoice.receptor_codigo_postal} {selectedInvoice.receptor_ciudad} 
                                      {selectedInvoice.receptor_provincia && ` (${selectedInvoice.receptor_provincia})`}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm font-semibold">Servicios</Label>
                                <div className="mt-2 space-y-2">
                                  {selectedInvoice.lineas?.map((linea, idx) => (
                                    <div key={idx} className="flex justify-between text-sm border-b pb-2">
                                      <div>
                                        <p className="text-foreground">{linea.descripcion}</p>
                                        <p className="text-muted-foreground text-xs">
                                          {linea.cantidad} x €{linea.precio_unitario.toFixed(2)}
                                        </p>
                                      </div>
                                      <p className="text-foreground font-medium">€{linea.subtotal.toFixed(2)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2 pt-4 border-t">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Base imponible:</span>
                                  <span className="text-foreground">€{selectedInvoice.base_imponible.toFixed(2)}</span>
                                </div>
                                {selectedInvoice.exento_iva ? (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">IVA:</span>
                                    <span className="text-foreground">Exento</span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">IVA ({selectedInvoice.iva_porcentaje}%):</span>
                                    <span className="text-foreground">€{selectedInvoice.iva_importe.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                  <span>TOTAL:</span>
                                  <span>€{selectedInvoice.total.toFixed(2)}</span>
                                </div>
                              </div>

                              {selectedInvoice.notas && (
                                <div>
                                  <Label>Notas</Label>
                                  <p className="text-foreground text-sm mt-1">{selectedInvoice.notas}</p>
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
