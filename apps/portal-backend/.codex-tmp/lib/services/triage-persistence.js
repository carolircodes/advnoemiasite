"use strict";
/**
 * TRIAGE PERSISTENCE SERVICE
 *
 * Serviço especializado para persistir e gerenciar dados de triagem da NoemIA
 * Integrado com o sistema de conversações existente
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.triagePersistence = void 0;
const conversation_persistence_1 = require("./conversation-persistence");
class TriagePersistenceService {
    constructor() {
        this.supabase = conversation_persistence_1.conversationPersistence.supabaseClient;
    }
    isMissingColumn(error, column) {
        const message = error instanceof Error
            ? error.message
            : typeof error === 'object' && error && 'message' in error
                ? String(error.message || '')
                : String(error);
        return message.toLowerCase().includes(column.toLowerCase()) && message.toLowerCase().includes('column');
    }
    /**
     * Salvar ou atualizar dados da triagem
     */
    async saveTriageData(sessionId, triageData, metadata) {
        try {
            const now = new Date().toISOString();
            // Primeiro, tenta atualizar registro existente
            const { data: existingData, error: fetchError } = await this.supabase
                .from('noemia_triage_summaries')
                .select('*')
                .eq('session_id', sessionId)
                .single();
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('ERROR_FETCHING_TRIAGE:', fetchError);
                throw fetchError;
            }
            const summaryData = {
                session_id: sessionId,
                channel: metadata.channel,
                user_id: metadata.userId,
                triage_data: triageData,
                is_hot_lead: metadata.isHotLead,
                needs_human_attention: metadata.needsHumanAttention,
                handoff_reason: metadata.handoffReason || null,
                internal_summary: metadata.internalSummary,
                user_friendly_summary: metadata.userFriendlySummary,
                conversation_status: metadata.conversationStatus || triageData.conversation_status || null,
                consultation_stage: metadata.consultationStage || triageData.consultation_stage || null,
                report_data: metadata.reportData || triageData.report || {},
                lawyer_notification_generated: metadata.lawyerNotificationGenerated ?? false,
                updated_at: now,
                ...(existingData ? {} : { created_at: now })
            };
            let result;
            if (existingData) {
                // Atualizar registro existente
                let { data, error } = await this.supabase
                    .from('noemia_triage_summaries')
                    .update(summaryData)
                    .eq('session_id', sessionId)
                    .select()
                    .single();
                if (error &&
                    (this.isMissingColumn(error, 'conversation_status') ||
                        this.isMissingColumn(error, 'consultation_stage') ||
                        this.isMissingColumn(error, 'report_data') ||
                        this.isMissingColumn(error, 'lawyer_notification_generated'))) {
                    console.warn('TRIAGE_SCHEMA_DRIFT_RETRY', {
                        sessionId,
                        reason: 'extended_triage_columns_missing'
                    });
                    const { conversation_status: _conversationStatus, consultation_stage: _consultationStage, report_data: _reportData, lawyer_notification_generated: _lawyerNotificationGenerated, ...legacySummaryData } = summaryData;
                    const retryResult = await this.supabase
                        .from('noemia_triage_summaries')
                        .update(legacySummaryData)
                        .eq('session_id', sessionId)
                        .select()
                        .single();
                    data = retryResult.data;
                    error = retryResult.error;
                }
                if (error) {
                    console.error('ERROR_UPDATING_TRIAGE:', error);
                    throw error;
                }
                result = data;
            }
            else {
                // Criar novo registro
                let { data, error } = await this.supabase
                    .from('noemia_triage_summaries')
                    .insert(summaryData)
                    .select()
                    .single();
                if (error &&
                    (this.isMissingColumn(error, 'conversation_status') ||
                        this.isMissingColumn(error, 'consultation_stage') ||
                        this.isMissingColumn(error, 'report_data') ||
                        this.isMissingColumn(error, 'lawyer_notification_generated'))) {
                    console.warn('TRIAGE_SCHEMA_DRIFT_RETRY', {
                        sessionId,
                        reason: 'extended_triage_columns_missing'
                    });
                    const { conversation_status: _conversationStatus, consultation_stage: _consultationStage, report_data: _reportData, lawyer_notification_generated: _lawyerNotificationGenerated, ...legacySummaryData } = summaryData;
                    const retryResult = await this.supabase
                        .from('noemia_triage_summaries')
                        .insert(legacySummaryData)
                        .select()
                        .single();
                    data = retryResult.data;
                    error = retryResult.error;
                }
                if (error) {
                    console.error('ERROR_CREATING_TRIAGE:', error);
                    throw error;
                }
                result = data;
            }
            console.log('TRIAGE_SAVED', {
                sessionId,
                channel: metadata.channel,
                isHotLead: metadata.isHotLead,
                needsHumanAttention: metadata.needsHumanAttention,
                completude: triageData.completude || 0
            });
            return this.formatTriageSummary(result);
        }
        catch (error) {
            console.error('TRIAGE_PERSISTENCE_ERROR:', error);
            throw error;
        }
    }
    /**
     * Buscar dados da triagem por sessionId
     */
    async getTriageData(sessionId) {
        try {
            const { data, error } = await this.supabase
                .from('noemia_triage_summaries')
                .select('*')
                .eq('session_id', sessionId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Não encontrado
                }
                console.error('ERROR_FETCHING_TRIAGE:', error);
                throw error;
            }
            return this.formatTriageSummary(data);
        }
        catch (error) {
            console.error('GET_TRIAGE_ERROR:', error);
            return null;
        }
    }
    /**
     * Listar triagens que precisam de atenção humana
     */
    async getTriageForHumanAttention(limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('noemia_triage_summaries')
                .select('*')
                .eq('needs_human_attention', true)
                .order('updated_at', { ascending: false })
                .limit(limit);
            if (error) {
                console.error('ERROR_FETCHING_TRIAGE_FOR_ATTENTION:', error);
                throw error;
            }
            return (data || []).map(item => this.formatTriageSummary(item));
        }
        catch (error) {
            console.error('GET_TRIAGE_FOR_ATTENTION_ERROR:', error);
            return [];
        }
    }
    /**
     * Listar hot leads
     */
    async getHotLeads(limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('noemia_triage_summaries')
                .select('*')
                .eq('is_hot_lead', true)
                .order('updated_at', { ascending: false })
                .limit(limit);
            if (error) {
                console.error('ERROR_FETCHING_HOT_LEADS:', error);
                throw error;
            }
            return (data || []).map(item => this.formatTriageSummary(item));
        }
        catch (error) {
            console.error('GET_HOT_LEADS_ERROR:', error);
            return [];
        }
    }
    /**
     * Marcar triagem como atendida por humano
     */
    async markAsAttendedByHuman(sessionId, attendedBy) {
        try {
            const { error } = await this.supabase
                .from('noemia_triage_summaries')
                .update({
                needs_human_attention: false,
                handoff_reason: 'Atendido por humano',
                updated_at: new Date().toISOString(),
                attended_by: attendedBy || null,
                attended_at: new Date().toISOString()
            })
                .eq('session_id', sessionId);
            if (error) {
                console.error('ERROR_MARKING_AS_ATTENDED:', error);
                throw error;
            }
            console.log('TRIAGE_MARKED_AS_ATTENDED', { sessionId, attendedBy });
        }
        catch (error) {
            console.error('MARK_AS_ATTENDED_ERROR:', error);
            throw error;
        }
    }
    /**
     * Gerar relatório de triagens para dashboard
     */
    async generateTriageReport(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();
            const { data, error } = await this.supabase
                .from('noemia_triage_summaries')
                .select('*')
                .gte('created_at', startDateStr);
            if (error) {
                console.error('ERROR_GENERATING_REPORT:', error);
                throw error;
            }
            const triages = data || [];
            const report = {
                total: triages.length,
                hotLeads: triages.filter(t => t.is_hot_lead).length,
                needsAttention: triages.filter(t => t.needs_human_attention).length,
                byArea: {},
                byChannel: {},
                byUrgency: {},
                averageCompleteness: 0
            };
            let totalCompleteness = 0;
            triages.forEach(triage => {
                // Por área
                const area = triage.triage_data?.area || 'não identificada';
                report.byArea[area] = (report.byArea[area] || 0) + 1;
                // Por canal
                report.byChannel[triage.channel] = (report.byChannel[triage.channel] || 0) + 1;
                // Por urgência
                const urgency = triage.triage_data?.nivel_urgencia || 'não avaliada';
                report.byUrgency[urgency] = (report.byUrgency[urgency] || 0) + 1;
                // Completude média
                const completeness = triage.triage_data?.completude || 0;
                totalCompleteness += completeness;
            });
            report.averageCompleteness = triages.length > 0 ? Math.round(totalCompleteness / triages.length) : 0;
            return report;
        }
        catch (error) {
            console.error('GENERATE_REPORT_ERROR:', error);
            return {
                total: 0,
                hotLeads: 0,
                needsAttention: 0,
                byArea: {},
                byChannel: {},
                byUrgency: {},
                averageCompleteness: 0
            };
        }
    }
    /**
     * Formatar dados do banco para o formato TriageSummary
     */
    formatTriageSummary(data) {
        return {
            sessionId: data.session_id,
            channel: data.channel,
            userId: data.user_id,
            triageData: data.triage_data || {},
            isHotLead: data.is_hot_lead || false,
            needsHumanAttention: data.needs_human_attention || false,
            handoffReason: data.handoff_reason || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            internalSummary: data.internal_summary || '',
            userFriendlySummary: data.user_friendly_summary || ''
        };
    }
}
exports.triagePersistence = new TriagePersistenceService();
