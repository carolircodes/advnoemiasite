"use client";

import type { ReactNode } from "react";
import { Component, ErrorInfo, ReactElement } from "react";

import { PremiumStatePanel } from "@/components/portal/premium-experience";

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
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "SSR"
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4">
          <div className="w-full max-w-2xl">
            <PremiumStatePanel
              tone="error"
              eyebrow="Falha controlada"
              title="Nao foi possivel concluir esta tela agora."
              description="O portal preservou o restante da experiencia para evitar tela em branco. Tente novamente ou retome o acesso pela area segura de login."
              detail={
                process.env.NODE_ENV === "development" && this.state.error ? (
                  <details className="text-left">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8a83]">
                      Detalhes tecnicos do ambiente local
                    </summary>
                    <div className="mt-3 rounded-2xl border border-[rgba(142,106,59,0.14)] bg-[rgba(255,255,255,0.82)] p-4 text-xs text-[#5f6f68]">
                      <div className="mb-3">
                        <strong>Erro:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack ? (
                        <pre className="whitespace-pre-wrap break-all font-mono">
                          {this.state.error.stack}
                        </pre>
                      ) : null}
                    </div>
                  </details>
                ) : null
              }
              actions={
                <>
                  <button onClick={() => window.location.reload()} className="button">
                    Tentar novamente
                  </button>
                  <a href="/portal/login" className="button secondary">
                    Voltar ao login
                  </a>
                </>
              }
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
