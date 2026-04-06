const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";

export default function handler(req, res) {
  // CORS headers para permitir acesso da Meta
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log('🔍 Webhook GET verification:', { 
      mode, 
      token, 
      challenge: challenge ? '[RECEIVED]' : null 
    });

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      console.log('✅ Webhook Meta verificado com sucesso');
      return res.status(200).send(challenge);
    }

    console.log('❌ Verificação do webhook falhou:', { 
      mode, 
      token, 
      expectedToken: VERIFY_TOKEN 
    });
    return res.status(403).send("Forbidden");
  }

  if (req.method === "POST") {
    try {
      console.log("📥 EVENTO META RECEBIDO:", JSON.stringify(req.body, null, 2));
      
      // Log básico do evento
      const event = req.body;
      if (event && event.object) {
        console.log(`📊 Evento recebido: ${event.object}, entradas: ${event.entry?.length || 0}`);
      }

      return res.status(200).json({ 
        received: true,
        timestamp: new Date().toISOString(),
        object: req.body?.object || 'unknown'
      });
    } catch (error) {
      console.error("❌ Erro ao processar evento:", error);
      return res.status(400).json({ 
        received: false, 
        error: "Invalid JSON payload" 
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}