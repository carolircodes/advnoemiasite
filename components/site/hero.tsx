import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-green-50 to-white py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-6xl font-bold text-green-900 mb-6 leading-tight">
              Direito com
              <span className="text-yellow-600"> Humanidade</span>
              <br />
              e Excelência
            </h1>
            
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Atendimento jurídico sofisticado e personalizado. 
              Transformamos complexidade legal em clareza e segurança 
              para você e sua família.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/triagem"
                className="px-8 py-4 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-all transform hover:scale-105 shadow-lg font-medium"
              >
                Iniciar Atendimento
              </Link>
              <Link
                href="/portal/login"
                className="px-8 py-4 bg-white text-green-900 border-2 border-green-900 rounded-lg hover:bg-green-50 transition-all font-medium"
              >
                Área do Cliente
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center lg:justify-start gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-900">10+</div>
                <div className="text-sm text-gray-600">Anos de Experiência</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-900">500+</div>
                <div className="text-sm text-gray-600">Clientes Atendidos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-900">98%</div>
                <div className="text-sm text-gray-600">Satisfação</div>
              </div>
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-green-100 to-yellow-50 rounded-2xl p-8 shadow-xl">
              <div className="aspect-square bg-white rounded-xl shadow-inner flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-green-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-green-900 mb-2">
                    Justiça com
                    <br />
                    Competência
                  </h3>
                  <p className="text-gray-600">
                    Sua tranquilidade é nossa prioridade
                  </p>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-500 rounded-full opacity-20"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-green-900 rounded-full opacity-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
