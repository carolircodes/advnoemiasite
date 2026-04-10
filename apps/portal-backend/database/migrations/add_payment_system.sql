-- Migração para adicionar sistema de pagamentos ao Noêmia

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES noemia_leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL UNIQUE, -- ID do Mercado Pago
    payment_url TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled, refunded
    payment_method_id TEXT,
    payment_type_id TEXT,
    status_detail TEXT,
    transaction_amount DECIMAL(10,2),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Adicionar colunas de pagamento à tabela noemia_leads
ALTER TABLE noemia_leads 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending', -- pending, confirmed, rejected, refunded
ADD COLUMN IF NOT EXISTS payment_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMPTZ;

-- Adicionar colunas à tabela noemia_lead_conversations para suporte a mensagens de pagamento
ALTER TABLE noemia_lead_conversations 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user_message', -- user_message, ai_response, payment_confirmation, payment_request
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Tabela para controle de agendamentos (futura implementação)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES noemia_leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id),
    scheduled_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
    meeting_link TEXT,
    meeting_type TEXT DEFAULT 'online', -- online, in_person
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);

-- Adicionar coluna de appointment_id à tabela noemia_leads
ALTER TABLE noemia_leads 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Política para pagamentos: apenas usuários autenticados podem ver seus próprios pagamentos
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Política para appointments: apenas usuários autenticados podem ver seus próprios agendamentos
CREATE POLICY "Users can view their own appointments" ON appointments
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Comentários nas tabelas
COMMENT ON TABLE payments IS 'Tabela para registrar pagamentos via Mercado Pago';
COMMENT ON TABLE appointments IS 'Tabela para controlar agendamentos de consultas';
COMMENT ON COLUMN payments.external_id IS 'ID externo do pagamento no Mercado Pago';
COMMENT ON COLUMN payments.status IS 'Status do pagamento: pending, approved, rejected, cancelled, refunded';
COMMENT ON COLUMN appointments.meeting_type IS 'Tipo de atendimento: online, in_person';
COMMENT ON COLUMN appointments.meeting_link IS 'Link da reunião (para atendimentos online)';
