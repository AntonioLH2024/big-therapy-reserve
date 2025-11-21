import { useState, useEffect } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Download, Eye, Trash2, Filter, X } from "lucide-react";
import { validateSpanishTaxId } from "@/lib/nif-validator";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { z } from "zod";

// Zod schemas
const invoiceLineSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida").max(500, "Máximo 500 caracteres"),
  cantidad: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  precio_unitario: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

const invoiceSchema = z.object({
  receptor_razon_social: z.string().min(1, "La razón social es requerida").max(200),
  receptor_nif: z.string().min(1, "El NIF/CIF es requerido").refine(validateSpanishTaxId, "NIF/CIF no válido"),
  receptor_direccion: z.string().min(1, "La dirección es requerida").max(300),
  receptor_codigo_postal: z.string().min(4, "Código postal inválido").max(10),
  receptor_ciudad: z.string().min(1, "La ciudad es requerida").max(100),
  receptor_provincia: z.string().min(1, "La provincia es requerida").max(100),
  fecha_servicio: z.string().optional(),
  notas: z.string().max(1000).optional(),
  lineas: z.array(invoiceLineSchema).min(1, "Debe haber al menos una línea"),
});

interface InvoiceLine {
  id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  numero_factura: string;
  serie: string;
  fecha_emision: string;
  fecha_servicio?: string;
  estado: "borrador" | "enviada" | "pagada" | "cancelada";
  paciente_id: string;
  receptor_razon_social: string;
  receptor_nif: string;
  receptor_direccion?: string | null;
  receptor_codigo_postal?: string | null;
  receptor_ciudad?: string | null;
  receptor_provincia?: string | null;
  base_imponible: number;
  iva_porcentaje: number;
  iva_importe: number;
  irpf_porcentaje: number;
  irpf_importe: number;
  total: number;
  exento_iva: boolean;
  notas?: string;
  paciente?: {
    nombre: string;
    apellidos: string;
  };
}

interface Patient {
  id: string;
  nombre: string;
  apellidos: string;
  nif_dni?: string;
  direccion?: string;
  codigo_postal?: string;
  ciudad?: string;
  provincia?: string;
}

interface BillingConfig {
  razon_social: string;
  nif_cif: string;
  direccion: string;
  codigo_postal: string;
  ciudad: string;
  provincia: string;
  telefono?: string;
  email?: string;
  web?: string;
  logo_url?: string;
  color_primario: string;
  color_secundario: string;
  footer_text: string;
  iva_por_defecto: number;
  irpf_por_defecto: number;
  exento_iva: boolean;
  texto_exencion_iva: string;
  serie_factura: string;
}

export function BillingManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);

  // Filtros
  const [filterNif, setFilterNif] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    paciente_id: "",
    fecha_servicio: "",
    notas: "",
    estado: "borrador" as "borrador" | "enviada" | "pagada" | "cancelada",
    receptor_razon_social: "",
    receptor_nif: "",
    receptor_direccion: "",
    receptor_codigo_postal: "",
    receptor_ciudad: "",
    receptor_provincia: "",
  });

  const [lines, setLines] = useState<InvoiceLine[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 },
  ]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchInvoices(), fetchPatients(), fetchConfig()]).finally(() => setLoading(false));
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("facturacion_config")
        .select("*")
        .eq("psicologo_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
    } catch (error: any) {
      console.error("Error fetching config:", error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("facturas")
        .select("*")
        .eq("psicologo_id", user?.id)
        .order("fecha_emision", { ascending: false });

      if (error) throw error;
      
      // Obtener nombres de pacientes por separado
      const invoicesWithPatients = await Promise.all(
        (data || []).map(async (invoice) => {
          const { data: patientData } = await supabase
            .from("profiles")
            .select("nombre, apellidos")
            .eq("id", invoice.paciente_id)
            .single();
          
          return {
            ...invoice,
            paciente: patientData
          };
        })
      );
      
      setInvoices(invoicesWithPatients as any);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast.error("Error al cargar las facturas");
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, apellidos, nif_dni, direccion, codigo_postal, ciudad, provincia")
        .in(
          "id",
          (
            await supabase
              .from("citas")
              .select("paciente_id")
              .eq("psicologo_id", user?.id)
          ).data?.map((c: any) => c.paciente_id) || []
        );

      if (error) throw error;
      setPatients(data as Patient[]);
    } catch (error: any) {
      console.error("Error fetching patients:", error);
    }
  };

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Calcular subtotal
    if (field === "cantidad" || field === "precio_unitario") {
      newLines[index].subtotal = newLines[index].cantidad * newLines[index].precio_unitario;
    }
    
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const base_imponible = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const iva_porcentaje = config?.exento_iva ? 0 : config?.iva_por_defecto || 0;
    const irpf_porcentaje = config?.irpf_por_defecto || 0;
    
    const iva_importe = (base_imponible * iva_porcentaje) / 100;
    const irpf_importe = (base_imponible * irpf_porcentaje) / 100;
    const total = base_imponible + iva_importe - irpf_importe;
    
    return {
      base_imponible,
      iva_porcentaje,
      iva_importe,
      irpf_porcentaje,
      irpf_importe,
      total,
    };
  };

  const handleCreateInvoice = async () => {
    try {
      // Validar configuración
      if (!config) {
        toast.error("Debe configurar los datos de facturación primero");
        return;
      }

      // Validar campos requeridos
      if (!formData.paciente_id) {
        toast.error("Debe seleccionar un paciente");
        return;
      }

      if (!formData.receptor_razon_social || !formData.receptor_nif) {
        toast.error("Debe completar los datos del receptor (nombre y NIF/CIF)");
        return;
      }

      // Validar NIF/CIF
      if (!validateSpanishTaxId(formData.receptor_nif)) {
        toast.error("El NIF/CIF del receptor no es válido");
        return;
      }

      // Validar líneas
      if (lines.length === 0 || lines.some(l => !l.descripcion || l.cantidad <= 0)) {
        toast.error("Debe añadir al menos una línea con descripción y cantidad válida");
        return;
      }

      const totals = calculateTotals();

      if (isEditMode && selectedInvoice) {
        // Actualizar factura existente
        const { error: updateError } = await supabase
          .from("facturas")
          .update({
            estado: formData.estado,
            fecha_servicio: formData.fecha_servicio || null,
            receptor_razon_social: formData.receptor_razon_social,
            receptor_nif: formData.receptor_nif,
            receptor_direccion: formData.receptor_direccion || null,
            receptor_codigo_postal: formData.receptor_codigo_postal || null,
            receptor_ciudad: formData.receptor_ciudad || null,
            receptor_provincia: formData.receptor_provincia || null,
            ...totals,
            notas: formData.notas,
            concepto: lines.map((l) => l.descripcion).join(", "),
          } as any)
          .eq("id", selectedInvoice.id);

        if (updateError) throw updateError;

        // Eliminar líneas antiguas y crear nuevas
        await supabase.from("facturas_lineas").delete().eq("factura_id", selectedInvoice.id);
        
        const { error: linesError } = await supabase.from("facturas_lineas").insert(
          lines.map((line, index) => ({
            factura_id: selectedInvoice.id,
            descripcion: line.descripcion,
            cantidad: line.cantidad,
            precio_unitario: line.precio_unitario,
            subtotal: line.subtotal,
            orden: index,
          }))
        );

        if (linesError) throw linesError;

        toast.success("Factura actualizada correctamente");
      } else {
        // Crear nueva factura
        // Generar número de factura
        const { data: numeroData, error: numeroError } = await supabase.rpc(
          "generate_invoice_number_with_serie",
          { p_psicologo_id: user?.id }
        );

        if (numeroError) throw numeroError;

        // Crear factura
        const invoiceInsertData: any = {
          psicologo_id: user?.id,
          paciente_id: formData.paciente_id,
          numero_factura: numeroData,
          serie: config.serie_factura || "F",
          estado: formData.estado,
          fecha_emision: new Date().toISOString(),
          fecha_servicio: formData.fecha_servicio || null,
          fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
          monto: totals.base_imponible,
          // Emisor
          emisor_razon_social: config.razon_social,
          emisor_nif: config.nif_cif,
          emisor_direccion: config.direccion,
          emisor_codigo_postal: config.codigo_postal,
          emisor_ciudad: config.ciudad,
          emisor_provincia: config.provincia,
          // Receptor
          receptor_razon_social: formData.receptor_razon_social,
          receptor_nif: formData.receptor_nif,
          receptor_direccion: formData.receptor_direccion || null,
          receptor_codigo_postal: formData.receptor_codigo_postal || null,
          receptor_ciudad: formData.receptor_ciudad || null,
          receptor_provincia: formData.receptor_provincia || null,
          // Totales
          ...totals,
          exento_iva: config.exento_iva,
          texto_exencion: config.texto_exencion_iva,
          notas: formData.notas,
          concepto: lines.map((l) => l.descripcion).join(", "),
        };

        const { data: invoiceData, error: invoiceError } = await supabase
          .from("facturas")
          .insert(invoiceInsertData)
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Crear líneas de factura
        const { error: linesError } = await supabase.from("facturas_lineas").insert(
          lines.map((line, index) => ({
            factura_id: invoiceData.id,
            descripcion: line.descripcion,
            cantidad: line.cantidad,
            precio_unitario: line.precio_unitario,
            subtotal: line.subtotal,
            orden: index,
          }))
        );

        if (linesError) throw linesError;

        toast.success("Factura creada correctamente");
      }

      setIsDialogOpen(false);
      setIsEditMode(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      console.error("Error creating/updating invoice:", error);
      toast.error("Error al procesar la factura: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      paciente_id: "",
      fecha_servicio: "",
      notas: "",
      estado: "borrador",
      receptor_razon_social: "",
      receptor_nif: "",
      receptor_direccion: "",
      receptor_codigo_postal: "",
      receptor_ciudad: "",
      receptor_provincia: "",
    });
    setLines([{ descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
    setIsEditMode(false);
    setSelectedInvoice(null);
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("facturas")
        .update({ estado: newStatus })
        .eq("id", invoiceId);

      if (error) throw error;

      toast.success("Estado actualizado correctamente");
      fetchInvoices();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar el estado");
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Obtener líneas de la factura
      const { data: linesData, error: linesError } = await supabase
        .from("facturas_lineas")
        .select("*")
        .eq("factura_id", invoice.id)
        .order("orden");

      if (linesError) throw linesError;

      // Obtener datos completos del emisor y receptor
      const { data: facturaCompleta, error: facturaError } = await supabase
        .from("facturas")
        .select("*")
        .eq("id", invoice.id)
        .single();

      if (facturaError) throw facturaError;

      const pdfData = {
        ...facturaCompleta,
        lineas: linesData,
        logo_url: config?.logo_url,
        color_primario: config?.color_primario,
        color_secundario: config?.color_secundario,
        footer_text: config?.footer_text,
        emisor_telefono: config?.telefono,
        emisor_email: config?.email,
        emisor_web: config?.web,
      };

      const doc = generateInvoicePDF(pdfData);
      doc.save(`Factura_${invoice.numero_factura}.pdf`);
      
      toast.success("PDF descargado correctamente");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  const handleViewDetail = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    // Obtener líneas de la factura
    try {
      const { data: linesData, error } = await supabase
        .from("facturas_lineas")
        .select("*")
        .eq("factura_id", invoice.id)
        .order("orden");
      
      if (error) throw error;
      setInvoiceLines(linesData || []);
    } catch (error) {
      console.error("Error fetching invoice lines:", error);
      setInvoiceLines([]);
    }
    
    setIsDetailDialogOpen(true);
  };

  const handleEditInvoice = () => {
    if (!selectedInvoice) return;
    
    // Cargar datos de la factura en el formulario
    setFormData({
      paciente_id: selectedInvoice.paciente_id,
      fecha_servicio: selectedInvoice.fecha_servicio || "",
      estado: selectedInvoice.estado,
      notas: selectedInvoice.notas || "",
      receptor_razon_social: selectedInvoice.receptor_razon_social,
      receptor_nif: selectedInvoice.receptor_nif,
      receptor_direccion: selectedInvoice.receptor_direccion || "",
      receptor_codigo_postal: selectedInvoice.receptor_codigo_postal || "",
      receptor_ciudad: selectedInvoice.receptor_ciudad || "",
      receptor_provincia: selectedInvoice.receptor_provincia || "",
    });
    
    setLines(invoiceLines.map(line => ({
      id: line.id,
      descripcion: line.descripcion,
      cantidad: line.cantidad,
      precio_unitario: line.precio_unitario,
      subtotal: line.subtotal
    })));
    
    setIsEditMode(true);
    setIsDetailDialogOpen(false);
    setIsDialogOpen(true);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, any> = {
      borrador: { variant: "secondary", label: "Borrador" },
      enviada: { variant: "default", label: "Enviada" },
      pagada: { variant: "default", label: "Pagada", className: "bg-green-600" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    
    const config = variants[estado] || variants.borrador;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (filterNif && !invoice.receptor_nif.includes(filterNif.toUpperCase())) return false;
    if (filterCliente && !invoice.receptor_razon_social.toLowerCase().includes(filterCliente.toLowerCase())) return false;
    if (filterEstado !== "todos" && invoice.estado !== filterEstado) return false;
    if (filterFechaDesde && new Date(invoice.fecha_emision) < new Date(filterFechaDesde)) return false;
    if (filterFechaHasta && new Date(invoice.fecha_emision) > new Date(filterFechaHasta)) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterNif("");
    setFilterCliente("");
    setFilterEstado("todos");
    setFilterFechaDesde("");
    setFilterFechaHasta("");
  };

  const totals = calculateTotals();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración Requerida</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Debe configurar los datos de facturación antes de crear facturas.
          </p>
          <p className="text-sm text-muted-foreground">
            Vaya a la pestaña de configuración en el menú lateral.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestión de Facturas
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Editar Factura" : "Crear Nueva Factura"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Selección de paciente */}
                <div className="space-y-2">
                  <Label htmlFor="paciente">Cliente / Paciente *</Label>
                  <Select 
                    value={formData.paciente_id} 
                    onValueChange={(value) => {
                      const patient = patients.find(p => p.id === value);
                      setFormData({ 
                        ...formData, 
                        paciente_id: value,
                        receptor_razon_social: patient ? `${patient.nombre} ${patient.apellidos}` : "",
                        receptor_nif: patient?.nif_dni || "",
                        receptor_direccion: patient?.direccion || "",
                        receptor_codigo_postal: patient?.codigo_postal || "",
                        receptor_ciudad: patient?.ciudad || "",
                        receptor_provincia: patient?.provincia || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.nombre} {patient.apellidos}
                          {patient.nif_dni && ` - ${patient.nif_dni}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Datos del Receptor */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Datos del Receptor</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="receptor_razon_social">Nombre Completo / Razón Social *</Label>
                      <Input
                        id="receptor_razon_social"
                        value={formData.receptor_razon_social}
                        onChange={(e) => setFormData({ ...formData, receptor_razon_social: e.target.value })}
                        placeholder="Nombre completo o razón social"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="receptor_nif">NIF/CIF *</Label>
                      <Input
                        id="receptor_nif"
                        value={formData.receptor_nif}
                        onChange={(e) => setFormData({ ...formData, receptor_nif: e.target.value.toUpperCase() })}
                        placeholder="12345678A o X1234567A"
                        required
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="receptor_direccion">Dirección</Label>
                      <Input
                        id="receptor_direccion"
                        value={formData.receptor_direccion}
                        onChange={(e) => setFormData({ ...formData, receptor_direccion: e.target.value })}
                        placeholder="Calle, número, piso..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="receptor_codigo_postal">Código Postal</Label>
                      <Input
                        id="receptor_codigo_postal"
                        value={formData.receptor_codigo_postal}
                        onChange={(e) => setFormData({ ...formData, receptor_codigo_postal: e.target.value })}
                        placeholder="28001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="receptor_ciudad">Ciudad</Label>
                      <Input
                        id="receptor_ciudad"
                        value={formData.receptor_ciudad}
                        onChange={(e) => setFormData({ ...formData, receptor_ciudad: e.target.value })}
                        placeholder="Madrid"
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="receptor_provincia">Provincia</Label>
                      <Input
                        id="receptor_provincia"
                        value={formData.receptor_provincia}
                        onChange={(e) => setFormData({ ...formData, receptor_provincia: e.target.value })}
                        placeholder="Madrid"
                      />
                    </div>
                  </div>
                </div>

                {/* Fecha del servicio */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_servicio">Fecha del Servicio</Label>
                    <Input
                      id="fecha_servicio"
                      type="date"
                      value={formData.fecha_servicio}
                      onChange={(e) => setFormData({ ...formData, fecha_servicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(value: any) => setFormData({ ...formData, estado: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="enviada">Enviada</SelectItem>
                        <SelectItem value="pagada">Pagada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Líneas de factura */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Conceptos / Servicios *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir línea
                    </Button>
                  </div>
                  
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Input
                          placeholder="Descripción del servicio"
                          value={line.descripcion}
                          onChange={(e) => handleLineChange(index, "descripcion", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Cant."
                          step="0.01"
                          min="0"
                          value={line.cantidad}
                          onChange={(e) => handleLineChange(index, "cantidad", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Precio"
                          step="0.01"
                          min="0"
                          value={line.precio_unitario}
                          onChange={(e) => handleLineChange(index, "precio_unitario", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input value={`${line.subtotal.toFixed(2)} €`} disabled />
                      </div>
                      <div className="col-span-1">
                        {lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen de totales */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="space-y-2 w-64">
                      <div className="flex justify-between text-sm">
                        <span>Base imponible:</span>
                        <span>{totals.base_imponible.toFixed(2)} €</span>
                      </div>
                      {config.exento_iva ? (
                        <div className="flex justify-between text-sm">
                          <span>IVA:</span>
                          <span>Exento</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span>IVA ({totals.iva_porcentaje}%):</span>
                          <span>{totals.iva_importe.toFixed(2)} €</span>
                        </div>
                      )}
                      {totals.irpf_porcentaje > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>IRPF ({totals.irpf_porcentaje}%):</span>
                          <span>-{totals.irpf_importe.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>TOTAL:</span>
                        <span>{totals.total.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas / Observaciones</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    rows={3}
                    placeholder="Información adicional sobre la factura..."
                  />
                </div>

                <Button onClick={handleCreateInvoice} className="w-full">
                  {isEditMode ? "Actualizar Factura" : "Crear Factura"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros Avanzados
              </h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-cliente">Cliente</Label>
                <Input
                  id="filter-cliente"
                  placeholder="Buscar por nombre"
                  value={filterCliente}
                  onChange={(e) => setFilterCliente(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="filter-nif">NIF/CIF</Label>
                <Input
                  id="filter-nif"
                  placeholder="Buscar por NIF/CIF"
                  value={filterNif}
                  onChange={(e) => setFilterNif(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-estado">Estado</Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                    <SelectItem value="pagada">Pagada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="filter-fecha-desde">Desde</Label>
                  <Input
                    id="filter-fecha-desde"
                    type="date"
                    value={filterFechaDesde}
                    onChange={(e) => setFilterFechaDesde(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="filter-fecha-hasta">Hasta</Label>
                  <Input
                    id="filter-fecha-hasta"
                    type="date"
                    value={filterFechaHasta}
                    onChange={(e) => setFilterFechaHasta(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de facturas */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>NIF/CIF</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.numero_factura}</TableCell>
                  <TableCell>{new Date(invoice.fecha_emision).toLocaleDateString("es-ES")}</TableCell>
                  <TableCell>
                    {invoice.receptor_razon_social || `${invoice.paciente?.nombre || ""} ${invoice.paciente?.apellidos || ""}`.trim() || "Sin nombre"}
                  </TableCell>
                  <TableCell>{invoice.receptor_nif || "-"}</TableCell>
                  <TableCell>{invoice.total.toFixed(2)} €</TableCell>
                  <TableCell>
                    <Select
                      value={invoice.estado}
                      onValueChange={(value) => handleUpdateStatus(invoice.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="enviada">Enviada</SelectItem>
                        <SelectItem value="pagada">Pagada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron facturas con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Factura {selectedInvoice?.numero_factura}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && config && (
            <div className="space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-base border-b pb-2">Información de la Factura</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Número:</strong> {selectedInvoice.numero_factura}</p>
                    <p><strong>Serie:</strong> {selectedInvoice.serie}</p>
                    <p><strong>Fecha de emisión:</strong> {new Date(selectedInvoice.fecha_emision).toLocaleDateString("es-ES")}</p>
                    {selectedInvoice.fecha_servicio && (
                      <p><strong>Fecha del servicio:</strong> {new Date(selectedInvoice.fecha_servicio).toLocaleDateString("es-ES")}</p>
                    )}
                    <p><strong>Estado:</strong> {getEstadoBadge(selectedInvoice.estado)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-base border-b pb-2">Datos del Emisor</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>{config.razon_social}</strong></p>
                    <p>NIF: {config.nif_cif}</p>
                    <p>{config.direccion}</p>
                    <p>{config.codigo_postal} {config.ciudad} ({config.provincia})</p>
                    {config.telefono && <p>Tel: {config.telefono}</p>}
                    {config.email && <p>Email: {config.email}</p>}
                  </div>
                </div>
              </div>

              {/* Datos del Receptor */}
              <div>
                <h4 className="font-semibold text-base border-b pb-2 mb-2">Datos del Receptor</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>{selectedInvoice.receptor_razon_social}</strong></p>
                  <p>NIF: {selectedInvoice.receptor_nif}</p>
                  {selectedInvoice.receptor_direccion && <p>{selectedInvoice.receptor_direccion}</p>}
                  {(selectedInvoice.receptor_codigo_postal || selectedInvoice.receptor_ciudad || selectedInvoice.receptor_provincia) && (
                    <p>
                      {selectedInvoice.receptor_codigo_postal} {selectedInvoice.receptor_ciudad} 
                      {selectedInvoice.receptor_provincia && ` (${selectedInvoice.receptor_provincia})`}
                    </p>
                  )}
                </div>
              </div>

              {/* Líneas de Factura */}
              <div>
                <h4 className="font-semibold text-base border-b pb-2 mb-2">Conceptos / Servicios</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>{line.descripcion}</TableCell>
                        <TableCell className="text-right">{line.cantidad}</TableCell>
                        <TableCell className="text-right">{line.precio_unitario.toFixed(2)} €</TableCell>
                        <TableCell className="text-right">{line.subtotal.toFixed(2)} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totales */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base imponible:</span>
                    <span className="font-medium">{selectedInvoice.base_imponible.toFixed(2)} €</span>
                  </div>
                  
                  {selectedInvoice.exento_iva ? (
                    <div className="flex justify-between">
                      <span>IVA:</span>
                      <span className="font-medium">Exento</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>IVA ({selectedInvoice.iva_porcentaje}%):</span>
                      <span className="font-medium">{selectedInvoice.iva_importe.toFixed(2)} €</span>
                    </div>
                  )}
                  
                  {selectedInvoice.irpf_porcentaje > 0 && (
                    <div className="flex justify-between">
                      <span>IRPF ({selectedInvoice.irpf_porcentaje}%):</span>
                      <span className="font-medium">-{selectedInvoice.irpf_importe.toFixed(2)} €</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>TOTAL:</span>
                    <span>{selectedInvoice.total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Texto de exención IVA */}
              {selectedInvoice.exento_iva && config.texto_exencion_iva && (
                <div className="text-xs text-muted-foreground italic bg-muted p-3 rounded">
                  {config.texto_exencion_iva}
                </div>
              )}

              {/* Notas */}
              {selectedInvoice.notas && (
                <div>
                  <h4 className="font-semibold text-base border-b pb-2 mb-2">Notas / Observaciones</h4>
                  <p className="text-sm">{selectedInvoice.notas}</p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button onClick={handleEditInvoice} variant="outline" className="flex-1">
                  Editar Factura
                </Button>
                <Button onClick={() => handleDownloadPDF(selectedInvoice)} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
