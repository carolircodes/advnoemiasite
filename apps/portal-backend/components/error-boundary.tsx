"use client";

import type { ReactNode } from "react";
import { Component, ErrorInfo, ReactElement } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactElement;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] ERRO CAPTURADO NO CLIENT-SIDE:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR'
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback customizado ou padrão
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee]">
          <div className="max-w-md w-full mx-4">
            <div className="rounded-2xl border border-[#f0ebe5] bg-gradient-to-br from-white via-white to-[#fafbff] p-8 shadow-[0_32px_96px_rgba(16,38,29,0.04),0_8px_32px_rgba(142,106,59,0.02),0_2px_8px_rgba(16,38,29,0.02)]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#f8e6d7] to-[#f1d5c5] mb-4">
                  <svg className="w-6 h-6 text-[#d97757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h1 className="text-xl font-semibold text-[#10261d] mb-2">
                  Ops! Algo deu errado
                </h1>
                
                <p className="text-[#7a8a83] mb-6 leading-[1.6]">
                  Encontramos um problema ao carregar seu portal. Nossa equipe já foi notificada e está trabalhando para resolver.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#8e6a3b] to-[#7b5c31] text-white rounded-xl font-medium hover:from-[#7b5c31] hover:to-[#6b4f2a] transition-all duration-200 shadow-[0_4px_12px_rgba(142,106,59,0.2)]"
                  >
                    Tentar novamente
                  </button>
                  
                  <a
                    href="/portal/login"
                    className="block w-full px-4 py-3 border border-[#f0ebe5] bg-white text-[#8e6a3b] rounded-xl font-medium hover:bg-[#fafbff] transition-all duration-200"
                  >
                    Voltar para o login
                  </a>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="text-xs text-[#7a8a83] cursor-pointer">
                      Detalhes técnicos (desenvolvimento)
                    </summary>
                    <div className="mt-2 p-3 bg-[#f8f9fa] rounded-lg text-xs text-[#6b7280] font-mono">
                      <div className="mb-2">
                        <strong>Erro:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap break-all">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
