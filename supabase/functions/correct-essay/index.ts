import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada');
    }

    const { text, theme } = await req.json();
    
    if (!text) {
      throw new Error('Texto da redação é obrigatório');
    }

    if (text.length < 200) {
      throw new Error('Texto deve ter pelo menos 200 caracteres');
    }

    console.log('Iniciando correção da redação...');

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
      const errorData = await response.text();
      console.error('Erro da OpenRouter API:', errorData);
      throw new Error(`Erro da API: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da correção recebida');

    const correctionText = data.choices?.[0]?.message?.content;
    
    if (!correctionText) {
      throw new Error('Não foi possível obter correção da redação');
    }

    // Tenta fazer parse do JSON da correção
    let correction;
    try {
      // Remove possíveis marcadores de código se existirem
      const cleanJson = correctionText.replace(/```json\n?|\n?```/g, '').trim();
      correction = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Erro ao fazer parse da correção:', parseError);
      throw new Error('Formato de resposta inválido da IA');
    }

    return new Response(JSON.stringify({ 
      correction,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na correção:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});