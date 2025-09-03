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

    const imageBase64 = typeof (payload as any).imageBase64 === 'string' ? (payload as any).imageBase64 : '';
    const base64Re = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!imageBase64 || !base64Re.test(imageBase64)) {
      return new Response(JSON.stringify({ success: false, error: 'Imagem inválida (base64)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verificação de tamanho (máx 10MB)
    try {
      const bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
      if (bytes.byteLength > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ success: false, error: 'Imagem muito grande (máx 10MB)' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Base64 inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(JSON.stringify({ level: 'info', msg: 'Iniciando extração de texto', requestId, userId: user.id }));

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

    console.log(JSON.stringify({ level: 'info', msg: 'Resposta da OpenRouter', requestId, status: response.status }));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(JSON.stringify({ level: 'error', msg: 'Erro da OpenRouter API', requestId, status: response.status, error: errorText?.slice(0, 500) }));
      
      // Tratamento específico para rate limit
      if (response.status === 429) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns minutos.');
      }
      
      return new Response(JSON.stringify({ success: false, error: 'Erro ao processar extração' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    console.log(JSON.stringify({ level: 'info', msg: 'Resposta da API recebida', requestId }));

    const extractedText = data.choices?.[0]?.message?.content;
    
    if (!extractedText) {
      return new Response(JSON.stringify({ success: false, error: 'Não foi possível extrair texto da imagem' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ 
      extractedText: extractedText.trim(),
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(JSON.stringify({ level: 'error', msg: 'Erro na extração de texto', requestId: crypto.randomUUID?.(), error: (error as any)?.message }));
    const message = (error && (error as any).message) || 'Erro interno';
    const status = message.includes('temporariamente indisponível') ? 429 : 500;
    return new Response(JSON.stringify({ success: false, error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});