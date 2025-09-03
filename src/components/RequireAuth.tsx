import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RequireAuthProps {
  children: JSX.Element;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        // Verificar se é visitante
        const isGuest = localStorage.getItem('isGuest') === 'true';
        
        if (isGuest) {
          // Permitir acesso para visitantes
          setChecking(false);
          return;
        }

        if (!supabase) {
          navigate("/", { replace: false });
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/", { replace: false });
          return;
        }
        
        setChecking(false);
      } finally {
        if (isMounted) setChecking(false);
      }
    };
    check();
    return () => { isMounted = false; };
  }, [navigate]);

  if (checking) {
    return null;
  }

  return children;
};

export default RequireAuth;


