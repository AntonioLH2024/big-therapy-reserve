export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      citas: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha_hora: string
          id: string
          notas: string | null
          paciente_id: string
          psicologo_id: string
          servicio: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha_hora: string
          id?: string
          notas?: string | null
          paciente_id: string
          psicologo_id: string
          servicio: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha_hora?: string
          id?: string
          notas?: string | null
          paciente_id?: string
          psicologo_id?: string
          servicio?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_psicologo_id_fkey"
            columns: ["psicologo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facturacion_config: {
        Row: {
          ciudad: string
          codigo_postal: string
          color_primario: string | null
          color_secundario: string | null
          created_at: string | null
          direccion: string
          email: string | null
          exento_iva: boolean | null
          footer_text: string | null
          id: string
          irpf_por_defecto: number | null
          iva_por_defecto: number | null
          logo_url: string | null
          nif_cif: string
          provincia: string
          proximo_numero: number | null
          psicologo_id: string
          razon_social: string
          serie_factura: string | null
          telefono: string | null
          texto_exencion_iva: string | null
          updated_at: string | null
          web: string | null
        }
        Insert: {
          ciudad: string
          codigo_postal: string
          color_primario?: string | null
          color_secundario?: string | null
          created_at?: string | null
          direccion: string
          email?: string | null
          exento_iva?: boolean | null
          footer_text?: string | null
          id?: string
          irpf_por_defecto?: number | null
          iva_por_defecto?: number | null
          logo_url?: string | null
          nif_cif: string
          provincia: string
          proximo_numero?: number | null
          psicologo_id: string
          razon_social: string
          serie_factura?: string | null
          telefono?: string | null
          texto_exencion_iva?: string | null
          updated_at?: string | null
          web?: string | null
        }
        Update: {
          ciudad?: string
          codigo_postal?: string
          color_primario?: string | null
          color_secundario?: string | null
          created_at?: string | null
          direccion?: string
          email?: string | null
          exento_iva?: boolean | null
          footer_text?: string | null
          id?: string
          irpf_por_defecto?: number | null
          iva_por_defecto?: number | null
          logo_url?: string | null
          nif_cif?: string
          provincia?: string
          proximo_numero?: number | null
          psicologo_id?: string
          razon_social?: string
          serie_factura?: string | null
          telefono?: string | null
          texto_exencion_iva?: string | null
          updated_at?: string | null
          web?: string | null
        }
        Relationships: []
      }
      facturas: {
        Row: {
          base_imponible: number | null
          cita_id: string | null
          concepto: string
          created_at: string
          emisor_ciudad: string | null
          emisor_codigo_postal: string | null
          emisor_direccion: string | null
          emisor_nif: string | null
          emisor_provincia: string | null
          emisor_razon_social: string | null
          estado: string
          exento_iva: boolean | null
          fecha_emision: string
          fecha_servicio: string | null
          fecha_vencimiento: string
          id: string
          irpf_importe: number | null
          irpf_porcentaje: number | null
          iva_importe: number | null
          iva_porcentaje: number | null
          monto: number
          notas: string | null
          numero_factura: string
          paciente_id: string
          psicologo_id: string
          receptor_ciudad: string | null
          receptor_codigo_postal: string | null
          receptor_direccion: string | null
          receptor_nif: string | null
          receptor_provincia: string | null
          receptor_razon_social: string | null
          serie: string | null
          texto_exencion: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          base_imponible?: number | null
          cita_id?: string | null
          concepto: string
          created_at?: string
          emisor_ciudad?: string | null
          emisor_codigo_postal?: string | null
          emisor_direccion?: string | null
          emisor_nif?: string | null
          emisor_provincia?: string | null
          emisor_razon_social?: string | null
          estado?: string
          exento_iva?: boolean | null
          fecha_emision?: string
          fecha_servicio?: string | null
          fecha_vencimiento: string
          id?: string
          irpf_importe?: number | null
          irpf_porcentaje?: number | null
          iva_importe?: number | null
          iva_porcentaje?: number | null
          monto: number
          notas?: string | null
          numero_factura: string
          paciente_id: string
          psicologo_id: string
          receptor_ciudad?: string | null
          receptor_codigo_postal?: string | null
          receptor_direccion?: string | null
          receptor_nif?: string | null
          receptor_provincia?: string | null
          receptor_razon_social?: string | null
          serie?: string | null
          texto_exencion?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          base_imponible?: number | null
          cita_id?: string | null
          concepto?: string
          created_at?: string
          emisor_ciudad?: string | null
          emisor_codigo_postal?: string | null
          emisor_direccion?: string | null
          emisor_nif?: string | null
          emisor_provincia?: string | null
          emisor_razon_social?: string | null
          estado?: string
          exento_iva?: boolean | null
          fecha_emision?: string
          fecha_servicio?: string | null
          fecha_vencimiento?: string
          id?: string
          irpf_importe?: number | null
          irpf_porcentaje?: number | null
          iva_importe?: number | null
          iva_porcentaje?: number | null
          monto?: number
          notas?: string | null
          numero_factura?: string
          paciente_id?: string
          psicologo_id?: string
          receptor_ciudad?: string | null
          receptor_codigo_postal?: string | null
          receptor_direccion?: string | null
          receptor_nif?: string | null
          receptor_provincia?: string | null
          receptor_razon_social?: string | null
          serie?: string | null
          texto_exencion?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cita_id_fkey"
            columns: ["cita_id"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_lineas: {
        Row: {
          cantidad: number | null
          created_at: string | null
          descripcion: string
          factura_id: string
          id: string
          orden: number | null
          precio_unitario: number
          subtotal: number
        }
        Insert: {
          cantidad?: number | null
          created_at?: string | null
          descripcion: string
          factura_id: string
          id?: string
          orden?: number | null
          precio_unitario: number
          subtotal: number
        }
        Update: {
          cantidad?: number | null
          created_at?: string | null
          descripcion?: string
          factura_id?: string
          id?: string
          orden?: number | null
          precio_unitario?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_lineas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_time: string
          created_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempt_time?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apellidos: string
          ciudad: string | null
          codigo_postal: string | null
          created_at: string | null
          direccion: string | null
          id: string
          nif_dni: string | null
          nombre: string
          provincia: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          apellidos: string
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion?: string | null
          id: string
          nif_dni?: string | null
          nombre: string
          provincia?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion?: string | null
          id?: string
          nif_dni?: string | null
          nombre?: string
          provincia?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      psicologo_detalles: {
        Row: {
          biografia: string | null
          ciudad: string | null
          codigo_postal: string | null
          created_at: string | null
          direccion: string | null
          especialidad: string[] | null
          foto_url: string | null
          id: string
          nif_cif: string | null
          provincia: string | null
          razon_social: string | null
          servicios: string[] | null
          updated_at: string | null
        }
        Insert: {
          biografia?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion?: string | null
          especialidad?: string[] | null
          foto_url?: string | null
          id: string
          nif_cif?: string | null
          provincia?: string | null
          razon_social?: string | null
          servicios?: string[] | null
          updated_at?: string | null
        }
        Update: {
          biografia?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion?: string | null
          especialidad?: string[] | null
          foto_url?: string | null
          id?: string
          nif_cif?: string | null
          provincia?: string | null
          razon_social?: string | null
          servicios?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "psicologo_detalles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      psicologo_horarios: {
        Row: {
          created_at: string
          disponible: boolean
          fecha: string
          hora: string
          id: string
          psicologo_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disponible?: boolean
          fecha: string
          hora: string
          id?: string
          psicologo_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disponible?: boolean
          fecha?: string
          hora?: string
          id?: string
          psicologo_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      generate_invoice_number_with_serie: {
        Args: { p_psicologo_id: string }
        Returns: string
      }
      get_unblock_time: { Args: { user_email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_v2: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_blocked: { Args: { user_email: string }; Returns: boolean }
      record_login_attempt: {
        Args: { is_success: boolean; user_email: string; user_ip?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "psicologo" | "paciente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "psicologo", "paciente"],
    },
  },
} as const
