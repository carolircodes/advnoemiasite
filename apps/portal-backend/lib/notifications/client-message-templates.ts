import "server-only";

export interface ClientMessageTemplate {
  greeting: string;
  update: string;
  summary: string;
  nextSteps: string;
  closing: string;
  contactInfo: string;
}

/**
 * Templates profissionais para mensagens de clientes
 */
export class ClientMessageTemplates {
  
  /**
   * Template para atualização geral de caso
   */
  static caseUpdate(clientName: string, caseTitle: string, publicSummary: string): ClientMessageTemplate {
    return {
      greeting: `Olá, ${clientName}!`,
      update: `Passando para informar que houve uma atualização importante no seu atendimento: "${caseTitle}".`,
      summary: publicSummary || `Nossa equipe realizou uma movimentação relevante no seu processo que impacta diretamente o andamento.`,
      nextSteps: `Recomendamos acessar seu portal do cliente para visualizar todos os detalhes e próximos passos. Mantenha seus documentos atualizados para agilizar o processo.`,
      closing: `Estamos à sua disposição para qualquer dúvida.`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para mudança de status
   */
  static statusChange(clientName: string, caseTitle: string, newStatus: string, details?: string): ClientMessageTemplate {
    return {
      greeting: `Olá, ${clientName}!`,
      update: `Boa notícia! O status do seu caso "${caseTitle}" foi atualizado para: ${newStatus}.`,
      summary: details || `Esta mudança representa um avanço importante no seu processo jurídico. Nossa equipe está trabalhando continuamente para garantir o melhor resultado.`,
      nextSteps: `Acompanhe todos os detalhes e próximos passos pelo seu portal do cliente. Caso precise de alguma informação adicional, nossa equipe entrará em contato.`,
      closing: `Celebramos cada conquista ao seu lado!`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para novo documento solicitado
   */
  static documentRequest(clientName: string, documentTitle: string, reason: string): ClientMessageTemplate {
    return {
      greeting: `Prezado(a) ${clientName},`,
      update: `Precisamos da sua atenção para um documento importante: "${documentTitle}".`,
      summary: reason || `Este documento é essencial para darmos andamento ao seu processo. Sua colaboração é fundamental para alcançarmos o resultado desejado.`,
      nextSteps: `Por favor, envie o documento através do seu portal do cliente o mais breve possível. Caso tenha dificuldades, nossa equipe pode ajudar.`,
      closing: `Contamos com sua colaboração!`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para agendamento de consulta
   */
  static appointmentScheduled(clientName: string, dateTime: string, type: string): ClientMessageTemplate {
    return {
      greeting: `Olá, ${clientName}!`,
      update: `Sua consulta foi agendada com sucesso!`,
      summary: `${type} marcada para ${dateTime}. Prepare-se para a consulta reunindo todos os documentos relevantes do seu caso.`,
      nextSteps: `Compareça com 15 minutos de antecedência. Caso precise remarcar, avise-nos com pelo menos 24 horas de antecedência.`,
      closing: `Aguardamos você!`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para lembrete de consulta
   */
  static appointmentReminder(clientName: string, dateTime: string, type: string): ClientMessageTemplate {
    return {
      greeting: `Olá, ${clientName}!`,
      update: `Lembrete da sua consulta amanhã!`,
      summary: `${type} agendada para ${dateTime}. Não se esqueça de levar seus documentos e chegar com 15 minutos de antecedência.`,
      nextSteps: `Caso precise remarcar ou tenha alguma dúvida, entre em contato conosco pelo WhatsApp.`,
      closing: `Aguardamos você!`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para conclusão de caso
   */
  static caseCompleted(clientName: string, caseTitle: string, result: string): ClientMessageTemplate {
    return {
      greeting: `Olá, ${clientName}!`,
      update: `Excelente notícia! Seu caso "${caseTitle}" foi concluído com sucesso!`,
      summary: result || `Conseguimos alcançar um resultado positivo para você. Esta conquista é fruto do trabalho conjunto e da sua confiança em nosso trabalho.`,
      nextSteps: `Acesse seu portal para visualizar o resultado final e próximos passos. Guarde todos os documentos em local seguro.`,
      closing: `Foi uma honra representar você!`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para mensagem de boas-vindas
   */
  static welcome(clientName: string): ClientMessageTemplate {
    return {
      greeting: `Seja bem-vindo(a), ${clientName}!`,
      update: `É uma grande satisfação tê-lo(a) como cliente do Escritório Noemia.`,
      summary: `Sua jornada jurídica agora conta com uma equipe dedicada e experiente. Estamos prontos para oferecer o melhor atendimento e buscar os melhores resultados para você.`,
      nextSteps: `Acesse seu portal do cliente para começar a interagir conosco. Lá você encontrará todos os seus casos, documentos e poderá se comunicar diretamente com nossa equipe.`,
      closing: `Estamos à sua disposição!`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para mensagem de aniversário
   */
  static birthday(clientName: string): ClientMessageTemplate {
    return {
      greeting: `Feliz aniversário, ${clientName}!`,
      update: `Hoje é um dia especial e queremos celebrar junto com você!`,
      summary: `Agradecemos por confiar o seu caso às nossas mãos. É um privilégio fazer parte da sua jornada jurídica e celebrar cada conquista ao seu lado.`,
      nextSteps: `Que este novo ciclo traga muitas realizações. Continue contando com nosso apoio para todos os desafios jurídicos que surgirem.`,
      closing: `Muitas felicidades e sucesso!`,
      contactInfo: `Com carinho,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Template para mensagem de férias/indisponibilidade
   */
  static holidayNotice(clientName: string, returnDate: string): ClientMessageTemplate {
    return {
      greeting: `Olá, ${clientName}!`,
      update: `Informamos sobre nosso período de recesso coletivo.`,
      summary: `Nosso escritório estará em recesso para recarregar energias e melhor atendê-lo(a) ao retornar. Retomaremos normalmente em ${returnDate}.`,
      nextSteps: `Casos urgentes serão encaminhados para nossa equipe de plantão. Para assuntos não urgentes, aguardamos seu retorno em ${returnDate}.`,
      closing: `Agradecemos sua compreensão!`,
      contactInfo: `Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922`
    };
  }

  /**
   * Formata mensagem completa para email
   */
  static formatEmail(template: ClientMessageTemplate): string {
    return `${template.greeting}

${template.update}

${template.summary}

${template.nextSteps}

${template.closing}

${template.contactInfo}`;
  }

  /**
   * Formata mensagem compacta para WhatsApp
   */
  static formatWhatsApp(template: ClientMessageTemplate): string {
    return `${template.greeting}

${template.update}

${template.summary}

${template.nextSteps}

${template.closing}

${template.contactInfo}`;
  }

  /**
   * Formata assunto de email
   */
  static formatSubject(update: string): string {
    return `Atualização do Escritório Noemia: ${update}`;
  }
}

/**
 * Gera mensagem personalizada baseada no tipo de evento
 */
export function generateClientMessage(
  eventType: string,
  clientName: string,
  caseTitle: string,
  publicSummary: string,
  additionalData?: Record<string, any>
): ClientMessageTemplate {
  switch (eventType) {
    case "case_update":
      return ClientMessageTemplates.caseUpdate(clientName, caseTitle, publicSummary);
    
    case "status_change":
      return ClientMessageTemplates.statusChange(
        clientName, 
        caseTitle, 
        additionalData?.newStatus || "Atualizado",
        additionalData?.details
      );
    
    case "document_request":
      return ClientMessageTemplates.documentRequest(
        clientName,
        additionalData?.documentTitle || "Documento",
        publicSummary
      );
    
    case "appointment_scheduled":
      return ClientMessageTemplates.appointmentScheduled(
        clientName,
        additionalData?.dateTime || "Data a definir",
        additionalData?.type || "Consulta"
      );
    
    case "appointment_reminder":
      return ClientMessageTemplates.appointmentReminder(
        clientName,
        additionalData?.dateTime || "Amanhã",
        additionalData?.type || "Consulta"
      );
    
    case "case_completed":
      return ClientMessageTemplates.caseCompleted(
        clientName,
        caseTitle,
        publicSummary
      );
    
    default:
      // Template genérico para eventos não mapeados
      return {
        greeting: `Olá, ${clientName}!`,
        update: `Temos uma atualização importante sobre seu caso "${caseTitle}".`,
        summary: publicSummary || "Houve uma movimentação relevante no seu processo.",
        nextSteps: "Acesse seu portal do cliente para mais detalhes.",
        closing: "Estamos à sua disposição!",
        contactInfo: "Atenciosamente,\nEscritório Noemia\nWhatsApp: (84) 4002-8922"
      };
  }
}
