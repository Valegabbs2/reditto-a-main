import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, UserPlus } from "lucide-react";
import { User, Session } from '@supabase/supabase-js';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  // Form states
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabaseReady = Boolean(supabase);

  // Check authentication state
  useEffect(() => {
    // Limpar modo visitante ao retornar ao login
    localStorage.removeItem('isGuest');
    
    // Set up auth state listener FIRST
    if (!supabase) {
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect to main app if authenticated
        if (session?.user) {
          navigate("/envio");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate("/envio");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      if (!supabaseReady) {
        toast({
          variant: "destructive",
          title: "Configuração ausente",
          description: "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
        });
        return;
      }
      const redirectUrl = `${window.location.origin}/envio`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: error.message
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "Algo deu errado. Tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!supabaseReady) {
        toast({
          variant: "destructive",
          title: "Configuração ausente",
          description: "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
        });
        return;
      }
      // Validações básicas no cliente
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const isValidEmail = emailRegex.test(trimmedEmail) && trimmedEmail.length >= 3 && trimmedEmail.length <= 254;
      const isValidPassword = (() => {
        if (typeof password !== 'string') return false;
        if (isSignUp) {
          if (password.length < 8 || password.length > 72) return false;
          const hasLower = /[a-z]/.test(password);
          const hasUpper = /[A-Z]/.test(password);
          const hasNumber = /\d/.test(password);
          const hasSpecial = /[^A-Za-z0-9]/.test(password);
          return hasLower && hasUpper && hasNumber && hasSpecial;
        }
        // Login: aceitar qualquer senha não vazia, evitando bloquear contas antigas
        return password.length > 0;
      })();
      const isValidName = !isSignUp || (trimmedName.length >= 2 && trimmedName.length <= 80);

      if (!isValidEmail) {
        toast({
          variant: "destructive",
          title: "Email inválido",
          description: "Informe um email válido."
        });
        return;
      }

      if (!isValidPassword) {
        toast({
          variant: "destructive",
          title: isSignUp ? "Senha fraca" : "Senha obrigatória",
          description: isSignUp ? "Use 8+ caracteres com maiúscula, minúscula, número e símbolo." : "Informe sua senha."
        });
        return;
      }

      if (!isValidName) {
        toast({
          variant: "destructive",
          title: "Nome inválido",
          description: "O nome deve ter entre 2 e 80 caracteres."
        });
        return;
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              display_name: trimmedName
            }
          }
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              variant: "destructive",
              title: "Email já cadastrado",
              description: "Este email já possui uma conta. Tente fazer login."
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro no cadastro",
              description: error.message
            });
          }
        } else {
          // Se a conta foi criada com sucesso, fazer login automático
          if (data?.user && !data?.user?.email_confirmed_at) {
            // Tentar fazer login automático
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password
            });
            
            if (signInError) {
              toast({
                title: "Conta criada!",
                description: "Faça login para continuar."
              });
              setIsSignUp(false);
              setName("");
            } else {
              toast({
                title: "Conta criada com sucesso!",
                description: "Bem-vindo ao Reditto!"
              });
            }
          } else {
            toast({
              title: "Conta criada com sucesso!",
              description: "Bem-vindo ao Reditto!"
            });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: "Credenciais inválidas",
              description: "Email ou senha incorretos."
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro no login",
              description: error.message
            });
          }
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: (error as any)?.message || "Algo deu errado. Tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Marcar como visitante e navegar para página especial
    localStorage.setItem('isGuest', 'true');
    navigate("/envio");
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="Reditto Logo" 
              className="w-48 h-48 object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Correção de Redação para Todos!
          </p>
        </div>

        {!showEmailForm ? (
          /* Main Auth Options */
          <div className="space-y-4">
            {/* Theme Toggle with Message */}
            <div className="flex items-center justify-center gap-2 mb-4 border border-border rounded-md px-3 py-2 bg-background/50 backdrop-blur-sm">
              <ThemeToggle />
              <span className="text-xs text-muted-foreground">
                ← Clique no ícone para alterar a cor do seu ambiente.
              </span>
            </div>

            {/* Email Sign In */}
            <div className="glass-card space-y-4">
              <Button 
                onClick={() => {
                  setShowEmailForm(true);
                  setIsSignUp(true);
                  resetForm();
                }}
                variant="outline"
                size="lg"
                className="w-full h-14 text-base font-medium flex items-center gap-3 hover:bg-muted/50"
              >
                <UserPlus className="w-5 h-5" />
                Criar conta
              </Button>
              
              <Button 
                onClick={() => {
                  setShowEmailForm(true);
                  resetForm();
                }}
                variant="outline"
                size="lg"
                className="w-full h-14 text-base font-medium flex items-center gap-3 hover:bg-muted/50"
              >
                <Mail className="w-5 h-5" />
                Entrar com Email
              </Button>
            </div>

            {/* Demo Account */}
            <div className="glass-card space-y-4">
              <div className="text-center">
                <h3 className="font-medium text-foreground mb-2">Testar sem cadastro</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Experimente todas as funcionalidades
                </p>
                <Button 
                  onClick={handleDemoLogin}
                  variant="secondary"
                  size="lg"
                  className="w-full h-12 text-base font-medium"
                >
                  Entrar como visitante
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Email Form */
          <div className="glass-card space-y-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmailForm(false);
                  resetForm();
                }}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {isSignUp ? "Criar conta" : "Entrar"}
              </h2>
            </div>
            
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-background/50 border-border/50 focus:border-primary pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
              >
                {loading ? "Processando..." : (isSignUp ? "Criar conta" : "Entrar")}
              </Button>

              {!isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      const trimmedEmail = email.trim().toLowerCase();
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
                      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
                        toast({
                          variant: "destructive",
                          title: "Email inválido",
                          description: "Digite um email válido para enviar o link de redefinição."
                        });
                        return;
                      }
                      try {
                        await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                          redirectTo: `${window.location.origin}/envio`
                        });
                        toast({
                          title: "Verifique seu email",
                          description: "Enviamos um link para redefinir sua senha."
                        });
                      } catch (err) {
                        toast({
                          variant: "destructive",
                          title: "Erro ao enviar link",
                          description: "Tente novamente em instantes."
                        });
                      }
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  resetForm();
                }}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp 
                  ? "Já tem uma conta? Fazer login" 
                  : "Não tem uma conta? Criar conta"
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;