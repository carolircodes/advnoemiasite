import "server-only";

import { createAdminSupabaseClient } from "../supabase/admin.ts";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  service: string;
  action: string;
  userId?: string;
  clientId?: string;
  caseId?: string;
  notificationId?: string;
  channel?: string;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  sensitive?: boolean; // Marca se contém dados sensíveis
}

/**
 * Logger estruturado para eventos operacionais
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private supabase: ReturnType<typeof createAdminSupabaseClient> | null = null;

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Registra log de informação
   */
  async info(
    service: string,
    action: string,
    message: string,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      clientId?: string;
      caseId?: string;
      notificationId?: string;
      channel?: string;
    }
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: "info",
      service,
      action,
      message,
      metadata,
      ...context
    });
  }

  /**
   * Registra log de aviso
   */
  async warn(
    service: string,
    action: string,
    message: string,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      clientId?: string;
      caseId?: string;
      notificationId?: string;
      channel?: string;
    }
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: "warn",
      service,
      action,
      message,
      metadata,
      ...context
    });
  }

  /**
   * Registra log de erro
   */
  async error(
    service: string,
    action: string,
    message: string,
    error?: Error,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      clientId?: string;
      caseId?: string;
      notificationId?: string;
      channel?: string;
    }
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: "error",
      service,
      action,
      message,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...context
    });
  }

  /**
   * Registra log de debug (só em desenvolvimento)
   */
  async debug(
    service: string,
    action: string,
    message: string,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      clientId?: string;
      caseId?: string;
      notificationId?: string;
      channel?: string;
    }
  ): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      await this.log({
        timestamp: new Date().toISOString(),
        level: "debug",
        service,
        action,
        message,
        metadata,
        ...context
      });
    }
  }

  /**
   * Método principal de logging
   */
  private async log(entry: LogEntry): Promise<void> {
    try {
      // 1. Log no console (formatado)
      this.logToConsole(entry);

      // 2. Salvar no banco (assíncrono, não bloqueante)
      this.saveToDatabase(entry).catch((error) => {
        console.warn("[StructuredLogger] Persistencia de log indisponivel", {
          reason: error instanceof Error ? error.name : "unknown_error"
        });
      });

      // 3. Enviar para serviço externo se configurado
      if (process.env.LOG_SERVICE_URL) {
        this.sendToExternalService(entry).catch((error) => {
          console.warn("[StructuredLogger] Exportacao de log indisponivel", {
            reason: error instanceof Error ? error.name : "unknown_error"
          });
        });
      }
    } catch (error) {
      console.warn("[StructuredLogger] Logging degradado", {
        reason: error instanceof Error ? error.name : "unknown_error"
      });
    }
  }

  /**
   * Formata e envia para console
   */
  private logToConsole(entry: LogEntry): void {
    const sanitizedEntry = this.sanitizeEntry(entry);
    const { timestamp, level, service, action, message, metadata, error } = sanitizedEntry;
    
    const emoji = this.getEmoji(level);
    const context = this.buildContextString(sanitizedEntry);
    const metaString = metadata ? ` | ${JSON.stringify(metadata)}` : "";
    const errorString = error ? ` | ERROR: ${error.name}: ${error.message}` : "";
    
    console.log(
      `${emoji} ${timestamp} [${level.toUpperCase()}] ${service}:${action}${context} - ${message}${metaString}${errorString}`
    );
  }

  /**
   * Salva log no banco de dados
   */
  private async saveToDatabase(entry: LogEntry): Promise<void> {
    if (
      !process.env.NEXT_PUBLIC_APP_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    ) {
      return;
    }

    // Limpar dados sensíveis antes de salvar
    const sanitizedEntry = this.sanitizeEntry(entry);
    
    if (!this.supabase) {
      this.supabase = createAdminSupabaseClient();
    }

    await this.supabase.from("structured_logs").insert({
      timestamp: sanitizedEntry.timestamp,
      level: sanitizedEntry.level,
      service: sanitizedEntry.service,
      action: sanitizedEntry.action,
      user_id: sanitizedEntry.userId,
      client_id: sanitizedEntry.clientId,
      case_id: sanitizedEntry.caseId,
      notification_id: sanitizedEntry.notificationId,
      channel: sanitizedEntry.channel,
      message: sanitizedEntry.message,
      metadata: sanitizedEntry.metadata,
      error_name: sanitizedEntry.error?.name,
      error_message: sanitizedEntry.error?.message,
      error_stack: sanitizedEntry.error?.stack,
      sensitive: sanitizedEntry.sensitive || false
    });
  }

  /**
   * Envia log para serviço externo (ex: Datadog, Sentry, etc)
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    if (!process.env.LOG_SERVICE_URL) return;

    const sanitizedEntry = this.sanitizeEntry(entry);
    
    await fetch(process.env.LOG_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.LOG_SERVICE_TOKEN || ""}`
      },
      body: JSON.stringify(sanitizedEntry)
    });
  }

  /**
   * Remove dados sensíveis do log
   */
  private sanitizeEntry(entry: LogEntry): LogEntry {
    const sensitiveFields = [
      "password", "token", "secret", "key", "auth", "credential",
      "cpf", "rg", "phone", "email", "address", "bank", "card"
    ];

    const sanitized = { ...entry };

    // Sanitizar metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata, sensitiveFields);
    }

    // Sanitizar error se tiver stack trace
    if (sanitized.error?.stack) {
      sanitized.error.stack = this.sanitizeStack(sanitized.error.stack);
    }

    return sanitized;
  }

  /**
   * Sanitiza objeto removendo campos sensíveis
   */
  private sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, sensitiveFields));
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      
      if (sensitiveFields.some(field => keyLower.includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeObject(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitiza stack trace removendo dados sensíveis
   */
  private sanitizeStack(stack: string): string {
    // Remove URLs sensíveis, tokens, etc
    return stack
      .replace(/token=[\w\-._]+/gi, "token=[REDACTED]")
      .replace(/password=[\w\-._]+/gi, "password=[REDACTED]")
      .replace(/key=[\w\-._]+/gi, "key=[REDACTED]")
      .replace(/secret=[\w\-._]+/gi, "secret=[REDACTED]");
  }

  /**
   * Constrói string de contexto para console
   */
  private buildContextString(entry: LogEntry): string {
    const contexts = [];
    
    if (entry.userId) contexts.push(`user:${entry.userId}`);
    if (entry.clientId) contexts.push(`client:${entry.clientId}`);
    if (entry.caseId) contexts.push(`case:${entry.caseId}`);
    if (entry.notificationId) contexts.push(`notif:${entry.notificationId}`);
    if (entry.channel) contexts.push(`channel:${entry.channel}`);
    
    return contexts.length > 0 ? ` [${contexts.join(", ")}]` : "";
  }

  /**
   * Retorna emoji para nível de log
   */
  private getEmoji(level: string): string {
    switch (level) {
      case "info": return "INFO";
      case "warn": return "WARN";
      case "error": return "ERROR";
      case "debug": return "DEBUG";
      default: return "LOG";
    }
  }
}

/**
 * Logger global para uso fácil
 */
export const logger = StructuredLogger.getInstance();

/**
 * Funções de conveniência para logs específicos
 */
export const logCaseUpdate = async (
  action: string,
  caseId: string,
  clientId: string,
  message: string,
  metadata?: Record<string, any>,
  userId?: string
) => {
  await logger.info("cases", action, message, metadata, {
    userId,
    clientId,
    caseId
  });
};

export const logNotification = async (
  action: string,
  notificationId: string,
  channel: string,
  message: string,
  metadata?: Record<string, any>,
  userId?: string
) => {
  await logger.info("notifications", action, message, metadata, {
    userId,
    notificationId,
    channel
  });
};

export const logWhatsApp = async (
  action: string,
  phone: string,
  message: string,
  metadata?: Record<string, any>,
  error?: Error
) => {
  await logger.info("whatsapp", action, message, metadata, {
    channel: "whatsapp"
  });
  
  if (error) {
    await logger.error("whatsapp", action, "Erro no WhatsApp", error, metadata, {
      channel: "whatsapp"
    });
  }
};

export const logNoemia = async (
  action: string,
  profileId: string,
  message: string,
  metadata?: Record<string, any>,
  error?: Error
) => {
  await logger.info("noemia", action, message, metadata, {
    userId: profileId
  });
  
  if (error) {
    await logger.error("noemia", action, "Erro na NoemIA", error, metadata, {
      userId: profileId
    });
  }
};

export const logSecurity = async (
  action: string,
  message: string,
  metadata?: Record<string, any>,
  userId?: string
) => {
  await logger.warn("security", action, message, {
    ...metadata,
    sensitive: true
  }, {
    userId
  });
};
