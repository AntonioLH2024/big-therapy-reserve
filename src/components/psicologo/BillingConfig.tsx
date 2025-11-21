import { useState, useEffect } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, Save, Upload } from "lucide-react";
import { validateSpanishTaxId } from "@/lib/nif-validator";

interface BillingConfig {
  id?: string;
  psicologo_id: string;
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
  proximo_numero: number;
}

export function BillingConfig() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BillingConfig>({
    psicologo_id: user?.id || "",
    razon_social: "",
    nif_cif: "",
    direccion: "",
    codigo_postal: "",
    ciudad: "",
    provincia: "",
    telefono: "",
    email: "",
    web: "",
    logo_url: "",
    color_primario: "#1e40af",
    color_secundario: "#10b981",
    footer_text: "Gracias por confiar en nuestros servicios",
    iva_por_defecto: 0,
    irpf_por_defecto: 0,
    exento_iva: true,
    texto_exencion_iva: "Exento de IVA según Art. 20.Uno.3º Ley 37/1992",
    serie_factura: "F",
    proximo_numero: 1,
  });

  useEffect(() => {
    if (user) {
      fetchConfig();
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

      if (data) {
        setConfig(data as BillingConfig);
      }
    } catch (error: any) {
      console.error("Error fetching billing config:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validar NIF/CIF
    if (!validateSpanishTaxId(config.nif_cif)) {
      toast.error("El NIF/CIF no es válido");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("facturacion_config")
        .upsert({
          ...config,
          psicologo_id: user?.id,
        });

      if (error) throw error;

      toast.success("Configuración guardada correctamente");
      fetchConfig();
    } catch (error: any) {
      console.error("Error saving billing config:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona una imagen");
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar 2MB");
      return;
    }

    try {
      // Por ahora guardamos como data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setConfig({ ...config, logo_url: e.target?.result as string });
      };
      reader.readAsDataURL(file);

      toast.success("Logo cargado correctamente");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Error al cargar el logo");
    }
  };

  if (loading) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configuración de Facturación
          </CardTitle>
          <CardDescription>
            Configure los datos de su empresa para la emisión de facturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Datos Fiscales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datos Fiscales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="razon_social">Razón Social *</Label>
                <Input
                  id="razon_social"
                  value={config.razon_social}
                  onChange={(e) => setConfig({ ...config, razon_social: e.target.value })}
                  placeholder="Nombre de la empresa o profesional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nif_cif">NIF/CIF *</Label>
                <Input
                  id="nif_cif"
                  value={config.nif_cif}
                  onChange={(e) => setConfig({ ...config, nif_cif: e.target.value.toUpperCase() })}
                  placeholder="12345678A o A12345678"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dirección</h3>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección Completa *</Label>
              <Input
                id="direccion"
                value={config.direccion}
                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                placeholder="Calle, número, piso, puerta"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_postal">Código Postal *</Label>
                <Input
                  id="codigo_postal"
                  value={config.codigo_postal}
                  onChange={(e) => setConfig({ ...config, codigo_postal: e.target.value })}
                  placeholder="28001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad *</Label>
                <Input
                  id="ciudad"
                  value={config.ciudad}
                  onChange={(e) => setConfig({ ...config, ciudad: e.target.value })}
                  placeholder="Madrid"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia *</Label>
                <Input
                  id="provincia"
                  value={config.provincia}
                  onChange={(e) => setConfig({ ...config, provincia: e.target.value })}
                  placeholder="Madrid"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datos de Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={config.telefono}
                  onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  placeholder="contacto@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="web">Sitio Web</Label>
                <Input
                  id="web"
                  value={config.web}
                  onChange={(e) => setConfig({ ...config, web: e.target.value })}
                  placeholder="www.ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Configuración Visual */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personalización Visual</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo de la Empresa</Label>
                <div className="flex items-center gap-4">
                  {config.logo_url && (
                    <img src={config.logo_url} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                  )}
                  <Button variant="outline" onClick={() => document.getElementById("logo-upload")?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Logo
                  </Button>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_text">Texto del Pie de Factura</Label>
                <Textarea
                  id="footer_text"
                  value={config.footer_text}
                  onChange={(e) => setConfig({ ...config, footer_text: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color_primario">Color Primario</Label>
                <div className="flex gap-2">
                  <Input
                    id="color_primario"
                    type="color"
                    value={config.color_primario}
                    onChange={(e) => setConfig({ ...config, color_primario: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={config.color_primario}
                    onChange={(e) => setConfig({ ...config, color_primario: e.target.value })}
                    placeholder="#1e40af"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color_secundario">Color Secundario</Label>
                <div className="flex gap-2">
                  <Input
                    id="color_secundario"
                    type="color"
                    value={config.color_secundario}
                    onChange={(e) => setConfig({ ...config, color_secundario: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={config.color_secundario}
                    onChange={(e) => setConfig({ ...config, color_secundario: e.target.value })}
                    placeholder="#10b981"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuración Fiscal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuración Fiscal</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="exento_iva"
                checked={config.exento_iva}
                onCheckedChange={(checked) => setConfig({ ...config, exento_iva: checked })}
              />
              <Label htmlFor="exento_iva">Exento de IVA (servicios sanitarios)</Label>
            </div>
            {config.exento_iva && (
              <div className="space-y-2">
                <Label htmlFor="texto_exencion_iva">Texto de Exención de IVA</Label>
                <Input
                  id="texto_exencion_iva"
                  value={config.texto_exencion_iva}
                  onChange={(e) => setConfig({ ...config, texto_exencion_iva: e.target.value })}
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iva_por_defecto">% IVA por Defecto</Label>
                <Input
                  id="iva_por_defecto"
                  type="number"
                  step="0.01"
                  value={config.iva_por_defecto}
                  onChange={(e) => setConfig({ ...config, iva_por_defecto: parseFloat(e.target.value) })}
                  disabled={config.exento_iva}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="irpf_por_defecto">% IRPF por Defecto</Label>
                <Input
                  id="irpf_por_defecto"
                  type="number"
                  step="0.01"
                  value={config.irpf_por_defecto}
                  onChange={(e) => setConfig({ ...config, irpf_por_defecto: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Numeración */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Numeración de Facturas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serie_factura">Serie</Label>
                <Input
                  id="serie_factura"
                  value={config.serie_factura}
                  onChange={(e) => setConfig({ ...config, serie_factura: e.target.value.toUpperCase() })}
                  placeholder="F"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proximo_numero">Próximo Número</Label>
                <Input
                  id="proximo_numero"
                  type="number"
                  value={config.proximo_numero}
                  onChange={(e) => setConfig({ ...config, proximo_numero: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
