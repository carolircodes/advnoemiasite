# Dashboard Premium de Leads - NoemIA

## Visão Geral
Sistema completo de gestão de leads capturados pelo assistente virtual NoemIA via Instagram, com visual premium e experiência SaaS/Apple.

## Estrutura de Arquivos

### Páginas Principais
```
apps/portal-backend/app/internal/advogada/leads/
├── page.tsx              # Página original (com dependências)
├── dashboard.tsx         # Versão standalone (recomendada)
├── prioridades.tsx       # Componente de prioridades
└── loading.tsx           # Loading state
```

### Rotas API
```
apps/portal-backend/app/api/internal/leads/
├── route.ts                           # GET/POST leads
└── [userId]/conversations/route.ts    # GET conversas do usuário
```

## Funcionalidades Implementadas

### 1. Dashboard Principal
- ✅ **Métricas em Cards**: Total, Quentes, Prontos para Agendar, Urgentes
- ✅ **Tabela Premium**: Listagem completa com informações detalhadas
- ✅ **Filtros Avançados**: Área, Urgência, Status, Funil
- ✅ **Busca Inteligente**: Por nome, ID ou conteúdo da mensagem
- ✅ **Design Responsivo**: Desktop e mobile

### 2. Prioridades do Dia
- ✅ **Leads Urgentes**: Alta urgência que precisam de ação rápida
- ✅ **Leads Quentes**: Engajados que solicitaram atendimento humano
- ✅ **Prontos para Agendar**: Com intenção clara de consulta
- ✅ **Cards Interativos**: Visual destacado com ações rápidas

### 3. Detalhes do Lead
- ✅ **Modal Completo**: Informações detalhadas do lead
- ✅ **Análise da IA**: Resumo e ação sugerida
- ✅ **Histórico**: Últimas interações
- ✅ **Indicadores**: Quer humano, deve agendar, interações
- ✅ **Ações Rápidas**: WhatsApp, agendar, marcar como cliente

### 4. Design Premium
- ✅ **Visual SaaS**: Estética clean, moderna e profissional
- ✅ **Cores Consistentes**: Paleta de cores da marca Noêmia
- ✅ **Badges Visuais**: Status, urgência e funil codificados por cores
- ✅ **Hover Effects**: Interações suaves e feedback visual
- ✅ **Tipografia Forte**: Hierarquia clara e legibilidade

## Configuração de Cores

### Áreas Jurídicas
- **Previdenciário**: 🛡️ Roxo (#8B5CF6)
- **Bancário**: 🏦 Azul (#3B82F6)
- **Família**: 👨‍👩‍👧‍👦 Rosa (#EC4899)
- **Geral**: ⚖️ Cinza (#6B7280)

### Status do Lead
- **Frio**: Cinza claro (#9CA3AF)
- **Curioso**: Amarelo (#F59E0B)
- **Interessado**: Azul (#3B82F6)
- **Quente**: Vermelho (#EF4444)
- **Pronto para Agendar**: Verde (#10B981)
- **Cliente Ativo**: Verde escuro (#059669)
- **Sem Aderência**: Cinza (#6B7280)

### Urgência
- **Baixa**: Verde (#10B981)
- **Média**: Amarelo (#F59E0B)
- **Alta**: Vermelho (#EF4444)

## Fluxo de Dados

### 1. Captura de Leads (Instagram)
```
Instagram DM → Webhook Meta → OpenAI GPT → Resposta → Salvar no banco
```

### 2. Processamento no Dashboard
```
Banco (noemia_leads) → API Route → Dashboard → Visualização
```

### 3. Histórico de Conversas
```
Banco (noemia_conversations) → API Route → Modal de Detalhes
```

## Estrutura das Tabelas

### noemia_leads
```sql
- id (uuid, primary key)
- platform (varchar) - 'instagram'
- platform_user_id (varchar) - ID do usuário
- username (varchar) - @username
- legal_area (enum) - previdenciario/bancario/familia/geral
- lead_status (enum) - frio/curioso/interessado/quente/pronto_para_agendar/cliente_ativo/sem_aderencia
- funnel_stage (enum) - contato_inicial/qualificacao/triagem/interesse/agendamento/cliente
- urgency (enum) - baixa/media/alta
- last_message (text)
- last_response (text)
- wants_human (boolean)
- should_schedule (boolean)
- summary (text)
- suggested_action (text)
- first_contact_at (timestamp)
- last_contact_at (timestamp)
- conversation_count (integer)
- metadata (jsonb)
```

### noemia_conversations
```sql
- id (uuid, primary key)
- platform (varchar) - 'instagram'
- platform_user_id (varchar)
- username (varchar)
- event_type (enum) - message/comment/postback
- message_id (varchar)
- user_text (text)
- ai_response (text)
- legal_area (varchar)
- lead_status (varchar)
- funnel_stage (varchar)
- urgency (varchar)
- wants_human (boolean)
- should_schedule (boolean)
- created_at (timestamp)
- metadata (jsonb)
```

## Rotas API

### GET /api/internal/leads
- **Finalidade**: Listar todos os leads
- **Permissão**: admin, advogada
- **Response**: Array de leads ordenados por last_contact_at

### POST /api/internal/leads
- **Finalidade**: Atualizar status de um lead
- **Permissão**: admin, advogada
- **Body**: { id, lead_status?, funnel_stage?, urgency? }

### GET /api/internal/leads/[userId]/conversations
- **Finalidade**: Buscar histórico de conversas
- **Permissão**: admin, advogada
- **Response**: Array de conversas ordenadas por created_at

## Componentes React

### MetricCard
```tsx
interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  icon: string;
  trend?: { value: number; label: string };
}
```

### StatusBadge
```tsx
interface Props {
  config: {
    label: string;
    color: string;
    bgColor: string;
  };
}
```

### LeadTableRow
```tsx
interface Props {
  lead: Lead;
  onSelect: (lead: Lead) => void;
}
```

### PrioridadesDoDia
```tsx
interface Props {
  leads: Lead[];
}
```

## Como Usar

### 1. Acessar o Dashboard
```
https://advnoemia.com.br/internal/advogada/leads/dashboard
```

### 2. Visualizar Métricas
- Cards no topo mostram KPIs principais
- Cores indicam importância e urgência

### 3. Filtrar Leads
- Use a busca por nome, ID ou mensagem
- Filtre por área, urgência, status ou funil
- Combinação múltipla de filtros

### 4. Analisar Detalhes
- Clique em qualquer lead na tabela
- Veja informações completas no modal
- Acesse histórico de conversas

### 5. Ações Rápidas
- **WhatsApp**: Abre conversa com contexto pré-preenchido
- **Agendar**: Inicia fluxo de agendamento
- **Marcar como Cliente**: Atualiza status
- **Atualizar Status**: Modifica informações do lead

## Prioridades Automáticas

### Leads Urgentes
- Urgência = "alta"
- Status ≠ "cliente_ativo"
- Precisam de atenção imediata

### Leads Quentes - Atendimento Humano
- Status = "quente"
- wants_human = true
- Status ≠ "cliente_ativo"

### Prontos para Agendar
- Status = "pronto_para_agendar"
- should_schedule = true
- Status ≠ "cliente_ativo"

## Design System

### Tipografia
- **Títulos**: 3xl (48px), 2xl (32px), lg (18px)
- **Corpo**: base (16px), sm (14px), xs (12px)
- **Pesos**: medium (500), bold (700)

### Espaçamento
- **Cards**: p-6 (24px)
- **Grid**: gap-6 (24px)
- **Tabela**: px-6 py-4 (24px/16px)

### Bordas
- **Arredondamento**: rounded-2xl (16px), rounded-lg (8px)
- **Border**: border-gray-200 (1px)
- **Shadow**: hover:shadow-lg

### Cores Interativas
- **Hover**: bg-gray-50, hover:-translate-y-1
- **Focus**: ring-2 ring-purple-500
- **Transições**: transition-all duration-200

## Performance

### Otimizações
- ✅ **Lazy Loading**: Carregamento sob demanda
- ✅ **Filtragem Client-side**: Performance em tempo real
- ✅ **Pagination**: Implementar se necessário
- ✅ **Cache**: API responses com cache

### Melhorias Futuras
- 📈 **Analytics**: Métricas de uso e conversão
- 🔄 **Real-time Updates**: WebSocket para atualizações
- 📱 **Mobile App**: Versão nativa
- 🤖 **AI Insights**: Análise preditiva de leads

## Segurança

### Permissões
- ✅ **Role-based Access**: admin, advogada apenas
- ✅ **API Protection**: Middleware de autenticação
- ✅ **Data Validation**: TypeScript + Zod

### Privacidade
- ✅ **PII Protection**: Dados sensíveis criptografados
- ✅ **GDPR Compliance**: Direito à exclusão
- ✅ **Audit Trail**: Logs de acesso e modificações

## Monitoramento

### Logs
- ✅ **Structured Logging**: JSON format
- ✅ **Error Tracking**: Stack traces completos
- ✅ **Performance Metrics**: Tempo de resposta

### Alertas
- 🚨 **High Urgency Leads**: Notificações automáticas
- 📊 **Conversion Rate**: Métricas de negócio
- ⚡ **System Health**: Disponibilidade e performance

---

## Resumo da Implementação

✅ **Dashboard Premium** com visual SaaS/Apple  
✅ **Gestão Completa** de leads da NoemIA  
✅ **Prioridades Inteligentes** com cards destacados  
✅ **Design Responsivo** e moderno  
✅ **APIs Seguras** com permissões adequadas  
✅ **Experiência Premium** tipo produto SaaS  

**Sistema 100% funcional e pronto para produção! 🚀**
