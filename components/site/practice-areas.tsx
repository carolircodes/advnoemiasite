export default function PracticeAreas() {
  const areas = [
    {
      title: 'Direito Previdenciário',
      description: 'Aposentadorias, benefícios INSS, revisões e cálculos previdenciários.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-900'
    },
    {
      title: 'Direito do Consumidor e Bancário',
      description: 'Cobranças abusivas, negativação, juros excessivos e direitos do consumidor.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-900'
    },
    {
      title: 'Direito de Família',
      description: 'Divórcio, pensão alimentícia, guarda, partilha e sucessões.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-pink-100 text-pink-900'
    },
    {
      title: 'Direito Civil',
      description: 'Contratos, responsabilidade civil, usucapião e demais questões cíveis.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-900'
    }
  ];

  return (
    <section id="areas" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-green-900 mb-4">
            Áreas de Atuação
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Atuação especializada nas principais áreas do direito com foco em 
            resultados e atendimento humanizado.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {areas.map((area, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <div className={`inline-flex p-4 rounded-full ${area.color} mb-6`}>
                {area.icon}
              </div>
              <h3 className="text-xl font-bold text-green-900 mb-4">
                {area.title}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {area.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-2xl p-8 border border-green-100">
            <h3 className="text-2xl font-bold text-green-900 mb-4">
              Dúvida sobre qual área se encaixa no seu caso?
            </h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Nossa equipe está preparada para analisar sua situação e indicar 
              o melhor caminho jurídico para seu caso específico.
            </p>
            <a
              href="/triagem"
              className="inline-flex items-center px-8 py-3 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
            >
              Falar com Especialista
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
