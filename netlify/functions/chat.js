export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    const { message } = JSON.parse(event.body || "{}");

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Mensagem vazia" }),
      };
    }

    const systemPrompt = `
Você é a assistente virtual de um escritório de advocacia no Brasil.
Seu papel é fazer triagem inicial de possíveis clientes com educação, clareza, seriedade e acolhimento.

Regras:
- Não prometa vitória judicial.
- Não invente leis, prazos ou valores.
- Não substitua consulta jurídica formal.
- Explique de forma simples e profissional.
- Conduza a conversa para identificar a área do caso.
- Áreas principais: previdenciário, consumidor/bancário, civil e família.
- Sempre que fizer sentido, peça nome, cidade e um resumo do caso.
- Quando perceber intenção real de contratação, oriente o usuário a seguir para atendimento humano no WhatsApp.
- Tom: sofisticado, confiável, objetivo e acolhedor.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();

    const reply =
      data.output_text ||
      "Desculpe, não consegui responder agora. Tente novamente em instantes.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Erro interno no servidor",
        details: error.message
      })
    };
  }
}