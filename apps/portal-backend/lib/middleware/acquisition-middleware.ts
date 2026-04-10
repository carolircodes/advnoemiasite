import { NextRequest, NextResponse } from 'next/server';
import { extractAcquisitionParams, createAcquisitionContext, inferSourceFromContext } from '@/lib/acquisition/acquisition-service';

export interface AcquisitionContext {
  source: string;
  campaign?: string;
  topic?: string;
  content_id?: string;
  acquisition_metadata: Record<string, any>;
  acquisition_tags: string[];
  ai_context: string;
  language_adaptation: string;
}

export function processAcquisitionData(request: NextRequest): AcquisitionContext | null {
  try {
    // Extrair parâmetros da URL
    const { searchParams } = new URL(request.url);
    const acquisitionData = extractAcquisitionParams(searchParams);

    // Se não há parâmetros de aquisição, tentar inferir
    if (!acquisitionData.source && !acquisitionData.utm_source) {
      const inferredSource = inferSourceFromContext(request.headers, request.headers.get('user-agent') || undefined);
      
      // Apenas criar contexto se houver alguma informação de origem
      if (inferredSource !== 'organic') {
        acquisitionData.source = inferredSource;
      }
    }

    // Se ainda não há dados de aquisição, retornar null
    if (!acquisitionData.source && !acquisitionData.campaign && !acquisitionData.topic) {
      return null;
    }

    // Criar contexto de aquisição
    const acquisitionContext = createAcquisitionContext(acquisitionData);

    // Gerar contexto para IA
    const { generateAIContext, adaptLanguageForTopic } = require('@/lib/acquisition/acquisition-service');
    const aiContext = generateAIContext(acquisitionContext);
    const languageAdaptation = adaptLanguageForTopic(acquisitionContext.topic);

    console.log('ACQUISITION_TRACKING: Middleware processou dados:', {
      source: acquisitionContext.source,
      topic: acquisitionContext.topic,
      campaign: acquisitionContext.campaign,
      hasAIContext: !!aiContext,
      hasLanguageAdaptation: !!languageAdaptation
    });

    return {
      source: acquisitionContext.source,
      campaign: acquisitionContext.campaign,
      topic: acquisitionContext.topic,
      content_id: acquisitionContext.content_id,
      acquisition_metadata: acquisitionContext.acquisition_metadata,
      acquisition_tags: acquisitionContext.acquisition_tags,
      ai_context: aiContext,
      language_adaptation: languageAdaptation
    };

  } catch (error) {
    console.error('ACQUISITION_TRACKING: Erro no middleware de aquisição:', error);
    return null;
  }
}

// Função para injetar contexto de aquisição no request
export function injectAcquisitionContext(request: NextRequest): NextRequest {
  const acquisitionContext = processAcquisitionData(request);
  
  if (acquisitionContext) {
    // Adicionar contexto aos headers para uso posterior
    const headers = new Headers(request.headers);
    headers.set('x-acquisition-source', acquisitionContext.source);
    headers.set('x-acquisition-context', JSON.stringify(acquisitionContext));
    
    // Criar novo request com contexto enriquecido
    return new Request(request.url, {
      method: request.method,
      headers: headers,
      body: request.body,
      duplex: request.duplex
    });
  }
  
  return request;
}

// Função para extrair contexto do request
export function extractAcquisitionFromRequest(request: NextRequest): AcquisitionContext | null {
  try {
    const contextHeader = request.headers.get('x-acquisition-context');
    if (!contextHeader) return null;
    
    return JSON.parse(contextHeader);
  } catch (error) {
    console.error('ACQUISITION_TRACKING: Erro ao extrair contexto do request:', error);
    return null;
  }
}
