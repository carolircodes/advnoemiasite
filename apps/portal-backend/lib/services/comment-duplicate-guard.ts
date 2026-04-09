import { createWebhookSupabaseClient } from '../supabase/webhook';

export interface CommentDuplicateCheck {
  isDuplicate: boolean;
  existingEvent?: any;
  reason?: string;
}

class CommentDuplicateGuard {
  private supabase = createWebhookSupabaseClient();

  async checkCommentDuplicate(commentId: string): Promise<CommentDuplicateCheck> {
    try {
      console.log('CHECKING_COMMENT_DUPLICATE:', commentId);

      // Verificar se o comentário já foi processado
      const { data: existingEvent, error } = await this.supabase
        .from('keyword_automation_events')
        .select('*')
        .eq('comment_id', commentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.log('ERROR_CHECKING_DUPLICATE:', error);
        // Em caso de erro no banco, assume que é duplicado para segurança
        return {
          isDuplicate: true,
          reason: 'Database error - assuming duplicate for safety'
        };
      }

      if (existingEvent) {
        console.log('COMMENT_ALREADY_PROCESSED:', {
          commentId,
          eventId: existingEvent.id,
          processingStatus: existingEvent.processing_status,
          processedAt: existingEvent.processed_at
        });

        return {
          isDuplicate: true,
          existingEvent,
          reason: `Already processed with status: ${existingEvent.processing_status}`
        };
      }

      console.log('COMMENT_NOT_DUPLICATE:', commentId);
      return {
        isDuplicate: false
      };

    } catch (error) {
      console.log('EXCEPTION_CHECKING_DUPLICATE:', error);
      // Em caso de exceção, assume que é duplicado para segurança
      return {
        isDuplicate: true,
        reason: 'Exception - assuming duplicate for safety'
      };
    }
  }

  async markCommentProcessed(eventData: {
    commentId: string;
    mediaId: string;
    userId: string;
    campaignId: string;
    keyword: string;
    commentText: string;
    theme?: string;
    area?: string;
    username?: string;
    userFullName?: string;
  }): Promise<boolean> {
    try {
      console.log('MARKING_COMMENT_AS_PROCESSED:', eventData.commentId);

      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .insert({
          comment_id: eventData.commentId,
          user_id: eventData.userId,
          keyword: eventData.keyword,
          theme: eventData.theme || 'unknown',
          area: eventData.area || 'unknown',
          dm_sent: false,
          session_created: false,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.log('ERROR_MARKING_COMMENT_PROCESSED:', error);
        return false;
      }

      console.log('COMMENT_MARKED_AS_PROCESSED:', {
        eventId: data.id,
        commentId: eventData.commentId
      });

      return true;
    } catch (error) {
      console.log('EXCEPTION_MARKING_COMMENT_PROCESSED:', error);
      return false;
    }
  }

  async getCommentProcessingHistory(commentId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('ERROR_GETTING_COMMENT_HISTORY:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('EXCEPTION_GETTING_COMMENT_HISTORY:', error);
      return [];
    }
  }

  async getUserRecentComments(userId: string, hours: number = 24): Promise<any[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('ERROR_GETTING_USER_RECENT_COMMENTS:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('EXCEPTION_GETTING_USER_RECENT_COMMENTS:', error);
      return [];
    }
  }

  async isUserSpamming(userId: string, maxComments: number = 5, hours: number = 24): Promise<boolean> {
    try {
      const recentComments = await this.getUserRecentComments(userId, hours);
      
      console.log('CHECKING_USER_SPAM:', {
        userId,
        recentCommentsCount: recentComments.length,
        maxComments,
        hours
      });

      return recentComments.length >= maxComments;
    } catch (error) {
      console.log('EXCEPTION_CHECKING_USER_SPAM:', error);
      // Em caso de erro, assume que não é spam para não bloquear usuários legítimos
      return false;
    }
  }

  async getMediaStats(mediaId: string): Promise<{
    totalComments: number;
    processedComments: number;
    successfulReplies: number;
    uniqueUsers: number;
  }> {
    try {
      const { data: events, error } = await this.supabase
        .from('keyword_automation_events')
        .select('*')
        .eq('comment_id', mediaId);

      if (error) {
        console.log('ERROR_GETTING_MEDIA_STATS:', error);
        return {
          totalComments: 0,
          processedComments: 0,
          successfulReplies: 0,
          uniqueUsers: 0
        };
      }

      const totalComments = events?.length || 0;
      const processedComments = events?.length || 0; // Todos estão processados na nova tabela
      const successfulReplies = events?.filter(e => e.dm_sent).length || 0;
      const uniqueUsers = new Set(events?.map(e => e.user_id) || []).size;

      return {
        totalComments,
        processedComments,
        successfulReplies,
        uniqueUsers
      };
    } catch (error) {
      console.log('EXCEPTION_GETTING_MEDIA_STATS:', error);
      return {
        totalComments: 0,
        processedComments: 0,
        successfulReplies: 0,
        uniqueUsers: 0
      };
    }
  }

  async cleanupOldEvents(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('keyword_automation_events')
        .delete()
        .lt('created_at', cutoffDate)
        .select('id');

      if (error) {
        console.log('ERROR_CLEANING_OLD_EVENTS:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log('CLEANED_OLD_EVENTS:', {
        deletedCount,
        cutoffDate
      });

      return deletedCount;
    } catch (error) {
      console.log('EXCEPTION_CLEANING_OLD_EVENTS:', error);
      return 0;
    }
  }
}

export const commentDuplicateGuard = new CommentDuplicateGuard();
