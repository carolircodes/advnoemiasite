// Re-export para garantir compatibilidade com build da Vercel
export { getServerEnv, getPublicEnv, getNotificationEnv } from './env';
export type { ServerEnv, PublicEnv, NotificationEnv } from './env';
