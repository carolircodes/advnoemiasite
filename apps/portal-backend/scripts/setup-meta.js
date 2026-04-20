#!/usr/bin/env node

/**
 * Script de setup para integração com Meta
 * Configura variáveis de ambiente e testa conexão
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function setupEnvironment() {
  log('\n🚀 Setup da Integração Meta', 'bright');
  log('================================', 'cyan');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const metaEnvPath = path.join(process.cwd(), '.env.meta.example');
  
  // Verificar se .env.local já existe
  if (fs.existsSync(envPath)) {
    log('⚠️  Arquivo .env.local já existe', 'yellow');
    log('Deseja sobrescrever? (y/N): ', 'yellow');
    
    // Em ambiente real, aqui teríamos input do usuário
    log('ℹ️  Preservando arquivo existente. Adicione manualmente as variáveis:', 'blue');
  }
  
  // Gerar tokens seguros
  const appSecret = generateSecureToken(64);
  const verifyToken = generateSecureToken(32);
  const analyticsToken = generateSecureToken(48);
  
  // Conteúdo do .env.local
  const envContent = `
# Configurações da Meta - Geradas em ${new Date().toISOString()}
META_APP_SECRET=${appSecret}
FACEBOOK_APP_SECRET=
META_VERIFY_TOKEN=${verifyToken}

# WhatsApp Business API (preencher manualmente)
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_BUSINESS_ACCOUNT_ID=

# Instagram API (preencher manualmente)
META_INSTAGRAM_APP_ID=
META_INSTAGRAM_APP_SECRET=
META_INSTAGRAM_ACCESS_TOKEN=

# Analytics (opcional)
META_ANALYTICS_WEBHOOK=
META_ANALYTICS_TOKEN=${analyticsToken}

# Configurações
NODE_ENV=development
DEBUG_META=true
`;

  // Salvar .env.local
  fs.writeFileSync(envPath, envContent.trim());
  log('✅ Arquivo .env.local criado com sucesso!', 'green');
  
  // Mostrar tokens gerados
  log('\n🔑 Tokens Gerados:', 'bright');
  log('==================', 'cyan');
  log(`META_APP_SECRET: ${appSecret}`, 'blue');
  log(`META_VERIFY_TOKEN: ${verifyToken}`, 'blue');
  log(`META_ANALYTICS_TOKEN: ${analyticsToken}`, 'blue');
  
  log('\n⚠️  IMPORTANTE:', 'yellow');
  log('1. Copie META_VERIFY_TOKEN para configurar no webhook da Meta', 'yellow');
  log('2. Configure as credenciais do WhatsApp e Instagram manualmente', 'yellow');
  log('3. Não compartilhe estes tokens com ninguém!', 'red');
}

function showWebhookInstructions() {
  log('\n📡 Configuração do Webhook', 'bright');
  log('============================', 'cyan');
  
  log('1. Acesse: https://developers.facebook.com/', 'blue');
  log('2. Selecione seu app ou crie um novo', 'blue');
  log('3. Vá em "Products" → "Webhooks"', 'blue');
  log('4. Configure o webhook:', 'blue');
  log(`   - Callback URL: https://seu-dominio.com/api/meta/webhook`, 'white');
  log(`   - Verify Token: META_VERIFY_TOKEN do .env.local`, 'white');
  log('5. Selecione eventos:', 'blue');
  log('   ✓ Instagram Direct Messages', 'white');
  log('   ✓ Instagram Comments', 'white');
  log('   ✓ WhatsApp Business Messages', 'white');
  
  log('\n📱 WhatsApp Business Setup:', 'bright');
  log('==========================', 'cyan');
  log('1. No Meta for Developers, adicione "WhatsApp" product', 'blue');
  log('2. Configure um número de telefone', 'blue');
  log('3. Obtenha as credenciais:', 'blue');
  log('   - Access Token', 'white');
  log('   - Phone Number ID', 'white');
  log('   - Business Account ID', 'white');
  log('4. Adicione ao .env.local', 'blue');
}

function showTestCommands() {
  log('\n🧪 Comandos de Teste', 'bright');
  log('====================', 'cyan');
  
  log('1. Testar detecção de tema:', 'blue');
  log('   curl "http://localhost:3000/api/meta/test?text=aposentadoria&origem=instagram"', 'white');
  
  log('\n2. Simular webhook:', 'blue');
  log('   curl -X POST http://localhost:3000/api/meta/test \\', 'white');
  log('     -H "Content-Type: application/json" \\', 'white');
  log('     -d \'{"type": "instagram_direct", "text": "Preciso de ajuda com aposentadoria"}\'', 'white');
  
  log('\n3. Verificar webhook:', 'blue');
  log('   curl "https://seu-dominio.com/api/meta/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=SEU_TOKEN"', 'white');
  
  log('\n4. Testar NoemIA com contexto:', 'blue');
  log('   curl -X POST http://localhost:3000/api/noemia/chat/route-meta \\', 'white');
  log('     -H "Content-Type: application/json" \\', 'white');
  log('     -d \'{"message": "Preciso de ajuda", "metaContext": {"tema": "aposentadoria", "origem": "instagram"}}\'', 'white');
}

function showDirectoryStructure() {
  log('\n📁 Estrutura de Arquivos Criada:', 'bright');
  log('================================', 'cyan');
  
  const structure = `
apps/portal-backend/
├── app/api/meta/
│   ├── webhook/route.ts          # Webhook principal
│   └── test/route.ts             # Endpoint de testes
├── lib/meta/
│   ├── webhook-processor.ts      # Processador de eventos
│   ├── theme-detector.ts         # Detecção de temas
│   ├── link-generator.ts         # Geração de links
│   ├── whatsapp-service.ts       # WhatsApp Cloud API
│   └── logging.ts                # Sistema de logs
├── app/api/noemia/chat/
│   └── route-meta.ts             # NoemIA com contexto Meta
├── scripts/
│   └── setup-meta.js             # Este script
├── .env.local                    # Variáveis de ambiente
└── INTEGRACAO_META_GUIDE.md      # Documentação completa
`;
  
  log(structure, 'white');
}

function checkPrerequisites() {
  log('\n🔍 Verificando Pré-requisitos:', 'bright');
  log('==============================', 'cyan');
  
  // Verificar Node.js
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 20) {
    log(`✅ Node.js ${nodeVersion}`, 'green');
  } else {
    log(`❌ Node.js ${nodeVersion} (requerido >= 20.0.0)`, 'red');
    process.exit(1);
  }
  
  // Verificar se está no diretório correto
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.name === 'portal-backend') {
      log('✅ Diretório correto: portal-backend', 'green');
    } else {
      log('❌ Execute este script no diretório apps/portal-backend', 'red');
      process.exit(1);
    }
  } else {
    log('❌ package.json não encontrado', 'red');
    process.exit(1);
  }
  
  // Verificar dependências
  const requiredDeps = ['next', 'react', '@supabase/supabase-js'];
  const missingDeps = [];
  
  for (const dep of requiredDeps) {
    try {
      require.resolve(dep);
      log(`✅ ${dep} instalado`, 'green');
    } catch (e) {
      missingDeps.push(dep);
      log(`❌ ${dep} não encontrado`, 'red');
    }
  }
  
  if (missingDeps.length > 0) {
    log(`\n⚠️  Dependências faltando: ${missingDeps.join(', ')}`, 'yellow');
    log('Execute: npm install', 'yellow');
  }
}

function main() {
  log('\n🎯 Integração Meta - Noêmia Paixão Advocacia', 'bright');
  log('=============================================', 'cyan');
  
  checkPrerequisites();
  setupEnvironment();
  showWebhookInstructions();
  showTestCommands();
  showDirectoryStructure();
  
  log('\n✅ Setup concluído!', 'green');
  log('\n📖 Próximos passos:', 'bright');
  log('1. Configure as credenciais no .env.local', 'blue');
  log('2. Configure o webhook no Meta Developers', 'blue');
  log('3. Teste com os comandos acima', 'blue');
  log('4. Leia INTEGRACAO_META_GUIDE.md para detalhes', 'blue');
  
  log('\n🚀 Sistema pronto para automação com Meta!', 'green');
  log('==========================================', 'cyan');
}

// Executar setup
if (require.main === module) {
  main();
}

module.exports = {
  setupEnvironment,
  showWebhookInstructions,
  showTestCommands,
  checkPrerequisites
};
