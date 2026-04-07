export default function About() {
  return (
    <section id="sobre" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-green-900 mb-6">
              Sobre a Advogada
            </h2>
            
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                <span className="font-semibold text-green-900">Noêmia Paixão</span> é advogada 
                especializada com mais de 10 anos de experiência, dedicada a oferecer 
                atendimento jurídico de excelência com humanidade e compromisso.
              </p>
              
              <p>
                Formada com dedicação ao Direito, construiu uma carreira pautada pela 
                ética, transparência e resultados concretos para seus clientes. 
                Atua com foco em entender profundamente cada caso para oferecer 
                soluções personalizadas e eficazes.
              </p>
              
              <p>
                Acreditamos que o direito deve ser acessível, compreensível e, 
                acima de tudo, humano. Cada cliente é único e merece atenção 
                especializada que transforme complexidade jurídica em clareza 
                e segurança.
              </p>
            </div>

            {/* Values */}
            <div className="mt-12 space-y-4">
              <h3 className="text-xl font-bold text-green-900 mb-6">Nossos Valores</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">Ética e Transparência</h4>
                    <p className="text-gray-600 text-sm">Atendimento honesto e claro em todas as etapas</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">Compromisso com Resultados</h4>
                    <p className="text-gray-600 text-sm">Foco em soluções eficazes e duradouras</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">Atendimento Humanizado</h4>
                    <p className="text-gray-600 text-sm">Cuidado e empatia em cada detalhe</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">Excelência Técnica</h4>
                    <p className="text-gray-600 text-sm">Atualização constante e especialização</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-green-100 to-yellow-50 rounded-2xl p-8 shadow-xl">
              <div className="aspect-square bg-white rounded-xl shadow-inner flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-900 to-green-800 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                    <span className="text-white text-4xl font-bold">NP</span>
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-4">
                    Noêmia Paixão
                  </h3>
                  <p className="text-gray-600 mb-2">OAB - UF XXXXX</p>
                  <p className="text-green-800 font-medium">
                    Advocacia e Consultoria Jurídica
                  </p>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex justify-center space-x-6 text-gray-600">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">10+</div>
                        <div className="text-sm">Anos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">500+</div>
                        <div className="text-sm">Clientes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">98%</div>
                        <div className="text-sm">Sucesso</div>
                      </div>
                    </div>
                  </div>
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
