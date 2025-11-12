import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role after state change
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", session.user.id)
              .single();
            
            setUserRole(profile?.role || null);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUserRole(profile?.role || null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: userData,
      },
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cuenta creada exitosamente");
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check if user is blocked
      const { data: isBlocked, error: blockCheckError } = await supabase
        .rpc('is_user_blocked', { user_email: email });
      
      if (blockCheckError) {
        console.error('Error checking block status:', blockCheckError);
      }
      
      if (isBlocked) {
        const { data: unblockTime } = await supabase
          .rpc('get_unblock_time', { user_email: email });
        
        const minutesLeft = unblockTime 
          ? Math.ceil((new Date(unblockTime).getTime() - Date.now()) / 60000)
          : 15;
        
        toast.error(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutesLeft} minutos.`);
        return { error: new Error('Account temporarily blocked') };
      }
      
      // Attempt sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Record failed attempt
        await supabase.rpc('record_login_attempt', {
          user_email: email,
          is_success: false,
          user_ip: null
        });
        
        // Check remaining attempts
        const { data: failedAttempts } = await supabase
          .from('login_attempts')
          .select('*', { count: 'exact' })
          .eq('email', email)
          .eq('success', false)
          .gte('attempt_time', new Date(Date.now() - 15 * 60 * 1000).toISOString());
        
        const attemptsLeft = 5 - (failedAttempts || []).length;
        
        if (attemptsLeft > 0 && attemptsLeft <= 3) {
          toast.error(`Credenciales incorrectas. Te quedan ${attemptsLeft} intentos antes del bloqueo temporal.`);
        } else {
          toast.error("Credenciales incorrectas");
        }
        
        return { error };
      }
      
      // Record successful attempt
      await supabase.rpc('record_login_attempt', {
        user_email: email,
        is_success: true,
        user_ip: null
      });
      
      // Get user role and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        toast.success("Sesión iniciada");
        
        // Redirect based on role
        if (profile?.role === "admin") {
          navigate("/dashboard/admin");
        } else if (profile?.role === "psicologo") {
          navigate("/dashboard/psicologo");
        } else if (profile?.role === "paciente") {
          navigate("/dashboard/paciente");
        } else {
          navigate("/");
        }
      }
      
      return { error };
    } catch (err) {
      console.error('Error during sign in:', err);
      toast.error("Error al iniciar sesión");
      return { error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Sesión cerrada");
      navigate("/");
    }
  };

  const value = {
    session,
    user,
    userRole,
    signUp,
    signIn,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
