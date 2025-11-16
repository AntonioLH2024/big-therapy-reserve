import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent injection attacks
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Input validation
function validateAppointmentData(data: any): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^\d{2}:\d{2}$/;
  
  return (
    data.fecha && dateRegex.test(data.fecha) &&
    data.hora && timeRegex.test(data.hora) &&
    data.servicio && typeof data.servicio === 'string' && data.servicio.length <= 200 &&
    data.pacienteNombre && typeof data.pacienteNombre === 'string' && data.pacienteNombre.length <= 100 &&
    data.psicologoNombre && typeof data.psicologoNombre === 'string' && data.psicologoNombre.length <= 100
  );
}

interface AppointmentNotificationRequest {
  appointmentId: string;
  type: "scheduled" | "changed" | "cancelled";
  pacienteEmail: string;
  psicologoEmail?: string;
  psicologoId?: string;
  appointmentDetails: {
    fecha: string;
    hora: string;
    servicio: string;
    pacienteNombre: string;
    psicologoNombre: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      appointmentId, 
      type, 
      pacienteEmail, 
      psicologoEmail: providedPsicologoEmail,
      psicologoId,
      appointmentDetails 
    }: AppointmentNotificationRequest = await req.json();

    console.log(`Processing ${type} notification for appointment ${appointmentId}`);

    // Validate input data
    if (!validateAppointmentData(appointmentDetails)) {
      console.error("Invalid appointment data format");
      return new Response(
        JSON.stringify({ error: "Invalid appointment data format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get psychologist email from database if not provided
    let psicologoEmail = providedPsicologoEmail;
    if (!psicologoEmail && psicologoId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: userData, error } = await supabase.auth.admin.getUserById(psicologoId);
      
      if (error) {
        console.error("Error fetching psychologist email:", error);
      } else {
        psicologoEmail = userData?.user?.email;
      }
    }

    if (!psicologoEmail) {
      console.error("Could not determine psychologist email");
      return new Response(
        JSON.stringify({ error: "Could not determine psychologist email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Escape all user-supplied data to prevent HTML injection
    const fecha = escapeHtml(appointmentDetails.fecha);
    const hora = escapeHtml(appointmentDetails.hora);
    const servicio = escapeHtml(appointmentDetails.servicio);
    const pacienteNombre = escapeHtml(appointmentDetails.pacienteNombre);
    const psicologoNombre = escapeHtml(appointmentDetails.psicologoNombre);

    // Email content based on notification type
    let subjectPaciente = "";
    let htmlPaciente = "";
    let subjectPsicologo = "";
    let htmlPsicologo = "";

    switch (type) {
      case "scheduled":
        subjectPaciente = "Cita Programada - Big Citas";
        htmlPaciente = `
          <h1>¡Tu cita ha sido programada!</h1>
          <p>Hola ${pacienteNombre},</p>
          <p>Tu cita ha sido programada exitosamente con los siguientes detalles:</p>
          <ul>
            <li><strong>Psicólogo:</strong> ${psicologoNombre}</li>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Servicio:</strong> ${servicio}</li>
          </ul>
          <p>Te esperamos en tu cita.</p>
          <p>Saludos,<br>Equipo Big Citas</p>
        `;
        
        subjectPsicologo = "Nueva Cita Programada - Big Citas";
        htmlPsicologo = `
          <h1>Nueva cita programada</h1>
          <p>Hola Dr. ${psicologoNombre},</p>
          <p>Se ha programado una nueva cita:</p>
          <ul>
            <li><strong>Paciente:</strong> ${pacienteNombre}</li>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Servicio:</strong> ${servicio}</li>
          </ul>
          <p>Saludos,<br>Equipo Big Citas</p>
        `;
        break;

      case "changed":
        subjectPaciente = "Cambio de Cita - Big Citas";
        htmlPaciente = `
          <h1>Tu cita ha sido modificada</h1>
          <p>Hola ${pacienteNombre},</p>
          <p>Tu cita ha sido cambiada. Los nuevos detalles son:</p>
          <ul>
            <li><strong>Psicólogo:</strong> ${psicologoNombre}</li>
            <li><strong>Nueva Fecha:</strong> ${fecha}</li>
            <li><strong>Nueva Hora:</strong> ${hora}</li>
            <li><strong>Servicio:</strong> ${servicio}</li>
          </ul>
          <p>Te esperamos en tu nueva cita.</p>
          <p>Saludos,<br>Equipo Big Citas</p>
        `;
        
        subjectPsicologo = "Cambio de Cita - Big Citas";
        htmlPsicologo = `
          <h1>Cita modificada</h1>
          <p>Hola Dr. ${psicologoNombre},</p>
          <p>Una cita ha sido modificada:</p>
          <ul>
            <li><strong>Paciente:</strong> ${pacienteNombre}</li>
            <li><strong>Nueva Fecha:</strong> ${fecha}</li>
            <li><strong>Nueva Hora:</strong> ${hora}</li>
            <li><strong>Servicio:</strong> ${servicio}</li>
          </ul>
          <p>Saludos,<br>Equipo Big Citas</p>
        `;
        break;

      case "cancelled":
        subjectPaciente = "Cita Cancelada - Big Citas";
        htmlPaciente = `
          <h1>Tu cita ha sido cancelada</h1>
          <p>Hola ${pacienteNombre},</p>
          <p>Tu cita con los siguientes detalles ha sido cancelada:</p>
          <ul>
            <li><strong>Psicólogo:</strong> ${psicologoNombre}</li>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Servicio:</strong> ${servicio}</li>
          </ul>
          <p>Si deseas programar una nueva cita, puedes hacerlo desde tu panel.</p>
          <p>Saludos,<br>Equipo Big Citas</p>
        `;
        
        subjectPsicologo = "Cita Cancelada - Big Citas";
        htmlPsicologo = `
          <h1>Cita cancelada</h1>
          <p>Hola Dr. ${psicologoNombre},</p>
          <p>Una cita ha sido cancelada:</p>
          <ul>
            <li><strong>Paciente:</strong> ${pacienteNombre}</li>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Servicio:</strong> ${servicio}</li>
          </ul>
          <p>Saludos,<br>Equipo Big Citas</p>
        `;
        break;
    }

    // Send email to patient
    const pacienteEmailResponse = await resend.emails.send({
      from: "Big Citas <onboarding@resend.dev>",
      to: [pacienteEmail],
      subject: subjectPaciente,
      html: htmlPaciente,
    });

    console.log("Patient email sent:", pacienteEmailResponse);

    // Send email to psychologist
    const psicologoEmailResponse = await resend.emails.send({
      from: "Big Citas <onboarding@resend.dev>",
      to: [psicologoEmail],
      subject: subjectPsicologo,
      html: htmlPsicologo,
    });

    console.log("Psychologist email sent:", psicologoEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pacienteEmailId: pacienteEmailResponse.data?.id,
        psicologoEmailId: psicologoEmailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-appointment-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
