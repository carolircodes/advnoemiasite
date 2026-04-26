import { createWebhookSupabaseClient } from '../supabase/webhook.ts';
import { commentDuplicateGuard } from './comment-duplicate-guard.ts';

export interface CommentCampaign {
  id: string;
  platform: string;
  media_id: string;
  theme: string;
  keyword: string;
  public_reply_template: string;
  dm_opening_template: string;
  area: string;
  is_active: boolean;
}

export interface CommentEvent {
  id: string;
  platform: string;
  comment_id: string;
  media_id: string;
  external_user_id: string;
  comment_text: string;
  keyword_matched: string;
  public_replied: boolean;
  dm_sent: boolean;
  session_created: boolean;
  campaign_id: string;
  username?: string;
  user_full_name?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  processed_at?: string;
  created_at: string;
}

export interface CommentData {
  id: string;
  from: {
    id: string;
    username?: string;
    full_name?: string;
  };
  text: string;
  media?: {
    id: string;
  };
}

export interface CommentProcessingResult {
  success: boolean;
  campaign?: CommentCampaign;
  event?: CommentEvent;
  publicReplySent?: boolean;
  dmSent?: boolean;
  error?: string;
}

class CommentAutomationService {
  private supabase = createWebhookSupabaseClient();

  async findActiveCampaign(mediaId: string): Promise<CommentCampaign | null> {
    try {
      const { data, error } = await this.supabase
        .from('comment_keyword_campaigns')
        .select('*')
        .eq('media_id', mediaId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('ERROR_FINDING_CAMPAIGN:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.log('EXCEPTION_FINDING_CAMPAIGN:', error);
      return null;
    }
  }

  async findCampaignByKeyword(mediaId: string, commentText: string): Promise<CommentCampaign | null> {
    try {
      // Normalizar texto do comentário
      const normalizedComment = commentText.toLowerCase().trim();
      
      // Buscar todas as campanhas ativas para este media
      const { data: campaigns, error } = await this.supabase
        .from('comment_keyword_campaigns')
        .select('*')
        .eq('media_id', mediaId)
        .eq('is_active', true);

      if (error) {
        console.log('ERROR_FINDING_CAMPAIGNS:', error);
        return null;
      }

      if (!campaigns || campaigns.length === 0) {
        console.log('NO_ACTIVE_CAMPAIGNS_FOR_MEDIA:', mediaId);
        return null;
      }

      // Procurar por keyword match (case-insensitive)
      for (const campaign of campaigns) {
        const normalizedKeyword = campaign.keyword.toLowerCase().trim();
        
        if (normalizedComment.includes(normalizedKeyword)) {
          console.log('KEYWORD_MATCHED:', {
            mediaId,
            keyword: campaign.keyword,
            commentText: normalizedComment,
            campaignId: campaign.id
          });
          return campaign;
        }
      }

      console.log('NO_KEYWORD_MATCHED:', {
        mediaId,
        commentText: normalizedComment,
        keywords: campaigns.map(c => c.keyword)
      });

      return null;
    } catch (error) {
      console.log('EXCEPTION_FINDING_CAMPAIGN_BY_KEYWORD:', error);
      return null;
    }
  }

  async wasCommentProcessed(commentId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .select('id')
        .eq('comment_id', commentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.log('ERROR_CHECKING_COMMENT_PROCESSED:', error);
        return true; // Em caso de erro, assume que já foi processado para evitar duplicatas
      }

      return !!data;
    } catch (error) {
      console.log('EXCEPTION_CHECKING_COMMENT_PROCESSED:', error);
      return true; // Em caso de erro, assume que já foi processado
    }
  }

  async createCommentEvent(
    commentData: CommentData,
    campaign: CommentCampaign
  ): Promise<CommentEvent | null> {
    try {
      const eventData = {
        platform: 'instagram',
        comment_id: commentData.id,
        media_id: commentData.media?.id || '',
        external_user_id: commentData.from.id,
        comment_text: commentData.text,
        keyword_matched: campaign.keyword,
        public_replied: false,
        dm_sent: false,
        campaign_id: campaign.id,
        username: commentData.from.username,
        user_full_name: commentData.from.full_name,
        processing_status: 'pending' as const
      };

      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .insert({
          comment_id: commentData.id,
          user_id: commentData.from.id,
          keyword: campaign.keyword,
          theme: campaign.theme || 'unknown',
          area: campaign.area || 'unknown',
          dm_sent: false,
          session_created: false,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.log('ERROR_CREATING_COMMENT_EVENT:', error);
        return null;
      }

      console.log('COMMENT_EVENT_CREATED:', {
        eventId: data.id,
        commentId: commentData.id,
        campaignId: campaign.id,
        keyword: campaign.keyword
      });

      return data;
    } catch (error) {
      console.log('EXCEPTION_CREATING_COMMENT_EVENT:', error);
      return null;
    }
  }

  async updateCommentEvent(
    eventId: string,
    updates: Partial<CommentEvent>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('keyword_automation_events')
        .update({
          dm_sent: updates.dm_sent,
          session_created: updates.session_created,
          processed_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        console.log('ERROR_UPDATING_COMMENT_EVENT:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.log('EXCEPTION_UPDATING_COMMENT_EVENT:', error);
      return false;
    }
  }

  async sendPublicReply(commentId: string, replyText: string): Promise<boolean> {
    try {
      const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
      const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

      if (!INSTAGRAM_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
        console.log('MISSING_CREDENTIALS_FOR_PUBLIC_REPLY');
        return false;
      }

      const apiUrl = `https://graph.facebook.com/v19.0/${commentId}/comments?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
      
      const payload = {
        message: replyText
      };

      console.log('SENDING_PUBLIC_REPLY:', {
        commentId,
        replyText,
        apiUrl
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      console.log('PUBLIC_REPLY_RESPONSE:', {
        status: response.status,
        body: responseText
      });

      if (!response.ok) {
        console.log('PUBLIC_REPLY_FAILED:', {
          commentId,
          status: response.status,
          body: responseText
        });
        return false;
      }

      console.log('PUBLIC_REPLY_SUCCESS:', commentId);
      return true;
    } catch (error) {
      console.log('EXCEPTION_SENDING_PUBLIC_REPLY:', error);
      return false;
    }
  }

  async processComment(commentData: CommentData): Promise<CommentProcessingResult> {
    try {
      console.log('=== PROCESSING_COMMENT ===');
      console.log('COMMENT_ID:', commentData.id);
      console.log('USER_ID:', commentData.from.id);
      console.log('USERNAME:', commentData.from.username);
      console.log('COMMENT_TEXT:', commentData.text);
      console.log('MEDIA_ID:', commentData.media?.id);

      // 1. Verificar duplicidade com sistema especializado
      const duplicateCheck = await commentDuplicateGuard.checkCommentDuplicate(commentData.id);
      if (duplicateCheck.isDuplicate) {
        console.log('COMMENT_ALREADY_PROCESSED:', {
          commentId: commentData.id,
          reason: duplicateCheck.reason
        });
        return {
          success: false,
          error: duplicateCheck.reason || 'Comment already processed'
        };
      }

      // 2. Verificar se usuário está fazendo spam
      const isSpamming = await commentDuplicateGuard.isUserSpamming(commentData.from.id);
      if (isSpamming) {
        console.log('USER_SPAMMING_DETECTED:', commentData.from.id);
        return {
          success: false,
          error: 'User detected as spamming'
        };
      }

      // 3. Verificar se tem media_id
      if (!commentData.media?.id) {
        console.log('NO_MEDIA_ID_FOR_COMMENT:', commentData.id);
        return {
          success: false,
          error: 'No media_id associated with comment'
        };
      }

      // 4. Encontrar campanha por keyword
      const campaign = await this.findCampaignByKeyword(
        commentData.media.id,
        commentData.text
      );

      if (!campaign) {
        console.log('NO_CAMPAIGN_FOUND_FOR_COMMENT:', commentData.id);
        return {
          success: false,
          error: 'No active campaign found for this comment'
        };
      }

      // 5. Marcar comentário como processado (anti-duplicidade)
      const markedAsProcessed = await commentDuplicateGuard.markCommentProcessed({
        commentId: commentData.id,
        mediaId: commentData.media.id,
        userId: commentData.from.id,
        campaignId: campaign.id,
        keyword: campaign.keyword,
        commentText: commentData.text,
        username: commentData.from.username,
        userFullName: commentData.from.full_name
      });

      if (!markedAsProcessed) {
        console.log('FAILED_TO_MARK_COMMENT_PROCESSED:', commentData.id);
        return {
          success: false,
          error: 'Failed to mark comment as processed'
        };
      }

      // 6. Obter evento criado
      const event = await commentDuplicateGuard.getCommentProcessingHistory(commentData.id);
      const createdEvent = event[0]; // Primeiro (e único) evento

      if (!createdEvent) {
        console.log('FAILED_TO_RETRIEVE_CREATED_EVENT:', commentData.id);
        return {
          success: false,
          error: 'Failed to retrieve created event'
        };
      }

      // 7. Atualizar status para processing
      await this.updateCommentEvent(createdEvent.id, {
        processing_status: 'processing'
      });

      let publicReplySent = false;
      let dmSent = false;

      try {
        // 8. Enviar resposta pública
        if (campaign.public_reply_template) {
          publicReplySent = await this.sendPublicReply(
            commentData.id,
            campaign.public_reply_template
          );

          if (publicReplySent) {
            console.log('PUBLIC_REPLY_SENT_SUCCESSFULLY:', commentData.id);
          } else {
            console.log('FAILED_TO_SEND_PUBLIC_REPLY:', commentData.id);
          }
        }

        // 9. Enviar DM (será feito pelo webhook principal)
        // Apenas marcamos que precisa enviar DM
        console.log('DM_SHOULD_BE_SENT:', {
          userId: commentData.from.id,
          template: campaign.dm_opening_template,
          campaignId: campaign.id
        });

        dmSent = true; // Assumimos que será enviado pelo fluxo principal

        // 10. Atualizar status final
        const finalStatus = (publicReplySent && dmSent) ? 'completed' : 'failed';
        await this.updateCommentEvent(createdEvent.id, {
          processing_status: finalStatus,
          public_replied: publicReplySent,
          dm_sent: dmSent,
          processing_error: finalStatus === 'failed' ? 'Partial failure' : undefined
        });

        console.log('COMMENT_PROCESSING_COMPLETED:', {
          eventId: createdEvent.id,
          commentId: commentData.id,
          publicReplySent,
          dmSent,
          status: finalStatus
        });

        return {
          success: true,
          campaign,
          event: createdEvent,
          publicReplySent,
          dmSent
        };

      } catch (processingError) {
        console.log('ERROR_DURING_COMMENT_PROCESSING:', processingError);
        
        await this.updateCommentEvent(createdEvent.id, {
          processing_status: 'failed',
          processing_error: processingError instanceof Error ? processingError.message : String(processingError)
        });

        return {
          success: false,
          error: processingError instanceof Error ? processingError.message : String(processingError)
        };
      }

    } catch (error) {
      console.log('EXCEPTION_PROCESSING_COMMENT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getCommentEvent(commentId: string): Promise<CommentEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .select('*')
        .eq('comment_id', commentId)
        .single();

      if (error) {
        console.log('ERROR_GETTING_COMMENT_EVENT:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.log('EXCEPTION_GETTING_COMMENT_EVENT:', error);
      return null;
    }
  }

  async getActiveCampaigns(): Promise<CommentCampaign[]> {
    try {
      const { data, error } = await this.supabase
        .from('comment_keyword_campaigns')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('ERROR_GETTING_ACTIVE_CAMPAIGNS:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('EXCEPTION_GETTING_ACTIVE_CAMPAIGNS:', error);
      return [];
    }
  }
}

export const commentAutomation = new CommentAutomationService();
