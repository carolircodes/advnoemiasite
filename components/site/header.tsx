'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-green-900">
              Noêmia Paixão
              <span className="block text-sm font-normal text-gray-600">Advocacia</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="#sobre" className="text-gray-700 hover:text-green-900 transition-colors">
              Sobre
            </Link>
            <Link href="#areas" className="text-gray-700 hover:text-green-900 transition-colors">
              Áreas de Atuação
            </Link>
            <Link href="#como-funciona" className="text-gray-700 hover:text-green-900 transition-colors">
              Como Funciona
            </Link>
            <Link href="#contato" className="text-gray-700 hover:text-green-900 transition-colors">
              Contato
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex space-x-4">
            <Link
              href="/portal/login"
              className="px-4 py-2 text-green-900 border border-green-900 rounded-lg hover:bg-green-50 transition-colors"
            >
              Área do Cliente
            </Link>
            <Link
              href="/triagem"
              className="px-6 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors"
            >
              Iniciar Atendimento
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-green-900 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col space-y-4">
              <Link href="#sobre" className="text-gray-700 hover:text-green-900 transition-colors">
                Sobre
              </Link>
              <Link href="#areas" className="text-gray-700 hover:text-green-900 transition-colors">
                Áreas de Atuação
              </Link>
              <Link href="#como-funciona" className="text-gray-700 hover:text-green-900 transition-colors">
                Como Funciona
              </Link>
              <Link href="#contato" className="text-gray-700 hover:text-green-900 transition-colors">
                Contato
              </Link>
              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-100">
                <Link
                  href="/portal/login"
                  className="px-4 py-2 text-green-900 border border-green-900 rounded-lg hover:bg-green-50 transition-colors text-center"
                >
                  Área do Cliente
                </Link>
                <Link
                  href="/triagem"
                  className="px-6 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors text-center"
                >
                  Iniciar Atendimento
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
