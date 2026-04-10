'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PagamentoPendenteContent() {
  const [countdown, setCountdown] = useState(60);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get('payment_id');
  const paymentType = searchParams.get('payment_type');

  useEffect(() => {
    // Determinar método de pagamento
    if (paymentType === 'pix') {
      setPaymentMethod('Pix');
    } else if (paymentType === 'credit_card') {
      setPaymentMethod('Cartão de Crédito');
    } else {
      setPaymentMethod('outro método');
    }

    // Countdown para verificar status
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          checkPaymentStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentType]);

  const checkPaymentStatus = async () => {
    if (!paymentId) return;

    try {
      const response = await fetch(`/api/payment/create?payment_id=${paymentId}`);
      const data = await response.json();

      if (data.success && data.payment.status === 'approved') {
        router.push('/pagamento/sucesso?payment_id=' + paymentId);
      } else if (data.payment.status === 'rejected') {
        router.push('/pagamento/falha?payment_id=' + paymentId + '&collection_status=rejected');
      } else {
        // Continua pendente, reinicia o countdown
        setCountdown(60);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setCountdown(60); // Tentar novamente em 60 segundos
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInstructions = () => {
    switch (paymentType) {
      case 'pix':
        return {
          title: 'Aguardando pagamento via Pix',
          steps: [
            'Escaneie o QR Code com o app do seu banco',
            'Ou copie e cole o código Pix no app do seu banco',
            'Pagamentos via Pix são confirmados instantaneamente',
            'Após o pagamento, você será redirecionado automaticamente'
          ],
          color: 'green'
        };
      
      case 'credit_card':
        return {
          title: 'Processando pagamento com Cartão de Crédito',
          steps: [
            'Seu pagamento está sendo processado pela operadora',
            'A confirmação pode levar até 5 minutos',
            'Não feche esta página enquanto aguardamos',
            'Você será redirecionado automaticamente após a confirmação'
          ],
          color: 'blue'
        };
      
      default:
        return {
          title: 'Processando pagamento',
          steps: [
            'Seu pagamento está sendo processado',
            'Aguarde a confirmação da transação',
            'Não feche esta página',
            'Você será redirecionado automaticamente'
          ],
          color: 'yellow'
        };
    }
  };

  const instructions = getInstructions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Ícone de carregamento */}
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {instructions.title}
          </h1>
          
          <p className="text-gray-600 mb-6">
            ID da transação: <span className="font-mono text-sm">{paymentId}</span>
          </p>

          {/* Timer */}
          <div className={`bg-${instructions.color}-50 border border-${instructions.color}-200 rounded-lg p-4 mb-6`}>
            <p className={`text-${instructions.color}-800 text-sm mb-2`}>
              <strong>Verificando status em:</strong>
            </p>
            <div className={`text-3xl font-bold text-${instructions.color}-600`}>
              {formatTime(countdown)}
            </div>
            <p className={`text-${instructions.color}-600 text-xs mt-1`}>
              {paymentMethod === 'Pix' ? 'ou clique em "Já paguei"' : 'aguarde a confirmação'}
            </p>
          </div>

          {/* Instruções */}
          <div className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-gray-800 text-sm font-semibold mb-3">
              O que fazer agora:
            </p>
            <ul className="space-y-2">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start text-gray-700 text-sm">
                  <span className="text-blue-600 mr-2 mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <button
              onClick={checkPaymentStatus}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Verificar status agora
            </button>
            
            {paymentMethod === 'Pix' && (
              <button
                onClick={() => router.push('/noemia')}
                className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Já paguei, voltar para atendimento
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Atualizar página
            </button>
          </div>

          {/* Ajuda */}
          <div className="text-xs text-gray-500 mt-4 space-y-1">
            <p>• Não feche esta página enquanto aguarda a confirmação</p>
            <p>• Se o pagamento for confirmado e não for redirecionado, clique em "Verificar status agora"</p>
            <p>• Em caso de problemas, entre em contato conosco</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoPendente() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    }>
      <PagamentoPendenteContent />
    </Suspense>
  );
}
