"use client";

import { useEffect } from "react";

export function NoemiaScript() {
  useEffect(() => {
    // Adicionar o script da NoemIA unificado
    const script = document.createElement("script");
    script.src = "/assets/js/noemia-unified.js";
    script.async = true;
    script.onload = () => {
      console.log("[NoemIA] Script unificado carregado com sucesso");
    };
    script.onerror = () => {
      console.error("[NoemIA] Erro ao carregar script unificado");
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return null;
}
