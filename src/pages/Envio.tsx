import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, FileText, Image as ImageIcon, Zap, Award, Camera, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Envio = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [activeTab, setActiveTab] = useState<"texto" | "imagem">("texto");
  const [charCount, setCharCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);

  const handleTextChange = (value: string) => {
    if (value.length <= 5000) {
      setTexto(value);
      setCharCount(value.length);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Converter imagem para texto automaticamente
      setIsProcessingImage(true);
      try {
        await convertImageToText(file);
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        toast.error('Erro ao processar a imagem. Tente novamente.');
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const convertImageToText = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const imageBase64 = base64.split(',')[1]; // Remove o prefixo data:image/...;base64,
          
          console.log('Enviando imagem para extração de texto...');
          
          const { data, error } = await supabase.functions.invoke('extract-text-from-image', {
            body: { imageBase64 }
          });
          
          console.log('Resposta da função:', data, error);
          
          if (error) {
            console.error('Erro da edge function:', error);
            throw new Error(error.message || 'Erro ao processar imagem');
          }
          
          if (data?.success && data?.extractedText) {
            setTexto(data.extractedText);
            setCharCount(data.extractedText.length);
            setActiveTab("texto"); // Muda automaticamente para aba de texto
            toast.success('Texto extraído da imagem com sucesso!');
          } else {
            console.error('Erro na resposta:', data);
            throw new Error(data?.error || 'Erro ao extrair texto da imagem');
          }
          
          resolve();
        } catch (error) {
          console.error('Erro completo:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (isSubmitDisabled()) return;
    
    setIsCorrecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('correct-essay', {
        body: { 
          text: texto,
          theme: tema || undefined
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success && data.correction) {
        // Salvar correção no localStorage para acessar na página de resultados
        localStorage.setItem('correctionResult', JSON.stringify(data.correction));
        localStorage.setItem('submittedEssay', texto);
        localStorage.setItem('essayTheme', tema || '');
        
        navigate("/resultados");
      } else {
        throw new Error(data.error || 'Erro ao corrigir redação');
      }
    } catch (error) {
      console.error('Erro na correção:', error);
      toast.error('Erro ao corrigir a redação. Tente novamente.');
    } finally {
      setIsCorrecting(false);
    }
  };

  const isSubmitDisabled = () => {
    if (activeTab === "texto") {
      return texto.trim().length < 200 || isCorrecting;
    } else {
      return !selectedImage || texto.trim().length < 200 || isCorrecting || isProcessingImage;
    }
  };

  const handleFileButtonClick = () => {
    if (!isProcessingImage && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLogout = () => {
    navigate("/");
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Page Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Envie sua redação</h1>
            <p className="text-muted-foreground">
              Digite o tema e o texto ou envie uma foto da sua redação
            </p>
          </div>

          <div className="glass-card space-y-6">
            {/* Theme Input */}
            <div className="space-y-2">
              <Label htmlFor="tema" className="text-sm font-medium">
                Tema da redação (opcional)
              </Label>
              <Input
                id="tema"
                placeholder="Ex: A importância da educação digital no Brasil"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="h-12 bg-background/50"
              />
              <div className="char-counter text-right">
                0/200
              </div>
            </div>

            {/* Tab Selection */}
            <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
              <Button
                variant={activeTab === "texto" ? "gradient" : "ghost"}
                onClick={() => setActiveTab("texto")}
                className="flex-1 h-12"
              >
                <FileText className="w-4 h-4 mr-2" />
                Texto
              </Button>
              <Button
                variant={activeTab === "imagem" ? "gradient" : "ghost"}
                onClick={() => setActiveTab("imagem")}
                className="flex-1 h-12"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Imagem
              </Button>
            </div>

            {/* Content Area */}
            <div className="min-h-[300px]">
              {activeTab === "texto" ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Cole o texto da sua redação aqui..."
                    value={texto}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="min-h-[300px] bg-background/50 custom-scrollbar resize-none"
                  />
                  <div className="char-counter text-right">
                    <span className={charCount > 4500 ? "text-warning" : charCount < 200 ? "text-destructive" : ""}>
                      {charCount < 200 ? "Mínimo 200 caracteres • " : ""}Máximo 5.000 caracteres
                    </span>
                    <div className={charCount > 4500 ? "text-warning font-medium" : charCount < 200 ? "text-destructive font-medium" : ""}>
                      {charCount}/5000
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass border-2 border-dashed border-border/50 rounded-xl p-8">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      {isProcessingImage ? (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      ) : (
                        <Camera className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">
                        {isProcessingImage ? "Extraindo texto da imagem..." : "Envie uma foto da sua redação"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isProcessingImage 
                          ? "Aguarde enquanto convertemos sua imagem em texto"
                          : "Tire uma foto clara da sua redação ou faça upload de uma imagem"
                        }
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={isProcessingImage}
                        ref={fileInputRef}
                      />
                      <Button 
                        variant="outline" 
                        className="h-12" 
                        disabled={isProcessingImage}
                        onClick={handleFileButtonClick}
                        type="button"
                      >
                        {isProcessingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            {selectedImage ? "Imagem Selecionada" : "Selecionar Imagem"}
                          </>
                        )}
                      </Button>
                    </div>
                    {selectedImage && (
                      <p className="text-sm text-muted-foreground">
                        Arquivo: {selectedImage.name}
                      </p>
                    )}
                    {isProcessingImage && (
                      <p className="text-sm text-info">
                        ✨ Convertendo imagem em texto automaticamente...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              variant="gradient"
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              disabled={isSubmitDisabled()}
            >
              {isCorrecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Corrigindo Redação...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Corrigir Redação
                </>
              )}
            </Button>
          </div>

          {/* Features Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-card text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-info-bg rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-info" />
              </div>
              <div>
                <h3 className="font-semibold text-info">5 Competências</h3>
                <p className="text-sm text-muted-foreground">
                  Avaliado completo seguindo os critérios oficiais do ENEM
                </p>
              </div>
            </div>

            <div className="glass-card text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-warning-bg rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Feedback Rápido</h3>
                <p className="text-sm text-muted-foreground">
                  Correção detalhada e dicas para melhorar sua escrita
                </p>
              </div>
            </div>

            <div className="glass-card text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-success-bg rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-success">Envio por Foto</h3>
                <p className="text-sm text-muted-foreground">
                  Tire uma foto da sua redação e deixe a IA extrair o texto
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Envio;