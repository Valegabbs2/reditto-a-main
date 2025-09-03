import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, FileEdit, Printer, CheckCircle, AlertTriangle, Lightbulb, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CorrectionData {
  competencias: {
    competencia1: { nota: number; titulo: string; feedback: string };
    competencia2: { nota: number; titulo: string; feedback: string };
    competencia3: { nota: number; titulo: string; feedback: string };
    competencia4: { nota: number; titulo: string; feedback: string };
    competencia5: { nota: number; titulo: string; feedback: string };
  };
  notaFinal: number;
  resumo: string;
  pontosForts: string[];
  pontosAmelhorar: string[];
  dicas: string[];
}

const Resultados = () => {
  const navigate = useNavigate();
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null);
  const [essayText, setEssayText] = useState<string>("");

  useEffect(() => {
    const storedResult = localStorage.getItem('correctionResult');
    const storedEssay = localStorage.getItem('submittedEssay');
    
    if (storedResult) {
      try {
        const result = JSON.parse(storedResult);
        setCorrectionData(result);
      } catch (error) {
        console.error('Erro ao recuperar dados da correção');
      }
    }
    
    if (storedEssay) {
      setEssayText(storedEssay);
    }
  }, []);

  // Competências baseadas nos dados da IA ou valores padrão
  const competencias = correctionData?.competencias ? [
    { numero: "I", nome: correctionData.competencias.competencia1?.titulo || "Competência I - Demonstrar domínio da modalidade escrita formal da língua portuguesa", nota: correctionData.competencias.competencia1?.nota || 0, feedback: correctionData.competencias.competencia1?.feedback || "" },
    { numero: "II", nome: correctionData.competencias.competencia2?.titulo || "Competência II - Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento", nota: correctionData.competencias.competencia2?.nota || 0, feedback: correctionData.competencias.competencia2?.feedback || "" },
    { numero: "III", nome: correctionData.competencias.competencia3?.titulo || "Competência III - Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos", nota: correctionData.competencias.competencia3?.nota || 0, feedback: correctionData.competencias.competencia3?.feedback || "" },
    { numero: "IV", nome: correctionData.competencias.competencia4?.titulo || "Competência IV - Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação", nota: correctionData.competencias.competencia4?.nota || 0, feedback: correctionData.competencias.competencia4?.feedback || "" },
    { numero: "V", nome: correctionData.competencias.competencia5?.titulo || "Competência V - Elaborar proposta de intervenção para o problema abordado", nota: correctionData.competencias.competencia5?.nota || 0, feedback: correctionData.competencias.competencia5?.feedback || "" }
  ] : [
    { numero: "I", nome: "Competência I - Demonstrar domínio da modalidade escrita formal da língua portuguesa", nota: 0, feedback: "" },
    { numero: "II", nome: "Competência II - Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento", nota: 0, feedback: "" },
    { numero: "III", nome: "Competência III - Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos", nota: 0, feedback: "" },
    { numero: "IV", nome: "Competência IV - Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação", nota: 0, feedback: "" },
    { numero: "V", nome: "Competência V - Elaborar proposta de intervenção para o problema abordado", nota: 0, feedback: "" }
  ];

  const notaFinal = correctionData?.notaFinal || competencias.reduce((sum, comp) => sum + comp.nota, 0);

  const handleNovaRedacao = () => {
    navigate("/envio");
  };

  const handleLogout = () => {
    // Limpar modo visitante se existir
    localStorage.removeItem('isGuest');
    // Limpar sessão do Supabase se existir
    if (supabase) {
      supabase.auth.signOut();
    }
    navigate("/");
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="px-4 py-4 md:px-6 md:py-6">
        <div className="container mx-auto flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/placeholder-image.png" 
              alt="Reditto Logo" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain flex-shrink-0"
            />
            <span className="text-sm md:text-base text-muted-foreground/80 font-normal hidden sm:block">
              Correção de Redação para Todos!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Scores Section */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Final Score */}
            <div className="glass-card text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Trophy className="w-6 h-6" />
                <h2 className="text-xl font-bold">Nota Final</h2>
              </div>
              <div className="text-6xl font-bold text-primary">
                {notaFinal}
              </div>
              <div className="text-lg text-muted-foreground">
                de 1000 pontos
              </div>
            </div>

            {/* Competências */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-6">Notas por Competência</h2>
              <div className="grid grid-cols-2 gap-4">
                {competencias.map((comp, index) => (
                  <div key={index} className="glass-card text-center p-4">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {comp.nota}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Competência {comp.numero}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              Feedback Detalhado
            </h2>
            
            <div className="space-y-6">
              {/* Resumo da Correção */}
              {correctionData?.resumo && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <FileEdit className="w-5 h-5" />
                    <h3 className="font-semibold">Resumo da Correção</h3>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      {correctionData.resumo}
                    </p>
                  </div>
                </div>
              )}

              {/* Pontos de Melhoria */}
              {correctionData?.pontosAmelhorar && correctionData.pontosAmelhorar.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-info">
                    <Lightbulb className="w-5 h-5" />
                    <h3 className="font-semibold">Pontos de Melhoria</h3>
                  </div>
                  <div className="bg-info-bg p-4 rounded-xl border border-info/20 space-y-2">
                    {correctionData.pontosAmelhorar.map((ponto, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {ponto}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Pontos de Atenção (Dicas) */}
              {correctionData?.dicas && correctionData.dicas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="font-semibold">Pontos de Atenção</h3>
                  </div>
                  <div className="bg-warning-bg p-4 rounded-xl border border-warning/20 space-y-2">
                    {correctionData.dicas.map((dica, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {dica}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Parabéns (Pontos Fortes) */}
              {correctionData?.pontosForts && correctionData.pontosForts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-5 h-5" />
                    <h3 className="font-semibold">Parabéns!</h3>
                  </div>
                  <div className="bg-success-bg p-4 rounded-xl border border-success/20 space-y-2">
                    {correctionData.pontosForts.map((ponto, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {ponto}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback por Competência */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Feedback por Competência</h3>
                {competencias.map((comp, index) => (
                  comp.feedback && (
                    <div key={index} className="bg-muted/20 p-4 rounded-xl border">
                      <h4 className="font-medium mb-2 text-primary">
                        Competência {comp.numero} - {comp.nome}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {comp.feedback}
                      </p>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Essay Preview */}
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              Sua Redação (prévia)
            </h2>
            <div className="bg-muted/20 p-6 rounded-xl">
              <p className="text-muted-foreground leading-relaxed">
                {essayText ? essayText.substring(0, 300) + (essayText.length > 300 ? "..." : "") : "Nenhuma redação encontrada."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleNovaRedacao}
              variant="gradient"
              size="lg"
              className="h-14 px-8 text-lg font-semibold"
            >
              <FileEdit className="w-5 h-5 mr-2" />
              Nova Redação
            </Button>
            <Button 
              onClick={handleImprimir}
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg font-semibold"
            >
              <Printer className="w-5 h-5 mr-2" />
              Imprimir Resultado
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resultados;