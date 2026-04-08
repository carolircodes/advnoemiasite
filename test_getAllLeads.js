// Exemplo de uso da função getAllLeads()
import { getAllLeads } from './apps/portal-backend/lib/services/noemia.js';

// Exemplo de retorno esperado:
const exampleReturn = [
  {
    sessionId: "user-session-123",
    summary: {
      theme: "aposentadoria",
      problem: "INSS negou meu benefício",
      time: "há 2 meses",
      urgency: "sim",
      temperature: "hot",
      urgencyLevel: "high",
      priority: "high",
      needsHumanAttention: true,
      handoffReason: "Lead quente com alta urgência - situação crítica detectada"
    },
    lastMessage: "O INSS negou minha aposentadoria e estou sem renda, o que fazer?",
    priority: "high",
    temperature: "hot",
    urgency: "high",
    theme: "aposentadoria",
    timestamp: new Date("2026-04-08T12:30:00Z")
  },
  {
    sessionId: "visitor-session-456",
    summary: {
      theme: "desconto-indevido",
      problem: "Banco fazendo desconto indevido",
      time: "há 1 semana",
      urgency: "não",
      temperature: "warm",
      urgencyLevel: "medium",
      priority: "normal",
      needsHumanAttention: false,
      handoffReason: "Lead morno - tratamento padrão automatizado"
    },
    lastMessage: "Meu banco está descontando um valor que não reconheço",
    priority: "normal",
    temperature: "warm",
    urgency: "medium",
    theme: "desconto-indevido",
    timestamp: new Date("2026-04-08T11:45:00Z")
  }
];

// Como usar:
console.log("=== EXEMPLO DE USO DA FUNÇÃO getAllLeads() ===");
console.log("");

// Simular chamada da função
const leads = getAllLeads();

console.log("Total de leads encontrados:", leads.length);
console.log("");

leads.forEach((lead, index) => {
  console.log(`--- LEAD ${index + 1} ---`);
  console.log("Session ID:", lead.sessionId);
  console.log("Tema:", lead.theme);
  console.log("Prioridade:", lead.priority);
  console.log("Temperatura:", lead.temperature);
  console.log("Urgência:", lead.urgency);
  console.log("Última mensagem:", lead.lastMessage);
  console.log("Timestamp:", lead.timestamp.toISOString());
  console.log("Resumo completo:", JSON.stringify(lead.summary, null, 2));
  console.log("");
});

console.log("=== CARACTERÍSTICAS DA FUNÇÃO ===");
console.log("✅ Filtra apenas sessões com leadSummary");
console.log("✅ Ordena: priority 'high' primeiro");
console.log("✅ Depois ordena por timestamp mais recente");
console.log("✅ Retorna todos os campos solicitados");
console.log("✅ Não altera nenhuma lógica existente");
