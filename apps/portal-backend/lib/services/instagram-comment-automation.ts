import { createWebhookSupabaseClient } from '../supabase/webhook';

export interface CommentCampaign {
  id: string;
  platform: string;
  media_id: string;
  theme: string;
  area: string;
  keyword: string;
  public_reply_template: string;
  dm_opening_template: string;
  is_active: boolean;
}

export interface CommentEvent {
  id: string;
  platform: string;
  comment_id: string;
  media_id: string;
  external_user_id: string;
  comment_text: string;
  normalized_comment_text: string;
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

export interface InstagramCommentData {
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

class InstagramCommentAutomationService {
  private supabase = createWebhookSupabaseClient();

  // FASE 2: Detecção de comentários no webhook
  async findActiveCampaign(mediaId: string): Promise<CommentCampaign | null> {
    try {
      const { data, error } = await this.supabase
        .from('comment_keyword_campaigns')
        .select('*')
        .eq('media_id', mediaId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
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
      const normalizedComment = commentText.toLowerCase().trim();
      
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

      for (const campaign of campaigns) {
        const normalizedKeyword = campaign.keyword.toLowerCase().trim();
        
        if (normalizedComment.includes(normalizedKeyword)) {
          console.log('COMMENT_KEYWORD_MATCHED:', {
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

  // FASE 6: Anti-duplicidade
  async wasCommentProcessed(commentId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .select('id')
        .eq('comment_id', commentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('ERROR_CHECKING_COMMENT_PROCESSED:', error);
        return true;
      }

      return !!data;
    } catch (error) {
      console.log('EXCEPTION_CHECKING_COMMENT_PROCESSED:', error);
      return true;
    }
  }

  async createCommentEvent(
    commentData: InstagramCommentData,
    campaign: CommentCampaign
  ): Promise<CommentEvent | null> {
    try {
      const normalizedText = commentData.text.toLowerCase().trim();
      
      const eventData = {
        platform: 'instagram',
        comment_id: commentData.id,
        media_id: commentData.media?.id || '',
        external_user_id: commentData.from.id,
        comment_text: commentData.text,
        normalized_comment_text: normalizedText,
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

  // FASE 3: Resposta pública
  async sendPublicReply(commentId: string, replyText: string): Promise<boolean> {
    try {
      const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

      if (!INSTAGRAM_ACCESS_TOKEN) {
        console.log('MISSING_INSTAGRAM_ACCESS_TOKEN_FOR_PUBLIC_REPLY');
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

  // FASE 4: Primeira DM privada
  async sendFirstDM(userId: string, dmText: string): Promise<boolean> {
    try {
      const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
      const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

      if (!INSTAGRAM_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
        console.log('MISSING_CREDENTIALS_FOR_DM');
        return false;
      }

      const apiUrl = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
      
      const payload = {
        recipient: { 
          id: userId 
        },
        message: { 
          text: dmText 
        },
        messaging_type: "RESPONSE"
      };

      console.log('SENDING_FIRST_DM:', {
        userId,
        dmText: dmText.substring(0, 100) + '...',
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

      console.log('FIRST_DM_RESPONSE:', {
        status: response.status,
        body: responseText
      });

      if (!response.ok) {
        console.log('FIRST_DM_FAILED:', {
          userId,
          status: response.status,
          body: responseText
        });
        return false;
      }

      console.log('FIRST_DM_SUCCESS:', userId);
      return true;
    } catch (error) {
      console.log('EXCEPTION_SENDING_FIRST_DM:', error);
      return false;
    }
  }

  // Processamento completo do comentário
  async processComment(commentData: InstagramCommentData): Promise<CommentProcessingResult> {
    try {
      console.log('=== INSTAGRAM_COMMENT_RECEIVED ===');
      console.log('COMMENT_ID:', commentData.id);
      console.log('USER_ID:', commentData.from.id);
      console.log('USERNAME:', commentData.from.username);
      console.log('COMMENT_TEXT:', commentData.text);
      console.log('MEDIA_ID:', commentData.media?.id);

      // FASE 2: Verificar se já foi processado (anti-duplicidade)
      const wasProcessed = await this.wasCommentProcessed(commentData.id);
      if (wasProcessed) {
        console.log('COMMENT_ALREADY_PROCESSED:', commentData.id);
        return {
          success: false,
          error: 'Comment already processed'
        };
      }

      // Verificar se tem media_id
      if (!commentData.media?.id) {
        console.log('NO_MEDIA_ID_FOR_COMMENT:', commentData.id);
        return {
          success: false,
          error: 'No media_id associated with comment'
        };
      }

      // FASE 2: Encontrar campanha por keyword
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

      // FASE 6: Criar evento de processamento (anti-duplicidade)
      const event = await this.createCommentEvent(commentData, campaign);
      if (!event) {
        console.log('FAILED_TO_CREATE_COMMENT_EVENT:', commentData.id);
        return {
          success: false,
          error: 'Failed to create comment event'
        };
      }

      // Atualizar status para processing
      await this.updateCommentEvent(event.id, {
        processing_status: 'processing'
      });

      let publicReplySent = false;
      let dmSent = false;

      try {
        // FASE 3: Enviar resposta pública
        if (campaign.public_reply_template) {
          publicReplySent = await this.sendPublicReply(
            commentData.id,
            campaign.public_reply_template
          );

          if (publicReplySent) {
            console.log('COMMENT_PUBLIC_REPLY_SENT:', commentData.id);
          } else {
            console.log('FAILED_TO_SEND_PUBLIC_REPLY:', commentData.id);
          }
        }

        // FASE 4: Enviar primeira DM
        if (campaign.dm_opening_template) {
          dmSent = await this.sendFirstDM(
            commentData.from.id,
            campaign.dm_opening_template
          );

          if (dmSent) {
            console.log('COMMENT_FIRST_DM_SENT:', commentData.from.id);
          } else {
            console.log('FAILED_TO_SEND_FIRST_DM:', commentData.from.id);
          }
        }

        // Atualizar status final
        const finalStatus = (publicReplySent && dmSent) ? 'completed' : 'failed';
        await this.updateCommentEvent(event.id, {
          processing_status: finalStatus,
          public_replied: publicReplySent,
          dm_sent: dmSent,
          processing_error: finalStatus === 'failed' ? 'Partial failure' : undefined
        });

        console.log('COMMENT_PROCESSING_COMPLETED:', {
          eventId: event.id,
          commentId: commentData.id,
          publicReplySent,
          dmSent,
          status: finalStatus
        });

        return {
          success: true,
          campaign,
          event,
          publicReplySent,
          dmSent
        };

      } catch (processingError) {
        console.log('ERROR_DURING_COMMENT_PROCESSING:', processingError);
        
        await this.updateCommentEvent(event.id, {
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
}

export const instagramCommentAutomation = new InstagramCommentAutomationService();
