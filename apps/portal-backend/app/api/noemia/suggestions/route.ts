// Endpoint para obter sugestões dinâmicas baseadas no tema
import { NextResponse } from "next/server";

// Sugestões dinâmicas por tema
function getThemeSuggestions(tema?: string): string[] {
  const suggestions: Record<string, string[]> = {
    'aposentadoria': [
      'Posso me aposentar?',
      'Quanto tempo falta?',
      'Quais documentos preciso?',
      'Como funciona o cálculo?'
    ],
    'desconto-indevido': [
      'Como parar o desconto?',
      'Posso recuperar o dinheiro?',
      'O banco pode fazer isso?',
      'Quais meus direitos?'
    ],
    'pensao': [
      'Meu marido não paga pensão',
      'Como calcular o valor?',
      'Como pedir revisão?',
      'O que fazer se não paga?'
    ],
    'divorcio': [
      'Como funciona o divórcio?',
      'Quanto tempo demora?',
      'Como dividir bens?',
      'E se tiver filhos?'
    ],
    'trabalhista': [
      'Fui demitido injustamente',
      'Como calcular as verbas?',
      'O que é aviso prévio?',
      'Posso processar?'
    ],
    'familia': [
      'Como funciona guarda?',
      'O que é pensão alimentícia?',
      'Como fazer guarda compartilhada?',
      'E se não concordarmos?'
    ]
  };
  
  return suggestions[tema || ''] || [
    'Olá! Bom dia',
    'Como agendar consulta?',
    'Quanto custa uma consulta?',
    'Quais áreas atendem?'
  ];
}

// Mensagem inicial contextual
function getInitialMessage(tema?: string): string {
  const messages: Record<string, string> = {
    'aposentadoria': 'Vi que você chegou por um conteúdo sobre aposentadoria. Posso te ajudar a entender os primeiros pontos, documentos necessários e o melhor próximo passo.',
    'desconto-indevido': 'Se a sua dúvida é sobre desconto indevido ou cobrança irregular, posso organizar sua situação inicial e te orientar sobre o caminho mais adequado.',
    'pensao': 'Sobre pensão alimentícia, posso te explicar como funciona, como calcular e quais são os seus direitos e deveres.',
    'divorcio': 'Sobre divórcio, posso te orientar sobre os tipos, procedimentos e o que precisa ser considerado para cada caso.',
    'trabalhista': 'Para questões trabalhistas, posso te explicar sobre direitos trabalhistas, verbas rescisórias e como proceder.',
    'familia': 'Em direito de família, posso te ajudar a entender sobre guarda, pensão, divórcio e outros procedimentos familiares.'
  };
  
  return messages[tema || ''] || 'Olá! Que bom ter você aqui. Sou a NoemIA, sua assistente inteligente para jornada jurídica. Posso ajudar com agendamentos, processos, documentos ou orientar sobre próximos passos.';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tema = searchParams.get('tema') || undefined;
  
  return NextResponse.json({
    suggestions: getThemeSuggestions(tema),
    initialMessage: getInitialMessage(tema),
    tema
  });
}
