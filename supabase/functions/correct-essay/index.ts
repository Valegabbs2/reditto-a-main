import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    // Verificar origem (Origin header) para anti-CSRF
    const origin = req.headers.get('Origin') || '';
    if (origin && origin !== allowOrigin) {
      return new Response(JSON.stringify({ success: false, error: 'Origem não permitida' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada');
    }

    // Autenticação: validar usuário via Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ success: false, error: 'Configuração Supabase ausente' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validação do corpo
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'JSON inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const text = typeof (payload as any).text === 'string' ? (payload as any).text.trim() : '';
    const themeRaw = (payload as any).theme;
    const theme = typeof themeRaw === 'string' ? themeRaw.trim() : undefined;

    if (!text || text.length < 200 || text.length > 5000) {
      return new Response(JSON.stringify({ success: false, error: 'Texto deve ter entre 200 e 5000 caracteres' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof theme !== 'undefined' && (theme.length === 0 || theme.length > 200)) {
      return new Response(JSON.stringify({ success: false, error: 'Tema deve ter até 200 caracteres' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(JSON.stringify({ level: 'info', msg: 'Iniciando correção da redação', requestId, userId: user.id }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://reditto.vercel.app',
        'X-Title': 'Reditto - Correção de Redações'
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-coder-32b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `Você é um corretor especialista em redações do ENEM, seguindo rigorosamente a Matriz de Referência e os critérios oficiais de correção.
Sua tarefa é corrigir a redação fornecida conforme as 5 competências avaliadas pelo ENEM:

1. Domínio da norma culta da língua escrita.
2. Compreensão e desenvolvimento do tema.
3. Seleção, organização e interpretação de argumentos.
4. Demonstração de conhecimento dos mecanismos linguísticos necessários para a construção da argumentação (coesão).
5. Elaboração de proposta de intervenção, detalhada, relacionada ao tema e respeitando os direitos humanos.

Regras obrigatórias:

- Cada competência deve receber uma nota de 0 a 200 pontos, em intervalos de 20 pontos.
- A nota final deve ser a soma das 5 competências, arredondada para uma das 15 possibilidades possíveis: 680, 700, 720, 740, 760, 780, 800, 820, 840, 860, 880, 900, 920, 940, 960, 980.
- Se a redação tiver fuga ao tema, menos de 8 linhas, desrespeito aos direitos humanos ou não for dissertativo-argumentativa, atribuir nota zero em todas as competências.
- Pequenos erros ocasionais de gramática não devem zerar a competência I.
- A proposta de intervenção deve ser avaliada com base em: ação, agente, modo/meio, efeito e detalhamento.

FORMATO DA RESPOSTA:
Sua resposta deve ser um JSON válido com esta estrutura exata:

{
  "competencias": {
    "competencia1": {
      "nota": [0-200],
      "titulo": "Modalidade Escrita",
      "feedback": "Análise detalhada com exemplos específicos do texto"
    },
    "competencia2": {
      "nota": [0-200],
      "titulo": "Compreensão do Tema",
      "feedback": "Análise detalhada com exemplos específicos do texto"
    },
    "competencia3": {
      "nota": [0-200],
      "titulo": "Argumentação",
      "feedback": "Análise detalhada com exemplos específicos do texto"
    },
    "competencia4": {
      "nota": [0-200],
      "titulo": "Coesão e Coerência",
      "feedback": "Análise detalhada com exemplos específicos do texto"
    },
    "competencia5": {
      "nota": [0-200],
      "titulo": "Proposta de Intervenção",
      "feedback": "Análise detalhada com exemplos específicos do texto"
    }
  },
  "notaFinal": [soma das 5 competências arredondada para uma das 15 notas possíveis],
  "resumo": "Feedback Detalhado: avaliação geral da redação",
  "pontosForts": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
  "pontosAmelhorar": ["Ponto a melhorar 1", "Ponto a melhorar 2", "Ponto a melhorar 3"],
  "dicas": ["Dica prática 1", "Dica prática 2", "Dica prática 3"]
}

IMPORTANTE: 
- Responda APENAS com o JSON, sem texto adicional
- Seja específico e cite trechos do texto nos feedbacks
- Seja justo mas rigoroso seguindo os critérios ENEM
- Forneça feedback construtivo e educativo
- A nota final deve ser obrigatoriamente uma das 15 notas possíveis do ENEM`
          },
          {
            role: 'user',
            content: `${theme ? `TEMA: ${theme}\n\n` : ''}TEXTO DA REDAÇÃO:\n\n${text}\n\nPor favor, corrija esta redação seguindo os critérios do ENEM e responda no formato JSON especificado.`
          }
        ],
        max_tokens: 3000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(JSON.stringify({ level: 'error', msg: 'Erro da OpenRouter API', requestId, status: response.status, error: errorText?.slice(0, 500) }));
      const status = response.status === 429 ? 429 : 502;
      return new Response(JSON.stringify({ success: false, error: 'Erro ao processar correção' }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    console.log(JSON.stringify({ level: 'info', msg: 'Resposta da correção recebida', requestId }));

    const correctionText = data.choices?.[0]?.message?.content;
    
    if (!correctionText) {
      return new Response(JSON.stringify({ success: false, error: 'Não foi possível obter correção da redação' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Tenta fazer parse do JSON da correção
    let correction;
    try {
      // Remove possíveis marcadores de código se existirem
      const cleanJson = correctionText.replace(/```json\n?|\n?```/g, '').trim();
      correction = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error(JSON.stringify({ level: 'error', msg: 'Erro ao fazer parse da correção', requestId }));
      return new Response(JSON.stringify({ success: false, error: 'Formato de resposta inválido da IA' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ 
      correction,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(JSON.stringify({ level: 'error', msg: 'Erro na correção', error: (error as any)?.message, requestId: crypto.randomUUID?.() }));
    return new Response(JSON.stringify({ success: false, error: 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});