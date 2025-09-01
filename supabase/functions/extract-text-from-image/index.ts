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

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Imagem é obrigatória');
    }

    console.log('Iniciando extração de texto da imagem...');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://reditto.vercel.app',
        'X-Title': 'Reditto - Correção de Redações'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview:free',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em OCR (reconhecimento óptico de caracteres) para redações manuscritas em português brasileiro. 

INSTRUÇÕES:
1. Extraia TODO o texto da imagem de forma precisa
2. Mantenha a formatação original (parágrafos, quebras de linha)
3. Corrija apenas erros óbvios de OCR, mantendo a escrita original do estudante
4. Se houver partes ilegíveis, indique com [texto ilegível]
5. Responda APENAS com o texto extraído, sem comentários adicionais

A imagem contém uma redação manuscrita que precisa ser digitalizada para correção.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Por favor, extraia todo o texto desta redação manuscrita:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    console.log('Resposta da API:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro da OpenRouter API:', errorData);
      
      // Tratamento específico para rate limit
      if (response.status === 429) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns minutos.');
      }
      
      throw new Error(`Erro da API: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Resposta da API recebida');

    const extractedText = data.choices?.[0]?.message?.content;
    
    if (!extractedText) {
      throw new Error('Não foi possível extrair texto da imagem');
    }

    return new Response(JSON.stringify({ 
      extractedText: extractedText.trim(),
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na extração de texto:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});