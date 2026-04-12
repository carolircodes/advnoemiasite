"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_NOEMIA_PATHS = ["/", "/triagem", "/noemia"];

function shouldLoadNoemiaScript(pathname: string) {
  return PUBLIC_NOEMIA_PATHS.some((basePath) => {
    if (basePath === "/") {
      return pathname === "/";
    }

    return pathname === basePath || pathname.startsWith(`${basePath}/`);
  });
}

export function NoemiaScript() {
  const pathname = usePathname() || "/";
  const shouldLoad = shouldLoadNoemiaScript(pathname);

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-noemia-unified="true"]'
    );

    if (!shouldLoad) {
      existingScript?.remove();
      return;
    }

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "/assets/js/noemia-unified.js";
    script.async = true;
    script.dataset.noemiaUnified = "true";
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
  }, [shouldLoad]);

  return null;
}
