/**
 * SERVIÇO DE PERSISTÊNCIA DE FOLLOW-UP INTELIGENTE
 * 
 * Responsável por armazenar e recuperar tentativas de follow-up
 */

import { FollowUpAttempt, FollowUpTrigger } from '../ai/noemia-core';

export interface FollowUpRecord {
  id: string;
  sessionId: string;
  userId?: string;
  channel: string;
  trigger: FollowUpTrigger;
  attemptNumber: number;
  message: string;
  sentAt: Date;
  responseReceived?: boolean;
  respondedAt?: Date;
  nextAttemptAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface FollowUpStats {
  totalAttempts: number;
  activeFollowUps: number;
  responseRate: number;
  averageResponseTime: number;
  triggerBreakdown: Record<FollowUpTrigger, number>;
}

// Mock de persistência (em produção, usar Supabase/PostgreSQL)
class FollowUpPersistence {
  private followUps: Map<string, FollowUpRecord[]> = new Map();

  async saveFollowUpAttempt(attempt: FollowUpAttempt): Promise<void> {
    const sessionFollowUps = this.followUps.get(attempt.sessionId) || [];
    
    const record: FollowUpRecord = {
      id: attempt.id,
      sessionId: attempt.sessionId,
      channel: 'unknown', // Seria passado como parâmetro ou recuperado do contexto
      trigger: attempt.trigger,
      attemptNumber: attempt.attemptNumber,
      message: attempt.message,
      sentAt: attempt.sentAt,
      responseReceived: attempt.responseReceived,
      respondedAt: attempt.responseReceived ? new Date() : undefined,
      nextAttemptAt: attempt.nextAttemptAt,
      isActive: !attempt.responseReceived,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    sessionFollowUps.push(record);
    this.followUps.set(attempt.sessionId, sessionFollowUps);
  }

  async getFollowUpHistory(sessionId: string): Promise<FollowUpRecord[]> {
    return this.followUps.get(sessionId) || [];
  }

  async getActiveFollowUps(): Promise<FollowUpRecord[]> {
    const allFollowUps: FollowUpRecord[] = [];
    
    for (const sessionFollowUps of this.followUps.values()) {
      allFollowUps.push(...sessionFollowUps.filter(f => f.isActive));
    }
    
    return allFollowUps.sort((a, b) => a.nextAttemptAt!.getTime() - b.nextAttemptAt!.getTime());
  }

  async markAsResponded(sessionId: string, attemptId: string): Promise<void> {
    const sessionFollowUps = this.followUps.get(sessionId);
    if (!sessionFollowUps) return;
    
    const attempt = sessionFollowUps.find(f => f.id === attemptId);
    if (attempt) {
      attempt.responseReceived = true;
      attempt.respondedAt = new Date();
      attempt.isActive = false;
      attempt.metadata = {
        ...attempt.metadata,
        updatedAt: new Date()
      };
    }
  }

  async getFollowUpStats(userId?: string): Promise<FollowUpStats> {
    const allFollowUps: FollowUpRecord[] = [];
    
    for (const sessionFollowUps of this.followUps.values()) {
      allFollowUps.push(...sessionFollowUps);
    }
    
    const totalAttempts = allFollowUps.length;
    const activeFollowUps = allFollowUps.filter(f => f.isActive).length;
    const respondedAttempts = allFollowUps.filter(f => f.responseReceived);
    const responseRate = totalAttempts > 0 ? (respondedAttempts.length / totalAttempts) * 100 : 0;
    
    // Calcular tempo médio de resposta
    const responseTimes = respondedAttempts
      .filter(f => f.respondedAt)
      .map(f => f.respondedAt!.getTime() - f.sentAt.getTime());
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    // Breakdown por trigger
    const triggerBreakdown: Record<FollowUpTrigger, number> = {
      'inactivity': 0,
      'post_handoff': 0,
      'consultation_proposed': 0,
      'follow_up_needed': 0
    };
    
    allFollowUps.forEach(f => {
      triggerBreakdown[f.trigger]++;
    });
    
    return {
      totalAttempts,
      activeFollowUps,
      responseRate,
      averageResponseTime,
      triggerBreakdown
    };
  }

  async getPendingFollowUps(limit: number = 50): Promise<FollowUpRecord[]> {
    const activeFollowUps = await this.getActiveFollowUps();
    const now = new Date();
    
    return activeFollowUps
      .filter(f => f.nextAttemptAt && f.nextAttemptAt <= now)
      .slice(0, limit);
  }

  async cancelFollowUp(sessionId: string, reason: string): Promise<void> {
    const sessionFollowUps = this.followUps.get(sessionId);
    if (!sessionFollowUps) return;
    
    sessionFollowUps.forEach(f => {
      f.isActive = false;
      f.metadata = {
        ...f.metadata,
        cancelledAt: new Date(),
        cancelReason: reason,
        updatedAt: new Date()
      };
    });
  }

  async getFollowUpsByTrigger(trigger: FollowUpTrigger): Promise<FollowUpRecord[]> {
    const allFollowUps: FollowUpRecord[] = [];
    
    for (const sessionFollowUps of this.followUps.values()) {
      allFollowUps.push(...sessionFollowUps.filter(f => f.trigger === trigger));
    }
    
    return allFollowUps;
  }

  async cleanupOldFollowUps(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let cleanedCount = 0;
    
    for (const [sessionId, sessionFollowUps] of this.followUps.entries()) {
      const originalLength = sessionFollowUps.length;
      const filtered = sessionFollowUps.filter(f => 
        f.sentAt > cutoffDate || f.isActive
      );
      
      if (filtered.length < originalLength) {
        this.followUps.set(sessionId, filtered);
        cleanedCount += (originalLength - filtered.length);
      }
    }
    
    return cleanedCount;
  }
}

export const followUpPersistence = new FollowUpPersistence();
