'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PagamentoSucessoContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');
  const collectionId = searchParams.get('collection_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setStatus('error');
        return;
      }

      try {
        // Verificar status do pagamento
        const response = await fetch(`/api/payment/create?payment_id=${paymentId}`);
        const data = await response.json();

        if (data.success) {
          setPaymentInfo(data.payment);
          setStatus('success');
          
          // Se for sucesso, redirecionar para o Noêmia após 3 segundos
          setTimeout(() => {
            router.push('/noemia?payment=confirmed');
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [paymentId, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificando pagamento...</h1>
            <p className="text-gray-600">Aguarde um instante enquanto confirmamos sua transação.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro no pagamento</h1>
            <p className="text-gray-600 mb-6">Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente ou entre em contato conosco.</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/noemia')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Voltar para o atendimento
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento confirmado!</h1>
          <p className="text-gray-600 mb-6">
            Seu pagamento foi processado com sucesso. 
            {paymentInfo?.amount && ` Valor: R$ ${paymentInfo.amount.toFixed(2)}`}
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Próximos passos:</strong><br />
              • Você será redirecionado automaticamente para o atendimento<br />
              • Receberá as orientações para sua consulta<br />
              • Nossa equipe entrará em contato para agendar
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/noemia?payment=confirmed')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continuar para o atendimento
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Ir para a página inicial
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Redirecionando automaticamente em 3 segundos...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoSucesso() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PagamentoSucessoContent />
    </Suspense>
  );
}
