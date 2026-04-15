'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { generateTrackingLink, TrackingLinkParams } from '@/lib/acquisition/link-builder';

interface SmartCTAProps {
  label: string;
  source?: string;
  campaign?: string;
  topic?: string;
  content_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  target?: '_blank' | '_self';
  icon?: React.ReactNode;
}

export function SmartCTA({
  label,
  source,
  campaign,
  topic,
  content_id,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  target = '_self',
  icon
}: SmartCTAProps) {
  const router = useRouter();

  const handleClick = () => {
    if (disabled || loading) return;

    // Gerar URL com tracking
    const trackingUrl = generateTrackingLink({
      source,
      campaign,
      topic,
      content_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content
    });

    // Log do click
    console.log('SMART_CTA_CLICKED: Tracking link gerado:', {
      label,
      trackingUrl,
      params: {
        source,
        campaign,
        topic,
        content_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content
      }
    });

    // Se tiver onClick customizado, executar primeiro
    if (onClick) {
      onClick();
    }

    // Navegar para URL com tracking
    if (target === '_blank') {
      window.open(trackingUrl, '_blank');
    } else {
      router.push(trackingUrl);
    }
  };

  // Classes base
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'opacity-75 cursor-wait'
  ].join(' ');

  // Classes por variante
  const variantClasses = {
    primary: [
      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      'shadow-sm hover:shadow-md'
    ].join(' '),
    secondary: [
      'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      'shadow-sm hover:shadow-md'
    ].join(' '),
    outline: [
      'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      'bg-transparent hover:border-blue-700 hover:text-blue-700'
    ].join(' ')
  };

  // Classes por tamanho
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].join(' ');

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={combinedClasses}
      type="button"
      aria-label={label}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {icon && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      
      {label}
    </button>
  );
}

// Componentes específicos para facilitar uso
export function InstagramCTA({
  label,
  campaign,
  topic,
  content_id,
  ...props
}: Omit<SmartCTAProps, 'source'>) {
  return (
    <SmartCTA
      label={label}
      source="instagram"
      campaign={campaign}
      topic={topic}
      content_id={content_id}
      {...props}
    />
  );
}

export function WhatsAppCTA({
  label,
  message,
  campaign,
  topic,
  ...props
}: Omit<SmartCTAProps, 'source'> & { message?: string }) {
  const handleClick = () => {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511999999999';
    const trackingParams = new URLSearchParams({
      source: 'whatsapp',
      campaign: campaign || 'whatsapp_direct',
      topic: topic || 'geral'
    });

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message || '')}`;
    const trackingUrl = `/?${trackingParams.toString()}#atendimento`;

    console.log('WHATSAPP_CTA_CLICKED: Redirecionando para WhatsApp com tracking:', {
      message,
      trackingUrl,
      params: {
        source: 'whatsapp',
        campaign,
        topic
      }
    });

    // Abrir WhatsApp em nova janela
    window.open(whatsappUrl, '_blank');
    
    // Redirecionar para NoemIA após pequeno delay
    setTimeout(() => {
      window.location.href = trackingUrl;
    }, 1000);
  };

  return (
    <SmartCTA
      label={label}
      source="whatsapp"
      campaign={campaign}
      topic={topic}
      onClick={handleClick}
      {...props}
    />
  );
}

export function SiteCTA({
  label,
  campaign,
  topic,
  ...props
}: Omit<SmartCTAProps, 'source'>) {
  return (
    <SmartCTA
      label={label}
      source="site"
      campaign={campaign || 'homepage_main'}
      topic={topic || 'geral'}
      {...props}
    />
  );
}

export function AdsCTA({
  label,
  campaign,
  topic,
  adGroup,
  creative,
  ...props
}: Omit<SmartCTAProps, 'source'> & { adGroup?: string; creative?: string }) {
  return (
    <SmartCTA
      label={label}
      source="ads"
      campaign={campaign}
      topic={topic}
      utm_source="google"
      utm_medium="cpc"
      utm_campaign={campaign}
      utm_term={adGroup}
      utm_content={creative}
      {...props}
    />
  );
}
