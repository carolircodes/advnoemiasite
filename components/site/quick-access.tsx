import Link from 'next/link';

export default function QuickAccess() {
  const quickAccessItems = [
    {
      title: 'Iniciar Atendimento',
      description: 'Agende sua consulta inicial e comece sua jornada jurídica com segurança',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      href: '/triagem',
      color: 'bg-green-900 text-white'
    },
    {
      title: 'Área do Cliente',
      description: 'Acesse seus processos, documentos e agendamentos',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      href: '/portal/login',
      color: 'bg-white text-green-900 border-2 border-green-900'
    },
    {
      title: 'NoemIA',
      description: 'Assistente inteligente para orientações rápidas 24/7',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      href: '/noemia',
      color: 'bg-gradient-to-r from-green-900 to-green-800 text-white'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-green-900 mb-4">
            Acesso Rápido
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Tudo que você precisa em um só lugar. Atendimento ágil e organizado 
            para sua tranquilidade.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {quickAccessItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`group block p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 ${item.color}`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-3 bg-white bg-opacity-20 rounded-full group-hover:bg-opacity-30 transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="leading-relaxed opacity-90">{item.description}</p>
                <div className="mt-6 flex items-center font-medium">
                  <span>Acessar</span>
                  <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
