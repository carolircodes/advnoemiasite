'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PagamentoFalhaContent() {
  const [reason, setReason] = useState<string>('');
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    // Determinar motivo da falha baseado nos parâmetros
    if (searchParams.get('collection_status') === 'rejected') {
      setReason('Pagamento rejeitado pela instituição financeira.');
    } else if (searchParams.get('collection_status') === 'cancelled') {
      setReason('Pagamento cancelado pelo usuário.');
    } else if (searchParams.get('collection_status') === 'pending') {
      setReason('Pagamento em processamento. Verificamos seu status e atualizaremos em breve.');
    } else {
      setReason('Ocorreu um erro durante o processamento do pagamento.');
    }
  }, [searchParams]);

  const handleRetry = () => {
    // Tentar gerar novo pagamento
    if (externalReference) {
      // Extrair leadId do external_reference
      const match = externalReference.match(/consultation_(\d+)_\d+/);
      if (match) {
        const leadId = match[1];
        router.push(`/noemia?lead=${leadId}&retry_payment=true`);
      }
    }
  };

  const handleContact = () => {
    // Redirecionar para WhatsApp ou contato
    window.open('https://wa.me/5511999999999?text=Olá!%20Tive%20problemas%20com%20o%20pagamento%20da%20consulta.', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento não concluído</h1>
          
          <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm mb-2">
              <strong>Motivo:</strong> {reason}
            </p>
            {paymentId && (
              <p className="text-red-600 text-xs">
                <strong>ID da transação:</strong> {paymentId}
              </p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>O que você pode fazer:</strong><br />
                • Tentar o pagamento novamente com outro cartão<br />
                • Usar o Pix para pagamento instantâneo<br />
                • Entrar em contato conosco para ajuda
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tentar pagamento novamente
            </button>
            
            <button
              onClick={handleContact}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Falar com atendente
            </button>
            
            <button
              onClick={() => router.push('/noemia')}
              className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar para o atendimento
            </button>
          </div>

          <div className="text-xs text-gray-500 mt-4 space-y-1">
            <p>• Pagamentos via Pix são processados instantaneamente</p>
            <p>• Cartões de crédito podem demorar até 5 minutos para confirmar</p>
            <p>• Em caso de dúvidas, entre em contato conosco</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoFalha() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    }>
      <PagamentoFalhaContent />
    </Suspense>
  );
}
