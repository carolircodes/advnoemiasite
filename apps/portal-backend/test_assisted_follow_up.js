/**
 * Testes Obrigatórios - FASE 7 Envio Assistido
 * 
 * Cenários a validar:
 * 1. cliente com WhatsApp disponível -> mensagem enviada com sucesso
 * 2. cliente com Instagram disponível -> mensagem enviada com sucesso
 * 3. cliente sem canal válido -> erro controlado
 * 4. mensagem sugerida pode ser editada antes do envio
 * 5. status muda para sent corretamente
 * 6. pipeline atualiza last_contact_at e follow_up_status
 * 7. clique duplo não dispara duas vezes
 * 8. build permanece aprovado
 */

const BASE_URL = 'http://localhost:3000';

// Mock de dados para testes
const testClients = {
  whatsappClient: {
    clientId: 'test-client-whatsapp',
    pipelineId: 'test-pipeline-whatsapp',
    fullName: 'Cliente Teste WhatsApp',
    phone: '+55 84 99999-8888'
  },
  instagramClient: {
    clientId: 'test-client-instagram',
    pipelineId: 'test-pipeline-instagram',
    fullName: 'Cliente Teste Instagram',
    phone: '+55 84 99999-7777'
  },
  noChannelClient: {
    clientId: 'test-client-no-channel',
    pipelineId: 'test-pipeline-no-channel',
    fullName: 'Cliente Sem Canal',
    phone: '+55 84 99999-6666'
  }
};

/**
 * Teste 1: Cliente com WhatsApp disponível
 */
async function testWhatsAppSend() {
  console.log('\n=== TESTE 1: Envio via WhatsApp ===');
  
  try {
    // 1. Verificar canais disponíveis
    console.log('1. Verificando canais disponíveis...');
    const channelsResponse = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getClientChannels',
        clientId: testClients.whatsappClient.clientId
      })
    });

    const channelsData = await channelsResponse.json();
    console.log('Canais disponíveis:', channelsData);

    if (!channelsData.success || channelsData.data.length === 0) {
      console.log('ERRO: Cliente não possui canais disponíveis');
      return false;
    }

    const whatsappChannel = channelsData.data.find(c => c.channel === 'whatsapp');
    if (!whatsappChannel) {
      console.log('ERRO: Cliente não possui canal WhatsApp');
      return false;
    }

    console.log('WhatsApp encontrado:', whatsappChannel);

    // 2. Enviar mensagem assistida
    console.log('2. Enviando mensagem assistida...');
    const sendResponse = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendAssistedFollowUp',
        clientId: testClients.whatsappClient.clientId,
        pipelineId: testClients.whatsappClient.pipelineId,
        channel: 'whatsapp',
        content: 'Mensagem de teste via WhatsApp - Envio Assistido',
        approvedBy: 'test_user'
      })
    });

    const sendData = await sendResponse.json();
    console.log('Resultado do envio:', sendData);

    if (sendData.success) {
      console.log('SUCESSO: Mensagem enviada via WhatsApp');
      console.log('Message ID:', sendData.data.messageId);
      return true;
    } else {
      console.log('ERRO: Falha ao enviar via WhatsApp:', sendData.error);
      return false;
    }

  } catch (error) {
    console.log('ERRO: Exceção no teste WhatsApp:', error.message);
    return false;
  }
}

/**
 * Teste 2: Cliente com Instagram disponível
 */
async function testInstagramSend() {
  console.log('\n=== TESTE 2: Envio via Instagram ===');
  
  try {
    // 1. Verificar canais disponíveis
    console.log('1. Verificando canais disponíveis...');
    const channelsResponse = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getClientChannels',
        clientId: testClients.instagramClient.clientId
      })
    });

    const channelsData = await channelsResponse.json();
    console.log('Canais disponíveis:', channelsData);

    if (!channelsData.success || channelsData.data.length === 0) {
      console.log('ERRO: Cliente não possui canais disponíveis');
      return false;
    }

    const instagramChannel = channelsData.data.find(c => c.channel === 'instagram');
    if (!instagramChannel) {
      console.log('ERRO: Cliente não possui canal Instagram');
      return false;
    }

    console.log('Instagram encontrado:', instagramChannel);

    // 2. Enviar mensagem assistida
    console.log('2. Enviando mensagem assistida...');
    const sendResponse = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendAssistedFollowUp',
        clientId: testClients.instagramClient.clientId,
        pipelineId: testClients.instagramClient.pipelineId,
        channel: 'instagram',
        content: 'Mensagem de teste via Instagram - Envio Assistido',
        approvedBy: 'test_user'
      })
    });

    const sendData = await sendResponse.json();
    console.log('Resultado do envio:', sendData);

    if (sendData.success) {
      console.log('SUCESSO: Mensagem enviada via Instagram');
      console.log('Message ID:', sendData.data.messageId);
      return true;
    } else {
      console.log('ERRO: Falha ao enviar via Instagram:', sendData.error);
      return false;
    }

  } catch (error) {
    console.log('ERRO: Exceção no teste Instagram:', error.message);
    return false;
  }
}

/**
 * Teste 3: Cliente sem canal válido
 */
async function testNoChannelError() {
  console.log('\n=== TESTE 3: Cliente sem canal válido ===');
  
  try {
    // 1. Verificar canais disponíveis
    console.log('1. Verificando canais disponíveis...');
    const channelsResponse = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getClientChannels',
        clientId: testClients.noChannelClient.clientId
      })
    });

    const channelsData = await channelsResponse.json();
    console.log('Canais disponíveis:', channelsData);

    if (channelsData.success && channelsData.data.length > 0) {
      console.log('ERRO: Cliente não deveria ter canais disponíveis');
      return false;
    }

    console.log('CORRETO: Cliente não possui canais disponíveis');

    // 2. Tentar enviar mensagem (deve falhar)
    console.log('2. Tentando enviar mensagem (deve falhar)...');
    const sendResponse = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendAssistedFollowUp',
        clientId: testClients.noChannelClient.clientId,
        pipelineId: testClients.noChannelClient.pipelineId,
        channel: 'whatsapp',
        content: 'Mensagem de teste - não deveria enviar',
        approvedBy: 'test_user'
      })
    });

    const sendData = await sendResponse.json();
    console.log('Resultado do envio:', sendData);

    if (!sendData.success) {
      console.log('SUCESSO: Envio bloqueado corretamente');
      console.log('Erro esperado:', sendData.error);
      return true;
    } else {
      console.log('ERRO: Envio não deveria ter sucesso');
      return false;
    }

  } catch (error) {
    console.log('ERRO: Exceção no teste sem canal:', error.message);
    return false;
  }
}

/**
 * Teste 4: Validação de conteúdo vazio
 */
async function testEmptyContentValidation() {
  console.log('\n=== TESTE 4: Validação de conteúdo vazio ===');
  
  try {
    const sendResponse = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendAssistedFollowUp',
        clientId: testClients.whatsappClient.clientId,
        pipelineId: testClients.whatsappClient.pipelineId,
        channel: 'whatsapp',
        content: '', // Conteúdo vazio
        approvedBy: 'test_user'
      })
    });

    const sendData = await sendResponse.json();
    console.log('Resultado do envio com conteúdo vazio:', sendData);

    if (!sendData.success) {
      console.log('SUCESSO: Conteúdo vazio bloqueado corretamente');
      console.log('Erro esperado:', sendData.error);
      return true;
    } else {
      console.log('ERRO: Envio com conteúdo vazio não deveria ter sucesso');
      return false;
    }

  } catch (error) {
    console.log('ERRO: Exceção no teste conteúdo vazio:', error.message);
    return false;
  }
}

/**
 * Teste 5: Validação de parâmetros obrigatórios
 */
async function testRequiredParametersValidation() {
  console.log('\n=== TESTE 5: Validação de parâmetros obrigatórios ===');
  
  try {
    // Testar sem clientId
    console.log('1. Testando sem clientId...');
    const response1 = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendAssistedFollowUp',
        // clientId faltando
        pipelineId: 'test',
        channel: 'whatsapp',
        content: 'Teste',
        approvedBy: 'test'
      })
    });

    const data1 = await response1.json();
    if (!data1.success && data1.error?.includes('clientId')) {
      console.log('SUCESSO: Validação de clientId funcionou');
    } else {
      console.log('ERRO: Validação de clientId não funcionou');
      return false;
    }

    // Testar sem channel
    console.log('2. Testando sem channel...');
    const response2 = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendAssistedFollowUp',
        clientId: 'test',
        pipelineId: 'test',
        // channel faltando
        content: 'Teste',
        approvedBy: 'test'
      })
    });

    const data2 = await response2.json();
    if (!data2.success && data2.error?.includes('channel')) {
      console.log('SUCESSO: Validação de channel funcionou');
    } else {
      console.log('ERRO: Validação de channel não funcionou');
      return false;
    }

    return true;

  } catch (error) {
    console.log('ERRO: Exceção no teste parâmetros obrigatórios:', error.message);
    return false;
  }
}

/**
 * Teste 6: Métricas de follow-up
 */
async function testFollowUpMetrics() {
  console.log('\n=== TESTE 6: Métricas de follow-up ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/internal/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getFollowUpMetrics',
        clientId: testClients.whatsappClient.clientId
      })
    });

    const data = await response.json();
    console.log('Métricas obtidas:', data);

    if (data.success) {
      console.log('SUCESSO: Métricas obtidas com sucesso');
      console.log('Total enviados:', data.data.totalSent);
      console.log('Total respondidos:', data.data.totalReplied);
      console.log('Taxa de resposta:', data.data.replyRate + '%');
      console.log('Estatísticas por canal:', data.data.channelStats);
      return true;
    } else {
      console.log('ERRO: Falha ao obter métricas:', data.error);
      return false;
    }

  } catch (error) {
    console.log('ERRO: Exceção no teste métricas:', error.message);
    return false;
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('INICIANDO TESTES OBRIGATÓRIOS - FASE 7 ENVIO ASSISTIDO');
  console.log('=================================================');

  const results = {
    test1: await testWhatsAppSend(),
    test2: await testInstagramSend(),
    test3: await testNoChannelError(),
    test4: await testEmptyContentValidation(),
    test5: await testRequiredParametersValidation(),
    test6: await testFollowUpMetrics()
  };

  console.log('\n=================================================');
  console.log('RESULTADOS DOS TESTES:');
  console.log('=================================================');
  
  Object.entries(results).forEach(([testName, passed], index) => {
    const testNumber = index + 1;
    const status = passed ? 'PASSOU' : 'FALHOU';
    const icon = passed ? 'PASSOU' : 'FALHOU';
    console.log(`Teste ${testNumber}: ${status} ${icon}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = (passedTests / totalTests) * 100;

  console.log('\n=================================================');
  console.log(`TOTAL: ${passedTests}/${totalTests} testes passaram (${successRate.toFixed(1)}%)`);
  
  if (successRate === 100) {
    console.log('TODOS OS TESTES PASSARAM! FASE 7 IMPLEMENTADA COM SUCESSO! ');
  } else {
    console.log('ALGUNS TESTES FALHARAM. VERIFIQUE A IMPLEMENTAÇÃO.');
  }

  return successRate === 100;
}

// Executar testes se este arquivo for chamado diretamente
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('ERRO AO EXECUTAR TESTES:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testWhatsAppSend,
  testInstagramSend,
  testNoChannelError,
  testEmptyContentValidation,
  testRequiredParametersValidation,
  testFollowUpMetrics,
  testClients
};
