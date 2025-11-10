import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify caller is an admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if calling user has admin role
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .single();

    if (!userRoles) {
      console.log("Non-admin user attempted to create admin:", callingUser.email);
      return new Response(
        JSON.stringify({ error: "Forbidden: Only admins can create admin accounts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { email, password, userData } = await req.json();

    console.log("Admin creating new admin user:", email);

    // Create user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData,
    });

    if (authError) {
      console.error("Error creating user:", authError);
      throw authError;
    }

    console.log("User created successfully:", authData.user.id);

    // Update role to admin in profiles
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", authData.user.id);

    if (updateError) {
      console.error("Error updating profile role:", updateError);
      throw updateError;
    }

    // Insert admin role in user_roles table
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Error inserting user role:", roleError);
      throw roleError;
    }

    console.log("Admin role assigned successfully");

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        message: "Admin user created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-admin function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
