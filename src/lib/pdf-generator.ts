import jsPDF from "jspdf";

interface InvoiceLine {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface InvoiceData {
  // Numeración
  numero_factura: string;
  serie: string;
  fecha_emision: string;
  fecha_servicio?: string;
  
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
  
  // Líneas de factura
  lineas: InvoiceLine[];
  
  // Importes
  base_imponible: number;
  iva_porcentaje: number;
  iva_importe: number;
  total: number;
  exento_iva: boolean;
  texto_exencion?: string;
  
  // Personalización
  logo_url?: string;
  color_primario?: string;
  color_secundario?: string;
  footer_text?: string;
}

export function generateInvoicePDF(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colores corporativos
  const primaryColor = hexToRgb(invoice.color_primario || "#1e40af");
  const secondaryColor = hexToRgb(invoice.color_secundario || "#10b981");
  
  let yPos = 20;
  
  // === ENCABEZADO ===
  // Barra superior azul
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Logo (si existe)
  if (invoice.logo_url && !invoice.logo_url.startsWith("data:")) {
    try {
      doc.addImage(invoice.logo_url, "PNG", 15, 10, 30, 20);
    } catch (e) {
      console.error("Error adding logo:", e);
    }
  }
  
  // Título FACTURA
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA", pageWidth - 15, 25, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`${invoice.numero_factura}`, pageWidth - 15, 33, { align: "right" });
  
  yPos = 50;
  
  // === DATOS EMISOR Y RECEPTOR ===
  doc.setTextColor(0, 0, 0);
  
  // Emisor (izquierda)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("DATOS DEL EMISOR", 15, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  yPos += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.emisor_razon_social || "", 15, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`NIF: ${invoice.emisor_nif || ""}`, 15, yPos);
  yPos += 5;
  doc.text(invoice.emisor_direccion || "", 15, yPos);
  yPos += 5;
  doc.text(`${invoice.emisor_codigo_postal || ""} ${invoice.emisor_ciudad || ""} (${invoice.emisor_provincia || ""})`, 15, yPos);
  
  if (invoice.emisor_telefono) {
    yPos += 5;
    doc.text(`Tel: ${invoice.emisor_telefono}`, 15, yPos);
  }
  if (invoice.emisor_email) {
    yPos += 5;
    doc.text(`Email: ${invoice.emisor_email}`, 15, yPos);
  }
  if (invoice.emisor_web) {
    yPos += 5;
    doc.text(`Web: ${invoice.emisor_web}`, 15, yPos);
  }
  
  // Receptor (derecha)
  let yPosRight = 50;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("DATOS DEL RECEPTOR", pageWidth - 15, yPosRight, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  yPosRight += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.receptor_razon_social || "", pageWidth - 15, yPosRight, { align: "right" });
  yPosRight += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`NIF: ${invoice.receptor_nif || ""}`, pageWidth - 15, yPosRight, { align: "right" });
  yPosRight += 5;
  if (invoice.receptor_direccion) {
    doc.text(invoice.receptor_direccion, pageWidth - 15, yPosRight, { align: "right" });
    yPosRight += 5;
  }
  if (invoice.receptor_codigo_postal || invoice.receptor_ciudad || invoice.receptor_provincia) {
    doc.text(`${invoice.receptor_codigo_postal || ""} ${invoice.receptor_ciudad || ""} ${invoice.receptor_provincia ? `(${invoice.receptor_provincia})` : ""}`.trim(), pageWidth - 15, yPosRight, { align: "right" });
    yPosRight += 5;
  }
  if (invoice.receptor_telefono) {
    doc.text(`Tel: ${invoice.receptor_telefono}`, pageWidth - 15, yPosRight, { align: "right" });
    yPosRight += 5;
  }
  if (invoice.receptor_email) {
    doc.text(`Email: ${invoice.receptor_email}`, pageWidth - 15, yPosRight, { align: "right" });
    yPosRight += 5;
  }
  
  // Fechas
  yPos = Math.max(yPos, yPosRight) + 10;
  doc.setFontSize(9);
  doc.text(`Fecha de emisión: ${new Date(invoice.fecha_emision).toLocaleDateString("es-ES")}`, 15, yPos);
  if (invoice.fecha_servicio) {
    yPos += 5;
    doc.text(`Fecha del servicio: ${new Date(invoice.fecha_servicio).toLocaleDateString("es-ES")}`, 15, yPos);
  }
  
  yPos += 15;
  
  // === TABLA DE CONCEPTOS ===
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(15, yPos, pageWidth - 30, 8, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Descripción", 20, yPos + 5);
  doc.text("Cant.", pageWidth - 80, yPos + 5, { align: "right" });
  doc.text("Precio Unit.", pageWidth - 55, yPos + 5, { align: "right" });
  doc.text("Subtotal", pageWidth - 20, yPos + 5, { align: "right" });
  
  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  
  // Líneas de factura
  invoice.lineas.forEach((linea, index) => {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }
    
    // Alternar color de fondo
    if (index % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(15, yPos - 4, pageWidth - 30, 7, "F");
    }
    
    doc.text(linea.descripcion, 20, yPos);
    doc.text(linea.cantidad.toString(), pageWidth - 80, yPos, { align: "right" });
    doc.text(`${linea.precio_unitario.toFixed(2)} €`, pageWidth - 55, yPos, { align: "right" });
    doc.text(`${linea.subtotal.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 7;
  });
  
  yPos += 10;
  
  // === TOTALES ===
  const totalsX = pageWidth - 70;
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX - 10, yPos, pageWidth - 15, yPos);
  yPos += 7;
  
  doc.setFontSize(9);
  doc.text("Base imponible:", totalsX, yPos);
  doc.text(`${invoice.base_imponible.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
  yPos += 6;
  
  // IVA
  if (invoice.exento_iva) {
    doc.text("IVA:", totalsX, yPos);
    doc.text("Exento", pageWidth - 20, yPos, { align: "right" });
    yPos += 6;
  } else if (invoice.iva_porcentaje > 0) {
    doc.text(`IVA (${invoice.iva_porcentaje}%):`, totalsX, yPos);
    doc.text(`${invoice.iva_importe.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    yPos += 6;
  }
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.line(totalsX - 10, yPos, pageWidth - 15, yPos);
  yPos += 7;
  
  // Total
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX, yPos);
  doc.text(`${invoice.total.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
  
  // Texto de exención IVA
  if (invoice.exento_iva && invoice.texto_exencion) {
    yPos += 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize(invoice.texto_exencion, pageWidth - 40);
    doc.text(lines, 20, yPos);
  }
  
  // === FOOTER ===
  const footerY = pageHeight - 30;
  doc.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  doc.rect(0, footerY, pageWidth, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const footerLines = doc.splitTextToSize(invoice.footer_text || "", pageWidth - 30);
  doc.text(footerLines, pageWidth / 2, footerY + 10, { align: "center" });
  
  return doc;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 30, g: 64, b: 175 }; // Default azul
}
