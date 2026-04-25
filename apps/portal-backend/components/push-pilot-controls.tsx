"use client";

import { useEffect, useState } from "react";

type PushPilotControlsProps = {
  activationFlag: boolean;
  readinessStatus: "pilot_ready" | "not_ready";
  readinessSummary: string;
  pushPilotInterested: boolean;
  vapidPublicKey: string | null;
  initialSubscriptionStatus: {
    hasActiveSubscription: boolean;
    activeSubscriptions: number;
    revokedSubscriptions: number;
    lastSeenAt: string | null;
    lastTestedAt: string | null;
  };
};

type PermissionState = NotificationPermission | "unsupported";

function isPushSupported() {
  return (
    typeof window !== "undefined"
    && window.isSecureContext
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window
  );
}

function toDeviceLabel() {
  const ua = navigator.userAgent;

  if (/android/i.test(ua)) {
    return "Android";
  }

  if (/iphone|ipad|ipod/i.test(ua)) {
    return "iPhone ou iPad";
  }

  if (/mac os/i.test(ua)) {
    return "Mac";
  }

  if (/windows/i.test(ua)) {
    return "Windows";
  }

  return "Navegador principal";
}

function toPlatformLabel() {
  return [navigator.platform, navigator.userAgent]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" / ")
    .slice(0, 120);
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function postJson(url: string, method: "POST" | "DELETE", body: Record<string, unknown>) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Nao foi possivel atualizar o piloto push."
    );
  }

  return result;
}

export function PushPilotControls(props: PushPilotControlsProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState(props.initialSubscriptionStatus);

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false);
      setPermission("unsupported");
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  async function ensureRegistration() {
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    const existing = existingRegistrations.find((item) =>
      item.active?.scriptURL.includes("notification-pilot-sw.js")
      || item.installing?.scriptURL.includes("notification-pilot-sw.js")
      || item.waiting?.scriptURL.includes("notification-pilot-sw.js")
    );

    if (existing) {
      return existing;
    }

    return navigator.serviceWorker.register("/notification-pilot-sw.js", {
      scope: "/"
    });
  }

  async function handleEnable() {
    if (!props.vapidPublicKey) {
      setMessage("As chaves do piloto ainda nao estao completas neste ambiente.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      if (!isPushSupported()) {
        setPermission("unsupported");
        throw new Error("Este navegador ainda nao suporta o piloto push com seguranca.");
      }

      let nextPermission = Notification.permission;
      if (nextPermission !== "granted") {
        nextPermission = await Notification.requestPermission();
      }

      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        await postJson("/api/notifications/push/subscription", "POST", {
          mode: "permission",
          permissionState: nextPermission
        });
        throw new Error(
          nextPermission === "denied"
            ? "Permissao negada. O piloto continua desligado neste dispositivo."
            : "Permissao ainda nao concedida. O piloto continua em espera."
        );
      }

      const registration = await ensureRegistration();
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64Url(props.vapidPublicKey)
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("A subscription retornou incompleta e nao pode entrar no piloto.");
      }

      const result = await postJson("/api/notifications/push/subscription", "POST", {
        mode: "subscribe",
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth
        },
        deviceLabel: toDeviceLabel(),
        platform: toPlatformLabel()
      });

      setSubscriptionStatus(result.subscriptionStatus as PushPilotControlsProps["initialSubscriptionStatus"]);
      setMessage("Piloto ativo neste dispositivo para alertas realmente curtos e de alto valor.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel ativar o piloto push.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setMessage("");

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const registration = registrations.find((item) =>
        item.active?.scriptURL.includes("notification-pilot-sw.js")
        || item.installing?.scriptURL.includes("notification-pilot-sw.js")
        || item.waiting?.scriptURL.includes("notification-pilot-sw.js")
      );
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      const endpoint = subscription?.endpoint || undefined;
      await postJson("/api/notifications/push/subscription", "DELETE", {
        endpoint,
        reason: "user_opt_out"
      });

      if (subscription) {
        await subscription.unsubscribe();
      }

      if (registration) {
        await registration.unregister();
      }

      setSubscriptionStatus({
        hasActiveSubscription: false,
        activeSubscriptions: 0,
        revokedSubscriptions: subscriptionStatus.revokedSubscriptions + (endpoint ? 1 : 0),
        lastSeenAt: subscriptionStatus.lastSeenAt,
        lastTestedAt: subscriptionStatus.lastTestedAt
      });
      setMessage("Piloto desligado neste dispositivo. Seus rastros operacionais foram preservados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel desligar o piloto agora.");
    } finally {
      setBusy(false);
    }
  }

  const canOfferOptIn =
    props.activationFlag
    && props.readinessStatus === "pilot_ready"
    && props.pushPilotInterested;

  return (
    <div className="rounded-[24px] border border-[#eadfcf] bg-[#f8f1e6] p-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[#8e6a3b]">
          Piloto push controlado
        </p>
        <h3 className="text-lg text-[#10261d]">
          Permissao so quando houver valor claro e cohort pequeno.
        </h3>
        <p className="text-sm text-[#5f6f68]">{props.readinessSummary}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[18px] border border-[#eadfcf] bg-white p-4 text-sm text-[#10261d]">
          <strong className="block">Escopo</strong>
          <span className="mt-1 block text-[#5f6f68]">
            Apenas lembrete de compromisso e documento liberado.
          </span>
        </div>
        <div className="rounded-[18px] border border-[#eadfcf] bg-white p-4 text-sm text-[#10261d]">
          <strong className="block">Estado</strong>
          <span className="mt-1 block text-[#5f6f68]">
            {subscriptionStatus.hasActiveSubscription
              ? `Ativo em ${subscriptionStatus.activeSubscriptions} dispositivo(s).`
              : "Ainda nao ativo neste dispositivo."}
          </span>
        </div>
        <div className="rounded-[18px] border border-[#eadfcf] bg-white p-4 text-sm text-[#10261d]">
          <strong className="block">Compatibilidade</strong>
          <span className="mt-1 block text-[#5f6f68]">
            {!supported
              ? "Este navegador ainda nao esta elegivel para o piloto."
              : permission === "granted"
                ? "Permissao concedida."
                : permission === "denied"
                  ? "Permissao negada neste navegador."
                  : "Permissao ainda nao solicitada."}
          </span>
        </div>
      </div>

      {!props.pushPilotInterested ? (
        <p className="mt-4 text-sm text-[#5f6f68]">
          Primeiro marque acima que deseja participar do piloto. Isso evita ativacao acidental.
        </p>
      ) : null}

      {canOfferOptIn ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="button"
            disabled={busy || !supported}
            onClick={handleEnable}
            type="button"
          >
            {busy ? "Preparando..." : "Ativar neste dispositivo"}
          </button>
          <button
            className="button secondary"
            disabled={busy || !subscriptionStatus.hasActiveSubscription}
            onClick={handleDisable}
            type="button"
          >
            Desligar piloto
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-[#5f6f68]">{message}</p> : null}
    </div>
  );
}
