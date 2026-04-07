export default function ProcessFlow() {
  const steps = [
    {
      number: '01',
      title: 'Triagem Inicial',
      description: 'Conversamos sobre sua situação para entender os detalhes do seu caso.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      number: '02',
      title: 'Análise Jurídica',
      description: 'Nossa equipe analisa seu caso e identifica as melhores estratégias.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      number: '03',
      title: 'Consulta Detalhada',
      description: 'Reunião para apresentar a estratégia e esclarecer todas as dúvidas.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      number: '04',
      title: 'Acompanhamento',
      description: 'Acompanhamos cada etapa do processo mantendo você sempre informado.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ];

  return (
    <section id="como-funciona" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-green-900 mb-4">
            Como Funciona o Atendimento
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Um processo claro, transparente e eficiente para garantir seus direitos 
            com o máximo de segurança e tranquilidade.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-green-200 to-transparent -translate-x-1/2"></div>
              )}
              
              <div className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                {/* Step number */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-green-900 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="inline-flex p-3 bg-green-100 text-green-900 rounded-full mb-6">
                  {step.icon}
                </div>
                
                <h3 className="text-xl font-bold text-green-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-green-900 mb-4">
              Pronto para começar?
            </h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Dê o primeiro passo para resolver sua questão jurídica. 
              Nossa equipe está pronta para atender você.
            </p>
            <a
              href="/triagem"
              className="inline-flex items-center px-8 py-3 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
            >
              Iniciar Agora
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
