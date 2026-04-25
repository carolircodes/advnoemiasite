"use client";

import { useEffect, useMemo, useState } from "react";

import { PremiumStatePanel } from "@/components/portal/premium-experience";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "client-pwa-install-dismissed";

function isIosSafari() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
}

export function ClientPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Boolean((window.navigator as any).standalone);

    setInstalled(standalone);
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const showIosInstructions = useMemo(
    () => !installed && !dismissed && !deferredPrompt && isIosSafari(),
    [deferredPrompt, dismissed, installed]
  );

  if (installed || dismissed) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      if (result.outcome === "accepted") {
        setInstalled(true);
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }

  if (deferredPrompt) {
    return (
      <PremiumStatePanel
        tone="neutral"
        eyebrow="Portal no celular"
        title="Instale este acompanhamento na tela inicial."
        description="O acesso fica mais rapido para abrir agenda, documentos, pagamentos e o proximo passo do seu caso sem procurar pelo navegador."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={installing}
              className="button"
            >
              {installing ? "Preparando instalacao..." : "Instalar portal"}
            </button>
            <button type="button" onClick={dismiss} className="button secondary">
              Agora nao
            </button>
          </div>
        }
      />
    );
  }

  if (showIosInstructions) {
    return (
      <PremiumStatePanel
        tone="neutral"
        eyebrow="Portal no iPhone"
        title="Voce pode instalar este portal na tela inicial."
        description="No Safari, toque em Compartilhar e depois em Adicionar a Tela de Inicio para abrir seu acompanhamento com um toque."
        actions={
          <button type="button" onClick={dismiss} className="button secondary">
            Entendi
          </button>
        }
      />
    );
  }

  return null;
}
