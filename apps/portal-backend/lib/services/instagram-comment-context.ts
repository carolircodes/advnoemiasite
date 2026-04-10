import { conversationPersistence } from './conversation-persistence';

export interface CommentContext {
  source: 'instagram_comment';
  media_id: string;
  keyword: string;
  theme: string;
  area: string;
  campaign_id: string;
  comment_id: string;
  comment_text: string;

  // 🔥 CORREÇÃO DO ERRO + EXPANSÃO INTELIGENTE
  detected_topic?: string;
  detected_keywords?: string[];
  priority?: 'low' | 'medium' | 'high';
  intent_level?: 'low' | 'medium' | 'high';
  confidence?: number;
}

class InstagramCommentContextService {
  async createSessionWithCommentContext(
    userId: string,
    commentContext: CommentContext
  ): Promise<any> {
    try {
      console.log('=== CREATING_SESSION_WITH_COMMENT_CONTEXT ===');
      console.log('USER_ID:', userId);
      console.log('SOURCE:', commentContext.source);
      console.log('MEDIA_ID:', commentContext.media_id);
      console.log('KEYWORD:', commentContext.keyword);
      console.log('THEME:', commentContext.theme);
      console.log('AREA:', commentContext.area);

      const session = await conversationPersistence.getOrCreateSession(
        'instagram',
        userId
      );

      await conversationPersistence.updateSession(session.id, {
        lead_stage: 'engaged',
        case_area: commentContext.area,
        current_intent: `comment_${commentContext.keyword}`,
        last_inbound_at: new Date().toISOString(),

        metadata: {
          source: commentContext.source,
          media_id: commentContext.media_id,
          keyword: commentContext.keyword,
          theme: commentContext.theme,
          area: commentContext.area,
          campaign_id: commentContext.campaign_id,
          comment_id: commentContext.comment_id,
          comment_text: commentContext.comment_text,

          // 🔥 NOVOS CAMPOS SALVOS (IMPORTANTE)
          detected_topic: commentContext.detected_topic,
          detected_keywords: commentContext.detected_keywords,
          priority: commentContext.priority,
          intent_level: commentContext.intent_level,
          confidence: commentContext.confidence,

          context_created_at: new Date().toISOString()
        }
      });

      await conversationPersistence.saveMessage(
        session.id,
        commentContext.comment_id,
        'user',
        commentContext.comment_text,
        'inbound',
        {
          channel: 'instagram',
          source: commentContext.source,
          externalUserId: userId,
          externalMessageId: commentContext.comment_id,
          media_id: commentContext.media_id,
          keyword: commentContext.keyword,
          theme: commentContext.theme,
          area: commentContext.area
        }
      );

      console.log('COMMENT_CONTEXT_SESSION_CREATED:', {
        sessionId: session.id,
        userId,
        source: commentContext.source,
        theme: commentContext.theme
      });

      return session;
    } catch (error) {
      console.log('EXCEPTION_CREATING_COMMENT_CONTEXT_SESSION:', error);
      throw error;
    }
  }

  async getSessionCommentContext(sessionId: string): Promise<CommentContext | null> {
    try {
      const { data: session, error } = await conversationPersistence.supabaseClient
        .from('conversation_sessions')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      if (error || !session?.metadata) {
        console.log('ERROR_GETTING_SESSION_CONTEXT:', error);
        return null;
      }

      const metadata = session.metadata as any;
      
      if (metadata.source === 'instagram_comment') {
        return {
          source: metadata.source,
          media_id: metadata.media_id,
          keyword: metadata.keyword,
          theme: metadata.theme,
          area: metadata.area,
          campaign_id: metadata.campaign_id,
          comment_id: metadata.comment_id,
          comment_text: metadata.comment_text,

          // 🔥 manter compatibilidade ao recuperar
          detected_topic: metadata.detected_topic,
          detected_keywords: metadata.detected_keywords,
          priority: metadata.priority,
          intent_level: metadata.intent_level,
          confidence: metadata.confidence
        };
      }

      return null;
    } catch (error) {
      console.log('EXCEPTION_GETTING_SESSION_CONTEXT:', error);
      return null;
    }
  }

  async hasCommentContext(sessionId: string): Promise<boolean> {
    const context = await this.getSessionCommentContext(sessionId);
    return context !== null;
  }

  async enrichNoemiaContext(
    sessionId: string,
    baseContext: any
  ): Promise<any> {
    try {
      const commentContext = await this.getSessionCommentContext(sessionId);
      
      if (!commentContext) {
        return baseContext;
      }

      return {
        ...baseContext,
        commentSource: commentContext.source,
        commentMediaId: commentContext.media_id,
        commentKeyword: commentContext.keyword,
        commentTheme: commentContext.theme,
        commentArea: commentContext.area,
        commentCampaignId: commentContext.campaign_id,
        commentId: commentContext.comment_id,
        commentText: commentContext.comment_text,
        isFromComment: true,
        personalizedContext: {
          origin: 'comment',
          triggerKeyword: commentContext.keyword,
          relatedMedia: commentContext.media_id,
          theme: commentContext.theme
        }
      };
    } catch (error) {
      console.log('EXCEPTION_ENRICHING_NOEMIA_CONTEXT:', error);
      return baseContext;
    }
  }

  generateContextualSystemMessage(commentContext: CommentContext): string {
    return `O usuário iniciou esta conversa a partir de um comentário em um conteúdo sobre ${commentContext.theme}.

Contexto do comentário:
- Palavra-chave detectada: "${commentContext.keyword}"
- Tema: ${commentContext.theme}
- Área jurídica: ${commentContext.area}
- ID do conteúdo: ${commentContext.media_id}
- Texto do comentário: "${commentContext.comment_text}"

O usuário já recebeu uma mensagem inicial personalizada sobre este tema. Continue a conversa:
1. Respondendo diretamente às perguntas do usuário
2. Mantendo o contexto do tema ${commentContext.theme}
3. Usando linguagem acolhedora e profissional
4. Oferecendo ajuda específica para a área ${commentContext.area}
5. Direcionando para próximos passos quando apropriado

NÃO mencione que você sabe que veio de um comentário. Flua naturalmente como se fosse uma conversa normal sobre o tema.`;
  }
}

export const instagramCommentContext = new InstagramCommentContextService();