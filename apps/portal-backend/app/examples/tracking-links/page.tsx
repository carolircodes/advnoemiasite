'use client';

import React, { useState } from 'react';
import { SmartCTA, InstagramCTA, WhatsAppCTA, AdsCTA, SiteCTA } from '@/components/SmartCTA';
import {
  generateTrackingLink,
  generateInstagramBioLink,
  generateContentLink,
  generateWhatsAppLink,
  generateAdLink,
  generateSiteLink
} from '@/lib/acquisition/link-builder';
import { getAvailableTopics } from '@/lib/acquisition/topics';

export default function TrackingLinksExamples() {
  const [selectedTopic, setSelectedTopic] = useState<string>('previdenciario');
  const [customCampaign, setCustomCampaign] = useState<string>('');

  const topics = getAvailableTopics();

  const exampleLinks = [
    {
      title: 'Instagram Bio',
      description: 'Link principal para bio do Instagram',
      link: generateInstagramBioLink('bio_principal'),
      code: `generateInstagramBioLink('bio_principal')`
    },
    {
      title: 'Reel - Benefício Negado',
      description: 'Conteúdo específico sobre previdenciário',
      link: generateContentLink('reel', 'beneficio_negado', 'previdenciario', 'reel_beneficio_negado'),
      code: `generateContentLink('reel', 'beneficio_negado', 'previdenciario')`
    },
    {
      title: 'WhatsApp Direto',
      description: 'Link para WhatsApp com mensagem personalizada',
      link: generateWhatsAppLink('Olá! Vi seu conteúdo sobre direito trabalhista e gostaria de saber mais.', 'whatsapp_direct', 'trabalhista'),
      code: `generateWhatsAppLink('mensagem', 'campaign', 'topic')`
    },
    {
      title: 'Anúncio Google Ads',
      description: 'Link para campanha de anúncios',
      link: generateAdLink('ads_juros_altos', 'bancario', 'grupo_juros', 'criativo_01'),
      code: `generateAdLink('campaign', 'topic', 'adGroup', 'creative')`
    },
    {
      title: 'Site Principal',
      description: 'Link para homepage com tracking',
      link: generateSiteLink('homepage_main'),
      code: `generateSiteLink('homepage_main')`
    }
  ];

  const generateCustomLink = () => {
    const params = {
      source: 'instagram',
      campaign: customCampaign || 'custom_campaign',
      topic: selectedTopic
    };

    return generateTrackingLink(params);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gerador de Links Inteligentes
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Crie links de tracking para a NoemIA com parâmetros de origem, campanha e tema.
            Todos os links geram contexto automático para a IA adaptar o atendimento.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Gerar Link Customizado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tema Jurídico
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {topics.map((topic) => (
                  <option key={topic.value} value={topic.value}>
                    {topic.icon} {topic.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campanha (opcional)
              </label>
              <input
                type="text"
                value={customCampaign}
                onChange={(e) => setCustomCampaign(e.target.value)}
                placeholder="nome_da_campanha"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <SmartCTA
                label="Gerar Link"
                source="instagram"
                campaign={customCampaign || 'custom_campaign'}
                topic={selectedTopic}
                variant="primary"
                onClick={() => {
                  const link = generateCustomLink();
                  navigator.clipboard.writeText(link);
                  alert('Link copiado para área de transferência!');
                }}
              />
            </div>
          </div>

          {customCampaign && selectedTopic && (
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-600 mb-2">Link gerado:</p>
              <code className="block bg-white px-3 py-2 rounded border text-sm break-all">
                {generateCustomLink()}
              </code>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Exemplos de Links
          </h2>

          <div className="space-y-6">
            {exampleLinks.map((example, index) => (
              <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {example.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {example.description}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <SmartCTA
                      label="Testar Link"
                      variant="outline"
                      size="sm"
                      target="_blank"
                      onClick={() => window.open(example.link, '_blank')}
                    />
                    <SmartCTA
                      label="Copiar"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(example.link);
                        alert('Link copiado!');
                      }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">URL:</p>
                  <code className="block bg-white px-2 py-1 rounded border text-xs break-all mb-2">
                    {example.link}
                  </code>
                  <p className="text-xs text-gray-500 mb-1">Código:</p>
                  <code className="block bg-blue-50 px-2 py-1 rounded border text-xs text-blue-800">
                    {example.code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Componentes React
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Instagram CTA
              </h3>
              <div className="space-y-3">
                <InstagramCTA
                  label="Falar com NoemIA"
                  campaign="bio_principal"
                  topic="previdenciario"
                />
                <InstagramCTA
                  label="Agendar Consulta"
                  campaign="reel_agendamento"
                  topic="geral"
                  variant="outline"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                WhatsApp CTA
              </h3>
              <div className="space-y-3">
                <WhatsAppCTA
                  label="Conversar no WhatsApp"
                  message="Olá! Gostaria de agendar uma consulta."
                  campaign="whatsapp_direct"
                  topic="geral"
                />
                <WhatsAppCTA
                  label="Tirar Dúvidas"
                  message="Tenho uma dúvida sobre meu caso."
                  campaign="whatsapp_duvidas"
                  topic="geral"
                  variant="outline"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Anúncio CTA
              </h3>
              <div className="space-y-3">
                <AdsCTA
                  label="Falar com Especialista"
                  campaign="ads_beneficio_negado"
                  topic="previdenciario"
                  adGroup="beneficio"
                  creative="texto_01"
                />
                <AdsCTA
                  label="Análise Gratuita"
                  campaign="ads_juros_altos"
                  topic="bancario"
                  adGroup="juros"
                  creative="texto_02"
                  variant="outline"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Site CTA
              </h3>
              <div className="space-y-3">
                <SiteCTA
                  label="Iniciar Atendimento"
                  campaign="homepage_main"
                  topic="geral"
                />
                <SiteCTA
                  label="Triagem Online"
                  campaign="header_cta"
                  topic="geral"
                  variant="outline"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            📚 Como Usar
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">1. Importe os componentes:</h3>
              <code className="block bg-white px-3 py-2 rounded border text-xs">
{`import { SmartCTA, InstagramCTA, WhatsAppCTA } from '@/components/SmartCTA';
import { generateTrackingLink } from '@/lib/acquisition/link-builder';`}
              </code>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">2. Use nos seus componentes:</h3>
              <code className="block bg-white px-3 py-2 rounded border text-xs">
{`<SmartCTA
  label="Falar com NoemIA"
  source="instagram"
  campaign="reel_beneficio_negado"
  topic="previdenciario"
/>`}
              </code>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">3. Ou gere links dinamicamente:</h3>
              <code className="block bg-white px-3 py-2 rounded border text-xs">
{`const link = generateTrackingLink({
  source: 'instagram',
  campaign: 'reel_beneficio_negado',
  topic: 'previdenciario'
});`}
              </code>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">4. Temas disponíveis:</h3>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                {topics.map((topic) => (
                  <li key={topic.value}>
                    {topic.icon} <strong>{topic.value}</strong>: {topic.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}