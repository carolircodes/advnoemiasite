import { NextResponse } from "next/server";

// Função para chamar a NoemIA
async function callNoemiaAI(userMessage: string, phoneNumber: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/noemia/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-Webhook/1.0'
      },
      body: JSON.stringify({
        message: userMessage,
        context: {
          platform: 'whatsapp',
          phoneNumber: phoneNumber,
          source: 'webhook'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`NoemIA API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || 'Desculpe, não consegui processar sua mensagem no momento.';
    
  } catch (error) {
    console.error('NoemIA integration error:', error);
    return null; // Retorna null para usar fallback
  }
}

// Função de resposta inteligente
export async function generateIntelligentResponse(userMessage: string, phoneNumber: string): Promise<string> {
  // Tentar resposta com NoemIA primeiro
  const aiResponse = await callNoemiaAI(userMessage, phoneNumber);
  
  if (aiResponse) {
    return aiResponse;
  }
  
  // Fallback inteligente baseado em contexto
  const message = userMessage.toLowerCase().trim();
  
  // Detecção de intenções jurídicas
  if (message.includes('aposentar') || message.includes('inss') || message.includes('benefício')) {
    return `Entendo sua dúvida sobre aposentadoria/benefícios! 📋\n\nA Dra. Noemia Rosa é especialista em Direito Previdenciário e pode ajudar você a:\n\n✅ Analisar seu direito à aposentadoria\n✅ Revisar benefícios negados\n✅ Auxiliar em pedidos administrativos\n\n📞 Agende sua consulta: (85) 99999-9999\n🌐 Saiba mais: advnoemia.com.br/previdenciario`;
  }
  
  if (message.includes('banco') || message.includes('empreéstimo') || message.includes('cobrança')) {
    return `Problemas com banco? 🏦\n\nA Dra. Noemia Rosa atua em Direito Bancário para te ajudar com:\n\n✅ Negociação de dívidas\n✅ Revisão de contratos\n✅ Combate a cobranças abusivas\n✅ Cancelamento de serviços\n\n📞 Fale conosco: (85) 99999-9999\n🌐 Saiba mais: advnoemia.com.br/bancario`;
  }
  
  if (message.includes('divórcio') || message.includes('pensão') || message.includes('guarda')) {
    return `Questões de família? 👨‍👩‍👧‍👦\n\nA Dra. Noemia Rosa oferece acompanhamento em Direito de Família:\n\n✅ Divórcio consensual e litigioso\n✅ Guarda de menores\n✅ Pensão alimentícia\n✅ Partilha de bens\n\n📞 Agende sua consulta: (85) 99999-9999\n🌐 Saiba mais: advnoemia.com.br/familia`;
  }
  
  // Resposta padrão com CTAs
  return `Olá! Sou o assistente virtual da Advnoemia 🤖\n\nComo posso ajudar você hoje?\n\n🔹 Aposentadorias e benefícios\n🔹 Direito bancário\n🔹 Direito de família\n\n📞 Para consulta: (85) 99999-9999\n🌐 Site: advnoemia.com.br`;
}

// Endpoint para testar integração
export async function POST(request: Request) {
  try {
    const { message, phoneNumber } = await request.json();
    
    if (!message || !phoneNumber) {
      return NextResponse.json({
        error: 'Message and phoneNumber are required'
      }, { status: 400 });
    }
    
    const response = await generateIntelligentResponse(message, phoneNumber);
    
    return NextResponse.json({
      originalMessage: message,
      phoneNumber,
      response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
