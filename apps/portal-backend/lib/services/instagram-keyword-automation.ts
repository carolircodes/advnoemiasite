import { createWebhookSupabaseClient } from '../supabase/webhook';

export interface KeywordMapping {
  keyword: string;
  theme: string;
  area: string;
  openingMessage: string;
  isActive: boolean;
}

export interface KeywordDetectionResult {
  detected: boolean;
  keyword?: string;
  theme?: string;
  area?: string;
  openingMessage?: string;
}

export interface AutoDMResult {
  success: boolean;
  dmSent?: boolean;
  sessionCreated?: boolean;
  error?: string;
  keyword?: string;
  theme?: string;
}

class InstagramKeywordAutomationService {
  private supabase = createWebhookSupabaseClient();

  // Mapeamento de palavras-chave para temas jurídicos com mensagens específicas
  private keywordMappings: KeywordMapping[] = [
    {
      keyword: 'aposentadoria',
      theme: 'previdenciario',
      area: 'previdenciário',
      openingMessage: 'Vi que você comentou sobre aposentadoria! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?',
      isActive: true
    },
    {
      keyword: 'aposentar',
      theme: 'previdenciario',
      area: 'previdenciário',
      openingMessage: 'Vi que você comentou sobre se aposentar! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?',
      isActive: true
    },
    {
      keyword: 'inss',
      theme: 'previdenciario',
      area: 'previdenciário',
      openingMessage: 'Vi que você comentou sobre INSS! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?',
      isActive: true
    },
    {
      keyword: 'benefício',
      theme: 'previdenciario',
      area: 'previdenciário',
      openingMessage: 'Vi que você comentou sobre benefício! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?',
      isActive: true
    },
    {
      keyword: 'banco',
      theme: 'bancario',
      area: 'bancário',
      openingMessage: 'Vi que você comentou sobre banco! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo esse problema com o banco vem acontecendo?',
      isActive: true
    },
    {
      keyword: 'desconto',
      theme: 'bancario',
      area: 'bancário',
      openingMessage: 'Vi que você comentou sobre desconto! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo esse desconto vem aparecendo?',
      isActive: true
    },
    {
      keyword: 'cobrança',
      theme: 'bancario',
      area: 'bancário',
      openingMessage: 'Vi que você comentou sobre cobrança! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo essa cobrança vem acontecendo?',
      isActive: true
    },
    {
      keyword: 'pensão',
      theme: 'familia',
      area: 'família',
      openingMessage: 'Vi que você comentou sobre pensão! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Já existe algum acordo ou decisão judicial sobre a pensão?',
      isActive: true
    },
    {
      keyword: 'divórcio',
      theme: 'familia',
      area: 'família',
      openingMessage: 'Vi que você comentou sobre divórcio! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Vocês já estão separados ou ainda moram juntos?',
      isActive: true
    },
    {
      keyword: 'guarda',
      theme: 'familia',
      area: 'família',
      openingMessage: 'Vi que você comentou sobre guarda! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Já existe alguma decisão sobre a guarda das crianças?',
      isActive: true
    },
    {
      keyword: 'contrato',
      theme: 'civil',
      area: 'cível',
      openingMessage: 'Vi que você comentou sobre contrato! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. O contrato foi escrito ou verbal?',
      isActive: true
    },
    {
      keyword: 'dano',
      theme: 'civil',
      area: 'cível',
      openingMessage: 'Vi que você comentou sobre dano! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. O dano foi material ou moral?',
      isActive: true
    },
    {
      keyword: 'indenização',
      theme: 'civil',
      area: 'cível',
      openingMessage: 'Vi que você comentou sobre indenização! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. Você já tentou negociar diretamente?',
      isActive: true
    }
  ];

  // Detectar palavra-chave no comentário
  detectKeyword(commentText: string): KeywordDetectionResult {
    try {
      const normalizedText = commentText.toLowerCase().trim();
      
      console.log('KEYWORD_DETECTION_START', {
        commentText: normalizedText,
        keywordsCount: this.keywordMappings.length
      });

      for (const mapping of this.keywordMappings) {
        if (!mapping.isActive) continue;
        
        if (normalizedText.includes(mapping.keyword.toLowerCase())) {
          console.log('KEYWORD_DETECTED', {
            keyword: mapping.keyword,
            theme: mapping.theme,
            area: mapping.area,
            commentText: normalizedText
          });

          return {
            detected: true,
            keyword: mapping.keyword,
            theme: mapping.theme,
            area: mapping.area,
            openingMessage: mapping.openingMessage
          };
        }
      }

      console.log('NO_KEYWORD_DETECTED', {
        commentText: normalizedText,
        keywords: this.keywordMappings.map(k => k.keyword)
      });

      return {
        detected: false
      };
    } catch (error) {
      console.log('KEYWORD_DETECTION_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        commentText
      });

      return {
        detected: false
      };
    }
  }

  // Enviar DM automática
  async sendAutoDM(userId: string, message: string): Promise<boolean> {
    try {
      const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
      const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

      if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
        console.log('AUTO_DM_MISSING_CONFIG', {
          hasToken: !!INSTAGRAM_ACCESS_TOKEN,
          hasBusinessAccountId: !!INSTAGRAM_BUSINESS_ACCOUNT_ID
        });
        return false;
      }

      const apiUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
      
      const payload = {
        recipient: {
          id: userId
        },
        message: {
          text: message
        },
        messaging_type: 'RESPONSE'
      };

      console.log('AUTO_DM_SENDING', {
        userId,
        messageLength: message.length,
        apiUrl
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('AUTO_DM_SEND_ERROR', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return false;
      }

      const result = await response.json();
      
      console.log('AUTO_DM_SENT', {
        userId,
        messageId: result.message_id,
        success: true
      });

      return true;
    } catch (error) {
      console.log('AUTO_DM_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return false;
    }
  }

  // Criar sessão com contexto inicial
  async createSessionWithContext(
    userId: string,
    keyword: string,
    theme: string,
    area: string,
    commentId: string,
    mediaId: string
  ): Promise<boolean> {
    try {
      const sessionData = {
        platform: 'instagram',
        user_id: userId,
        status: 'active',
        metadata: JSON.stringify({
          source: 'keyword_automation',
          keyword: keyword,
          theme: theme,
          area: area,
          comment_id: commentId,
          media_id: mediaId,
          lead_temperature: 'warm',
          created_at: new Date().toISOString()
        })
      };

      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) {
        console.log('KEYWORD_SESSION_CREATE_ERROR', {
          error: error.message,
          userId,
          keyword
        });
        return false;
      }

      console.log('KEYWORD_SESSION_CREATED', {
        sessionId: data.id,
        userId,
        keyword,
        theme,
        area
      });

      return true;
    } catch (error) {
      console.log('KEYWORD_SESSION_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        keyword
      });
      return false;
    }
  }

  // Verificar se comentário já foi processado
  async wasCommentProcessed(commentId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .select('id')
        .eq('comment_id', commentId)
        .single();

      // Se a tabela não existe, criar automaticamente
      if (error && error.code === 'PGRST116') {
        console.log('KEYWORD_TABLE_NOT_EXISTS', {
          error: error.message,
          commentId,
          action: 'Table does not exist, assuming not processed'
        });
        return false; // Tabela não existe, assume que não foi processado
      }

      // Outros erros de banco
      if (error) {
        console.log('KEYWORD_COMMENT_CHECK_ERROR', {
          error: error.message,
          code: error.code,
          commentId,
          action: 'Database error, assuming not processed to avoid blocking'
        });
        return false; // Em caso de erro, permite processamento para não bloquear
      }

      return !!data;
    } catch (error) {
      console.log('KEYWORD_COMMENT_CHECK_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        commentId,
        action: 'Exception, assuming not processed to avoid blocking'
      });
      return false; // Em caso de exceção, permite processamento
    }
  }

  // Registrar evento de automação
  async recordAutomationEvent(
    commentId: string,
    userId: string,
    keyword: string,
    theme: string,
    area: string,
    dmSent: boolean,
    sessionCreated: boolean
  ): Promise<boolean> {
    try {
      const eventData = {
        comment_id: commentId,
        user_id: userId,
        keyword: keyword,
        theme: theme,
        area: area,
        dm_sent: dmSent,
        session_created: sessionCreated,
        processed_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('keyword_automation_events')
        .insert(eventData);

      // Se a tabela não existe, tentar criar e inserir novamente
      if (error && error.code === 'PGRST116') {
        console.log('KEYWORD_TABLE_NOT_EXISTS_ON_INSERT', {
          error: error.message,
          commentId,
          keyword,
          action: 'Attempting to create table and retry'
        });

        // Tentar criar a tabela
        const tableCreated = await this.createKeywordAutomationTable();
        if (tableCreated) {
          // Tentar inserir novamente
          const { error: retryError } = await this.supabase
            .from('keyword_automation_events')
            .insert(eventData);

          if (retryError) {
            console.log('KEYWORD_EVENT_RETRY_ERROR', {
              error: retryError.message,
              commentId,
              keyword
            });
            return false;
          }

          console.log('KEYWORD_EVENT_RECORDED_AFTER_TABLE_CREATE', {
            commentId,
            userId,
            keyword,
            dmSent,
            sessionCreated
          });
          return true;
        }
      }

      if (error) {
        console.log('KEYWORD_EVENT_RECORD_ERROR', {
          error: error.message,
          code: error.code,
          commentId,
          keyword
        });
        return false;
      }

      console.log('KEYWORD_EVENT_RECORDED', {
        commentId,
        userId,
        keyword,
        dmSent,
        sessionCreated
      });

      return true;
    } catch (error) {
      console.log('KEYWORD_EVENT_RECORD_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error),
        commentId
      });
      return false;
    }
  }

  // Criar tabela keyword_automation_events se não existir
  async createKeywordAutomationTable(): Promise<boolean> {
    try {
      console.log('KEYWORD_TABLE_CREATE_ATTEMPT', {
        action: 'Table creation needed - please run migration manually'
      });

      // Não podemos criar tabelas dinamicamente via Supabase client
      // Retornar false para indicar que a tabela precisa ser criada via migration
      return false;
    } catch (error) {
      console.log('KEYWORD_TABLE_CREATE_EXCEPTION', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Processamento principal do fluxo de palavra-chave
  async processKeywordAutomation(
    commentId: string,
    userId: string,
    commentText: string,
    mediaId: string,
    username?: string
  ): Promise<AutoDMResult> {
    try {
      console.log('KEYWORD_FLOW_TRIGGERED', {
        commentId,
        userId,
        username,
        commentText: commentText.substring(0, 100),
        mediaId
      });

      // Verificar se já foi processado
      const wasProcessed = await this.wasCommentProcessed(commentId);
      if (wasProcessed) {
        console.log('KEYWORD_COMMENT_ALREADY_PROCESSED', { commentId });
        return {
          success: false,
          error: 'Comment already processed'
        };
      }

      // Detectar palavra-chave
      const detection = this.detectKeyword(commentText);
      if (!detection.detected) {
        console.log('KEYWORD_NO_DETECTION', { commentId, commentText });
        return {
          success: false,
          error: 'No keyword detected'
        };
      }

      // Enviar DM automática
      const dmSent = await this.sendAutoDM(userId, detection.openingMessage!);
      if (!dmSent) {
        console.log('KEYWORD_DM_SEND_FAILED', { commentId, userId });
        return {
          success: false,
          error: 'Failed to send DM',
          keyword: detection.keyword,
          theme: detection.theme
        };
      }

      console.log('AUTO_DM_SENT', {
        commentId,
        userId,
        keyword: detection.keyword,
        theme: detection.theme
      });

      // Criar sessão com contexto
      const sessionCreated = await this.createSessionWithContext(
        userId,
        detection.keyword!,
        detection.theme!,
        detection.area!,
        commentId,
        mediaId
      );

      // Registrar evento
      await this.recordAutomationEvent(
        commentId,
        userId,
        detection.keyword!,
        detection.theme!,
        detection.area!,
        dmSent,
        sessionCreated
      );

      console.log('KEYWORD_FLOW_COMPLETED', {
        commentId,
        userId,
        keyword: detection.keyword,
        theme: detection.theme,
        dmSent,
        sessionCreated
      });

      return {
        success: true,
        dmSent,
        sessionCreated,
        keyword: detection.keyword,
        theme: detection.theme
      };
    } catch (error) {
      console.log('KEYWORD_FLOW_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        commentId,
        userId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export const instagramKeywordAutomation = new InstagramKeywordAutomationService();
